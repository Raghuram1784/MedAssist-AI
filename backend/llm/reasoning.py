import json
import networkx as nx
from typing import List, Dict, Any, Optional

from backend.llm.llm_client import LLMClient
from backend.llm.prompt_builder import build_grounded_prompt, SYSTEM_MESSAGE
from backend.knowledge_graph.graph_queries import get_disease_explanation, get_related_diseases, get_symptoms_for_disease
from backend.app.data.normalizer import normalize_symptom_list

# Specific severe pathologies that require key distinguishing features to prevent over-ranking on generic symptoms
SPECIFIC_SEVERE_PATHOLOGIES = {
    "Tuberculosis": ["Coughing up blood", "Weight loss", "Night sweats"],
    "Ebola": ["Coughing up blood", "Unexplained bleeding", "High fever"],
    "Bronchiectasis": ["Cough with colored sputum", "Coughing up blood"],
    "Sarcoidosis": ["Skin lesions", "Granulomas", "Joint pain"],
    "Myasthenia gravis": ["Muscle weakness", "Drooping eyelid", "Double vision"],
    "SLE": ["Butterfly rash", "Joint pain", "Photosensitivity"],
    "Boerhaave": ["Severe chest pain", "Vomiting", "Subcutaneous emphysema"],
}

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
        Run the end-to-end CDSS reasoning pipeline (Phase 5.4):
        1. Normalize symptoms with terminology mapping layer.
        2. Retrieve top-25 internal similar cases from FAISS vector store.
        3. Discover candidates using Knowledge Graph + FAISS cohort ground truths.
        4. Score and rank candidates using hybrid multi-factor clinical evidence.
        5. Build compact grounded prompt context (with Top-5 FAISS cases).
        6. Execute Groq API LLM reasoning.
        7. Format and return structured assessment response.
        """
        gender_word = "male" if sex.upper() == "M" else "female"
        
        # 1. Normalize Symptoms
        normalized_symptoms = normalize_symptom_list(symptoms)
        if not normalized_symptoms:
            normalized_symptoms = symptoms
            
        # 2. Formulate Query & Retrieve Top-25 Similar Cases (FAISS)
        if not narrative:
            narrative = f"The patient is a {age}-year-old {gender_word}. Presenting symptoms include: {', '.join(normalized_symptoms)}."
            
        query_text = f"{age} year old {gender_word} with {', '.join(normalized_symptoms)}"
        retrieved_cases_25 = self.retriever.retrieve_similar_cases(query_text, top_k=25)
        
        # 3. Candidate Discovery (FAISS + Knowledge Graph)
        candidate_pool = set()
        
        # a) Candidates from FAISS Top 25 (ground truth & top differential entries)
        for case in retrieved_cases_25:
            if "ground_truth" in case:
                candidate_pool.add(case["ground_truth"])
            for diff_item in case.get("differential", []):
                if isinstance(diff_item, dict) and "pathology" in diff_item:
                    candidate_pool.add(diff_item["pathology"])
                    
        # b) Candidates from Knowledge Graph (diseases directly connected to normalized symptoms)
        for sym in normalized_symptoms:
            kg_diseases = get_related_diseases(self.graph, sym)
            for d in kg_diseases:
                candidate_pool.add(d)

        # 4. Multi-Factor Hybrid Candidate Scoring
        # Scoring Weights:
        W_KG = 0.45       # Weight for Knowledge Graph symptom match ratio
        W_FAISS = 0.35    # Weight for FAISS cohort frequency & vector similarity
        W_DIFF = 0.20     # Weight for DDXPlus differential probability
        
        scored_candidates = []
        num_query_symptoms = max(1, len(normalized_symptoms))
        
        for candidate in candidate_pool:
            # a) KG Symptom Match Ratio
            kg_info = get_disease_explanation(self.graph, candidate, normalized_symptoms)
            matched_symptoms = kg_info.get("matched_symptoms", [])
            kg_match_ratio = len(matched_symptoms) / num_query_symptoms
            
            # b) FAISS Vector Evidence & Frequency
            faiss_sim_sum = 0.0
            faiss_count = 0
            diff_prob_sum = 0.0
            
            for case in retrieved_cases_25:
                sim = case.get("similarity_score", 0.0)
                gt = case.get("ground_truth", "")
                if gt.lower() == candidate.lower():
                    faiss_sim_sum += sim
                    faiss_count += 1
                    
                for diff_item in case.get("differential", []):
                    if isinstance(diff_item, dict) and diff_item.get("pathology", "").lower() == candidate.lower():
                        diff_prob_sum += float(diff_item.get("probability", 0.0)) * sim
                        
            faiss_freq_score = (faiss_count / len(retrieved_cases_25)) if retrieved_cases_25 else 0.0
            avg_sim = (faiss_sim_sum / faiss_count) if faiss_count > 0 else 0.0
            faiss_score = (0.6 * faiss_freq_score) + (0.4 * avg_sim)
            diff_score = min(1.0, diff_prob_sum / max(1, faiss_count if faiss_count > 0 else 1))
            
            # c) Generic Input & Distinguishing Symptom Penalty
            penalty = 0.0
            if candidate in SPECIFIC_SEVERE_PATHOLOGIES:
                required_features = SPECIFIC_SEVERE_PATHOLOGIES[candidate]
                has_distinguishing_feature = any(
                    feat.lower() in [s.lower() for s in normalized_symptoms]
                    for feat in required_features
                )
                if not has_distinguishing_feature and num_query_symptoms <= 3:
                    penalty = 0.30  # Apply penalty if generic presentation lacks key distinguishing symptoms
                    
            # Compute Hybrid Score
            hybrid_score = (W_KG * kg_match_ratio) + (W_FAISS * faiss_score) + (W_DIFF * diff_score) - penalty
            
            scored_candidates.append({
                "disease": candidate,
                "hybrid_score": hybrid_score,
                "kg_match_ratio": kg_match_ratio,
                "faiss_count": faiss_count,
                "kg_info": kg_info
            })
            
        # Sort candidates by hybrid score descending
        scored_candidates.sort(key=lambda x: x["hybrid_score"], reverse=True)
        
        # Select top 5 candidates for detailed evidence breakdown
        top_candidates = scored_candidates[:5]
        candidate_diseases = [c["disease"] for c in top_candidates]
        kg_evidence = [c["kg_info"] for c in top_candidates if "error" not in c["kg_info"]]
        
        # 5. Determine Confidence Level based on Evidence Specificity
        best_score = top_candidates[0]["hybrid_score"] if top_candidates else 0.0
        best_kg_match = top_candidates[0]["kg_match_ratio"] if top_candidates else 0.0
        
        if num_query_symptoms <= 2 and best_kg_match < 0.7:
            confidence_level = "Medium - Generic presentation with multiple plausible candidates; key distinguishing features missing."
        elif best_kg_match >= 0.75 and best_score > 0.5:
            confidence_level = "High - Strong Knowledge Graph evidence match and FAISS historical case alignment."
        elif best_score < 0.3:
            confidence_level = "Low - Limited matching evidence across Knowledge Graph and index cohorts."
        else:
            confidence_level = "Medium - Supportive evidence present with missing distinguishing symptoms."

        # 6. Top-5 FAISS Cases for Groq Context & Response Schema
        similar_cases_5 = retrieved_cases_25[:5]

        # 7. Construct Compact Grounded Prompt for Groq
        prompt = build_grounded_prompt(
            patient_age=age,
            patient_sex=sex,
            patient_symptoms=normalized_symptoms,
            patient_narrative=narrative,
            similar_cases=similar_cases_5,
            kg_evidence=kg_evidence
        )
        
        # 8. Execute Groq API Call
        raw_response = self.llm_client.query(prompt, system_message=SYSTEM_MESSAGE)
        cleaned_response = self._clean_json_string(raw_response)
        
        try:
            parsed_json = json.loads(cleaned_response)
            
            # Ensure schema completeness
            if "possible_conditions" not in parsed_json or not parsed_json["possible_conditions"]:
                parsed_json["possible_conditions"] = [
                    {
                        "condition": c["disease"],
                        "supporting_evidence": c["kg_info"].get("matched_symptoms", []),
                        "similar_cases_found": c["faiss_count"]
                    }
                    for c in top_candidates[:3]
                ]
            if "alternative_conditions" not in parsed_json:
                parsed_json["alternative_conditions"] = [c["disease"] for c in scored_candidates[3:8]]
                
            parsed_json["confidence_level"] = confidence_level
            parsed_json["knowledge_graph_support"] = [
                item.get("explanation") for item in kg_evidence if "explanation" in item
            ]
            parsed_json["similar_cases"] = similar_cases_5
            parsed_json["kg_evidence"] = kg_evidence
            
            return parsed_json
            
        except Exception as e:
            print(f"Failed to parse LLM completion: {e}")
            return {
                "possible_conditions": [
                    {
                        "condition": c["disease"],
                        "supporting_evidence": c["kg_info"].get("matched_symptoms", []),
                        "similar_cases_found": c["faiss_count"]
                    }
                    for c in top_candidates[:3]
                ],
                "alternative_conditions": [c["disease"] for c in scored_candidates[3:8]],
                "knowledge_graph_support": [
                    item.get("explanation") for item in kg_evidence if "explanation" in item
                ],
                "confidence_level": confidence_level,
                "explanation": (
                    f"Evidence synthesis based on {len(retrieved_cases_25)} retrieved historical cases "
                    f"and Knowledge Graph symptom paths."
                ),
                "similar_cases": similar_cases_5,
                "kg_evidence": kg_evidence
            }

    def _clean_json_string(self, text: str) -> str:
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return text.strip()
