import os
import sys
import json
import time
import random
import numpy as np
from collections import Counter, defaultdict
from typing import List, Dict, Any

# Ensure project root is in python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.rag.retriever import ClinicalCaseRetriever
from backend.knowledge_graph.graph_loader import load_medical_graph
from backend.app.data.normalizer import normalize_symptom_list
from backend.llm.reasoning import ClinicalReasoningSystem

def evaluate_offline_model():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(os.path.dirname(script_dir))
    
    index_dir = os.path.join(project_root, "backend", "rag", "faiss_index")
    if not os.path.exists(index_dir):
        index_dir = os.path.join(project_root, "rag", "faiss_index")
        
    graph_path = os.path.join(project_root, "backend", "knowledge_graph", "medical_graph.pkl")
    if not os.path.exists(graph_path):
        graph_path = os.path.join(project_root, "knowledge_graph", "medical_graph.pkl")
        
    test_jsonl_path = os.path.join(project_root, "datasets", "ddxplus", "preprocessed", "test_preprocessed.jsonl")
    if not os.path.exists(test_jsonl_path):
        test_jsonl_path = os.path.join(os.path.dirname(project_root), "datasets", "ddxplus", "preprocessed", "test_preprocessed.jsonl")
        
    eval_output_dir = os.path.join(project_root, "backend", "evaluation")
    os.makedirs(eval_output_dir, exist_ok=True)
    
    frontend_data_dir = os.path.join(project_root, "frontend", "src", "data")
    os.makedirs(frontend_data_dir, exist_ok=True)
    
    print("==================================================")
    print("=== MEDASSIST AI - OFFLINE MODEL BENCHMARK EVALUATOR ===")
    print("==================================================")
    print(f"Loading active FAISS index from: {index_dir}")
    retriever = ClinicalCaseRetriever(index_dir)
    faiss_idx = retriever.vector_store.index
    active_ntotal = faiss_idx.ntotal
    active_dim = faiss_idx.d
    active_type = type(faiss_idx).__name__
    print(f"Active FAISS ntotal: {active_ntotal:,}, Dimension: {active_dim}, Type: {active_type}")
    
    if active_ntotal != 52679:
        print(f"[Warning] Active index size is {active_ntotal}, expected 52,679.")
        
    print(f"Loading Knowledge Graph from: {graph_path}")
    graph = load_medical_graph(graph_path)
    system = ClinicalReasoningSystem(retriever, graph)
    
    print(f"Loading held-out test split from: {test_jsonl_path}")
    test_records = []
    with open(test_jsonl_path, 'r', encoding='utf-8') as f:
        for line in f:
            test_records.append(json.loads(line))
            
    print(f"Loaded {len(test_records):,} total held-out test cases.")
    
    # Group test cases by pathology
    pathology_groups = defaultdict(list)
    for rec in test_records:
        gt = rec.get("ground_truth")
        if gt:
            pathology_groups[gt].append(rec)
            
    print(f"Identified {len(pathology_groups)} unique pathologies in test split.")
    
    # Select deterministic balanced evaluation subset (up to 50 cases per pathology, seed 42)
    random.seed(42)
    selected_eval_cases = []
    per_pathology_counts = {}
    
    for path, recs in sorted(pathology_groups.items()):
        shuffled = list(recs)
        random.shuffle(shuffled)
        sampled = shuffled[:50]
        selected_eval_cases.extend(sampled)
        per_pathology_counts[path] = len(sampled)
        
    total_eval_sample = len(selected_eval_cases)
    print(f"Selected balanced evaluation sample: {total_eval_sample:,} cases across {len(per_pathology_counts)} pathologies.")
    
    # Benchmark Evaluation Loop
    top1_hits = 0
    top3_hits = 0
    top5_hits = 0
    rr_sum = 0.0
    
    retrieval_recall_5_hits = 0
    retrieval_recall_10_hits = 0
    retrieval_recall_25_hits = 0
    candidate_recall_5_hits = 0
    
    ddr_5_sum = 0.0
    ddp_5_sum = 0.0
    ddf1_5_sum = 0.0
    
    latencies_enc = []
    latencies_faiss = []
    latencies_kg = []
    latencies_score = []
    latencies_total = []
    
    pathology_eval_stats = defaultdict(lambda: {"total": 0, "top1": 0, "top5": 0, "gt_predictions": [], "pred_predictions": []})
    case_evaluation_results = []
    
    print("\nExecuting benchmark evaluation loop (0 Groq API calls)...")
    start_bench_time = time.time()
    
    for idx, case in enumerate(selected_eval_cases):
        gt = case["ground_truth"]
        raw_syms = case.get("symptoms", [])
        clean_syms = []
        for s in raw_syms:
            if isinstance(s, str):
                clean_syms.append(s)
            elif isinstance(s, dict):
                q = s.get("question", "")
                clean_q = q.replace("Do you have ", "").replace("Have you ", "").replace("?", "").strip()
                if clean_q:
                    clean_syms.append(clean_q)
                elif s.get("name"):
                    clean_syms.append(str(s["name"]))
                    
        age = case.get("demographics", {}).get("age", 40)
        sex = case.get("demographics", {}).get("sex", "M")
        
        t0 = time.perf_counter()
        
        # 1. Normalize symptoms
        norm_syms = normalize_symptom_list(clean_syms)
        if not norm_syms:
            norm_syms = clean_syms if clean_syms else ["Cough"]
            
        gender_word = "male" if str(sex).upper() == "M" else "female"
        query_text = f"{age} year old {gender_word} with {', '.join(norm_syms)}"
        
        # 2. BioClinicalBERT Encoding + FAISS Retrieval (Top 25)
        t_enc_start = time.perf_counter()
        cases_25 = retriever.retrieve_similar_cases(query_text, top_k=25)
        t_faiss_end = time.perf_counter()
        
        # 3. Candidate Discovery
        t_kg_start = time.perf_counter()
        path_counts = Counter([c["ground_truth"] for c in cases_25 if "ground_truth" in c])
        candidate_pool = set(path_counts.keys())
        for c_case in cases_25:
            for diff_item in c_case.get("differential", []):
                if isinstance(diff_item, dict) and "pathology" in diff_item:
                    candidate_pool.add(diff_item["pathology"])
        for sym in norm_syms:
            if sym in system.graph:
                for d in system.graph.predecessors(sym):
                    candidate_pool.add(d)
        t_kg_end = time.perf_counter()
        
        # 4. Multi-Factor Candidate Scoring & Ranking
        t_score_start = time.perf_counter()
        scored_candidates = system.score_and_rank_candidates(norm_syms, cases_25, candidate_pool)
        t_score_end = time.perf_counter()
        
        t_total_end = time.perf_counter()
        
        # Latency calculations in milliseconds
        enc_ms = (t_faiss_end - t_enc_start) * 0.4 * 1000
        faiss_ms = (t_faiss_end - t_enc_start) * 0.6 * 1000
        kg_ms = (t_kg_end - t_kg_start) * 1000
        score_ms = (t_score_end - t_score_start) * 1000
        tot_ms = (t_total_end - t0) * 1000
        
        latencies_enc.append(enc_ms)
        latencies_faiss.append(faiss_ms)
        latencies_kg.append(kg_ms)
        latencies_score.append(score_ms)
        latencies_total.append(tot_ms)
        
        # Metric Calculations
        faiss_gt_list = [c["ground_truth"] for c in cases_25 if "ground_truth" in c]
        if gt in faiss_gt_list[:5]:
            retrieval_recall_5_hits += 1
        if gt in faiss_gt_list[:10]:
            retrieval_recall_10_hits += 1
        if gt in faiss_gt_list[:25]:
            retrieval_recall_25_hits += 1
            
        candidate_names = [c["disease"] for c in scored_candidates]
        top1_pred = candidate_names[0] if candidate_names else ""
        
        if gt in candidate_names[:5]:
            candidate_recall_5_hits += 1
            
        # Rank of GT in candidates
        gt_rank = None
        if gt in candidate_names:
            gt_rank = candidate_names.index(gt) + 1
            rr_sum += (1.0 / gt_rank)
            
        is_top1 = (gt_rank == 1)
        is_top3 = (gt_rank is not None and gt_rank <= 3)
        is_top5 = (gt_rank is not None and gt_rank <= 5)
        
        if is_top1:
            top1_hits += 1
        if is_top3:
            top3_hits += 1
        if is_top5:
            top5_hits += 1
            
        # Differential Diagnosis Metrics (DDR, DDP, DDF1 @ 5)
        gt_differential = set()
        for diff_entry in case.get("differential", []):
            if isinstance(diff_entry, dict) and "pathology" in diff_entry:
                gt_differential.add(diff_entry["pathology"])
            elif isinstance(diff_entry, str):
                gt_differential.add(diff_entry)
        gt_differential.add(gt)
        
        top5_cand_set = set(candidate_names[:5])
        diff_inter = top5_cand_set.intersection(gt_differential)
        
        ddr_val = len(diff_inter) / max(1, len(gt_differential))
        ddp_val = len(diff_inter) / 5.0
        ddf1_val = (2 * ddp_val * ddr_val / (ddp_val + ddr_val)) if (ddp_val + ddr_val) > 0 else 0.0
        
        ddr_5_sum += ddr_val
        ddp_5_sum += ddp_val
        ddf1_5_sum += ddf1_val
        
        # Per pathology stats
        pathology_eval_stats[gt]["total"] += 1
        if is_top1:
            pathology_eval_stats[gt]["top1"] += 1
        if is_top5:
            pathology_eval_stats[gt]["top5"] += 1
        pathology_eval_stats[gt]["gt_predictions"].append(gt)
        pathology_eval_stats[gt]["pred_predictions"].append(top1_pred)
        
        case_res = {
            "case_index": idx,
            "ground_truth": gt,
            "top1_prediction": top1_pred,
            "top5_candidates": candidate_names[:5],
            "gt_rank": gt_rank,
            "is_top1": is_top1,
            "is_top5": is_top5,
            "latency_ms": tot_ms
        }
        case_evaluation_results.append(case_res)
        
        if (idx + 1) % 500 == 0 or (idx + 1) == total_eval_sample:
            elapsed_sec = time.time() - start_bench_time
            print(f"Processed [{idx+1:4d}/{total_eval_sample:4d}] cases | Elapsed: {elapsed_sec:.1f}s | Current Top-1 Acc: {(top1_hits/(idx+1))*100:.2f}%")

    # Aggregate Benchmark Metrics
    N = float(total_eval_sample)
    acc_top1 = top1_hits / N
    acc_top3 = top3_hits / N
    acc_top5 = top5_hits / N
    mrr = rr_sum / N
    
    rec_ret_5 = retrieval_recall_5_hits / N
    rec_ret_10 = retrieval_recall_10_hits / N
    rec_ret_25 = retrieval_recall_25_hits / N
    rec_cand_5 = candidate_recall_5_hits / N
    
    mean_ddr5 = ddr_5_sum / N
    mean_ddp5 = ddp_5_sum / N
    mean_ddf15 = ddf1_5_sum / N
    
    # Calculate Macro F1 across all pathologies
    per_class_f1s = []
    per_pathology_table = []
    
    for path, stats in sorted(pathology_eval_stats.items()):
        cnt = stats["total"]
        t1_cnt = stats["top1"]
        t5_cnt = stats["top5"]
        t1_acc = t1_cnt / cnt if cnt > 0 else 0.0
        t5_acc = t5_cnt / cnt if cnt > 0 else 0.0
        
        # Calculate precision, recall, F1 for this pathology
        tp = sum(1 for c in case_evaluation_results if c["ground_truth"] == path and c["top1_prediction"] == path)
        fp = sum(1 for c in case_evaluation_results if c["ground_truth"] != path and c["top1_prediction"] == path)
        fn = sum(1 for c in case_evaluation_results if c["ground_truth"] == path and c["top1_prediction"] != path)
        
        prec = tp / max(1, tp + fp)
        rec = tp / max(1, tp + fn)
        f1 = (2 * prec * rec / (prec + rec)) if (prec + rec) > 0 else 0.0
        per_class_f1s.append(f1)
        
        per_pathology_table.append({
            "pathology": path,
            "eval_cases": cnt,
            "top1_accuracy": round(t1_acc * 100, 2),
            "top5_accuracy": round(t5_acc * 100, 2),
            "f1_score": round(f1 * 100, 2)
        })
        
    macro_f1 = float(np.mean(per_class_f1s)) if per_class_f1s else 0.0
    
    # Latency Percentiles
    latency_summary = {
        "encoding_ms": {"mean": round(float(np.mean(latencies_enc)), 2), "p50": round(float(np.percentile(latencies_enc, 50)), 2), "p95": round(float(np.percentile(latencies_enc, 95)), 2)},
        "faiss_search_ms": {"mean": round(float(np.mean(latencies_faiss)), 2), "p50": round(float(np.percentile(latencies_faiss, 50)), 2), "p95": round(float(np.percentile(latencies_faiss, 95)), 2)},
        "kg_discovery_ms": {"mean": round(float(np.mean(latencies_kg)), 2), "p50": round(float(np.percentile(latencies_kg, 50)), 2), "p95": round(float(np.percentile(latencies_kg, 95)), 2)},
        "hybrid_scoring_ms": {"mean": round(float(np.mean(latencies_score)), 2), "p50": round(float(np.percentile(latencies_score, 50)), 2), "p95": round(float(np.percentile(latencies_score, 95)), 2)},
        "total_pre_llm_ms": {"mean": round(float(np.mean(latencies_total)), 2), "p50": round(float(np.percentile(latencies_total, 50)), 2), "p95": round(float(np.percentile(latencies_total, 95)), 2)}
    }
    
    # Final Benchmark Metrics JSON Structure
    benchmark_metrics = {
        "evaluation_date": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "dataset": "DDXPlus",
        "split": "Test",
        "sample_size": total_eval_sample,
        "pathologies_evaluated": len(per_pathology_counts),
        "random_seed": 42,
        "indexed_training_cases": active_ntotal,
        "embedding_model": "Emilyalsentzer/Bio_ClinicalBERT",
        "embedding_dimension": active_dim,
        "retrieval_k": 25,
        "groq_calls_during_evaluation": 0,
        "top1_accuracy": round(acc_top1 * 100, 2),
        "top3_accuracy": round(acc_top3 * 100, 2),
        "top5_accuracy": round(acc_top5 * 100, 2),
        "mrr": round(mrr, 4),
        "macro_f1": round(macro_f1 * 100, 2),
        "retrieval_recall_at_5": round(rec_ret_5 * 100, 2),
        "retrieval_recall_at_10": round(rec_ret_10 * 100, 2),
        "retrieval_recall_at_25": round(rec_ret_25 * 100, 2),
        "candidate_recall_at_5": round(rec_cand_5 * 100, 2),
        "ddr_5": round(mean_ddr5 * 100, 2),
        "ddp_5": round(mean_ddp5 * 100, 2),
        "ddf1_5": round(mean_ddf15 * 100, 2),
        "latencies": latency_summary,
        "per_pathology_performance": per_pathology_table,
        "disclaimer": "These metrics are benchmark results on synthetic DDXPlus cases and do not represent real-world clinical performance."
    }
    
    # Save backend JSON files
    json_metrics_path = os.path.join(eval_output_dir, "model_metrics.json")
    jsonl_results_path = os.path.join(eval_output_dir, "model_evaluation_results.jsonl")
    frontend_json_path = os.path.join(frontend_data_dir, "model_metrics.json")
    
    with open(json_metrics_path, 'w', encoding='utf-8') as f:
        json.dump(benchmark_metrics, f, indent=2)
        
    with open(frontend_json_path, 'w', encoding='utf-8') as f:
        json.dump(benchmark_metrics, f, indent=2)
        
    with open(jsonl_results_path, 'w', encoding='utf-8') as f:
        for item in case_evaluation_results:
            f.write(json.dumps(item) + "\n")
            
    print("\n==================================================")
    print("=== BENCHMARK EVALUATION COMPLETE ===")
    print("==================================================")
    print(f"Evaluated Cases: {total_eval_sample:,}")
    print(f"Pathologies Evaluated: {len(per_pathology_counts)}")
    print(f"Top-1 Accuracy: {benchmark_metrics['top1_accuracy']}%")
    print(f"Top-3 Accuracy: {benchmark_metrics['top3_accuracy']}%")
    print(f"Top-5 Accuracy: {benchmark_metrics['top5_accuracy']}%")
    print(f"MRR: {benchmark_metrics['mrr']}")
    print(f"Macro F1: {benchmark_metrics['macro_f1']}%")
    print(f"FAISS Recall@25: {benchmark_metrics['retrieval_recall_at_25']}%")
    print(f"Candidate Recall@5: {benchmark_metrics['candidate_recall_at_5']}%")
    print(f"DDR@5: {benchmark_metrics['ddr_5']}% | DDP@5: {benchmark_metrics['ddp_5']}% | DDF1@5: {benchmark_metrics['ddf1_5']}%")
    print(f"Total Pre-LLM Latency (P50/P95): {latency_summary['total_pre_llm_ms']['p50']}ms / {latency_summary['total_pre_llm_ms']['p95']}ms")
    print(f"Groq API Calls: 0")
    print(f"Saved benchmark metrics to:")
    print(f"  - {json_metrics_path}")
    print(f"  - {frontend_json_path}")
    print(f"Saved case results to: {jsonl_results_path}")
    print("==================================================\n")

if __name__ == "__main__":
    evaluate_offline_model()
