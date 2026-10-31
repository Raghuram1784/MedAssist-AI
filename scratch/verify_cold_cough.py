"""
Verify qualitative behavior for Cold + Cough presentation on the frozen Phase 5.5 Hybrid system.
Checks that Tuberculosis is prevented from dominating when only limited non-specific evidence is presented.
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

def verify_cold_cough():
    index_dir = os.path.join(PROJECT_ROOT, "backend", "rag", "faiss_index")
    graph_path = os.path.join(PROJECT_ROOT, "backend", "knowledge_graph", "medical_graph.pkl")

    retriever = ClinicalCaseRetriever(index_dir)
    graph = load_medical_graph(graph_path)
    reasoner = ClinicalReasoningSystem(retriever, graph)

    syms = ["Cold", "Cough"]
    norm_syms = normalize_symptom_list(syms)
    
    # Predict structured probabilities with limited evidence
    clf_res = reasoner.classifier_adapter.predict_probabilities(age=40, sex="M", symptoms=norm_syms)
    
    joined_syms = ", ".join(norm_syms)
    q = f"40 year old male with {joined_syms}"
    cases = retriever.retrieve_similar_cases(q, top_k=25)
    
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
    
    print("\n==================================================")
    print("=== COLD + COUGH QUALITATIVE VERIFICATION ===")
    print("==================================================")
    print(f"Presentation: 40yo Male with {syms}")
    print(f"Normalized Symptoms: {norm_syms}")
    print(f"Features Populated: {clf_res['features_populated']} (Sparsity Ratio: {clf_res['sparsity_ratio']:.2f})")
    print("\nTop 10 Ranked Candidates:")
    tb_rank = None
    tb_score = None
    for rank, c in enumerate(scored[:10], 1):
        is_tb = "Tuberculosis" in c['disease']
        mark = " ***" if is_tb else ""
        print(f"  {rank:>2}. {c['disease']:.<42} | Hybrid: {c['hybrid_score']:>5.3f} | Struct Prob: {c['s_struct']:>5.3f} | KG Match: {c['kg_match_ratio']:>4.2f} | FAISS Count: {c['faiss_count']:>2}{mark}")
        if is_tb and tb_rank is None:
            tb_rank = rank
            tb_score = c['hybrid_score']
            
    for rank, c in enumerate(scored[10:], 11):
        if "Tuberculosis" in c['disease'] and tb_rank is None:
            tb_rank = rank
            tb_score = c['hybrid_score']
            print(f"  {rank:>2}. {c['disease']:.<42} | Hybrid: {c['hybrid_score']:>5.3f} | Struct Prob: {c['s_struct']:>5.3f} | KG Match: {c['kg_match_ratio']:>4.2f} | FAISS Count: {c['faiss_count']:>2} ***")
            break
            
    print("-" * 50)
    if tb_rank is None or tb_rank > 5:
        print(f"PASS: Tuberculosis is prevented from dominating! (Rank: {tb_rank or '>10'})")
    else:
        print(f"FAIL: Tuberculosis is ranked at {tb_rank} with score {tb_score}")
    print("==================================================\n")

if __name__ == "__main__":
    verify_cold_cough()
