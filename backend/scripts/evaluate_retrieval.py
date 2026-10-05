import os
import sys
from collections import Counter

# Ensure project root is in python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.rag.retriever import ClinicalCaseRetriever
from backend.knowledge_graph.graph_loader import load_medical_graph
from backend.knowledge_graph.graph_queries import get_disease_explanation
from backend.app.data.normalizer import normalize_symptom_list
from backend.llm.reasoning import ClinicalReasoningSystem

def evaluate_retrieval_cases():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    
    index_dir = os.path.join(project_root, "backend", "rag", "faiss_index")
    if not os.path.exists(index_dir):
        index_dir = os.path.join(project_root, "rag", "faiss_index")
        
    graph_path = os.path.join(project_root, "backend", "knowledge_graph", "medical_graph.pkl")
    if not os.path.exists(graph_path):
        graph_path = os.path.join(project_root, "knowledge_graph", "medical_graph.pkl")
    
    print("==================================================")
    print("=== PHASE 5.4 RETRIEVAL & HYBRID SCORING EVALUATION ===")
    print("==================================================")
    print(f"Loading FAISS index from: {index_dir}")
    print(f"Loading Knowledge Graph from: {graph_path}\n")
    
    retriever = ClinicalCaseRetriever(index_dir)
    graph = load_medical_graph(graph_path)
    
    system = ClinicalReasoningSystem(retriever, graph)
    
    eval_test_cases = [
        {"name": "Test Case 1: Cold + Cough", "age": 35, "sex": "F", "symptoms": ["Cold", "Cough"]},
        {"name": "Test Case 2: Fever + Cough", "age": 40, "sex": "M", "symptoms": ["Fever", "Cough"]},
        {"name": "Test Case 3: Fever + Cough + Breathing difficulty", "age": 49, "sex": "F", "symptoms": ["Fever", "Cough", "Breathing difficulty"]},
        {"name": "Test Case 4: Chest pain + Cough", "age": 52, "sex": "M", "symptoms": ["Chest pain", "Cough"]},
        {"name": "Test Case 5: Cough + Wheezing", "age": 28, "sex": "F", "symptoms": ["Cough", "Wheezing"]},
    ]
    
    for case_data in eval_test_cases:
        print(f"\n--------------------------------------------------")
        print(f"EVALUATION: {case_data['name']}")
        print(f"Input: Age={case_data['age']}, Sex={case_data['sex']}, Symptoms={case_data['symptoms']}")
        print(f"--------------------------------------------------")
        
        # 1. Symptom Normalization
        norm_syms = normalize_symptom_list(case_data['symptoms'])
        print(f"Normalized Symptoms: {norm_syms}")
        
        # 2. FAISS Top-25 Retrieval
        gender_word = "male" if case_data['sex'] == "M" else "female"
        query_text = f"{case_data['age']} year old {gender_word} with {', '.join(norm_syms)}"
        cases_25 = retriever.retrieve_similar_cases(query_text, top_k=25)
        
        # Count pathology distribution in Top 25 FAISS cases
        path_counts = Counter([c["ground_truth"] for c in cases_25])
        print(f"\n[FAISS Top 25 Pathology Distribution]:")
        for dx, count in path_counts.most_common(6):
            print(f"  • {dx}: {count} cases ({count/len(cases_25)*100:.1f}%)")
            
        # Top 5 similarity scores
        print(f"\n[Top 5 FAISS Similarity Scores]:")
        for i, c in enumerate(cases_25[:5]):
            print(f"  #{i+1} [{c['similarity_score']*100:.1f}% Match] {c['ground_truth']}")
            
        # 3. Knowledge Graph Evidence & Hybrid Scoring evaluation
        print(f"\n[Candidate Ranking & Knowledge Graph Evidence]:")
        candidate_pool = set(path_counts.keys())
        for case in cases_25:
            for diff_item in case.get("differential", []):
                if isinstance(diff_item, dict) and "pathology" in diff_item:
                    candidate_pool.add(diff_item["pathology"])
        for sym in norm_syms:
            if sym in system.graph:
                for d in system.graph.predecessors(sym):
                    candidate_pool.add(d)
                
        scored_candidates = system.score_and_rank_candidates(norm_syms, cases_25, candidate_pool)
        
        for idx, item in enumerate(scored_candidates[:4]):
            kg_info = item.get("kg_info", {})
            print(f"  Rank #{idx+1}: {item['disease']} (Hybrid Score: {item['hybrid_score']:.3f})")
            print(f"    - KG Matched Symptoms: {kg_info.get('matched_symptoms', [])}")
            print(f"    - FAISS Cases Found: {item['faiss_count']}/25")
            print(f"    - Unmatched Symptoms to watch: {kg_info.get('unmatched_symptoms', [])[:3]}")
            
        case_label = case_data['name'].partition(': ')[2] if ': ' in case_data['name'] else case_data['name']
        tb_rank = next((i+1 for i, s in enumerate(scored_candidates) if s["disease"] == "Tuberculosis"), None)
        top_dx = scored_candidates[0]["disease"]
        print(f"\n  [{case_label} Audit Verification]: Top candidate is '{top_dx}'. Tuberculosis rank: #{tb_rank}")

if __name__ == "__main__":
    evaluate_retrieval_cases()
