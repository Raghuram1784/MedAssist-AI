from typing import List, Dict, Any

SYSTEM_MESSAGE = (
    "You are an explainable clinical decision support assistant (CDSS).\n\n"
    "Analyze the provided patient information using the retrieved clinical cases (RAG) "
    "and Knowledge Graph relationships as grounding evidence. Your role is to provide "
    "differential diagnosis support, not a final diagnosis. You must explain any uncertainty "
    "if the evidence is insufficient. Do not make unsupported medical claims.\n\n"
    "You MUST respond ONLY with a valid JSON object matching the schema below. Do not include "
    "any markdown tags outside the JSON, conversation greetings, or explanations outside the JSON."
)

JSON_SCHEMA_INSTRUCTION = (
    "JSON Output Schema:\n"
    "{\n"
    "    \"possible_conditions\": [\n"
    "        {\n"
    "            \"condition\": \"Name of the condition\",\n"
    "            \"supporting_evidence\": [\"List of patient symptoms supporting this condition\"],\n"
    "            \"similar_cases_found\": 3  // Integer count of similar historical cases matching this condition\n"
    "        }\n"
    "    ],\n"
    "    \"alternative_conditions\": [\"List of alternative conditions to consider\"],\n"
    "    \"knowledge_graph_support\": [\"List of brief statements detailing matches/mismatches in the Knowledge Graph for candidate diseases\"],\n"
    "    \"confidence_level\": \"High / Medium / Low - explain why (e.g., 'Medium because RAG cases match symptoms, but patient lacks key antecedent risk factors in KG')\",\n"
    "    \"explanation\": \"A natural language explanation of your clinical reasoning, citing overlaps in similar historical cases and Knowledge Graph findings.\"\n"
    "}"
)

def build_grounded_prompt(
    patient_age: int,
    patient_sex: str,
    patient_symptoms: List[str],
    patient_narrative: str,
    similar_cases: List[Dict[str, Any]],
    kg_evidence: List[Dict[str, Any]]
) -> str:
    """
    Assemble the prompt with patient context, retrieved RAG cases, and Knowledge Graph relations.
    """
    # 1. Format Patient details
    patient_section = (
        f"Patient Information:\n"
        f"- Age: {patient_age}\n"
        f"- Gender: {patient_sex}\n"
        f"- Presenting Symptoms: {', '.join(patient_symptoms)}\n"
        f"- Synthesized Narrative: {patient_narrative}\n"
    )
    
    # 2. Format FAISS Retrieved Cases (RAG)
    rag_cases_list = []
    for idx, case in enumerate(similar_cases, 1):
        # Truncate clinical note to keep prompt clean
        narr = case.get("clinical_narrative", "")
        trunc_narr = (narr[:200] + "...") if len(narr) > 200 else narr
        
        # Resolve symptoms list
        case_symptoms = [
            s.get("question") for s in case.get("symptoms", []) 
            if s.get("value") == "Yes"
        ]
        
        case_text = (
            f"[Case {idx}] Score: {case.get('similarity_score', 0.0):.4f}\n"
            f"  - Diagnosis: {case.get('ground_truth')}\n"
            f"  - Key Symptoms: {', '.join(case_symptoms[:6])}\n"
            f"  - Clinical Note: {trunc_narr}"
        )
        rag_cases_list.append(case_text)
        
    rag_section = "FAISS Similar Cases Found (RAG Evidence):\n" + "\n\n".join(rag_cases_list)
    
    # 3. Format Knowledge Graph Evidence
    kg_entries = []
    for item in kg_evidence:
        # Check if error or valid
        if "error" in item:
            continue
            
        entry_text = (
            f"- Disease: {item.get('disease')}\n"
            f"  - ICD-10: {item.get('icd10')} | Severity level: {item.get('severity')}\n"
            f"  - Symptoms Matched in KG: {', '.join(item.get('matched_symptoms', []))}\n"
            f"  - Supporting KG Symptoms Missing in Patient: {', '.join(item.get('unmatched_symptoms', [])[:5])}"
        )
        kg_entries.append(entry_text)
        
    kg_section = "Clinical Knowledge Graph Structured Relations:\n" + "\n\n".join(kg_entries)
    
    # 4. Merge into final prompt template
    prompt = (
        f"Generate explainable diagnostic reasoning based on the following patient presentation "
        f"and supporting clinical contexts.\n\n"
        f"==================================================\n"
        f"{patient_section}\n"
        f"==================================================\n"
        f"{rag_section}\n"
        f"==================================================\n"
        f"{kg_section}\n"
        f"==================================================\n\n"
        f"{JSON_SCHEMA_INSTRUCTION}\n\n"
        f"Begin analysis. Return ONLY the JSON object."
    )
    
    return prompt
