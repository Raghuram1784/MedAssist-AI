"""
Structured Evidence Encoder for DDXPlus Clinical Dataset (Phase 5.5).

Transforms raw DDXPlus structured patient findings:
- AGE (numeric float, normalized)
- SEX (binary one-hot indicators)
- INITIAL_EVIDENCE (chief complaint one-hot indicator)
- EVIDENCES (binary findings, categorical scales, multi-choice options, antecedents)
into a deterministic, high-dimensional sparse feature vector.

Zero diagnosis-specific rules or clinical heuristics are included.
Features are derived purely from evidence schemas in release_evidences.json.
"""

import os
import json
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple, Union
from scipy.sparse import csr_matrix


class EvidenceEncoder:
    def __init__(self, evidences_json_path: Optional[str] = None):
        """
        Initialize the deterministic evidence encoder.
        If evidences_json_path is provided, builds feature mapping from schema.
        """
        self.feature_to_idx: Dict[str, int] = {}
        self.idx_to_feature: List[str] = []
        self.num_features: int = 0
        self.evidence_metadata: Dict[str, Any] = {}
        
        if evidences_json_path and os.path.exists(evidences_json_path):
            self.build_vocabulary(evidences_json_path)

    def build_vocabulary(self, evidences_json_path: str):
        """
        Build deterministic feature vocabulary directly from release_evidences.json.
        """
        with open(evidences_json_path, 'r', encoding='utf-8') as f:
            self.evidence_metadata = json.load(f)

        features = [
            "age_normalized",
            "sex_is_male",
            "sex_is_female"
        ]

        # 1. Evidence features (Binary, Categorical, Multi-choice, Antecedents)
        for ev_id, meta in sorted(self.evidence_metadata.items()):
            dt = meta.get("data_type")
            p_vals = meta.get("possible-values", [])
            if dt == "B":
                features.append(f"ev_{ev_id}")
            elif dt in ("C", "M"):
                for val in sorted(str(v) for v in p_vals):
                    features.append(f"ev_{ev_id}_@_{val}")

        # 2. Initial evidence features (Chief complaint)
        for ev_id in sorted(self.evidence_metadata.keys()):
            features.append(f"init_{ev_id}")

        self.idx_to_feature = features
        self.feature_to_idx = {feat: i for i, feat in enumerate(features)}
        self.num_features = len(features)

    def transform_single(
        self,
        age: int,
        sex: str,
        initial_evidence: str,
        evidences: List[str]
    ) -> csr_matrix:
        """
        Transform a single clinical case presentation into a sparse 1 x num_features vector.
        """
        row_indices = [0]
        row_data = [float(age) / 100.0]

        # Sex
        sex_upper = str(sex).strip().upper()
        if sex_upper == "M":
            row_indices.append(1)
            row_data.append(1.0)
        else:
            row_indices.append(2)
            row_data.append(1.0)

        # Initial evidence
        init_key = f"init_{initial_evidence.strip()}"
        if init_key in self.feature_to_idx:
            row_indices.append(self.feature_to_idx[init_key])
            row_data.append(1.0)

        # Evidence list
        for ev in evidences:
            ev_str = str(ev).strip()
            ev_key = f"ev_{ev_str}"
            if ev_key in self.feature_to_idx:
                row_indices.append(self.feature_to_idx[ev_key])
                row_data.append(1.0)

        indptr = np.array([0, len(row_indices)], dtype=np.int32)
        indices = np.array(row_indices, dtype=np.int32)
        data = np.array(row_data, dtype=np.float32)

        return csr_matrix((data, indices, indptr), shape=(1, self.num_features))

    def transform_dataframe(
        self,
        df: pd.DataFrame
    ) -> csr_matrix:
        """
        Vectorize a pandas DataFrame of DDXPlus cases into a 2D CSR matrix (N, num_features).
        Expected columns: AGE, SEX, INITIAL_EVIDENCE, EVIDENCES.
        """
        rows_count = len(df)
        indptr = np.zeros(rows_count + 1, dtype=np.int32)
        indices_list = []
        data_list = []

        ages = (df["AGE"].values / 100.0).astype(np.float32)
        sexes = df["SEX"].astype(str).values
        initial_evs = df["INITIAL_EVIDENCE"].astype(str).values
        evidences_raw = df["EVIDENCES"].values

        curr_ptr = 0
        feat_to_idx = self.feature_to_idx

        for i in range(rows_count):
            row_indices = [0]
            row_data = [ages[i]]

            # Sex
            if sexes[i].upper() == "M":
                row_indices.append(1)
                row_data.append(1.0)
            else:
                row_indices.append(2)
                row_data.append(1.0)

            # Initial evidence
            init_key = f"init_{initial_evs[i].strip()}"
            if init_key in feat_to_idx:
                row_indices.append(feat_to_idx[init_key])
                row_data.append(1.0)

            # Evidences list
            raw = evidences_raw[i]
            if isinstance(raw, str) and len(raw) > 4:
                # Fast parse string serialized list: "['E_1', 'E_2_@_V_3', ...]"
                cleaned = raw[1:-1].replace("'", "").replace('"', "")
                for ev in cleaned.split(", "):
                    ev_clean = ev.strip()
                    if not ev_clean:
                        continue
                    ev_key = f"ev_{ev_clean}"
                    if ev_key in feat_to_idx:
                        row_indices.append(feat_to_idx[ev_key])
                        row_data.append(1.0)
            elif isinstance(raw, list):
                for ev in raw:
                    ev_key = f"ev_{str(ev).strip()}"
                    if ev_key in feat_to_idx:
                        row_indices.append(feat_to_idx[ev_key])
                        row_data.append(1.0)

            indices_list.extend(row_indices)
            data_list.extend(row_data)
            curr_ptr += len(row_indices)
            indptr[i + 1] = curr_ptr

        return csr_matrix(
            (np.array(data_list, dtype=np.float32),
             np.array(indices_list, dtype=np.int32),
             indptr),
            shape=(rows_count, self.num_features)
        )

    def save(self, output_path: str):
        """Save feature vocabulary and metadata to JSON."""
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        schema_data = {
            "num_features": self.num_features,
            "feature_to_idx": self.feature_to_idx,
            "idx_to_feature": self.idx_to_feature
        }
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(schema_data, f, indent=2)

    def load(self, schema_path: str):
        """Load feature vocabulary from saved JSON schema."""
        with open(schema_path, "r", encoding="utf-8") as f:
            schema_data = json.load(f)
        self.num_features = schema_data["num_features"]
        self.feature_to_idx = schema_data["feature_to_idx"]
        self.idx_to_feature = schema_data["idx_to_feature"]
