import os
import sys
import json

# Ensure project root is in python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.rag.retriever import ClinicalCaseRetriever

def print_result_case(rank: int, case: dict):
    """
    Helper function to print retrieved clinical cases nicely.
    """
    print(f"\n[Rank {rank}] Similarity Score: {case['similarity_score']:.4f}")
    print(f"Case ID: {case['case_id']} | Diagnosis (GT): {case['ground_truth']}")
    print(f"Demographics: Age {case['demographics']['age']} | Sex {case['demographics']['sex']}")
    
    # Print first few symptoms
    symptoms = [s['question'] for s in case['symptoms'] if s['value'] == 'Yes'][:5]
    print(f"Key Symptoms: {', '.join(symptoms)}")
    
    # Print clinical narrative truncated
    narr = case['clinical_narrative']
    truncated_narr = (narr[:150] + '...') if len(narr) > 150 else narr
    print(f"Clinical Note: {truncated_narr}")

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    
    index_dir = os.path.join(project_root, "backend", "rag", "faiss_index")
    # Clean up output dir path
    if not os.path.exists(os.path.join(project_root, "backend")):
        index_dir = os.path.join(project_root, "rag", "faiss_index")
        
    print("--- RAG Retrieval Verification Test ---")
    print(f"Loading FAISS index from: {index_dir}")
    
    if not os.path.exists(index_dir):
        print(f"Error: FAISS index directory not found at {index_dir}.")
        print("Please compile the index first by running backend/scripts/build_vector_store.py.")
        sys.exit(1)
        
    # Instantiate retriever (loads BioClinicalBERT and FAISS index)
    retriever = ClinicalCaseRetriever(index_dir=index_dir)
    
    # Test Queries
    queries = [
        "patient with chest pain and cough",
        "49 year old female with fever, cough and breathing difficulty"
    ]
    
    for query in queries:
        print("\n" + "="*60)
        print(f"QUERY: '{query}'")
        print("="*60)
        
        results = retriever.retrieve_similar_cases(query, top_k=5)
        
        # Verification assertions
        assert len(results) == 5, f"Expected 5 results, got {len(results)}"
        
        for idx, result in enumerate(results, start=1):
            assert "similarity_score" in result, "Missing similarity score"
            assert "ground_truth" in result, "Missing diagnosis ground truth"
            assert "clinical_narrative" in result, "Missing clinical narrative"
            
            # Since vectors are L2-normalized, inner product similarity scores should lie in [-1, 1]
            score = result["similarity_score"]
            assert -1.0 <= score <= 1.0, f"Similarity score {score} out of bounds [-1, 1]"
            
            print_result_case(idx, result)

if __name__ == "__main__":
    main()
