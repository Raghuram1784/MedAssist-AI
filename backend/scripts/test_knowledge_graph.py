import os
import sys

# Ensure project root is in python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.knowledge_graph.graph_loader import load_medical_graph
from backend.knowledge_graph.graph_queries import (
    get_symptoms_for_disease,
    get_related_diseases,
    get_disease_explanation
)

def run_tests():
    print("--- Medical Knowledge Graph Verification Test ---")
    
    # 1. Load the Graph
    try:
        G = load_medical_graph()
        print("[OK] Graph loaded successfully using graph_loader.")
    except Exception as e:
        print(f"[FAIL] Failed to load graph: {e}")
        sys.exit(1)
        
    # 2. Assert basic counts and types
    num_nodes = G.number_of_nodes()
    num_edges = G.number_of_edges()
    print(f"Graph Nodes Count: {num_nodes}")
    print(f"Graph Edges Count: {num_edges}")
    
    assert num_nodes > 0, "Graph has no nodes."
    assert num_edges > 0, "Graph has no edges."
    
    # 3. Test outgoing query: get_symptoms_for_disease
    disease_query = "Pneumonia"
    symptoms = get_symptoms_for_disease(G, disease_query)
    print(f"\n[Disease Query] Symptoms associated with '{disease_query}':")
    for s in symptoms[:8]:
        print(f"  - {s}")
    if len(symptoms) > 8:
        print(f"  ... and {len(symptoms) - 8} more.")
        
    # Assert standard symptoms are returned
    # (Since E_91 = Fever, E_201 = Cough, E_66 = Breathing difficulty)
    expected_symptoms = ["Fever", "Cough", "Breathing difficulty"]
    for expected in expected_symptoms:
        assert expected in symptoms, f"Expected symptom '{expected}' not found for Pneumonia."
    print("[OK] Symptoms associated with 'Pneumonia' validated successfully.")
    
    # 4. Test incoming query: get_related_diseases
    symptom_query = "Cough"
    diseases = get_related_diseases(G, symptom_query)
    print(f"\n[Symptom Query] Diseases associated with '{symptom_query}':")
    for d in diseases[:8]:
        print(f"  - {d}")
    if len(diseases) > 8:
        print(f"  ... and {len(diseases) - 8} more.")
        
    assert "Pneumonia" in diseases, "Expected 'Pneumonia' to be related to 'Cough'."
    print("[OK] Diseases associated with 'Cough' validated successfully.")
    
    # 5. Test disease explanation generator
    explanation_disease = "Pneumonia"
    query_symptoms = ["Fever", "Cough", "Running nose", "Severe chest pain"]
    explanation_res = get_disease_explanation(G, explanation_disease, query_symptoms)
    
    print(f"\n[Explanation Generator] Querying '{explanation_disease}' with symptoms {query_symptoms}:")
    print(f"ICD-10 Code : {explanation_res['icd10']}")
    print(f"Severity    : {explanation_res['severity']}")
    print(f"Matched     : {explanation_res['matched_symptoms']}")
    print(f"Unmatched   : {explanation_res['unmatched_symptoms'][:4]}")
    print(f"\nExplanation:\n{explanation_res['explanation']}")
    
    assert "matched_symptoms" in explanation_res, "Explanation result missing matched symptoms."
    assert len(explanation_res["matched_symptoms"]) > 0, "Should have matched at least Fever and Cough."
    print("\n[OK] Disease explanation generation validated successfully.")
    
    # 6. Verify Edge Attributes (DiGraph Directionality)
    # Check if edge exists from disease to symptom, and not vice versa
    sample_disease = "Pneumonia"
    sample_symptom = "Fever"
    
    assert G.has_edge(sample_disease, sample_symptom), "Expected directed edge from Disease -> Symptom."
    assert not G.has_edge(sample_symptom, sample_disease), "Should not have directed edge from Symptom -> Disease."
    
    edge_data = G.edges[sample_disease, sample_symptom]
    assert edge_data.get("relation") == "has_symptom", "Edge missing relation label."
    assert edge_data.get("weight") == 1.0, "Edge missing default weight."
    print("[OK] Graph directionality and edge attributes validated successfully.")
    
    print("\n==================================================")
    print("ALL PHASE 3 KNOWLEDGE GRAPH TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
