import os
import json
import numpy as np
import faiss
from typing import List, Dict, Any, Tuple

class ClinicalVectorStore:
    def __init__(self, dimension: int = 768):
        """
        Initialize the Clinical Vector Store.
        
        Args:
            dimension: Dimensionality of the vectors (768 for BioClinicalBERT).
        """
        self.dimension = dimension
        # Use IndexFlatIP for Inner Product (Cosine Similarity when embeddings are L2 normalized)
        self.index = faiss.IndexFlatIP(self.dimension)
        self.metadata: List[Dict[str, Any]] = []

    def add_cases(self, embeddings: np.ndarray, cases_metadata: List[Dict[str, Any]]):
        """
        Add case embeddings and their associated clinical metadata to the FAISS index.
        
        Args:
            embeddings: Numpy array of shape (num_cases, dimension) containing L2-normalized embeddings.
            cases_metadata: List of dictionaries containing patient clinical metadata.
        """
        assert embeddings.shape[1] == self.dimension, f"Embedding dimension mismatch: expected {self.dimension}, got {embeddings.shape[1]}"
        assert len(cases_metadata) == embeddings.shape[0], f"Count mismatch: metadata size {len(cases_metadata)}, embeddings count {embeddings.shape[0]}"
        
        # Add to FAISS index. FAISS requires float32 values
        self.index.add(embeddings.astype('float32'))
        
        # Append metadata matching the index entries
        self.metadata.extend(cases_metadata)

    def search(self, query_vector: np.ndarray, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Search the vector index for similar cases.
        
        Args:
            query_vector: Normalized search vector of shape (dimension,) or (1, dimension).
            top_k: Number of nearest matches to return.
            
        Returns:
            List of dictionaries containing matched case metadata and their cosine similarity score.
        """
        if query_vector.ndim == 1:
            query_vector = np.expand_dims(query_vector, axis=0)
            
        # Search index. IndexFlatIP returns (inner_products, indices)
        scores, indices = self.index.search(query_vector.astype('float32'), top_k)
        
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx == -1:  # FAISS returns -1 if index is empty or has fewer elements than top_k
                continue
                
            meta = self.metadata[idx]
            results.append({
                "similarity_score": float(score),
                "case_id": meta.get("case_id"),
                "demographics": meta.get("demographics"),
                "clinical_narrative": meta.get("clinical_narrative"),
                "symptoms": meta.get("symptoms"),
                "ground_truth": meta.get("ground_truth"),
                "differential": meta.get("differential")
            })
            
        return results

    def save(self, dir_path: str):
        """
        Save the FAISS index and metadata.json to the specified directory.
        
        Args:
            dir_path: Directory path to save files.
        """
        os.makedirs(dir_path, exist_ok=True)
        index_path = os.path.join(dir_path, "clinical_cases.index")
        metadata_path = os.path.join(dir_path, "metadata.json")
        
        # Save FAISS binary index
        faiss.write_index(self.index, index_path)
        
        # Save metadata mapping
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(self.metadata, f, ensure_ascii=False, indent=2)
            
        print(f"Saved FAISS index to {index_path}")
        print(f"Saved metadata registry to {metadata_path}")

    def load(self, dir_path: str):
        """
        Load the FAISS index and metadata.json registry from the specified directory.
        
        Args:
            dir_path: Directory path containing the saved files.
        """
        index_path = os.path.join(dir_path, "clinical_cases.index")
        metadata_path = os.path.join(dir_path, "metadata.json")
        
        if not os.path.exists(index_path):
            raise FileNotFoundError(f"FAISS index file not found at: {index_path}")
        if not os.path.exists(metadata_path):
            raise FileNotFoundError(f"Metadata file not found at: {metadata_path}")
            
        # Load index
        self.index = faiss.read_index(index_path)
        
        # Load metadata
        with open(metadata_path, 'r', encoding='utf-8') as f:
            self.metadata = json.load(f)
            
        print(f"Loaded FAISS index containing {self.index.ntotal} case vectors.")
