import os
import time
import torch
from transformers import AutoTokenizer, AutoModel

def test():
    torch.set_num_threads(4)
    tokenizer = AutoTokenizer.from_pretrained("Emilyalsentzer/Bio_ClinicalBERT")
    model = AutoModel.from_pretrained("Emilyalsentzer/Bio_ClinicalBERT")
    model.eval()
    
    # Generate 192 sample narratives
    texts = ["Patient is a 45-year-old female presenting with fever, cough, and breathing difficulty for 3 days."] * 192

    for bs in [16, 32, 48, 64]:
        t0 = time.time()
        for i in range(0, len(texts), bs):
            with torch.inference_mode():
                inputs = tokenizer(texts[i:i+bs], padding=True, truncation=True, max_length=128, return_tensors="pt")
                out = model(**inputs)
        dur = time.time() - t0
        print(f"Batch Size {bs:2d}: Total time {dur:.2f}s ({len(texts)/dur:.1f} items/sec)")

if __name__ == "__main__":
    test()
