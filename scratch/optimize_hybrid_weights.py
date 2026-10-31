"""
Comprehensive Weight Optimization on 2,428-Case Matched Validation Cohort (validate.csv).
STRICTLY uses validate.csv. NEVER touches test.csv.

Precomputes candidate evidence features and runs a dense grid search over all hybrid weights:
- W_struct
- W_faiss
- W_kg_match
- W_kg_comp
- W_diff

Evaluates:
- Top-1, Top-3, Top-5 Exact Match
- MRR
- Macro F1 across all 49 pathologies
- Minimum pathology recall
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
from backend.knowledge_graph.graph_queries import get_related_diseases, get_disease_explanation, get_symptoms_for_disease
from backend.app.data.normalizer import normalize_symptom_list
from backend.models.clinical_classifier.classifier_adapter import StructuredClassifierAdapter
from backend.app.data.parser import PatientCase
from backend.app.data.translator import ClinicalTranslator

DATA_DIR = os.path.join(PROJECT_ROOT, "datasets", "ddxplus")
VAL_PATH = os.path.join(DATA_DIR, "validate.csv")
CONDITIONS_JSON = os.path.join(DATA_DIR, "release_conditions.json")
EVIDENCES_JSON = os.path.join(DATA_DIR, "release_evidences.json")
INDEX_DIR = os.path.join(PROJECT_ROOT, "backend", "rag", "faiss_index")
GRAPH_PATH = os.path.join(PROJECT_ROOT, "backend", "knowledge_graph", "medical_graph.pkl")

print("Initializing retrieval, graph, and classifier...")
retriever = ClinicalCaseRetriever(INDEX_DIR)
graph = load_medical_graph(GRAPH_PATH)
adapter = StructuredClassifierAdapter()

with open(CONDITIONS_JSON, "r", encoding="utf-8") as f:
    conditions_meta = json.load(f)
with open(EVIDENCES_JSON, "r", encoding="utf-8") as f:
    evidences_meta = json.load(f)

classes = sorted(conditions_meta.keys())
translator = ClinicalTranslator(evidences_meta, conditions_meta)

SPECIFIC_SEVERE_PATHOLOGIES = {
    "Tuberculosis": ["Coughing up blood", "Weight loss", "Night sweats"],
    "Ebola": ["Coughing up blood", "Unexplained bleeding", "High fever"],
    "Bronchiectasis": ["Cough with colored sputum", "Coughing up blood"],
    "Sarcoidosis": ["Skin lesions", "Granulomas", "Joint pain"],
    "Myasthenia gravis": ["Muscle weakness", "Drooping eyelid", "Double vision"],
    "SLE": ["Butterfly rash", "Joint pain", "Photosensitivity"],
    "Boerhaave": ["Severe chest pain", "Vomiting", "Subcutaneous emphysema"],
}

print("Selecting 2,428 matched validation cases (seed=42)...")
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
cases_info = []
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
    gt_diff = {item.pathology.lower() for item in case.differential_diagnosis}
    
    cases_info.append({
        "case": case,
        "gt": gt,
        "norm_s": norm_s,
        "q_text": q_text,
        "gt_diff": gt_diff
    })

print(f"Batch encoding {len(cases_info)} clinical queries...")
all_queries = [c["q_text"] for c in cases_info]
all_embeddings = retriever.encoder.encode(all_queries, batch_size=32, normalize=True)

print("Precomputing intermediate candidate scores for all 2,428 cases...")
t0 = time.time()
cached_cases = []

for i, c_info in enumerate(cases_info):
    case = c_info["case"]
    gt = c_info["gt"]
    norm_s = c_info["norm_s"]
    q_emb = all_embeddings[i:i+1]
    num_query_symptoms = max(1, len(norm_s))
    
    # 1. FAISS Search
    retrieved_25 = retriever.vector_store.search(q_emb, top_k=25)
    
    # 2. Classifier
    clf_res = adapter.predict_probabilities(
        age=case.age, sex=case.sex,
        initial_evidence=case.initial_evidence,
        evidences=case.evidences
    )
    clf_probs = clf_res["probabilities"]
    sparsity_ratio = clf_res["sparsity_ratio"]
    
    # 3. 4-Source Candidate Discovery
    cand_pool = set()
    for d, p in clf_res["top_predictions"][:10]:
        if p > 0.001: cand_pool.add(d)
    for r in retrieved_25:
        if "ground_truth" in r: cand_pool.add(r["ground_truth"])
        for d in r.get("differential", []):
            if isinstance(d, dict) and "pathology" in d: cand_pool.add(d["pathology"])
    for s in norm_s:
        for d in get_related_diseases(graph, s): cand_pool.add(d)
        
    path_counts = Counter([r["ground_truth"] for r in retrieved_25 if "ground_truth" in r])
    has_any_faiss = any(path_counts.get(c, 0) > 0 for c in path_counts)
    
    candidate_features = []
    for cand in cand_pool:
        # KG features
        kg_info = get_disease_explanation(graph, cand, norm_s)
        matched = kg_info.get("matched_symptoms", [])
        kg_match = len(matched) / num_query_symptoms
        all_s = get_symptoms_for_disease(graph, cand)
        kg_comp = len(matched) / max(1, max(len(matched), len(all_s)))
        
        # FAISS features
        f_sim = 0.0
        f_cnt = 0
        d_prob = 0.0
        for r in retrieved_25:
            sim = r.get("similarity_score", 0.0)
            if r.get("ground_truth", "").lower() == cand.lower():
                f_sim += sim
                f_cnt += 1
            for d in r.get("differential", []):
                if isinstance(d, dict) and d.get("pathology", "").lower() == cand.lower():
                    d_prob += float(d.get("probability", 0.0)) * sim
        f_freq = (f_cnt / len(retrieved_25)) if retrieved_25 else 0.0
        avg_sim = (f_sim / f_cnt) if f_cnt > 0 else 0.0
        s_faiss = (0.6 * f_freq) + (0.4 * avg_sim)
        s_diff = min(1.0, d_prob / max(1, f_cnt if f_cnt > 0 else 1))
        
        # Classifier feature
        s_struct = clf_probs.get(cand, 0.0)
        
        # Multiplier discount
        mult = 1.0
        if f_cnt == 0 and d_prob == 0.0 and has_any_faiss and s_struct < 0.10:
            mult = 0.85
            
        # Distinguishing penalty
        penalty = 0.0
        if cand in SPECIFIC_SEVERE_PATHOLOGIES:
            req = SPECIFIC_SEVERE_PATHOLOGIES[cand]
            has_req = any(req_feat.lower() in [s.lower() for s in norm_s] for req_feat in req)
            if not has_req and num_query_symptoms <= 3:
                penalty = 0.25
                
        candidate_features.append({
            "cand": cand,
            "s_struct": s_struct,
            "kg_match": kg_match,
            "kg_comp": kg_comp,
            "s_faiss": s_faiss,
            "s_diff": s_diff,
            "mult": mult,
            "penalty": penalty,
            "f_cnt": f_cnt,
            "matched_cnt": len(matched)
        })
        
    cached_cases.append({
        "gt": gt,
        "gt_diff": c_info["gt_diff"],
        "sparsity_ratio": sparsity_ratio,
        "candidates": candidate_features
    })

print(f"Precomputed and cached {len(cached_cases)} cases in {time.time() - t0:.2f} s")

# Fast evaluation function
def eval_weight_vector(w_struct, w_faiss, w_kg_match, w_kg_comp, w_diff):
    top1 = 0
    top3 = 0
    top5 = 0
    rr_sum = 0.0
    y_true = []
    y_pred = []
    
    for case_data in cached_cases:
        gt = case_data["gt"]
        sp_ratio = case_data["sparsity_ratio"]
        
        # Redistribution for sparse inputs
        rem = w_struct * (1.0 - sp_ratio)
        eff_kg_match = w_kg_match + rem * 0.50
        eff_kg_comp = w_kg_comp + rem * 0.15
        eff_faiss = w_faiss + rem * 0.25
        eff_diff = w_diff + rem * 0.10
        eff_struct = w_struct * sp_ratio
        
        scored = []
        for feat in case_data["candidates"]:
            cand = feat["cand"]
            raw = (
                (eff_struct * feat["s_struct"])
                + (eff_kg_match * feat["kg_match"])
                + (eff_kg_comp * feat["kg_comp"])
                + (eff_faiss * feat["s_faiss"])
                + (eff_diff * feat["s_diff"])
            )
            score = (raw * feat["mult"]) - feat["penalty"]
            scored.append((cand, score, feat["f_cnt"], feat["matched_cnt"], feat["kg_comp"]))
            
        scored.sort(key=lambda x: (x[1], x[2], x[3], x[4]), reverse=True)
        ranked = [x[0] for x in scored]
        
        y_true.append(gt)
        top1_p = ranked[0] if ranked else ""
        y_pred.append(top1_p)
        
        matches = [idx for idx, d in enumerate(ranked) if d.lower() == gt.lower()]
        if matches:
            rk = matches[0] + 1
            rr_sum += 1.0 / rk
            if rk == 1: top1 += 1
            if rk <= 3: top3 += 1
            if rk <= 5: top5 += 1
            
    n = len(cached_cases)
    rep = classification_report(y_true, y_pred, target_names=classes, output_dict=True, zero_division=0)
    macro_f1 = rep["macro avg"]["f1-score"] * 100.0
    recalls = [rep[cls]["recall"] * 100.0 for cls in classes if cls in rep]
    min_recall = min(recalls) if recalls else 0.0
    
    return {
        "top1": round(top1 / n * 100.0, 2),
        "top3": round(top3 / n * 100.0, 2),
        "top5": round(top5 / n * 100.0, 2),
        "mrr": round(rr_sum / n, 4),
        "macro_f1": round(macro_f1, 2),
        "min_recall": round(min_recall, 2)
    }

print("\nStarting systematic grid search over hybrid weights...")
grid_results = []

# Focused systematic exploration (216 combinations)
for w_s in [0.40, 0.45, 0.50, 0.55, 0.60, 0.65]:
    for w_f in [0.08, 0.12, 0.16]:
        for w_km in [0.10, 0.15, 0.20]:
            for w_kc in [0.04, 0.08]:
                for w_d in [0.04, 0.08]:
                    # Normalize weights to sum to 1.0
                    tot = w_s + w_f + w_km + w_kc + w_d
                    nw_s = round(w_s / tot, 4)
                    nw_f = round(w_f / tot, 4)
                    nw_km = round(w_km / tot, 4)
                    nw_kc = round(w_kc / tot, 4)
                    nw_d = round(w_d / tot, 4)
                    
                    res = eval_weight_vector(nw_s, nw_f, nw_km, nw_kc, nw_d)
                    grid_results.append({
                        "weights": {
                            "w_struct": nw_s,
                            "w_faiss": nw_f,
                            "w_kg_match": nw_km,
                            "w_kg_comp": nw_kc,
                            "w_diff": nw_d
                        },
                        "metrics": res
                    })

print(f"Evaluated {len(grid_results)} distinct weight combinations!")

# Sort by Top-1 desc, then Top-5 desc, then Macro F1 desc
grid_results.sort(
    key=lambda x: (
        x["metrics"]["top1"],
        x["metrics"]["top5"],
        x["metrics"]["macro_f1"],
        x["metrics"]["mrr"]
    ),
    reverse=True
)

print("\n" + "=" * 100)
print(f"{'Rank':<4} | {'Weights (struct, faiss, kg_m, kg_c, diff)':<45} | {'Top-1':<7} | {'Top-3':<7} | {'Top-5':<7} | {'MRR':<7} | {'Macro F1':<8} | {'Min Rec':<7}")
print("=" * 100)

for rank, item in enumerate(grid_results[:10], 1):
    w = item["weights"]
    m = item["metrics"]
    w_str = f"({w['w_struct']:.2f}, {w['w_faiss']:.2f}, {w['w_kg_match']:.2f}, {w['w_kg_comp']:.2f}, {w['w_diff']:.2f})"
    print(f"{rank:<4} | {w_str:<45} | {m['top1']:>6.2f}% | {m['top3']:>6.2f}% | {m['top5']:>6.2f}% | {m['mrr']:>7.4f} | {m['macro_f1']:>7.2f}% | {m['min_recall']:>6.2f}%")
print("=" * 100)

best = grid_results[0]
print(f"\nBest Overall Configuration:")
print(f"  Weights: {best['weights']}")
print(f"  Metrics: {best['metrics']}")

# Also evaluate Phase 5.4 Baseline, Structured Classifier Alone, Current Hybrid, and Optimized Hybrid for direct comparison
print("\n" + "=" * 90)
print("FINAL 4-MODE COMPARISON TABLE ON 2,428 MATCHED VALIDATION COHORT:")
print("=" * 90)

# Mode 1: Phase 5.4 Baseline
res_54 = eval_weight_vector(0.00, 0.30, 0.40, 0.15, 0.15)
# Mode 2: Structured Classifier Alone
res_struct = eval_weight_vector(1.00, 0.00, 0.00, 0.00, 0.00)
# Mode 3: Current Hybrid
res_curr = eval_weight_vector(0.35, 0.20, 0.25, 0.10, 0.10)
# Mode 4: Optimized Hybrid
bw = best["weights"]
res_opt = eval_weight_vector(bw["w_struct"], bw["w_faiss"], bw["w_kg_match"], bw["w_kg_comp"], bw["w_diff"])

comparison_modes = [
    ("1. Phase 5.4 Baseline", res_54),
    ("2. Structured Classifier Alone", res_struct),
    ("3. Current Hybrid", res_curr),
    ("4. Optimized Hybrid", res_opt)
]

print(f"{'Mode':<32} | {'Top-1':<7} | {'Top-3':<7} | {'Top-5':<7} | {'MRR':<7} | {'Macro F1':<8} | {'Min Recall':<10}")
print("-" * 90)
for name, m in comparison_modes:
    print(f"{name:<32} | {m['top1']:>6.2f}% | {m['top3']:>6.2f}% | {m['top5']:>6.2f}% | {m['mrr']:>7.4f} | {m['macro_f1']:>7.2f}% | {m['min_recall']:>9.2f}%")
print("=" * 90)

# Save to json
out_json = os.path.join(PROJECT_ROOT, "backend", "models", "clinical_classifier", "optimized_hybrid_tuning_results.json")
with open(out_json, "w", encoding="utf-8") as f:
    json.dump({
        "cohort_size": len(cached_cases),
        "best_weights": best["weights"],
        "comparison_table": {name: m for name, m in comparison_modes},
        "top_10_grid_configs": grid_results[:10]
    }, f, indent=2)
print(f"\nSaved optimization artifact to: {out_json}")
