"""
Tune Hybrid Evidence Weights on Validation Dataset (Phase 5.5 Step 2).
Uses ONLY validate.csv. Never accesses test.csv.
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

print("Initializing retriever, graph, and structured classifier adapter...")
retriever = ClinicalCaseRetriever(INDEX_DIR)
graph = load_medical_graph(GRAPH_PATH)
adapter = StructuredClassifierAdapter()

with open(CONDITIONS_JSON, "r", encoding="utf-8") as f:
    conditions_meta = json.load(f)
with open(EVIDENCES_JSON, "r", encoding="utf-8") as f:
    evidences_meta = json.load(f)

classes = sorted(conditions_meta.keys())
translator = ClinicalTranslator(evidences_meta, conditions_meta)

# Load matched validation cohort (2,428 cases)
print("Loading validation dataset...")
df_val = pd.read_csv(VAL_PATH, nrows=50000)
np.random.seed(42)
selected_indices = []
for p in classes:
    idx_list = df_val[df_val["PATHOLOGY"] == p].index.values
    if len(idx_list) <= 50:
        selected_indices.extend(idx_list)
    else:
        selected_indices.extend(np.random.choice(idx_list, size=50, replace=False))
selected_indices = sorted(selected_indices)

# Fast tuning subset of 600 validation cases across all 49 pathologies
sample_indices = selected_indices[:600]
print(f"Precomputing {len(sample_indices)} cases for weight optimization...")

records = []
for idx in sample_indices:
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
    
    # FAISS retrieval
    q_emb = retriever.encoder.encode(q_text, normalize=True)
    retrieved = retriever.vector_store.search(q_emb, top_k=25)
    
    # Structured classifier
    clf_res = adapter.predict_probabilities(
        age=case.age,
        sex=case.sex,
        initial_evidence=case.initial_evidence,
        evidences=case.evidences
    )
    
    records.append({
        "gt": gt,
        "norm_s": norm_s,
        "retrieved": retrieved,
        "clf_probs": clf_res["probabilities"],
        "features_populated": clf_res["features_populated"],
        "sparsity_ratio": clf_res["sparsity_ratio"]
    })

print(f"Precomputed {len(records)} cases. Now testing weight configurations...")

SPECIFIC_SEVERE_PATHOLOGIES = {
    "Tuberculosis": ["Coughing up blood", "Weight loss", "Night sweats"],
    "Ebola": ["Coughing up blood", "Unexplained bleeding", "High fever"],
    "Bronchiectasis": ["Cough with colored sputum", "Coughing up blood"],
    "Sarcoidosis": ["Skin lesions", "Granulomas", "Joint pain"],
    "Myasthenia gravis": ["Muscle weakness", "Drooping eyelid", "Double vision"],
    "SLE": ["Butterfly rash", "Joint pain", "Photosensitivity"],
    "Boerhaave": ["Severe chest pain", "Vomiting", "Subcutaneous emphysema"],
}

def evaluate_weights(w_struct, w_faiss, w_kg, w_diff):
    top1 = 0
    top3 = 0
    top5 = 0
    rr_sum = 0.0
    
    for r in records:
        gt = r["gt"]
        norm_s = r["norm_s"]
        retrieved_25 = r["retrieved"]
        clf_probs = r["clf_probs"]
        sparsity_ratio = r["sparsity_ratio"]
        num_query_symptoms = max(1, len(norm_s))
        
        # Build candidate pool from ALL 4 independent sources
        cand_pool = set()
        # Source A: Structured classifier top-10
        for d, p in sorted(clf_probs.items(), key=lambda x: -x[1])[:10]:
            if p > 0.001:
                cand_pool.add(d)
        # Source B: FAISS Top-25 ground truth
        for c in retrieved_25:
            if "ground_truth" in c:
                cand_pool.add(c["ground_truth"])
        # Source C: Knowledge Graph related diseases
        for s in norm_s:
            for d in get_related_diseases(graph, s):
                cand_pool.add(d)
        # Source D: DDXPlus Differential entries
        for c in retrieved_25:
            for d in c.get("differential", []):
                if isinstance(d, dict) and "pathology" in d:
                    cand_pool.add(d["pathology"])
            
        path_counts = Counter([c["ground_truth"] for c in retrieved_25 if "ground_truth" in c])
        has_any_faiss = any(path_counts.get(c, 0) > 0 for c in path_counts)
        
        scored = []
        for cand in cand_pool:
            # 1. KG Evidence Score
            kg_info = get_disease_explanation(graph, cand, norm_s)
            matched = kg_info.get("matched_symptoms", [])
            kg_match = len(matched) / num_query_symptoms
            all_s = get_symptoms_for_disease(graph, cand)
            kg_comp = len(matched) / max(1, max(len(matched), len(all_s)))
            s_kg = (0.7 * kg_match) + (0.3 * kg_comp)
            
            # 2. FAISS Cohort Evidence
            f_sim = 0.0
            f_cnt = 0
            d_prob = 0.0
            for c in retrieved_25:
                sim = c.get("similarity_score", 0.0)
                if c.get("ground_truth", "").lower() == cand.lower():
                    f_sim += sim
                    f_cnt += 1
                for d in c.get("differential", []):
                    if isinstance(d, dict) and d.get("pathology", "").lower() == cand.lower():
                        d_prob += float(d.get("probability", 0.0)) * sim
            f_freq = (f_cnt / len(retrieved_25)) if retrieved_25 else 0.0
            avg_sim = (f_sim / f_cnt) if f_cnt > 0 else 0.0
            s_faiss = (0.6 * f_freq) + (0.4 * avg_sim)
            s_diff = min(1.0, d_prob / max(1, f_cnt if f_cnt > 0 else 1))
            
            # 3. Structured Classifier Evidence (gated by sparsity)
            s_struct = clf_probs.get(cand, 0.0)
            
            # 4. Zero-FAISS Support Discount (only if no FAISS support and classifier has no confidence)
            mult = 1.0
            if f_cnt == 0 and d_prob == 0.0 and has_any_faiss and s_struct < 0.1:
                mult = 0.85
                
            # 5. Severe Pathology Distinguishing Penalty
            penalty = 0.0
            if cand in SPECIFIC_SEVERE_PATHOLOGIES:
                req = SPECIFIC_SEVERE_PATHOLOGIES[cand]
                has_req = any(req_feat.lower() in [s.lower() for s in norm_s] for req_feat in req)
                if not has_req and num_query_symptoms <= 3:
                    penalty = 0.25
                    
            raw = (w_struct * sparsity_ratio * s_struct) + (w_faiss * s_faiss) + (w_kg * s_kg) + (w_diff * s_diff)
            final_s = (raw * mult) - penalty
            scored.append((cand, final_s, f_cnt))
            
        scored.sort(key=lambda x: (x[1], x[2]), reverse=True)
        ranked = [x[0] for x in scored]
        
        matches = [i for i, d in enumerate(ranked) if d.lower() == gt.lower()]
        if matches:
            rk = matches[0] + 1
            rr_sum += 1.0 / rk
            if rk == 1: top1 += 1
            if rk <= 3: top3 += 1
            if rk <= 5: top5 += 1
            
    n = len(records)
    return {
        "top1": round(top1 / n * 100, 2),
        "top3": round(top3 / n * 100, 2),
        "top5": round(top5 / n * 100, 2),
        "mrr": round(rr_sum / n, 4)
    }

configs = [
    ("Phase 5.4 Baseline (w_struct=0.00)", 0.00, 0.30, 0.55, 0.15),
    ("Conservative Hybrid (w_struct=0.20)", 0.20, 0.25, 0.45, 0.10),
    ("Balanced Hybrid (w_struct=0.35)", 0.35, 0.20, 0.35, 0.10),
    ("Strong Hybrid (w_struct=0.50)", 0.50, 0.20, 0.25, 0.05),
    ("Dominant Hybrid (w_struct=0.65)", 0.65, 0.15, 0.15, 0.05),
    ("Very Dominant (w_struct=0.80)", 0.80, 0.10, 0.10, 0.00),
]

print("\n" + "=" * 80)
print(f"{'Configuration':<40} | {'Top-1':<7} | {'Top-3':<7} | {'Top-5':<7} | {'MRR':<7}")
print("=" * 80)
for name, ws, wf, wk, wd in configs:
    res = evaluate_weights(ws, wf, wk, wd)
    print(f"{name:<40} | {res['top1']:>6.2f}% | {res['top3']:>6.2f}% | {res['top5']:>6.2f}% | {res['mrr']:>7.4f}")
print("=" * 80)
