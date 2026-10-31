"""
Test 5 Clinical Scenarios on Phase 5.5 Hybrid Pipeline.
1. Cold + Cough
2. Fever + Cough
3. Fever + Cough + Breathing difficulty
4. Chest pain + Cough
5. Cough + Wheezing
"""

import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from backend.rag.retriever import ClinicalCaseRetriever
from backend.knowledge_graph.graph_loader import load_medical_graph
from backend.llm.reasoning import ClinicalReasoningSystem
from backend.app.data.normalizer import normalize_symptom_list
from backend.knowledge_graph.graph_queries import get_related_diseases

index_dir = os.path.join(PROJECT_ROOT, "backend", "rag", "faiss_index")
graph_path = os.path.join(PROJECT_ROOT, "backend", "knowledge_graph", "medical_graph.pkl")

print("Initializing retrieval and hybrid reasoning...")
retriever = ClinicalCaseRetriever(index_dir)
graph = load_medical_graph(graph_path)
reasoner = ClinicalReasoningSystem(retriever, graph)

scenarios = [
    ("Cold + Cough", ["Cold", "Cough"]),
    ("Fever + Cough", ["Fever", "Cough"]),
    ("Fever + Cough + Breathing difficulty", ["Fever", "Cough", "Breathing difficulty"]),
    ("Chest pain + Cough", ["Chest pain", "Cough"]),
    ("Cough + Wheezing", ["Cough", "Wheezing"])
]

print("\n=== PHASE 5.5 HYBRID CLINICAL SCENARIOS EVALUATION ===")
for name, syms in scenarios:
    norm_syms = normalize_symptom_list(syms)
    
    # Run structured classifier prediction
    clf_res = reasoner.classifier_adapter.predict_probabilities(age=40, sex="M", symptoms=norm_syms)
    
    joined_syms = ", ".join(norm_syms)
    q = f"40 year old male with {joined_syms}"
    cases = retriever.retrieve_similar_cases(q, top_k=25)
    
    # 4-source candidate pool
    pool = set()
    for d, p in clf_res["top_predictions"][:10]:
        if p > 0.001:
            pool.add(d)
    for c in cases:
        if "ground_truth" in c:
            pool.add(c["ground_truth"])
        for d in c.get("differential", []):
            if isinstance(d, dict) and "pathology" in d:
                pool.add(d["pathology"])
    for s in norm_syms:
        for d in get_related_diseases(graph, s):
            pool.add(d)
        
    scored = reasoner.score_and_rank_candidates(
        normalized_symptoms=norm_syms,
        retrieved_cases_25=cases,
        candidate_pool=pool,
        classifier_probs=clf_res["probabilities"],
        sparsity_ratio=clf_res["sparsity_ratio"],
        features_populated=clf_res["features_populated"]
    )
    
    print(f"\nScenario: {name}")
    print(f"  Populated structured features: {clf_res['features_populated']} (sparsity_ratio: {clf_res['sparsity_ratio']})")
    print("  Top 5 Candidates:")
    for rank, c in enumerate(scored[:5], 1):
        print(f"    {rank}. {c['disease']:.<40} | Hybrid Score: {c['hybrid_score']:>5.3f} | Struct Prob: {c['s_struct']:>5.3f} | FAISS Count: {c['faiss_count']}")
