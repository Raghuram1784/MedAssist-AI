import os
from typing import List, Dict, Any, Optional
from backend.rag.embeddings import BioClinicalBERTEncoder
from backend.rag.vector_store import ClinicalVectorStore

class ClinicalCaseRetriever:
    def __init__(self, index_dir: str, device: Optional[str] = None):
        """
        Initialize the Clinical Case Retriever.
        
        Args:
            index_dir: Path to the directory containing clinical_cases.index and metadata.json.
            device: Optional computing device override ('cuda' or 'cpu').
        """
        self.index_dir = index_dir
        
        # Instantiate the BioClinicalBERT encoder
        self.encoder = BioClinicalBERTEncoder(device=device)
        
        # Instantiate the vector store and load the index/metadata from disk
        self.vector_store = ClinicalVectorStore()
        self.vector_store.load(self.index_dir)

    def retrieve_similar_cases(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Embed the input clinical text query and return the top_k most similar historical cases.
        
        Args:
            query: Semantic search text query (e.g. "patient with chest pain and cough").
            top_k: Number of matching historical cases to retrieve.
            
        Returns:
            List of matching case metadata dictionaries with similarity scores.
        """
        if not query or not query.strip():
            return []
            
        # Encode the query text using BioClinicalBERT (with L2 normalization)
        query_embedding = self.encoder.encode(query, normalize=True)
        
        # Query FAISS index
        results = self.vector_store.search(query_embedding, top_k=top_k)
        
        return results
