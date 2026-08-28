import os
import sys
from fastapi.testclient import TestClient

# Ensure project root is in python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.api.main import app

client = None

def test_health_endpoint():
    """
    Test the API health status endpoint.
    """
    print("\n[Test] Querying GET /health...")
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "MedAssist AI"
    print("[OK] Health endpoint returned healthy status.")

def test_validation_errors():
    """
    Verify that invalid inputs are rejected gracefully with 422 errors.
    """
    print("\n[Test] Testing input validations...")
    
    # 1. Invalid age (> 120)
    response = client.post("/api/analyze", json={
        "age": 150,
        "sex": "F",
        "symptoms": ["Fever"]
    })
    assert response.status_code == 422
    print("[OK] Rejected invalid age (150) successfully.")

    # 2. Invalid sex code
    response = client.post("/api/analyze", json={
        "age": 45,
        "sex": "X",
        "symptoms": ["Fever"]
    })
    assert response.status_code == 422
    print("[OK] Rejected invalid sex code ('X') successfully.")

    # 3. Empty symptoms list
    response = client.post("/api/analyze", json={
        "age": 30,
        "sex": "M",
        "symptoms": []
    })
    assert response.status_code == 422
    print("[OK] Rejected empty symptoms list successfully.")

def test_analyze_case_1():
    """
    Test Case 1: 49 year old female with fever, cough and breathing difficulty.
    """
    print("\n[Test] Running Test Case 1: 49 year old F with Fever, Cough, Breathing difficulty...")
    response = client.post("/api/analyze", json={
        "age": 49,
        "sex": "F",
        "symptoms": ["Fever", "Cough", "Breathing difficulty"],
        "additional_information": "Symptoms started 3 days ago, accompanied by mild fatigue."
    })
    print("STATUS CODE:", response.status_code)
    print("RESPONSE TEXT:", response.text)
    assert response.status_code == 200
    data = response.json()
    
    # Check schema keys
    assert "patient_summary" in data
    assert "possible_conditions" in data
    assert "alternative_conditions" in data
    assert "confidence_level" in data
    assert "clinical_rationale" in data
    assert "knowledge_graph_support" in data
    assert "similar_cases" in data

    # Check value details
    summary = data["patient_summary"]
    assert summary["age"] == 49
    assert summary["sex"] == "F"
    assert "Fever" in summary["symptoms"]

    print("Possible conditions diagnosed:")
    for cond in data["possible_conditions"]:
        print(f"  - {cond['condition']} (Supporting symptoms: {cond['supporting_evidence']}, RAG cases: {cond['similar_cases_found']})")
    
    print(f"Confidence Level: {data['confidence_level']}")
    print(f"Similar Cases Found: {len(data['similar_cases'])}")
    print(f"Knowledge Graph checks loaded: {len(data['knowledge_graph_support'])} conditions mapped.")
    print("[OK] Test Case 1 clinical analysis completed successfully.")

def test_analyze_case_2():
    """
    Test Case 2: 35 year old male with chest pain and cough.
    """
    print("\n[Test] Running Test Case 2: 35 year old M with Chest pain and Cough...")
    response = client.post("/api/analyze", json={
        "age": 35,
        "sex": "M",
        "symptoms": ["Chest pain", "Cough"],
        "additional_information": "Chest pain is sharp, worse on deep inspiration."
    })
    assert response.status_code == 200
    data = response.json()

    # Check schema keys
    assert "patient_summary" in data
    assert "possible_conditions" in data
    assert "confidence_level" in data
    assert "clinical_rationale" in data
    assert "similar_cases" in data

    print("Possible conditions diagnosed:")
    for cond in data["possible_conditions"]:
        print(f"  - {cond['condition']} (Supporting symptoms: {cond['supporting_evidence']}, RAG cases: {cond['similar_cases_found']})")

    print(f"Confidence Level: {data['confidence_level']}")
    print(f"Similar Cases Found: {len(data['similar_cases'])}")
    print("[OK] Test Case 2 clinical analysis completed successfully.")

if __name__ == "__main__":
    print("--- MedAssist AI - Backend API Automation Suite ---")
    with TestClient(app) as active_client:
        client = active_client
        # Execute functions sequentially
        test_health_endpoint()
        test_validation_errors()
        test_analyze_case_1()
        test_analyze_case_2()
        print("\n==================================================")
        print("   ALL FASTAPI BACKEND VERIFICATION TESTS PASSED  ")
        print("==================================================")
