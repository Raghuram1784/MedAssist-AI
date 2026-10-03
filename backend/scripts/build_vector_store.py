import os
import sys
import json
import time
import shutil
from tqdm import tqdm
from typing import List, Dict, Any
import numpy as np
import torch

# Ensure project root is in python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.rag.embeddings import BioClinicalBERTEncoder
from backend.rag.vector_store import ClinicalVectorStore

def main():
    # Environment variable configuration for safe CPU memory/thread execution
    batch_size = int(os.environ.get("FAISS_BATCH_SIZE", 16))
    torch_threads = int(os.environ.get("FAISS_TORCH_THREADS", 4))
    torch.set_num_threads(torch_threads)

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
        
    temp_output_dir = output_dir + "_temp"
    os.makedirs(temp_output_dir, exist_ok=True)
    
    print("--- RAG FAISS Index Compiler ---")
    print(f"Loading data from: {train_preprocessed_path}")
    
    if not os.path.exists(train_preprocessed_path):
        print(f"Error: Preprocessed training data not found at {train_preprocessed_path}.")
        print("Please run backend/scripts/preprocess.py first.")
        sys.exit(1)
        
    # 1. Read clinical narratives and metadata
    limit = int(os.environ.get("FAISS_INDEX_SIZE", 0))
    cases_metadata = []
    narratives = []
    
    with open(train_preprocessed_path, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            if limit > 0 and idx >= limit:
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
            
    print(f"Batch size: {batch_size}")
    print(f"PyTorch threads: {torch_threads}")
    print(f"Number of cases: {len(narratives):,}")
    
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
    
    # Encode with safe configurable batch size
    sorted_embeddings = encoder.encode(sorted_narratives, batch_size=batch_size, normalize=True)
    
    # Reconstruct original order of embeddings
    embeddings = np.zeros((len(narratives), sorted_embeddings.shape[1]), dtype=np.float32)
    for i, idx in enumerate(sorted_indices):
        embeddings[idx] = sorted_embeddings[i]
    
    generation_time = time.time() - start_time
    print(f"Embeddings generated in {generation_time:.2f} seconds ({len(narratives)/generation_time:.1f} cases/sec).")
    print(f"Embedding matrix shape: {embeddings.shape}")
    
    # 4. Build and save the FAISS Inner Product index in temporary directory
    print("Populating FAISS vector index in temporary build directory...")
    vector_store_temp = ClinicalVectorStore(dimension=embeddings.shape[1])
    vector_store_temp.add_cases(embeddings, cases_metadata)
    
    print(f"Saving temporary FAISS index to: {temp_output_dir}")
    vector_store_temp.save(temp_output_dir)
    
    # 5. Atomic Verification & Replacement
    print("\n--- Verifying Temporary FAISS Build ---")
    verification_store = ClinicalVectorStore()
    verification_store.load(temp_output_dir)
    
    print(f"Temporary FAISS ntotal: {verification_store.index.ntotal}")
    print(f"Temporary Metadata count: {len(verification_store.metadata)}")
    print(f"Embedding dimension: {verification_store.index.d}")
    print(f"Index type: {type(verification_store.index).__name__}")
    
    if (verification_store.index.ntotal == len(narratives) and 
        len(verification_store.metadata) == len(narratives) and 
        verification_store.index.d == 768):
        print("\nVerification SUCCESS! Replacing active FAISS index directory with newly compiled index...")
        if os.path.exists(output_dir):
            shutil.rmtree(output_dir)
        shutil.move(temp_output_dir, output_dir)
        print(f"Active FAISS index successfully updated at: {output_dir}")
        print("--- FAISS Vector Indexing Complete ---")
    else:
        print("\nError: Verification FAILED! The newly compiled index does not match expected counts.")
        sys.exit(1)

if __name__ == "__main__":
    main()
