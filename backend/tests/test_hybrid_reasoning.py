"""
Unit tests for Phase 5.5 Structured Classifier Adapter and Hybrid Reasoning.
Strictly tests without accessing test.csv.
"""

import os
import pytest
from backend.models.clinical_classifier.classifier_adapter import StructuredClassifierAdapter
from backend.llm.reasoning import ClinicalReasoningSystem

def test_classifier_adapter_initialization():
    adapter = StructuredClassifierAdapter()
    assert adapter.clf is not None
    assert adapter.num_features == 1198 or adapter.encoder.num_features == 1198
    assert len(adapter.classes) == 49

def test_classifier_adapter_prediction_and_sparsity():
    adapter = StructuredClassifierAdapter()
    
    # Test sparse input (only age, sex, 1 symptom)
    res_sparse = adapter.predict_probabilities(
        age=45,
        sex="M",
        symptoms=["Cough"]
    )
    assert "probabilities" in res_sparse
    assert len(res_sparse["probabilities"]) == 49
    assert res_sparse["is_sparse"] is True
    assert res_sparse["features_populated"] <= 4
    assert res_sparse["sparsity_ratio"] <= 0.3
    
    # Test dense structured input
    res_dense = adapter.predict_probabilities(
        age=45,
        sex="M",
        initial_evidence="E_91",
        evidences=["E_91", "E_53", "E_55_@_V_130", "E_77", "E_181", "E_201", "E_94", "E_50", "E_124", "E_183"]
    )
    assert res_dense["is_sparse"] is False
    assert res_dense["features_populated"] >= 10
    assert res_dense["sparsity_ratio"] == 1.0

def test_hybrid_scoring_graceful_sparsity():
    adapter = StructuredClassifierAdapter()
    # Mock retriever and graph objects
    class MockRetriever:
        pass
    class MockGraph:
        pass
        
    reasoner = ClinicalReasoningSystem(MockRetriever(), MockGraph(), classifier_adapter=adapter)
    assert reasoner.classifier_adapter is not None
