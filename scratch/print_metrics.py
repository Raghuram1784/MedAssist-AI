import json

with open("backend/evaluation/model_metrics.json", "r", encoding="utf-8") as f:
    d = json.load(f)

print(f"Overall Metrics:")
print(f"  Top-1: {d['top1_exact_accuracy']}%")
print(f"  Top-3: {d['top3_exact_accuracy']}%")
print(f"  Top-5: {d['top5_exact_accuracy']}%")
print(f"  MRR: {d['mrr']}")
print(f"  Macro F1: {d['macro_f1']}%")
print(f"  Min Pathology Recall: {d['min_pathology_recall']}%")
print(f"  FAISS Recall@5: {d['retrieval_recall_at_5']}%")
print(f"  FAISS Recall@10: {d['retrieval_recall_at_10']}%")
print(f"  FAISS Recall@25: {d['retrieval_recall_at_25']}%")
print(f"  Candidate Recall@5: {d['candidate_recall_at_5']}%")
print(f"  DDR@5: {d['ddr_5']}%")
print(f"  DDP@5: {d['ddp_5']}%")
print(f"  DDF1@5: {d['ddf1_5']}%")

print("\nComparison Table:")
for row in d['comparison_table']:
    print(f"  {row['mode']:<25}: Top-1: {row['top1']}%, Top-3: {row['top3']}%, Top-5: {row['top5']}%, MRR: {row['mrr']}, Macro F1: {row['macro_f1']}%")

print(f"\nAbsolute Improvement:")
print(f"  {d['absolute_improvement']}")

print(f"\nLatencies:")
for k, v in d['latencies'].items():
    print(f"  {k}: Mean: {v['mean']}ms, P50: {v['p50']}ms, P95: {v['p95']}ms")

print(f"\nPer Pathology Performance ({len(d['per_pathology_performance'])} pathologies):")
for p in d['per_pathology_performance']:
    print(f"| {p['pathology']:<42} | {p['eval_cases']:>4} | {p['top1_accuracy']:>6.2f}% | {p['top5_accuracy']:>6.2f}% | {p['precision']:>6.2f}% | {p['recall']:>6.2f}% | {p['f1_score']:>6.2f}% |")
