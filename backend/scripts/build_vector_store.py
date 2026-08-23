import os
import sys
import json
import time
from tqdm import tqdm
from typing import List, Dict, Any
import numpy as np
import torch

# Ensure project root is in python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.rag.embeddings import BioClinicalBERTEncoder
from backend.rag.vector_store import ClinicalVectorStore

def main():
    # Limit PyTorch threads to prevent CPU thrashing
    torch.set_num_threads(4)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    
    # Path constants
    preprocessed_dir = os.path.join(os.path.dirname(project_root), "datasets", "ddxplus", "preprocessed")
    train_preprocessed_path = os.path.join(preprocessed_dir, "train_preprocessed.jsonl")
    
    output_dir = os.path.join(project_root, "backend", "rag", "faiss_index")
    # Clean up output dir path (handle overlapping backend in project_root depending on path resolve)
    if not os.path.exists(os.path.join(project_root, "backend")):
        # If running from inside backend, project_root might already be backend
        output_dir = os.path.join(project_root, "rag", "faiss_index")
        
    os.makedirs(output_dir, exist_ok=True)
    
    print("--- RAG FAISS Index Compiler ---")
    print(f"Loading data from: {train_preprocessed_path}")
    
    if not os.path.exists(train_preprocessed_path):
        print(f"Error: Preprocessed training data not found at {train_preprocessed_path}.")
        print("Please run backend/scripts/preprocess.py first.")
        sys.exit(1)
        
    # 1. Read clinical narratives and metadata (up to 10,000 records)
    limit = 10000
    cases_metadata = []
    narratives = []
    
    with open(train_preprocessed_path, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            if idx >= limit:
                break
            record = json.loads(line)
            
            # Map required metadata structure
            meta = {
                "case_id": f"case_{idx:05d}",
                "demographics": record.get("demographics"),
                "clinical_narrative": record.get("narrative"),
                "symptoms": record.get("symptoms"),
                "ground_truth": record.get("ground_truth"),
                "differential": record.get("differential")
            }
            cases_metadata.append(meta)
            narratives.append(record.get("narrative"))
            
    print(f"Loaded {len(narratives)} cases for indexing.")
    
    # 2. Instantiate BioClinicalBERT Encoder
    print("Initializing BioClinicalBERTEncoder...")
    encoder = BioClinicalBERTEncoder()
    
    # 3. Generate embeddings with normalized cosine-compatible vectors
    print("Optimizing narrative batching using bucket sorting by length...")
    # Sort indices by length of narrative
    sorted_indices = sorted(range(len(narratives)), key=lambda k: len(narratives[k]))
    sorted_narratives = [narratives[idx] for idx in sorted_indices]

    print("Generating normalized semantic embeddings for clinical narratives...")
    start_time = time.time()
    
    # Use smaller batch size of 16 for CPU efficiency
    sorted_embeddings = encoder.encode(sorted_narratives, batch_size=16, normalize=True)
    
    # Reconstruct original order of embeddings
    embeddings = np.zeros((len(narratives), sorted_embeddings.shape[1]), dtype=np.float32)
    for i, idx in enumerate(sorted_indices):
        embeddings[idx] = sorted_embeddings[i]
    
    generation_time = time.time() - start_time
    print(f"Embeddings generated in {generation_time:.2f} seconds ({len(narratives)/generation_time:.1f} cases/sec).")
    print(f"Embedding matrix shape: {embeddings.shape}")
    
    # 4. Build and save the FAISS Inner Product index
    print("Populating FAISS vector index...")
    vector_store = ClinicalVectorStore(dimension=embeddings.shape[1])
    vector_store.add_cases(embeddings, cases_metadata)
    
    print(f"Saving FAISS index & metadata registry to: {output_dir}")
    vector_store.save(output_dir)
    
    print("\n--- FAISS Vector Indexing Phase 2 Complete ---")

if __name__ == "__main__":
    main()
