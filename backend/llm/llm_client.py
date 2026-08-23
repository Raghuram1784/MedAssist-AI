import os
from dotenv import load_dotenv
from groq import Groq

# Load environment variables from .env file at application startup
load_dotenv()

class LLMClient:
    def __init__(self):
        """
        Initialize the LLM client using environment configuration keys.
        """
        self.api_key = os.environ.get("GROK_API_KEY")
        self.model_name = os.environ.get("GROQ_MODEL", "llama3-70b-8192")
        
        if not self.api_key:
            raise ValueError(
                "Environment variable 'GROK_API_KEY' not found. "
                "Please configure it in your .env file."
            )
            
        self.client = Groq(api_key=self.api_key)

    def query(self, prompt: str, system_message: str = "You are a helpful clinical assistant.") -> str:
        """
        Query the configured Groq LLM model with user and system messages.
        
        Args:
            prompt: The user-facing prompt text containing grounded clinical evidence.
            system_message: System instructions for LLM clinical constraints.
            
        Returns:
            The raw text completion returned by the model.
        """
        try:
            completion = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,  # Low temperature for stable clinical reasoning
                max_tokens=2048
            )
            
            return completion.choices[0].message.content or ""
            
        except Exception as e:
            # Handle connection errors or quota limits gracefully
            print(f"Error querying Groq API: {e}")
            return ""
