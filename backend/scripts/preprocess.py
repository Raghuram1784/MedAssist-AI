import os
import argparse
import time
import json
from tqdm import tqdm
from typing import Dict, Any

# Ensure we can import from backend
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.app.data.parser import (
    load_conditions,
    load_evidences,
    stream_cases,
)
from backend.app.data.translator import ClinicalTranslator

def preprocess_file(csv_path: str, 
                    output_path: str, 
                    translator: ClinicalTranslator, 
                    sample_size: Optional[int] = None) -> int:
    """
    Preprocess a single raw CSV file and write to JSONL format.
    
    Args:
        csv_path: Path to the raw input CSV file.
        output_path: Path to write the output JSONL file.
        translator: Instantiated ClinicalTranslator.
        sample_size: Maximum number of rows to process. None for full dataset.
        
    Returns:
        Number of processed records.
    """
    print(f"\nPreprocessing: {os.path.basename(csv_path)}")
    print(f"Input: {csv_path}")
    print(f"Output: {output_path}")
    if sample_size:
        print(f"Sampling mode enabled. Sample size: {sample_size} cases.")
    else:
        print("Processing full dataset.")

    # Create output directories if they don't exist
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    start_time = time.time()
    
    # We can estimate total rows to make tqdm look nice
    # (Approximate counts: test ~ 134k, validate ~ 132k, train ~ 1.02M)
    total_est = sample_size
    if not total_est:
        if "test" in csv_path:
            total_est = 134529
        elif "validate" in csv_path:
            total_est = 132000 # approximation
        else:
            total_est = 1000000 # approximation

    processed_count = 0
    with open(output_path, 'w', encoding='utf-8') as outfile:
        # Use our streaming generator to keep memory low
        cases_gen = stream_cases(csv_path, limit=sample_size)
        
        with tqdm(total=total_est, desc=f"Parsing {os.path.basename(csv_path)}") as pbar:
            for case in cases_gen:
                # Translate code case to rich clinical case
                translated_case = translator.translate_case(case)
                
                # Write to JSONL
                outfile.write(json.dumps(translated_case, ensure_ascii=False) + "\n")
                processed_count += 1
                pbar.update(1)

    elapsed = time.time() - start_time
    print(f"Completed! Processed {processed_count} records in {elapsed:.2f} seconds ({processed_count/elapsed:.1f} rec/sec).")
    print(f"Output File Size: {os.path.getsize(output_path) / (1024*1024):.2f} MB")
    
    return processed_count

def main():
    parser = argparse.ArgumentParser(description="Preprocess DDXPlus clinical cases into structured clinical summaries.")
    parser.add_argument("--sample-size", type=int, default=10000, 
                        help="Number of cases to sample from training set (default: 10000). Set to 0 to process the full file.")
    parser.add_argument("--full", action="store_true", 
                        help="Process the full dataset for train, validation, and test (ignores --sample-size).")
    args = parser.parse_args()

    # Determine paths relative to project root
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    
    # Raw datasets paths
    datasets_dir = os.path.join(os.path.dirname(project_root), "datasets", "ddxplus")
    conditions_json = os.path.join(datasets_dir, "release_conditions.json")
    evidences_json = os.path.join(datasets_dir, "release_evidences.json")
    train_csv = os.path.join(datasets_dir, "train.csv")
    validate_csv = os.path.join(datasets_dir, "validate.csv")
    test_csv = os.path.join(datasets_dir, "test.csv")

    # Output directory
    output_dir = os.path.join(datasets_dir, "preprocessed")
    train_out = os.path.join(output_dir, "train_preprocessed.jsonl")
    validate_out = os.path.join(output_dir, "validate_preprocessed.jsonl")
    test_out = os.path.join(output_dir, "test_preprocessed.jsonl")

    print("Loading medical metadata (pathologies & symptoms)...")
    conditions_meta = load_conditions(conditions_json)
    evidences_meta = load_evidences(evidences_json)
    print("Metadata loaded successfully.")
    
    # Instantiate translator
    translator = ClinicalTranslator(
        evidences_metadata=evidences_meta,
        conditions_metadata=conditions_meta
    )

    # Determine sampling limits
    if args.full:
        train_limit = None
        val_limit = None
        test_limit = None
    else:
        train_limit = args.sample_size
        # Sample smaller portions of val/test sets to keep dev fast
        val_limit = min(args.sample_size // 5, 2000) if args.sample_size > 0 else None
        test_limit = min(args.sample_size // 5, 2000) if args.sample_size > 0 else None

    # Preprocess each split
    preprocess_file(test_csv, test_out, translator, sample_size=test_limit)
    preprocess_file(validate_csv, validate_out, translator, sample_size=val_limit)
    preprocess_file(train_csv, train_out, translator, sample_size=train_limit)

    print("\n--- Phase 1 Preprocessing Complete ---")
    print(f"Preprocessed output files saved to: {output_dir}")

if __name__ == "__main__":
    from typing import Optional
    main()
