import os
import sys
import json
import time
import shutil
import hashlib
import gc
from typing import List, Dict, Any
import numpy as np
import torch

# Ensure project root is in python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.rag.embeddings import BioClinicalBERTEncoder
from backend.rag.vector_store import ClinicalVectorStore

def compute_file_sha256(filepath: str, max_bytes: int = 10 * 1024 * 1024) -> str:
    """Compute SHA-256 hash of file (header + size for performance on large files)."""
    hasher = hashlib.sha256()
    file_size = os.path.getsize(filepath)
    hasher.update(str(file_size).encode('utf-8'))
    
    with open(filepath, 'rb') as f:
        chunk = f.read(max_bytes)
        hasher.update(chunk)
    return hasher.hexdigest()

def format_time(seconds: float) -> str:
    """Format seconds into HHh MMm SSs string."""
    seconds = int(seconds)
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    if hours > 0:
        return f"{hours}h {minutes:02d}m {secs:02d}s"
    elif minutes > 0:
        return f"{minutes}m {secs:02d}s"
    else:
        return f"{secs}s"

def atomic_save_json(filepath: str, data: Dict[str, Any]) -> None:
    """Save dictionary to JSON atomically via temporary file."""
    tmp_path = filepath + ".tmp"
    with open(tmp_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    if os.path.exists(filepath):
        os.remove(filepath)
    os.rename(tmp_path, filepath)

def main():
    # Environment configuration for safe CPU memory/thread execution
    batch_size = int(os.environ.get("FAISS_BATCH_SIZE", 16))
    torch_threads = int(os.environ.get("FAISS_TORCH_THREADS", 4))
    reset_build = os.environ.get("FAISS_RESET_BUILD", "false").lower() in ("true", "1", "yes")
    torch.set_num_threads(torch_threads)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    
    # Path constants
    preprocessed_dir = os.path.join(os.path.dirname(project_root), "datasets", "ddxplus", "preprocessed")
    train_preprocessed_path = os.path.join(preprocessed_dir, "train_preprocessed.jsonl")
    
    output_dir = os.path.join(project_root, "backend", "rag", "faiss_index")
    if not os.path.exists(os.path.join(project_root, "backend")):
        output_dir = os.path.join(project_root, "rag", "faiss_index")
        
    faiss_mode = os.environ.get("FAISS_MODE", "").lower()
    is_test_env = os.environ.get("FAISS_IS_TEST", "false").lower() in ("true", "1", "yes")
    custom_output_dir = os.environ.get("FAISS_OUTPUT_DIR", "").strip()

    is_test_mode = (faiss_mode == "test") or is_test_env or bool(custom_output_dir)

    if custom_output_dir:
        output_dir = custom_output_dir
    elif is_test_mode:
        output_dir = os.path.join(os.path.dirname(output_dir), "faiss_index_test")

    temp_output_dir = output_dir + "_temp"
    
    print("--- Resumable BioClinicalBERT FAISS Index Compiler ---")
    if is_test_mode:
        print(f"[TEST MODE ACTIVE] Output target is isolated to: {output_dir}")

    
    # Handle RESET_BUILD flag
    if reset_build:
        print("[Reset] FAISS_RESET_BUILD=true detected. Removing incomplete temporary build directory...")
        if os.path.exists(temp_output_dir):
            shutil.rmtree(temp_output_dir)
        print("[Reset] Temporary build directory reset successfully.")
        
    os.makedirs(temp_output_dir, exist_ok=True)
    
    print(f"Loading data from: {train_preprocessed_path}")
    if not os.path.exists(train_preprocessed_path):
        print(f"Error: Preprocessed training data not found at {train_preprocessed_path}.")
        print("Please run backend/scripts/preprocess.py first.")
        sys.exit(1)
        
    dataset_sha256 = compute_file_sha256(train_preprocessed_path)
    
    # 1. Read clinical narratives and metadata
    limit = int(os.environ.get("FAISS_INDEX_SIZE", 0))
    cases_metadata = []
    narratives = []
    
    with open(train_preprocessed_path, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            if limit > 0 and idx >= limit:
                break
            record = json.loads(line)
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
            
    total_cases = len(narratives)
    embedding_dim = 768
    num_batches = (total_cases + batch_size - 1) // batch_size
    
    # Bucket sort narratives by length for optimal BERT padding
    sorted_indices = sorted(range(total_cases), key=lambda k: len(narratives[k]))
    sorted_narratives = [narratives[idx] for idx in sorted_indices]

    # Checkpoint and Memmap file paths
    checkpoint_path = os.path.join(temp_output_dir, "checkpoint.json")
    memmap_path = os.path.join(temp_output_dir, "embeddings_sorted.dat")
    
    completed_batches = 0
    completed_cases = 0
    next_batch_start = 0
    start_elapsed_offset = 0.0

    # 2. Check for existing checkpoint
    if os.path.exists(checkpoint_path) and os.path.exists(memmap_path):
        try:
            with open(checkpoint_path, 'r', encoding='utf-8') as f:
                ckpt = json.load(f)
                
            # Verify checkpoint validity against current dataset & configuration
            if (ckpt.get("dataset_sha256") == dataset_sha256 and
                ckpt.get("total_cases") == total_cases and
                ckpt.get("embedding_dimension") == embedding_dim):
                
                completed_batches = ckpt.get("completed_batches", 0)
                completed_cases = ckpt.get("completed_cases", 0)
                next_batch_start = ckpt.get("next_batch_start", 0)
                start_elapsed_offset = ckpt.get("total_elapsed_seconds", 0.0)
                
                print("\n--------------------------------------------------")
                print("Existing temporary build checkpoint detected.")
                print(f"Resuming from batch {completed_batches}/{num_batches}:")
                print(f"  - Completed cases: {completed_cases:,} / {total_cases:,} ({completed_cases/total_cases*100:.1f}%)")
                print(f"  - Remaining cases: {total_cases - completed_cases:,}")
                print(f"  - Prior elapsed time: {format_time(start_elapsed_offset)}")
                print("--------------------------------------------------\n")
            else:
                print("\n[Warning] Existing checkpoint does not match current dataset or target size.")
                print("Starting a new temporary build...")
                completed_batches = 0
                completed_cases = 0
                next_batch_start = 0
        except Exception as e:
            print(f"\n[Warning] Could not read existing checkpoint ({e}). Starting fresh temporary build.")
            completed_batches = 0
            completed_cases = 0
            next_batch_start = 0

    # Open/Create Disk-Backed NumPy Memmap
    if completed_batches == 0:
        # Create empty memmap file
        memmap_arr = np.memmap(memmap_path, dtype='float32', mode='w+', shape=(total_cases, embedding_dim))
    else:
        # Open existing memmap file in read-write mode
        memmap_arr = np.memmap(memmap_path, dtype='float32', mode='r+', shape=(total_cases, embedding_dim))

    print(f"Configured Batch Size: {batch_size}")
    print(f"Configured PyTorch Threads: {torch_threads}")
    print(f"Total Cases to Encode: {total_cases:,}")
    print(f"Total Batches: {num_batches:,}")
    
    # Check if build is already complete
    if completed_cases >= total_cases:
        print("\nAll cases are already encoded in the temporary build.")
    else:
        # 3. Instantiate BioClinicalBERT Encoder
        print("\nInitializing BioClinicalBERTEncoder...")
        encoder = BioClinicalBERTEncoder()

        print("\nStarting batch encoding process...")
        build_start_time = time.time()
        
        try:
            for b_idx in range(completed_batches, num_batches):
                b_start = b_idx * batch_size
                b_end = min(b_start + batch_size, total_cases)
                batch_texts = sorted_narratives[b_start:b_end]
                
                # Encode single batch (L2 normalized)
                batch_vectors = encoder.encode(batch_texts, batch_size=len(batch_texts), normalize=True)
                
                # Write to disk-backed memmap
                memmap_arr[b_start:b_end] = batch_vectors
                memmap_arr.flush()
                
                # Update counters
                completed_batches = b_idx + 1
                completed_cases = b_end
                next_batch_start = b_end
                
                current_session_elapsed = time.time() - build_start_time
                total_elapsed = start_elapsed_offset + current_session_elapsed
                
                cases_done_in_session = completed_cases - (next_batch_start - (b_end - b_start))
                session_speed = (completed_cases - (b_idx * batch_size)) / max(current_session_elapsed, 0.001)
                remaining_cases = total_cases - completed_cases
                est_remaining_sec = remaining_cases / session_speed if session_speed > 0 else 0
                
                # Atomic Checkpoint Save
                checkpoint_data = {
                    "total_cases": total_cases,
                    "embedding_dimension": embedding_dim,
                    "batch_size": batch_size,
                    "torch_threads": torch_threads,
                    "completed_batches": completed_batches,
                    "completed_cases": completed_cases,
                    "next_batch_start": next_batch_start,
                    "total_elapsed_seconds": total_elapsed,
                    "dataset_sha256": dataset_sha256,
                    "model_identifier": "Emilyalsentzer/Bio_ClinicalBERT",
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S")
                }
                atomic_save_json(checkpoint_path, checkpoint_data)
                
                # Progress Reporting
                pct = (completed_cases / total_cases) * 100
                print(f"[Batch {completed_batches:4d}/{num_batches:4d}] "
                      f"Completed: {completed_cases:6,d}/{total_cases:6,d} ({pct:5.1f}%) | "
                      f"Speed: {session_speed:4.1f} cases/sec | "
                      f"Elapsed: {format_time(total_elapsed)} | "
                      f"Est. Remaining: {format_time(est_remaining_sec)}")
                
        except KeyboardInterrupt:
            print("\n" + "="*60)
            print(" BUILD SAFELY INTERRUPTED (Ctrl+C)")
            print("="*60)
            print(f"Checkpoint saved at batch {completed_batches}/{num_batches}.")
            print(f"Completed cases saved on disk: {completed_cases:,} / {total_cases:,}.")
            print("The active working FAISS index was NOT modified.")
            print("To resume, simply run:")
            print("  python backend/scripts/build_vector_store.py")
            print("="*60 + "\n")
            sys.exit(0)

    # 4. Reconstruct Original Order and Populate FAISS
    print("\n--- Finalizing FAISS Index Compilation ---")
    print(f"Loading completed disk-backed embedding array ({total_cases:,} vectors)...")
    
    # Reconstruct original case order from sorted memmap
    final_embeddings = np.zeros((total_cases, embedding_dim), dtype=np.float32)
    for sorted_pos, orig_idx in enumerate(sorted_indices):
        final_embeddings[orig_idx] = memmap_arr[sorted_pos]
        
    print(f"Final embedding matrix shape: {final_embeddings.shape}")
    print("Populating FAISS vector index in temporary build directory...")
    
    vector_store_temp = ClinicalVectorStore(dimension=embedding_dim)
    vector_store_temp.add_cases(final_embeddings, cases_metadata)
    
    print(f"Saving temporary FAISS index registry to: {temp_output_dir}")
    vector_store_temp.save(temp_output_dir)
    
    # 5. Verification & Atomic Copy to Active Directory
    print("\n--- Verifying Temporary FAISS Build ---")
    verification_store = ClinicalVectorStore()
    verification_store.load(temp_output_dir)
    
    v_total = verification_store.index.ntotal
    v_meta = len(verification_store.metadata)
    v_dim = verification_store.index.d
    v_type = type(verification_store.index).__name__
    
    print(f"Temporary FAISS ntotal: {v_total}")
    print(f"Temporary Metadata count: {v_meta}")
    print(f"Embedding dimension: {v_dim}")
    print(f"Index type: {v_type}")
    
    # Close memmap file handle explicitly to release locks on Windows
    del memmap_arr
    gc.collect()

    allow_partial_overwrite = os.environ.get("FAISS_ALLOW_PARTIAL_OVERWRITE", "false").lower() in ("true", "1", "yes")

    if v_total == total_cases and v_meta == total_cases and v_dim == 768 and v_type == "IndexFlatIP":
        if is_test_mode:
            print("\n--------------------------------------------------")
            print(f"[Isolated Test Output] Build completed successfully ({total_cases:,} cases).")
            print(f"Test FAISS index is saved in isolated directory: {output_dir}")
            print("Active production index was NOT modified.")
            print("--------------------------------------------------")
            os.makedirs(output_dir, exist_ok=True)
            
            src_index = os.path.join(temp_output_dir, "clinical_cases.index")
            src_meta = os.path.join(temp_output_dir, "metadata.json")
            dst_index = os.path.join(output_dir, "clinical_cases.index")
            dst_meta = os.path.join(output_dir, "metadata.json")
            
            shutil.copy2(src_index, dst_index)
            shutil.copy2(src_meta, dst_meta)
            print(f"Isolated test FAISS index successfully updated at: {output_dir}")
        elif limit > 0 and not allow_partial_overwrite:
            print("\n--------------------------------------------------")
            print(f"[Test Mode Notice] Partial build completed successfully ({total_cases:,} cases).")
            print(f"Test index is saved in temporary directory: {temp_output_dir}")
            print(f"Active production index at {output_dir} was NOT overwritten.")
            print("(To explicitly update active index with a partial build, set FAISS_ALLOW_PARTIAL_OVERWRITE=true)")
            print("--------------------------------------------------")
        else:
            print("\nVerification SUCCESS! Copying newly compiled FAISS index to active directory...")
            os.makedirs(output_dir, exist_ok=True)
            
            src_index = os.path.join(temp_output_dir, "clinical_cases.index")
            src_meta = os.path.join(temp_output_dir, "metadata.json")
            dst_index = os.path.join(output_dir, "clinical_cases.index")
            dst_meta = os.path.join(output_dir, "metadata.json")
            
            shutil.copy2(src_index, dst_index)
            shutil.copy2(src_meta, dst_meta)
            
            print(f"Active FAISS index successfully updated at: {output_dir}")
            print("--- FAISS Vector Indexing Complete ---")
    else:
        print("\nError: Verification FAILED! The newly compiled index does not match expected criteria.")
        sys.exit(1)

if __name__ == "__main__":
    main()
