import os
import sys

# Ensure project root is in python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.rag.embeddings import BioClinicalBERTEncoder
from backend.rag.vector_store import ClinicalVectorStore
from backend.rag.retriever import ClinicalCaseRetriever
from backend.knowledge_graph.graph_loader import load_medical_graph
from backend.llm.reasoning import ClinicalReasoningSystem

def safe_print(text: str):
    """Print unicode text safely on Windows consoles by replacing unencodable characters."""
    if not text:
        return
    try:
        print(text)
    except UnicodeEncodeError:
        encoding = sys.stdout.encoding or 'utf-8'
        print(text.encode(encoding, errors='replace').decode(encoding))

def print_structured_result(query_id: int, query: str, res: dict):
    """
    Format and print the JSON clinical reasoning response.
    """
    safe_print("\n" + "=" * 60)
    safe_print(f"TEST QUERY {query_id}: '{query}'")
    safe_print("=" * 60)
    
    safe_print("\n--- 1. Possible Conditions ---")
    if res.get("possible_conditions"):
        for idx, cond in enumerate(res["possible_conditions"], 1):
            safe_print(f"  [{idx}] Condition: {cond.get('condition')}")
            safe_print(f"      Supporting Evidence: {', '.join(cond.get('supporting_evidence', []))}")
            safe_print(f"      Similar RAG Cases Found: {cond.get('similar_cases_found')}")
    else:
        safe_print("  None listed.")
        
    safe_print("\n--- 2. Alternative Conditions ---")
    safe_print(f"  {', '.join(res.get('alternative_conditions', []))}")
    
    safe_print("\n--- 3. Knowledge Graph Verification Support ---")
    for idx, support in enumerate(res.get("knowledge_graph_support", []), 1):
        safe_print(f"  - {support}")
        
    safe_print("\n--- 4. Confidence Level ---")
    safe_print(f"  {res.get('confidence_level')}")
    
    safe_print("\n--- 5. Explainable Clinical Rationale ---")
    safe_print(res.get("explanation"))
    safe_print("=" * 60)

def main():
    print("--- MedAssist AI LLM Reasoning Layer Integration Test ---")
    
    # 1. Initialize RAG retriever
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    index_dir = os.path.join(project_root, "backend", "rag", "faiss_index")
    
    print(f"Loading FAISS database from: {index_dir}")
    retriever = ClinicalCaseRetriever(index_dir)
    print("[OK] FAISS case retriever loaded.")
    
    # 2. Initialize Knowledge Graph
    graph_path = os.path.join(project_root, "backend", "knowledge_graph", "medical_graph.pkl")
    print(f"Loading Medical Knowledge Graph from: {graph_path}")
    graph = load_medical_graph(graph_path)
    print("[OK] NetworkX Knowledge Graph loaded.")
    
    # 3. Instantiate reasoning system
    reasoning_system = ClinicalReasoningSystem(retriever, graph)
    print("[OK] ClinicalReasoningSystem initialized successfully.\n")
    
    # -------------------------------------------------------------------------
    # TEST CASE 1: 49 year old female with fever, cough and breathing difficulty
    # -------------------------------------------------------------------------
    query_1 = "49 year old female with fever, cough and breathing difficulty"
    age_1, sex_1 = 49, "F"
    symptoms_1 = ["Fever", "Cough", "Breathing difficulty"]
    
    print("Running Pipeline for Query 1...")
    res_1 = reasoning_system.generate_clinical_reasoning(
        age=age_1,
        sex=sex_1,
        symptoms=symptoms_1
    )
    
    print_structured_result(1, query_1, res_1)
    
    # Run assertions for Query 1 structure
    assert "possible_conditions" in res_1, "Query 1 output missing possible_conditions."
    assert "confidence_level" in res_1, "Query 1 output missing confidence_level."
    assert "explanation" in res_1, "Query 1 output missing explanation."
    
    # -------------------------------------------------------------------------
    # TEST CASE 2: Patient with chest pain and cough
    # -------------------------------------------------------------------------
    query_2 = "Patient with chest pain and cough"
    age_2, sex_2 = 35, "M"  # Default generic age/sex
    symptoms_2 = ["Pain", "Cough"]  # Mapping raw chest pain/cough to clean graph labels
    
    print("\nRunning Pipeline for Query 2...")
    res_2 = reasoning_system.generate_clinical_reasoning(
        age=age_2,
        sex=sex_2,
        symptoms=symptoms_2
    )
    
    print_structured_result(2, query_2, res_2)
    
    # Run assertions for Query 2 structure
    assert "possible_conditions" in res_2, "Query 2 output missing possible_conditions."
    assert "confidence_level" in res_2, "Query 2 output missing confidence_level."
    assert "explanation" in res_2, "Query 2 output missing explanation."
    
    print("\n[OK] ALL PHASE 4 LLM REASONING LAYER INTEGRATION TESTS PASSED!")

if __name__ == "__main__":
    main()
