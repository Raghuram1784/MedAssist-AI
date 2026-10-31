import os
import sys
import time
import torch
import numpy as np
from transformers import AutoTokenizer, AutoModel

def bench():
    print(f"PyTorch threads: {torch.get_num_threads()}, CPU count: {os.cpu_count()}")
    tokenizer = AutoTokenizer.from_pretrained("Emilyalsentzer/Bio_ClinicalBERT")
    model = AutoModel.from_pretrained("Emilyalsentzer/Bio_ClinicalBERT")
    model.eval()

    texts = ["Patient is a 45-year-old male presenting with fever, severe cough, and breathing difficulty for 3 days."] * 256

    # Test 1: standard torch.no_grad() batch 64
    t0 = time.time()
    for batch_size in [64, 128, 256]:
        t_start = time.time()
        with torch.inference_mode():
            encoded = tokenizer(texts[:batch_size], padding=True, truncation=True, max_length=128, return_tensors='pt')
            output = model(**encoded)
            embeddings = output[0].mean(dim=1)
        dur = time.time() - t_start
        print(f"Batch size {batch_size}: {dur:.3f}s ({batch_size/dur:.1f} items/sec)")

if __name__ == "__main__":
    bench()
