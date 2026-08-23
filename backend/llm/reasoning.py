import json
import networkx as nx
from typing import List, Dict, Any, Optional

from backend.llm.llm_client import LLMClient
from backend.llm.prompt_builder import build_grounded_prompt, SYSTEM_MESSAGE
from backend.knowledge_graph.graph_queries import get_disease_explanation

class ClinicalReasoningSystem:
    def __init__(self, retriever, graph):
        """
        Initialize the reasoning system coordinator.
        
        Args:
            retriever: The ClinicalCaseRetriever instance (Phase 2 RAG).
            graph: The NetworkX DiGraph instance (Phase 3 KG).
        """
        self.retriever = retriever
        self.graph = graph
        self.llm_client = LLMClient()

    def generate_clinical_reasoning(
        self,
        age: int,
        sex: str,
        symptoms: List[str],
        narrative: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Run the end-to-end CDSS reasoning pipeline:
        1. Formulate patient narrative and query.
        2. Query FAISS vector store for 5 similar cases.
        3. Query clinical Knowledge Graph for candidate diseases.
        4. Build the grounded prompt context.
        5. Execute Groq API LLM query.
        6. Parse and enrich JSON results.
        
        Returns:
            Structured JSON dict matching target explanation schemas.
        """
        gender_word = "male" if sex.upper() == "M" else "female"
        
        # 1. Synthesize narrative if not provided
        if not narrative:
            narrative = f"The patient is a {age}-year-old {gender_word}. Presenting symptoms include: {', '.join(symptoms)}."
            
        # 2. Retrieve Similar Cases (RAG)
        query_text = f"{age} year old {gender_word} with {', '.join(symptoms)}"
        similar_cases = self.retriever.retrieve_similar_cases(query_text, top_k=5)
        
        # 3. Query Knowledge Graph for candidate diseases found in RAG
        candidate_diseases = list(set([case["ground_truth"] for case in similar_cases]))
        kg_evidence = []
        for disease in candidate_diseases:
            explanation = get_disease_explanation(self.graph, disease, symptoms)
            kg_evidence.append(explanation)
            
        # 4. Construct Grounded Prompt
        prompt = build_grounded_prompt(
            patient_age=age,
            patient_sex=sex,
            patient_symptoms=symptoms,
            patient_narrative=narrative,
            similar_cases=similar_cases,
            kg_evidence=kg_evidence
        )
        
        # 5. Query LLM
        raw_response = self.llm_client.query(prompt, system_message=SYSTEM_MESSAGE)
        
        # 6. Parse JSON Response robustly
        cleaned_response = self._clean_json_string(raw_response)
        
        try:
            parsed_json = json.loads(cleaned_response)
            
            # Ensure required schema structure is populated
            if "possible_conditions" not in parsed_json:
                parsed_json["possible_conditions"] = []
            if "alternative_conditions" not in parsed_json:
                parsed_json["alternative_conditions"] = candidate_diseases
            if "confidence_level" not in parsed_json:
                parsed_json["confidence_level"] = "Medium"
            if "explanation" not in parsed_json:
                parsed_json["explanation"] = "No explanation provided by the model."
                
            # Enrich graph support field directly using local NetworkX verified descriptions
            parsed_json["knowledge_graph_support"] = [
                item.get("explanation") for item in kg_evidence if "explanation" in item
            ]
            
            return parsed_json
            
        except Exception as e:
            # Fallback dictionary in case of API failure or JSON parsing issues
            print(f"Failed to parse LLM completion: {e}")
            return {
                "possible_conditions": [],
                "supporting_evidence": symptoms,
                "alternative_conditions": candidate_diseases,
                "knowledge_graph_support": [
                    item.get("explanation") for item in kg_evidence if "explanation" in item
                ],
                "confidence_level": "Low - failed to parse LLM structured response.",
                "explanation": (
                    f"A JSON parsing error occurred when decoding the LLM response. "
                    f"Raw completion: {raw_response}"
                )
            }
            
    def _clean_json_string(self, text: str) -> str:
        """
        Strip markdown formatting block wrappers from LLM response.
        """
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return text.strip()
