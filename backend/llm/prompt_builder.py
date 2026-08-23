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
    kg_evidence: List[Dict[str, Any]],
    max_chars: int = 3000
) -> str:
    """
    Assemble the prompt with patient context, compressed RAG cases, and compressed KG evidence.
    Applies active token safety trimming if prompt length exceeds max_chars.
    """
    # 1. Format Patient Section (Always kept intact)
    patient_section = (
        f"Patient Presentation:\n"
        f"- Age: {patient_age}\n"
        f"- Gender: {patient_sex}\n"
        f"- Presenting Symptoms: {', '.join(patient_symptoms)}\n"
        f"- Synthesized Narrative: {patient_narrative}\n"
    )
    
    # 2. Process RAG cases to compressed representations (Remove narratives, cap symptoms)
    processed_rag_cases = []
    for case in similar_cases:
        # Get active symptoms (value == "Yes" or True)
        active_symptoms = []
        for s in case.get("symptoms", []):
            if s.get("value") in ("Yes", "1", 1, True, "True"):
                active_symptoms.append(s.get("question", s.get("id")))
                
        # Limit to top 3-5 symptoms
        top_symptoms = active_symptoms[:5]
        
        case_info = {
            "ground_truth": case.get("ground_truth"),
            "score": case.get("similarity_score", 0.0),
            "symptoms": top_symptoms
        }
        processed_rag_cases.append(case_info)
        
    # 3. Process KG evidence to compressed representations (Cap missing symptom counts)
    processed_kg_evidence = []
    for item in kg_evidence:
        if "error" in item:
            continue
        kg_info = {
            "disease": item.get("disease"),
            "icd10": item.get("icd10"),
            "severity": item.get("severity"),
            "matched": item.get("matched_symptoms", []),
            # Limit missing supporting symptoms to top 3-4 items
            "missing": item.get("unmatched_symptoms", [])[:4]
        }
        processed_kg_evidence.append(kg_info)

    # 4. Iteratively construct prompt, trimming RAG/KG context if length exceeds max_chars
    rag_count = len(processed_rag_cases)
    
    while True:
        active_cases = processed_rag_cases[:rag_count]
        active_diagnoses = set(c["ground_truth"] for c in active_cases)
        
        # Build RAG text block
        rag_lines = []
        for idx, case in enumerate(active_cases, 1):
            line = (
                f"[Case {idx}] Score: {case['score']:.4f}\n"
                f"  - Diagnosis: {case['ground_truth']}\n"
                f"  - Supporting Symptoms: {', '.join(case['symptoms'])}"
            )
            rag_lines.append(line)
        rag_section = "Top Similar Cases:\n" + "\n\n".join(rag_lines)
        
        # Build KG text block (only for conditions remaining in trimmed similar cases)
        kg_lines = []
        for item in processed_kg_evidence:
            if item["disease"] in active_diagnoses:
                line = (
                    f"- Disease: {item['disease']} (ICD-10: {item['icd10']}, Severity: {item['severity']})\n"
                    f"  - Matched Symptoms: {', '.join(item['matched'])}\n"
                    f"  - Supporting Symptoms Patient Lacks: {', '.join(item['missing'])}"
                )
                kg_lines.append(line)
        kg_section = "Knowledge Graph Evidence:\n" + "\n\n".join(kg_lines)
        
        # Build full prompt
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
        
        # Stop trimming if length is safe or we reached minimum of 2 RAG cases
        if len(prompt) <= max_chars or rag_count <= 2:
            break
            
        # Trim context by dropping lowest scoring RAG case
        rag_count -= 1
        
    return prompt
