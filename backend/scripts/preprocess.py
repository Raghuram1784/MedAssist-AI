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
                    sample_size: Optional[int] = None,
                    seed: int = 42) -> int:
    """
    Preprocess a single raw CSV file and write to JSONL format.
    If sample_size is specified for train.csv, use deterministic stratified pathology sampling.
    """
    print(f"\nPreprocessing: {os.path.basename(csv_path)}")
    print(f"Input: {csv_path}")
    print(f"Output: {output_path}")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    start_time = time.time()

    # Determine row filter for stratified sampling if applicable
    sampled_indices_set = None
    if sample_size and "train.csv" in csv_path:
        print(f"Stratified sampling mode enabled for {sample_size} target records (seed={seed}).")
        df_path = pd.read_csv(csv_path, usecols=['PATHOLOGY'])
        np.random.seed(seed)
        sampled_indices = []
        target_per_class = max(1100, sample_size // 49)
        for pathology, count in df_path['PATHOLOGY'].value_counts().items():
            idx_list = df_path[df_path['PATHOLOGY'] == pathology].index.values
            if count <= target_per_class:
                sampled_indices.extend(idx_list)
            else:
                sampled_indices.extend(np.random.choice(idx_list, size=target_per_class, replace=False))
        sampled_indices_set = set(sampled_indices)
        print(f"Stratified sample selected {len(sampled_indices_set):,} indices across all {df_path['PATHOLOGY'].nunique()} pathologies.")

    processed_count = 0
    with open(output_path, 'w', encoding='utf-8') as outfile:
        # Process in pandas chunks for speed
        chunksize = 5000
        for chunk in pd.read_csv(csv_path, chunksize=chunksize):
            for idx, row in chunk.iterrows():
                if sampled_indices_set is not None and idx not in sampled_indices_set:
                    continue
                if sample_size and "train.csv" not in csv_path and processed_count >= sample_size:
                    break

                case = PatientCase(
                    age=int(row['AGE']),
                    sex=str(row['SEX']),
                    pathology=str(row['PATHOLOGY']),
                    evidences=row['EVIDENCES'],
                    differential_diagnosis=row['DIFFERENTIAL_DIAGNOSIS'],
                    initial_evidence=str(row['INITIAL_EVIDENCE'])
                )
                translated_case = translator.translate_case(case)
                outfile.write(json.dumps(translated_case, ensure_ascii=False) + "\n")
                processed_count += 1

    elapsed = time.time() - start_time
    print(f"Completed! Processed {processed_count:,} records in {elapsed:.2f} seconds ({processed_count/elapsed:.1f} rec/sec).")
    print(f"Output File Size: {os.path.getsize(output_path) / (1024*1024):.2f} MB")
    return processed_count

def main():
    parser = argparse.ArgumentParser(description="Preprocess DDXPlus clinical cases into structured clinical summaries.")
    parser.add_argument("--sample-size", type=int, default=int(os.environ.get("FAISS_INDEX_SIZE", 50000)), 
                        help="Target stratified sample size for training set (default: 50000). Set to 0 to process full file.")
    parser.add_argument("--full", action="store_true", 
                        help="Process the full dataset for train, validation, and test (ignores --sample-size).")
    args = parser.parse_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    
    datasets_dir = os.path.join(os.path.dirname(project_root), "datasets", "ddxplus")
    conditions_json = os.path.join(datasets_dir, "release_conditions.json")
    evidences_json = os.path.join(datasets_dir, "release_evidences.json")
    train_csv = os.path.join(datasets_dir, "train.csv")
    validate_csv = os.path.join(datasets_dir, "validate.csv")
    test_csv = os.path.join(datasets_dir, "test.csv")

    output_dir = os.path.join(datasets_dir, "preprocessed")
    train_out = os.path.join(output_dir, "train_preprocessed.jsonl")
    validate_out = os.path.join(output_dir, "validate_preprocessed.jsonl")
    test_out = os.path.join(output_dir, "test_preprocessed.jsonl")

    print("Loading medical metadata (pathologies & symptoms)...")
    conditions_meta = load_conditions(conditions_json)
    evidences_meta = load_evidences(evidences_json)
    print("Metadata loaded successfully.")
    
    translator = ClinicalTranslator(
        evidences_metadata=evidences_meta,
        conditions_metadata=conditions_meta
    )

    if args.full:
        train_limit = None
        val_limit = None
        test_limit = None
    else:
        train_limit = args.sample_size if args.sample_size > 0 else None
        val_limit = min(args.sample_size // 5, 2000) if args.sample_size > 0 else None
        test_limit = min(args.sample_size // 5, 2000) if args.sample_size > 0 else None

    preprocess_file(test_csv, test_out, translator, sample_size=test_limit)
    preprocess_file(validate_csv, validate_out, translator, sample_size=val_limit)
    preprocess_file(train_csv, train_out, translator, sample_size=train_limit)

    print("\n--- Phase 1 Preprocessing Complete ---")
    print(f"Preprocessed output files saved to: {output_dir}")

if __name__ == "__main__":
    from typing import Optional
    main()
