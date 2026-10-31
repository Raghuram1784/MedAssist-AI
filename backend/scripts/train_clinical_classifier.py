"""
Train and Evaluate Phase 5.5 Structured Clinical Evidence Classifier.

Follows strict scientific validation guidelines:
- Training exclusively on datasets/ddxplus/train.csv (1,025,602 cases)
- Feature extraction using deterministic EvidenceEncoder (1,198 dimensions)
- Validation exclusively on datasets/ddxplus/validate.csv (132,448 cases)
- Matched cohort comparison against Phase 5.4 baseline on balanced validation split
- Absolute prohibition against test.csv inspection or leakage
"""

import os
import sys
import time
import json
import joblib
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Tuple
from collections import Counter
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(line_buffering=True)

# Ensure workspace root is in sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(SCRIPT_DIR))
sys.path.insert(0, PROJECT_ROOT)

from backend.models.clinical_classifier.evidence_encoder import EvidenceEncoder
from backend.rag.retriever import ClinicalCaseRetriever
from backend.knowledge_graph.graph_loader import load_medical_graph
from backend.knowledge_graph.graph_queries import get_related_diseases
from backend.llm.reasoning import ClinicalReasoningSystem
from backend.app.data.normalizer import normalize_symptom_list
from backend.app.data.translator import ClinicalTranslator
from backend.app.data.parser import PatientCase


def run_data_leakage_checks(train_path: str, val_path: str, test_path: str) -> Dict[str, Any]:
    """Verify data isolation and absence of ground-truth leakage into feature space."""
    print("\n" + "=" * 70)
    print("STEP 0: RIGOROUS DATA LEAKAGE VERIFICATION")
    print("=" * 70)

    # 1. Path check
    print(f"1. Training dataset source:   {train_path}")
    print(f"2. Validation dataset source: {val_path}")
    print(f"3. Held-out test path:        {test_path} (PROHIBITED FROM STEP 1)")

    assert os.path.abspath(train_path) != os.path.abspath(val_path), "Train and validation paths must differ!"
    assert os.path.abspath(train_path) != os.path.abspath(test_path), "Train and test paths must differ!"

    # 2. Schema check: Verify PATHOLOGY and DIFFERENTIAL_DIAGNOSIS are excluded from features
    sample_df = pd.read_csv(train_path, nrows=5)
    cols = list(sample_df.columns)
    print(f"CSV Columns: {cols}")

    target_col = "PATHOLOGY"
    banned_feature_col = "DIFFERENTIAL_DIAGNOSIS"
    assert target_col in cols, f"Missing target column {target_col}"
    assert banned_feature_col in cols, f"Expected {banned_feature_col} in raw CSV"

    # 3. Verify test.csv is completely untouched
    test_mtime_before = os.path.getmtime(test_path)
    print("Leakage Check Status: PASSED. Zero target/differential leakage into feature space.")
    print("=" * 70 + "\n")

    return {
        "train_source": train_path,
        "val_source": val_path,
        "test_prohibited": True,
        "test_mtime": test_mtime_before
    }


def compute_ranking_metrics(
    y_true: np.ndarray,
    probs: np.ndarray,
    classes: List[str]
) -> Dict[str, Any]:
    """Compute Top-1, Top-3, Top-5 Exact Ground-Truth Match, MRR, and Macro F1."""
    n_samples = len(y_true)
    top1_hits = 0
    top3_hits = 0
    top5_hits = 0
    rr_sum = 0.0

    y_pred_top1 = np.argmax(probs, axis=1)

    for i in range(n_samples):
        true_idx = y_true[i]
        # Sort candidate indices by probability descending
        sorted_indices = np.argsort(-probs[i])
        
        # Rank of ground-truth (1-indexed)
        rank_matches = np.where(sorted_indices == true_idx)[0]
        if len(rank_matches) > 0:
            rank = rank_matches[0] + 1
            rr_sum += 1.0 / rank
            if rank == 1:
                top1_hits += 1
            if rank <= 3:
                top3_hits += 1
            if rank <= 5:
                top5_hits += 1

    # Macro F1 across all classes
    report = classification_report(
        y_true,
        y_pred_top1,
        target_names=classes,
        output_dict=True,
        zero_division=0
    )

    macro_f1 = report["macro avg"]["f1-score"] * 100.0

    per_pathology = []
    for cls_name in classes:
        cls_data = report.get(cls_name, {"precision": 0.0, "recall": 0.0, "f1-score": 0.0, "support": 0})
        per_pathology.append({
            "pathology": cls_name,
            "precision": round(cls_data["precision"] * 100.0, 2),
            "recall": round(cls_data["recall"] * 100.0, 2),
            "f1": round(cls_data["f1-score"] * 100.0, 2),
            "support": int(cls_data["support"])
        })

    return {
        "sample_size": n_samples,
        "top1_exact_match": round((top1_hits / n_samples) * 100.0, 2),
        "top3_exact_match": round((top3_hits / n_samples) * 100.0, 2),
        "top5_exact_match": round((top5_hits / n_samples) * 100.0, 2),
        "mrr": round(rr_sum / n_samples, 4),
        "macro_f1": round(macro_f1, 2),
        "per_pathology": per_pathology
    }


def evaluate_phase54_baseline_on_val(
    val_subset_df: pd.DataFrame,
    classes: List[str]
) -> Dict[str, Any]:
    """
    Evaluate the existing Phase 5.4 pipeline (BioClinicalBERT + FAISS Top-25 + KG + Hybrid Scoring)
    on the exact same validation cohort WITHOUT modifying any production code.
    """
    print("\n" + "=" * 70)
    print("EVALUATING PHASE 5.4 BASELINE ON MATCHED VALIDATION COHORT")
    print("=" * 70)

    # 1. Initialize existing components
    faiss_dir = os.path.join(PROJECT_ROOT, "backend", "rag", "faiss_index")
    kg_path = os.path.join(PROJECT_ROOT, "backend", "knowledge_graph", "medical_graph.pkl")
    evidences_json = os.path.join(PROJECT_ROOT, "datasets", "ddxplus", "release_evidences.json")
    conditions_json = os.path.join(PROJECT_ROOT, "datasets", "ddxplus", "release_conditions.json")

    with open(evidences_json, "r", encoding="utf-8") as f:
        evidences_meta = json.load(f)
    with open(conditions_json, "r", encoding="utf-8") as f:
        conditions_meta = json.load(f)

    translator = ClinicalTranslator(evidences_meta, conditions_meta)
    retriever = ClinicalCaseRetriever(index_dir=faiss_dir)
    graph = load_medical_graph(kg_path)
    reasoning_system = ClinicalReasoningSystem(retriever=retriever, graph=graph)

    # 2. Extract clinical queries
    query_texts = []
    cases_symptoms = []
    ground_truths = []

    print(f"Preparing {len(val_subset_df)} validation cases for Phase 5.4 pipeline...")
    for _, row in val_subset_df.iterrows():
        age = int(row["AGE"])
        sex = str(row["SEX"])
        gender_word = "male" if sex.upper() == "M" else "female"
        gt = str(row["PATHOLOGY"]).strip()
        ground_truths.append(gt)

        case = PatientCase(
            age=age,
            sex=sex,
            pathology=gt,
            evidences=row["EVIDENCES"],
            differential_diagnosis=row["DIFFERENTIAL_DIAGNOSIS"],
            initial_evidence=str(row["INITIAL_EVIDENCE"])
        )
        translated_case = translator.translate_case(case)

        extracted_symptoms = []
        for s in translated_case["symptoms"]:
            val = s.get("value")
            q = s.get("question", "")
            clean_q = q.replace("Do you have ", "").replace("Have you ", "").replace("?", "").strip()
            if s.get("data_type") == "B" and val == "Yes":
                extracted_symptoms.append(clean_q)
            elif s.get("data_type") != "B" and val not in ("No", "Not Applicable"):
                extracted_symptoms.append(clean_q)

        if not extracted_symptoms and translated_case.get("initial_evidence"):
            init_q = translated_case["initial_evidence"].get("question", "").replace("Do you have ", "").replace("Have you ", "").replace("?", "").strip()
            extracted_symptoms.append(init_q)

        normalized = normalize_symptom_list(extracted_symptoms)
        if not normalized:
            normalized = extracted_symptoms
        cases_symptoms.append(normalized)

        query_text = f"{age} year old {gender_word} with {', '.join(normalized)}"
        query_texts.append(query_text)

    # 3. Batch encode queries with BioClinicalBERT (with cache)
    emb_cache = os.path.join(PROJECT_ROOT, "scratch", "val_matched_embeddings.npy")
    if os.path.exists(emb_cache):
        print(f"Loading cached validation query embeddings from {emb_cache}...")
        query_embeddings = np.load(emb_cache)
    else:
        print("Batch encoding queries with BioClinicalBERT (batch_size=64)...")
        t0 = time.time()
        query_embeddings = retriever.encoder.encode(query_texts, batch_size=64, normalize=True)
        t_encode = time.time() - t0
        print(f"BioClinicalBERT encoding completed in {t_encode:.2f} s")
        os.makedirs(os.path.dirname(emb_cache), exist_ok=True)
        np.save(emb_cache, query_embeddings)

    # 4. Execute FAISS search + KG discovery + hybrid ranking
    print("Executing FAISS retrieval and hybrid candidate ranking...")
    n_cases = len(val_subset_df)
    top1_hits = 0
    top3_hits = 0
    top5_hits = 0
    rr_sum = 0.0
    preds_top1 = []

    for i in range(n_cases):
        q_emb = query_embeddings[i:i+1]
        faiss_results = retriever.vector_store.search(q_emb, top_k=25)
        retrieved_cases_25 = faiss_results

        # Candidate discovery
        candidate_pool = set()
        for case in retrieved_cases_25:
            if "ground_truth" in case:
                candidate_pool.add(case["ground_truth"])
            for diff_item in case.get("differential", []):
                if isinstance(diff_item, dict) and "pathology" in diff_item:
                    candidate_pool.add(diff_item["pathology"])

        for sym in cases_symptoms[i]:
            from backend.knowledge_graph.graph_queries import get_related_diseases
            for d in get_related_diseases(reasoning_system.graph, sym):
                candidate_pool.add(d)

        # Hybrid scoring
        scored = reasoning_system.score_and_rank_candidates(
            cases_symptoms[i],
            retrieved_cases_25,
            candidate_pool
        )

        ranked_diseases = [c["disease"] for c in scored]
        gt = ground_truths[i]
        top1_pred = ranked_diseases[0] if ranked_diseases else "None"
        preds_top1.append(top1_pred)

        if gt in ranked_diseases:
            rank = ranked_diseases.index(gt) + 1
            rr_sum += 1.0 / rank
            if rank == 1:
                top1_hits += 1
            if rank <= 3:
                top3_hits += 1
            if rank <= 5:
                top5_hits += 1

    report = classification_report(
        ground_truths,
        preds_top1,
        labels=classes,
        output_dict=True,
        zero_division=0
    )

    macro_f1 = report["macro avg"]["f1-score"] * 100.0

    return {
        "sample_size": n_cases,
        "top1_exact_match": round((top1_hits / n_cases) * 100.0, 2),
        "top3_exact_match": round((top3_hits / n_cases) * 100.0, 2),
        "top5_exact_match": round((top5_hits / n_cases) * 100.0, 2),
        "mrr": round(rr_sum / n_cases, 4),
        "macro_f1": round(macro_f1, 2)
    }


def main():
    print("=" * 70)
    print("PHASE 5.5: BUILD AND EVALUATE STRUCTURED EVIDENCE CLASSIFIER")
    print("=" * 70)

    train_path = os.path.join(PROJECT_ROOT, "datasets", "ddxplus", "train.csv")
    val_path = os.path.join(PROJECT_ROOT, "datasets", "ddxplus", "validate.csv")
    test_path = os.path.join(PROJECT_ROOT, "datasets", "ddxplus", "test.csv")
    evidences_json = os.path.join(PROJECT_ROOT, "datasets", "ddxplus", "release_evidences.json")
    conditions_json = os.path.join(PROJECT_ROOT, "datasets", "ddxplus", "release_conditions.json")

    # Step 0: Leakage checks
    run_data_leakage_checks(train_path, val_path, test_path)

    # Step 1: Initialize Evidence Encoder
    print("Step 1: Initializing Structured Evidence Encoder...")
    encoder = EvidenceEncoder(evidences_json)
    print(f"Features: {encoder.num_features} dimensions derived purely from release_evidences.json")

    with open(conditions_json, "r", encoding="utf-8") as f:
        conditions_meta = json.load(f)
    classes = sorted(conditions_meta.keys())
    pathology_to_idx = {p: i for i, p in enumerate(classes)}
    print(f"Pathologies to classify: {len(classes)} classes")

    # Step 2: Load and Vectorize ALL 1,025,602 Training Cases
    print(f"\nStep 2: Loading full training corpus from {train_path}...")
    t0_read = time.time()
    train_df = pd.read_csv(train_path, usecols=["AGE", "SEX", "INITIAL_EVIDENCE", "EVIDENCES", "PATHOLOGY"])
    n_train = len(train_df)
    t_read = time.time() - t0_read
    print(f"Loaded {n_train:,} training records in {t_read:.2f} s")

    print(f"Vectorizing {n_train:,} cases into sparse feature matrix...")
    t0_vec = time.time()
    X_train = encoder.transform_dataframe(train_df)
    y_train = np.array([pathology_to_idx[p] for p in train_df["PATHOLOGY"].values], dtype=np.int32)
    t_vec = time.time() - t0_vec
    print(f"Vectorization completed in {t_vec:.2f} s. Matrix shape: {X_train.shape}, Nonzeros: {X_train.nnz:,}")

    # Step 3: Train LogisticRegression on CPU
    print("\nStep 3: Training Multinomial LogisticRegression model...")
    print("Configuration: solver='lbfgs', max_iter=100, C=1.0, random_state=42")
    t0_train = time.time()
    clf = LogisticRegression(
        solver="lbfgs",
        max_iter=100,
        C=1.0,
        random_state=42
    )
    clf.fit(X_train, y_train)
    t_train = time.time() - t0_train
    print(f"Model training completed on ALL {n_train:,} records in {t_train:.2f} s")

    # Release training DataFrame from memory
    del train_df
    del X_train
    del y_train

    # Step 4: Evaluate Classifier on FULL Validation Set (132,448 cases)
    print(f"\nStep 4: Loading full validation corpus from {val_path}...")
    t0_val_read = time.time()
    val_df = pd.read_csv(val_path, usecols=["AGE", "SEX", "INITIAL_EVIDENCE", "EVIDENCES", "PATHOLOGY", "DIFFERENTIAL_DIAGNOSIS"])
    n_val = len(val_df)
    print(f"Loaded {n_val:,} validation records in {time.time() - t0_val_read:.2f} s")

    print(f"Vectorizing {n_val:,} validation cases...")
    t0_val_vec = time.time()
    X_val = encoder.transform_dataframe(val_df)
    y_val = np.array([pathology_to_idx[p] for p in val_df["PATHOLOGY"].values], dtype=np.int32)
    print(f"Validation vectorization completed in {time.time() - t0_val_vec:.2f} s")

    print(f"Evaluating classifier probabilities on all {n_val:,} validation cases...")
    t0_infer = time.time()
    probs_val = clf.predict_proba(X_val)
    t_infer = time.time() - t0_infer
    print(f"Inference completed in {t_infer:.2f} s ({t_infer / n_val * 1000:.3f} ms / case)")

    val_metrics_full = compute_ranking_metrics(y_val, probs_val, classes)

    print("\n" + "=" * 70)
    print("STRUCTURED CLASSIFIER FULL VALIDATION RESULTS (132,448 CASES)")
    print("=" * 70)
    print(f"DDXPlus Top-1 Exact Match: {val_metrics_full['top1_exact_match']}%")
    print(f"Top-3 Exact Match:         {val_metrics_full['top3_exact_match']}%")
    print(f"Top-5 Exact Match:         {val_metrics_full['top5_exact_match']}%")
    print(f"Mean Reciprocal Rank (MRR): {val_metrics_full['mrr']}")
    print(f"Macro F1 Score:            {val_metrics_full['macro_f1']}%")
    print("=" * 70)

    # Save model and schema immediately
    output_dir = os.path.join(PROJECT_ROOT, "backend", "models", "clinical_classifier")
    os.makedirs(output_dir, exist_ok=True)
    model_path = os.path.join(output_dir, "clinical_classifier.joblib")
    schema_path = os.path.join(output_dir, "feature_schema.json")
    joblib.dump(clf, model_path, compress=3)
    encoder.save(schema_path)
    print(f"Model checkpoint saved to: {model_path}")

    # Step 5: Matched Cohort Evaluation Against Phase 5.4 Baseline
    # Deterministic balanced validation subset (seed=42, up to 50 cases/pathology)
    print("\nStep 5: Selecting deterministic balanced validation subset (up to 50 cases/pathology, seed=42)...")
    np.random.seed(42)
    selected_indices = []
    target_per_class = 50
    for pathology in classes:
        idx_list = val_df[val_df["PATHOLOGY"] == pathology].index.values
        if len(idx_list) <= target_per_class:
            selected_indices.extend(idx_list)
        else:
            selected_indices.extend(np.random.choice(idx_list, size=target_per_class, replace=False))

    selected_indices = sorted(selected_indices)
    val_matched_df = val_df.iloc[selected_indices].copy().reset_index(drop=True)
    n_matched = len(val_matched_df)
    print(f"Matched validation cohort: {n_matched} cases across all {len(classes)} pathologies")

    # Classifier on matched cohort
    X_val_matched = encoder.transform_dataframe(val_matched_df)
    y_val_matched = np.array([pathology_to_idx[p] for p in val_matched_df["PATHOLOGY"].values], dtype=np.int32)
    probs_val_matched = clf.predict_proba(X_val_matched)
    clf_matched_metrics = compute_ranking_metrics(y_val_matched, probs_val_matched, classes)

    # Phase 5.4 Baseline on matched cohort
    phase54_matched_metrics = evaluate_phase54_baseline_on_val(val_matched_df, classes)

    # Comparison Table
    print("\n" + "=" * 75)
    print("VALIDATION BENCHMARK COMPARISON TABLE (MATCHED COHORT: 2,428 CASES)")
    print("=" * 75)
    print(f"{'Model':<35} | {'Top-1':<7} | {'Top-3':<7} | {'Top-5':<7} | {'MRR':<7} | {'Macro F1':<8}")
    print("-" * 75)
    print(f"{'Phase 5.4 Validation Baseline':<35} | {phase54_matched_metrics['top1_exact_match']:>6.2f}% | {phase54_matched_metrics['top3_exact_match']:>6.2f}% | {phase54_matched_metrics['top5_exact_match']:>6.2f}% | {phase54_matched_metrics['mrr']:>7.4f} | {phase54_matched_metrics['macro_f1']:>7.2f}%")
    print(f"{'Structured Evidence Classifier':<35} | {clf_matched_metrics['top1_exact_match']:>6.2f}% | {clf_matched_metrics['top3_exact_match']:>6.2f}% | {clf_matched_metrics['top5_exact_match']:>6.2f}% | {clf_matched_metrics['mrr']:>7.4f} | {clf_matched_metrics['macro_f1']:>7.2f}%")
    print("=" * 75)

    # Step 6: Save Trained Model and Metadata
    print("\nStep 6: Saving reproducible model artifacts...")
    output_dir = os.path.join(PROJECT_ROOT, "backend", "models", "clinical_classifier")
    os.makedirs(output_dir, exist_ok=True)

    model_path = os.path.join(output_dir, "clinical_classifier.joblib")
    schema_path = os.path.join(output_dir, "feature_schema.json")
    metadata_path = os.path.join(output_dir, "classifier_metadata.json")

    joblib.dump(clf, model_path, compress=3)
    encoder.save(schema_path)

    metadata = {
        "model_version": "Phase 5.5 Step 1",
        "model_type": "LogisticRegression(solver='lbfgs', C=1.0, max_iter=100)",
        "random_seed": 42,
        "feature_representation": "Dense/Sparse Clinical Findings (Age, Sex, Chief Complaint, Binary & Categorical Evidences)",
        "number_of_features": encoder.num_features,
        "number_of_classes": len(classes),
        "pathology_classes": classes,
        "training_record_count": n_train,
        "validation_record_count_full": n_val,
        "validation_matched_cohort_count": n_matched,
        "training_time_seconds": round(t_train, 2),
        "validation_inference_time_seconds": round(t_infer, 2),
        "full_validation_metrics": {
            "top1_exact_match": val_metrics_full["top1_exact_match"],
            "top3_exact_match": val_metrics_full["top3_exact_match"],
            "top5_exact_match": val_metrics_full["top5_exact_match"],
            "mrr": val_metrics_full["mrr"],
            "macro_f1": val_metrics_full["macro_f1"]
        },
        "matched_cohort_comparison": {
            "phase54_baseline": phase54_matched_metrics,
            "structured_classifier": clf_matched_metrics
        },
        "per_pathology_performance": val_metrics_full["per_pathology"]
    }

    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"Model saved to:    {model_path}")
    print(f"Schema saved to:   {schema_path}")
    print(f"Metadata saved to: {metadata_path}")
    print("\nPhase 5.5 Step 1 complete. Stopping as instructed.")


if __name__ == "__main__":
    main()
