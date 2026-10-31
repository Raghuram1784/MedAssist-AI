import os
import time
import torch
from transformers import AutoTokenizer, AutoModel

def test():
    tokenizer = AutoTokenizer.from_pretrained("Emilyalsentzer/Bio_ClinicalBERT")
    model = AutoModel.from_pretrained("Emilyalsentzer/Bio_ClinicalBERT")
    model.eval()
    texts = ["Patient is a 45-year-old male presenting with fever, cough, and breathing difficulty for 3 days."] * 128

    for num_t in [4, 6, 8, 12]:
        torch.set_num_threads(num_t)
        t0 = time.time()
        with torch.inference_mode():
            inputs = tokenizer(texts, padding=True, truncation=True, max_length=128, return_tensors="pt")
            out = model(**inputs)
        dur = time.time() - t0
        print(f"Threads={num_t}: {dur:.3f}s ({128/dur:.1f} items/sec)")

if __name__ == "__main__":
    test()
