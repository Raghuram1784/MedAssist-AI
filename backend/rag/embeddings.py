import torch
import numpy as np
from transformers import AutoTokenizer, AutoModel
from typing import List, Union, Optional, Any
from tqdm import tqdm

class BioClinicalBERTEncoder:
    def __init__(self, model_name: str = "Emilyalsentzer/Bio_ClinicalBERT", device: Optional[str] = None):
        """
        Initialize the BioClinicalBERT encoder.
        
        Args:
            model_name: Hugging Face model identifier.
            device: Computing device ('cuda', 'cpu', or None for auto-detect).
        """
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        print(f"Initializing BioClinicalBERTEncoder on device: {self.device}")
        
        # Load pre-trained tokenizer and model
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name).to(self.device)
        self.model.eval() # Put model in evaluation mode

    def _mean_pooling(self, model_output: Any, attention_mask: torch.Tensor) -> torch.Tensor:
        """
        Perform mean pooling on the token embeddings using the attention mask to filter padding.
        """
        token_embeddings = model_output[0] # First element of model_output contains all token embeddings
        
        # Expand attention mask to match token embeddings dimensions
        input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
        
        # Sum token embeddings weighted by attention mask
        sum_embeddings = torch.sum(token_embeddings * input_mask_expanded, 1)
        
        # Calculate sum of mask weights (clamped to prevent division by zero)
        sum_mask = torch.clamp(input_mask_expanded.sum(1), min=1e-9)
        
        return sum_embeddings / sum_mask

    def encode(self, texts: Union[str, List[str]], batch_size: int = 32, normalize: bool = True) -> np.ndarray:
        """
        Encode a list of texts into dense vectors.
        
        Args:
            texts: A single string or a list of strings to encode.
            batch_size: Batch size for tokenization and model inference.
            normalize: If True, L2-normalize the resulting vectors for cosine similarity.
            
        Returns:
            A numpy array of shape (num_texts, embedding_dim).
        """
        if isinstance(texts, str):
            texts = [texts]

        all_embeddings = []
        
        # Batch processing
        for i in tqdm(range(0, len(texts), batch_size), desc="Encoding clinical narratives"):
            batch_texts = texts[i:i + batch_size]
            
            # Tokenize batch with standard truncating/padding (128 max length)
            encoded_input = self.tokenizer(
                batch_texts,
                padding=True,
                truncation=True,
                max_length=128,
                return_tensors='pt'
            ).to(self.device)
            
            # Run model inference
            with torch.no_grad():
                model_output = self.model(**encoded_input)
                
            # Perform mean pooling
            batch_embeddings = self._mean_pooling(model_output, encoded_input['attention_mask'])
            
            # L2 Normalize vectors if required (Inner Product of L2-normalized vectors is Cosine Similarity)
            if normalize:
                batch_embeddings = torch.nn.functional.normalize(batch_embeddings, p=2, dim=1)
                
            all_embeddings.append(batch_embeddings.cpu().numpy())
            
        return np.vstack(all_embeddings)
