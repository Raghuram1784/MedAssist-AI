import os
import sys
import time
import torch
import numpy as np
from transformers import AutoTokenizer, AutoModel

def test_quant():
    num_threads = os.cpu_count() or 8
    torch.set_num_threads(num_threads)
    print(f"Threads: {torch.get_num_threads()}")
    
    tokenizer = AutoTokenizer.from_pretrained("Emilyalsentzer/Bio_ClinicalBERT")
    model = AutoModel.from_pretrained("Emilyalsentzer/Bio_ClinicalBERT")
    model.eval()

    texts = ["Patient is a 45-year-old female presenting with fever, cough, and breathing difficulty."] * 128

    # FP32 test
    t0 = time.time()
    with torch.inference_mode():
        inputs = tokenizer(texts, padding=True, truncation=True, max_length=128, return_tensors="pt")
        out_fp32 = model(**inputs)[0].mean(dim=1)
    dur_fp32 = time.time() - t0
    print(f"FP32 batch 128 time: {dur_fp32:.3f}s ({128/dur_fp32:.1f} items/sec)")

    # INT8 Quantized test
    model_quant = torch.quantization.quantize_dynamic(model, {torch.nn.Linear}, dtype=torch.qint8)
    t0 = time.time()
    with torch.inference_mode():
        inputs = tokenizer(texts, padding=True, truncation=True, max_length=128, return_tensors="pt")
        out_int8 = model_quant(**inputs)[0].mean(dim=1)
    dur_int8 = time.time() - t0
    print(f"INT8 Quantized batch 128 time: {dur_int8:.3f}s ({128/dur_int8:.1f} items/sec)")

    # Similarity check between FP32 and INT8 embeddings
    sim = torch.nn.functional.cosine_similarity(out_fp32, out_int8, dim=1).mean().item()
    print(f"Embedding Cosine Similarity FP32 vs INT8: {sim:.4f}")

if __name__ == "__main__":
    test_quant()
