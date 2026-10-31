"""
Comprehensive Matched Cohort Evaluation (2,428 cases from validate.csv).
DO NOT ACCESS test.csv.
Computes:
- Top-1, Top-3, Top-5 Exact Match
- MRR
- Macro F1
- FAISS Recall@5, @10, @25
- Candidate Recall@5
- Differential Recall, Precision, F1
for:
A. Phase 5.4 Baseline
B. Structured Classifier Alone
C. Hybrid System (Balanced Weights)
D. Calibrated Hybrid System (T=0.7698)
"""

import os
import sys
import json
import time
import numpy as np
import pandas as pd
from collections import Counter
from sklearn.metrics import classification_report

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from backend.rag.retriever import ClinicalCaseRetriever
from backend.knowledge_graph.graph_loader import load_medical_graph
from backend.knowledge_graph.graph_queries import get_related_diseases
from backend.app.data.normalizer import normalize_symptom_list
from backend.models.clinical_classifier.classifier_adapter import StructuredClassifierAdapter
from backend.app.data.parser import PatientCase
from backend.app.data.translator import ClinicalTranslator
from backend.llm.reasoning import ClinicalReasoningSystem

DATA_DIR = os.path.join(PROJECT_ROOT, "datasets", "ddxplus")
VAL_PATH = os.path.join(DATA_DIR, "validate.csv")
CONDITIONS_JSON = os.path.join(DATA_DIR, "release_conditions.json")
EVIDENCES_JSON = os.path.join(DATA_DIR, "release_evidences.json")
INDEX_DIR = os.path.join(PROJECT_ROOT, "backend", "rag", "faiss_index")
GRAPH_PATH = os.path.join(PROJECT_ROOT, "backend", "knowledge_graph", "medical_graph.pkl")

print("Initializing systems...")
retriever = ClinicalCaseRetriever(INDEX_DIR)
graph = load_medical_graph(GRAPH_PATH)
adapter_raw = StructuredClassifierAdapter(temperature=1.0)
adapter_cal = StructuredClassifierAdapter(temperature=0.7698)
reasoning_system = ClinicalReasoningSystem(retriever, graph, classifier_adapter=adapter_raw)

with open(CONDITIONS_JSON, "r", encoding="utf-8") as f:
    conditions_meta = json.load(f)
with open(EVIDENCES_JSON, "r", encoding="utf-8") as f:
    evidences_meta = json.load(f)

classes = sorted(conditions_meta.keys())
translator = ClinicalTranslator(evidences_meta, conditions_meta)

print("Selecting matched validation cohort (2,428 cases, seed=42)...")
df_val = pd.read_csv(VAL_PATH, nrows=60000)
np.random.seed(42)
selected_indices = []
for p in classes:
    idx_list = df_val[df_val["PATHOLOGY"] == p].index.values
    if len(idx_list) <= 50:
        selected_indices.extend(idx_list)
    else:
        selected_indices.extend(np.random.choice(idx_list, size=50, replace=False))
selected_indices = sorted(selected_indices)
print(f"Total matched validation cases: {len(selected_indices)}")

# Pre-extract cases
print("Extracting case representations...")
cases_data = []
for idx in selected_indices:
    row = df_val.iloc[idx]
    case = PatientCase(
        age=int(row["AGE"]),
        sex=str(row["SEX"]),
        pathology=str(row["PATHOLOGY"]),
        evidences=row["EVIDENCES"],
        differential_diagnosis=row["DIFFERENTIAL_DIAGNOSIS"],
        initial_evidence=str(row["INITIAL_EVIDENCE"])
    )
    translated = translator.translate_case(case)
    gt = translated["ground_truth"]
    
    extracted_symptoms = []
    for s in translated["symptoms"]:
        val = s.get("value")
        q = s.get("question", "").replace("Do you have ", "").replace("Have you ", "").replace("?", "").strip()
        if s.get("data_type") == "B" and val == "Yes":
            extracted_symptoms.append(q)
        elif s.get("data_type") != "B" and val not in ("No", "Not Applicable"):
            extracted_symptoms.append(q)
    if not extracted_symptoms and translated.get("initial_evidence"):
        init_q = translated["initial_evidence"]["question"].replace("Do you have ", "").replace("Have you ", "").replace("?", "").strip()
        extracted_symptoms.append(init_q)
        
    norm_s = normalize_symptom_list(extracted_symptoms) or extracted_symptoms
    gender_word = "male" if case.sex.upper() == "M" else "female"
    q_text = f"{case.age} year old {gender_word} with {', '.join(norm_s)}"
    
    # Differential targets
    gt_diff_pathologies = {item.pathology.lower() for item in case.differential_diagnosis}
    
    cases_data.append({
        "case": case,
        "gt": gt,
        "norm_s": norm_s,
        "q_text": q_text,
        "gt_diff_pathologies": gt_diff_pathologies
    })

print(f"Batch encoding {len(cases_data)} clinical queries...")
all_queries = [c["q_text"] for c in cases_data]
all_embeddings = retriever.encoder.encode(all_queries, batch_size=32, normalize=True)

print("Running evaluation across all 4 modes...")
# Metrics accumulators
modes = ["A_baseline", "B_struct_alone", "C_hybrid", "D_calibrated_hybrid"]
stats = {m: {
    "top1": 0, "top3": 0, "top5": 0, "rr_sum": 0.0,
    "y_true": [], "y_pred": [],
    "cand_recall_5": 0,
    "diff_rec_sum": 0.0, "diff_prec_sum": 0.0, "diff_f1_sum": 0.0
} for m in modes}

faiss_rec_5 = 0
faiss_rec_10 = 0
faiss_rec_25 = 0

t_start = time.time()
n_cases = len(cases_data)

for i in range(n_cases):
    c_info = cases_data[i]
    case = c_info["case"]
    gt = c_info["gt"]
    norm_s = c_info["norm_s"]
    gt_diff = c_info["gt_diff_pathologies"]
    q_emb = all_embeddings[i:i+1]
    
    # 1. FAISS Search
    retrieved_25 = retriever.vector_store.search(q_emb, top_k=25)
    
    # FAISS recalls
    f_gts = [r.get("ground_truth", "").lower() for r in retrieved_25]
    if gt.lower() in f_gts[:5]: faiss_rec_5 += 1
    if gt.lower() in f_gts[:10]: faiss_rec_10 += 1
    if gt.lower() in f_gts[:25]: faiss_rec_25 += 1
    
    # 2. Classifier Raw & Calibrated
    clf_res_raw = adapter_raw.predict_probabilities(
        age=case.age, sex=case.sex,
        initial_evidence=case.initial_evidence,
        evidences=case.evidences
    )
    clf_res_cal = adapter_cal.predict_probabilities(
        age=case.age, sex=case.sex,
        initial_evidence=case.initial_evidence,
        evidences=case.evidences
    )
    
    # Candidate pool for Phase 5.4 baseline
    pool_54 = set()
    for r in retrieved_25:
        if "ground_truth" in r: pool_54.add(r["ground_truth"])
        for d in r.get("differential", []):
            if isinstance(d, dict) and "pathology" in d: pool_54.add(d["pathology"])
    for s in norm_s:
        for d in get_related_diseases(graph, s): pool_54.add(d)
        
    # Candidate pool for Hybrid (includes classifier top 10)
    pool_hybrid = set(pool_54)
    for d, p in clf_res_raw["top_predictions"][:10]:
        if p > 0.001: pool_hybrid.add(d)
        
    # Mode A: Baseline (no classifier)
    scored_a = reasoning_system.score_and_rank_candidates(
        norm_s, retrieved_25, pool_54, classifier_probs=None
    )
    ranked_a = [c["disease"] for c in scored_a]
    
    # Mode B: Structured Classifier Alone
    ranked_b = [p[0] for p in clf_res_raw["top_predictions"]]
    
    # Mode C: Hybrid System
    scored_c = reasoning_system.score_and_rank_candidates(
        norm_s, retrieved_25, pool_hybrid,
        classifier_probs=clf_res_raw["probabilities"],
        sparsity_ratio=clf_res_raw["sparsity_ratio"],
        features_populated=clf_res_raw["features_populated"]
    )
    ranked_c = [c["disease"] for c in scored_c]
    
    # Mode D: Calibrated Hybrid System
    scored_d = reasoning_system.score_and_rank_candidates(
        norm_s, retrieved_25, pool_hybrid,
        classifier_probs=clf_res_cal["probabilities"],
        sparsity_ratio=clf_res_cal["sparsity_ratio"],
        features_populated=clf_res_cal["features_populated"]
    )
    ranked_d = [c["disease"] for c in scored_d]
    
    ranked_modes = {
        "A_baseline": ranked_a,
        "B_struct_alone": ranked_b,
        "C_hybrid": ranked_c,
        "D_calibrated_hybrid": ranked_d
    }
    
    for m in modes:
        ranked = ranked_modes[m]
        stats[m]["y_true"].append(gt)
        top1_p = ranked[0] if ranked else ""
        stats[m]["y_pred"].append(top1_p)
        
        # Check ranks
        matches = [idx for idx, d in enumerate(ranked) if d.lower() == gt.lower()]
        if matches:
            rk = matches[0] + 1
            stats[m]["rr_sum"] += 1.0 / rk
            if rk == 1: stats[m]["top1"] += 1
            if rk <= 3: stats[m]["top3"] += 1
            if rk <= 5:
                stats[m]["top5"] += 1
                stats[m]["cand_recall_5"] += 1
                
        # Differential metrics at Top-5
        top5_preds = set(d.lower() for d in ranked[:5])
        tp = len(top5_preds.intersection(gt_diff))
        rec = tp / len(gt_diff) if gt_diff else 0.0
        prec = tp / len(top5_preds) if top5_preds else 0.0
        f1 = (2 * prec * rec) / (prec + rec) if (prec + rec) > 0 else 0.0
        stats[m]["diff_rec_sum"] += rec
        stats[m]["diff_prec_sum"] += prec
        stats[m]["diff_f1_sum"] += f1

print(f"\nEvaluation of {n_cases} cases completed in {time.time() - t_start:.2f} s")

# Compute final summaries
summary_results = {}
for m in modes:
    st = stats[m]
    rep = classification_report(st["y_true"], st["y_pred"], target_names=classes, output_dict=True, zero_division=0)
    macro_f1 = rep["macro avg"]["f1-score"] * 100.0
    summary_results[m] = {
        "top1": round(st["top1"] / n_cases * 100.0, 2),
        "top3": round(st["top3"] / n_cases * 100.0, 2),
        "top5": round(st["top5"] / n_cases * 100.0, 2),
        "mrr": round(st["rr_sum"] / n_cases, 4),
        "macro_f1": round(macro_f1, 2),
        "cand_recall_5": round(st["cand_recall_5"] / n_cases * 100.0, 2),
        "diff_recall": round(st["diff_rec_sum"] / n_cases * 100.0, 2),
        "diff_prec": round(st["diff_prec_sum"] / n_cases * 100.0, 2),
        "diff_f1": round(st["diff_f1_sum"] / n_cases * 100.0, 2),
    }

faiss_rec_5_pct = round(faiss_rec_5 / n_cases * 100.0, 2)
faiss_rec_10_pct = round(faiss_rec_10 / n_cases * 100.0, 2)
faiss_rec_25_pct = round(faiss_rec_25 / n_cases * 100.0, 2)

print("\n" + "=" * 90)
print(f"{'Mode':<32} | {'Top-1':<7} | {'Top-3':<7} | {'Top-5':<7} | {'MRR':<7} | {'Macro F1':<8}")
print("=" * 90)
for m in modes:
    r = summary_results[m]
    print(f"{m:<32} | {r['top1']:>6.2f}% | {r['top3']:>6.2f}% | {r['top5']:>6.2f}% | {r['mrr']:>7.4f} | {r['macro_f1']:>7.2f}%")
print("=" * 90)

print(f"\nFAISS Recall Metrics:")
print(f"  FAISS Recall@5:  {faiss_rec_5_pct}%")
print(f"  FAISS Recall@10: {faiss_rec_10_pct}%")
print(f"  FAISS Recall@25: {faiss_rec_25_pct}%")

print(f"\nDifferential Metrics Comparison (Top-5):")
for m in modes:
    r = summary_results[m]
    print(f"  {m:<25}: DDR@5 = {r['diff_recall']:>5.2f}%, DDP@5 = {r['diff_prec']:>5.2f}%, DDF1@5 = {r['diff_f1']:>5.2f}%")

# Save evaluation output
out_file = os.path.join(PROJECT_ROOT, "backend", "models", "clinical_classifier", "matched_cohort_hybrid_results.json")
with open(out_file, "w", encoding="utf-8") as f:
    json.dump({
        "sample_size": n_cases,
        "modes": summary_results,
        "faiss_recalls": {
            "recall_at_5": faiss_rec_5_pct,
            "recall_at_10": faiss_rec_10_pct,
            "recall_at_25": faiss_rec_25_pct
        }
    }, f, indent=2)
print(f"\nSaved results to {out_file}")
