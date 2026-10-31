"""
Structured Clinical Classifier Adapter (Phase 5.5).

Wraps the pre-trained Multinomial Logistic Regression model and EvidenceEncoder.
Provides:
- Deterministic feature encoding
- Class probability distribution over all 49 DDXPlus pathologies
- Sparse / incomplete evidence safety gating
- Zero leakage of PATHOLOGY or DIFFERENTIAL_DIAGNOSIS
- Zero diagnosis-specific hardcoded heuristics
"""

import os
import json
import joblib
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from scipy.sparse import csr_matrix

from backend.models.clinical_classifier.evidence_encoder import EvidenceEncoder


class StructuredClassifierAdapter:
    def __init__(
        self,
        model_path: Optional[str] = None,
        schema_path: Optional[str] = None,
        conditions_path: Optional[str] = None,
        evidences_path: Optional[str] = None,
        temperature: float = 1.0
    ):
        """
        Initialize the structured clinical evidence classifier adapter.
        """
        pkg_dir = os.path.dirname(os.path.abspath(__file__))
        # pkg_dir is backend/models/clinical_classifier -> project_root is 3 levels up
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(pkg_dir)))
        
        if model_path is None:
            model_path = os.path.join(pkg_dir, "clinical_classifier.joblib")
        if schema_path is None:
            schema_path = os.path.join(pkg_dir, "feature_schema.json")
        if conditions_path is None:
            conditions_path = os.path.join(project_root, "datasets", "ddxplus", "release_conditions.json")
        if evidences_path is None:
            evidences_path = os.path.join(project_root, "datasets", "ddxplus", "release_evidences.json")
            
        self.model_path = model_path
        self.schema_path = schema_path
        self.temperature = float(temperature)
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Trained classifier not found at: {model_path}")
        if not os.path.exists(schema_path):
            raise FileNotFoundError(f"Feature schema not found at: {schema_path}")
            
        # 1. Load trained classifier
        self.clf = joblib.load(model_path)
        
        # 2. Load encoder and feature schema
        self.encoder = EvidenceEncoder()
        self.encoder.load(schema_path)
        
        # 3. Load conditions classes
        with open(conditions_path, "r", encoding="utf-8") as f:
            conditions_data = json.load(f)
        self.classes = sorted(conditions_data.keys())
        self.class_to_idx = {c: i for i, c in enumerate(self.classes)}
        
        # 4. Load evidence metadata for symptom-to-evidence lookup
        self.evidence_metadata: Dict[str, Any] = {}
        self.symptom_to_evidence_id: Dict[str, str] = {}
        if os.path.exists(evidences_path):
            with open(evidences_path, "r", encoding="utf-8") as f:
                self.evidence_metadata = json.load(f)
            self._build_symptom_reverse_map()

    @property
    def num_features(self) -> int:
        return self.encoder.num_features

    def _build_symptom_reverse_map(self):
        """
        Build an objective reverse lookup from canonical symptom labels
        to their exact DDXPlus binary evidence codes.
        Maps symptom names to evidence codes only (NEVER to diagnoses).
        """
        # Common canonical symptom names to binary evidence IDs
        canonical_symptom_evidence = {
            "fever": "E_91",
            "cough": "E_201",
            "breathing difficulty": "E_66",
            "shortness of breath": "E_66",
            "dyspnea": "E_66",
            "pain": "E_53",
            "chest pain": "E_53",
            "coughing up blood": "E_45",
            "cough with colored sputum": "E_77",
            "dizziness / faintness": "E_82",
            "dizziness": "E_82",
            "nausea / vomiting": "E_148",
            "nausea": "E_148",
            "vomiting": "E_148",
            "loss of appetite": "E_161",
            "weight loss": "E_162",
            "acid reflux": "E_173",
            "palpitations": "E_155",
            "chills / shivers": "E_94",
            "chills": "E_94",
            "fatigue": "E_50",
            "headache": "E_124",
            "sore throat": "E_183",
            "wheezing": "E_89",
            "nasal congestion": "E_181",
        }
        for name, ev_id in canonical_symptom_evidence.items():
            if ev_id in self.evidence_metadata:
                self.symptom_to_evidence_id[name.lower()] = ev_id

    def map_symptoms_to_evidence_codes(self, symptoms: List[str]) -> List[str]:
        """
        Map a list of free-text / normalized symptom strings to recognized evidence codes.
        Unrecognized symptoms are omitted (treated as unknown, not negative).
        """
        ev_codes = []
        for s in symptoms:
            cleaned = s.strip().lower()
            if cleaned in self.symptom_to_evidence_id:
                code = self.symptom_to_evidence_id[cleaned]
                if code not in ev_codes:
                    ev_codes.append(code)
        return ev_codes

    def predict_probabilities(
        self,
        age: int,
        sex: str,
        initial_evidence: Optional[str] = None,
        evidences: Optional[List[str]] = None,
        symptoms: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Generate calibrated condition probabilities from structured patient findings.
        
        Args:
            age: Patient age in years.
            sex: Patient sex ('M' or 'F').
            initial_evidence: Optional chief complaint evidence ID.
            evidences: Optional list of structured DDXPlus evidence codes.
            symptoms: Optional list of symptom strings (used if evidences is empty).
            
        Returns:
            Dict containing:
            - probabilities: Dict[disease_name, float]
            - features_populated: int (count of non-zero structured features)
            - sparsity_ratio: float (features_populated / 20.0, capped at 1.0)
            - is_sparse: bool (True if features_populated < 5)
            - top_predictions: List[Tuple[disease_name, float]]
        """
        combined_evidences = list(evidences or [])
        
        # If no structured evidence codes were provided, attempt reliable mapping from symptoms
        if not combined_evidences and symptoms:
            combined_evidences = self.map_symptoms_to_evidence_codes(symptoms)

        init_ev = initial_evidence or ""
        # If initial_evidence is empty but we have at least one evidence code, treat first as chief complaint
        if not init_ev and combined_evidences:
            init_ev = combined_evidences[0].split("_@_")[0]

        # Vectorize using deterministic EvidenceEncoder
        X = self.encoder.transform_single(
            age=age,
            sex=sex,
            initial_evidence=init_ev,
            evidences=combined_evidences
        )

        # Count populated non-zero features (distinguishes sparse from comprehensive records)
        features_populated = int(X.nnz)
        
        # Calculate logits and apply temperature scaling if calibrated
        if hasattr(self.clf, "decision_function"):
            logits = self.clf.decision_function(X)[0]
            if self.temperature != 1.0 and self.temperature > 0.0:
                logits = logits / self.temperature
            exp_logits = np.exp(logits - np.max(logits))
            probs = exp_logits / np.sum(exp_logits)
        else:
            probs = self.clf.predict_proba(X)[0]

        prob_dict = {cond: float(probs[i]) for i, cond in enumerate(self.classes)}
        
        # Sort top predictions
        sorted_preds = sorted(prob_dict.items(), key=lambda x: x[1], reverse=True)

        # Sparsity evaluation:
        # A full DDXPlus case typically populates 15-35 features.
        # An API request with only Age and Sex populates only 2-3 features.
        # We define sparsity_weight to scale classifier influence gracefully.
        evidence_features_count = max(0, features_populated - 2) # excluding age & sex
        sparsity_ratio = min(1.0, evidence_features_count / 8.0)
        is_sparse = features_populated < 5

        return {
            "probabilities": prob_dict,
            "features_populated": features_populated,
            "evidence_features_count": evidence_features_count,
            "sparsity_ratio": round(sparsity_ratio, 3),
            "is_sparse": is_sparse,
            "top_predictions": sorted_preds[:10]
        }
