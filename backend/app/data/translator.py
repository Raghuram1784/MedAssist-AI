import re
from typing import Dict, Any, List, Optional
from backend.app.data.parser import PatientCase

class ClinicalTranslator:
    def __init__(self, evidences_metadata: Dict[str, Any], conditions_metadata: Dict[str, Any]):
        """
        Initialize the translator with loaded metadata.
        """
        self.evidences = evidences_metadata
        self.conditions = conditions_metadata

    def decode_value(self, ev_id: str, raw_val: str) -> str:
        """
        Decode the raw value of an evidence using its metadata.
        """
        ev_meta = self.evidences.get(ev_id)
        if not ev_meta:
            return raw_val

        value_meaning = ev_meta.get("value_meaning", {})
        
        # 1. Check if value is in value_meaning
        if raw_val in value_meaning:
            meaning = value_meaning[raw_val].get("en", raw_val)
            # Normalize common abbreviation codes
            if meaning == "N":
                return "No"
            if meaning == "Y":
                return "Yes"
            if meaning == "NA" or meaning == "N/A":
                return "Not Applicable"
            return meaning

        # 2. Check for binary type
        if ev_meta.get("data_type") == "B":
            if raw_val in (1, "1", True, "True"):
                return "Yes"
            if raw_val in (0, "0", False, "False"):
                return "No"

        # 3. Check for scale (0 to 10)
        p_vals = ev_meta.get("possible-values", [])
        if p_vals == [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]:
            try:
                val_int = int(raw_val)
                return f"{val_int}/10"
            except (ValueError, TypeError):
                pass

        # 4. Standard cleanups for boolean-like string values
        if raw_val == "1":
            return "Yes"
        if raw_val == "0":
            return "No"

        return str(raw_val)

    def translate_evidence(self, ev_string: str) -> Dict[str, Any]:
        """
        Translate a single evidence string (e.g. 'E_53' or 'E_54_@_V_112') into detailed English.
        """
        # Parse E_ID and optional raw value
        if "@" in ev_string:
            parts = ev_string.split("_@_")
            if len(parts) != 2:
                # Fallback for alternative @ structures
                parts = ev_string.split("@")
            ev_id = parts[0].strip()
            raw_val = parts[1].strip()
        else:
            ev_id = ev_string.strip()
            raw_val = "1"  # Default active binary value

        ev_meta = self.evidences.get(ev_id)
        if not ev_meta:
            return {
                "id": ev_id,
                "name": ev_id,
                "question": f"Unknown evidence code: {ev_id}",
                "value": raw_val,
                "raw_value": raw_val,
                "is_antecedent": False,
                "data_type": "Unknown"
            }

        question = ev_meta.get("question_en", ev_meta.get("name", ev_id))
        is_antecedent = ev_meta.get("is_antecedent", False)
        data_type = ev_meta.get("data_type", "Unknown")
        decoded_val = self.decode_value(ev_id, raw_val)

        return {
            "id": ev_id,
            "name": ev_meta.get("name", ev_id),
            "question": question,
            "value": decoded_val,
            "raw_value": raw_val,
            "is_antecedent": is_antecedent,
            "data_type": data_type
        }

    def generate_narrative(self, 
                           age: int, 
                           sex: str, 
                           initial_symptom: Dict[str, Any], 
                           symptoms: List[Dict[str, Any]], 
                           antecedents: List[Dict[str, Any]]) -> str:
        """
        Generate a natural language clinical narrative / summary of the patient's case.
        """
        gender_word = "male" if sex.upper() == "M" else "female"
        pronoun = "He" if sex.upper() == "M" else "She"
        possessive = "His" if sex.upper() == "M" else "Her"

        # 1. Intro and reason for consultation
        init_q = initial_symptom["question"].replace("Do you have ", "").replace("Have you ", "").replace("?", "").lower()
        narrative_parts = [
            f"The patient is a {age}-year-old {gender_word}.",
            f"{pronoun} presents for a consultation, reporting '{initial_symptom['value']}' for the initial symptom query: '{initial_symptom['question']}'."
        ]

        # 2. Symptoms reported
        if symptoms:
            symptom_statements = []
            for s in symptoms:
                # Formatting binary symptoms vs. multi-choice vs. scales
                val = s["value"]
                q = s["question"]
                if s["data_type"] == "B" and val == "Yes":
                    # Convert binary questions to positive statements where possible
                    # E.g. "Do you have a fever?" -> "reports having a fever"
                    clean_q = q.replace("Do you have ", "").replace("Have you ", "").replace("?", "").strip()
                    symptom_statements.append(f"reports {clean_q}")
                else:
                    # E.g. "How intense is the pain? -> 6/10"
                    symptom_statements.append(f"notes that '{q}' is '{val}'")
            
            if symptom_statements:
                narrative_parts.append(f"{pronoun} presents with the following clinical symptoms: " + "; ".join(symptom_statements) + ".")

        # 3. Medical history / Risk factors
        if antecedents:
            antecedent_statements = []
            for a in antecedents:
                val = a["value"]
                q = a["question"]
                if a["data_type"] == "B" and val == "Yes":
                    clean_q = q.replace("Do you have ", "").replace("Have you ", "").replace("?", "").strip()
                    antecedent_statements.append(f"has history of {clean_q}")
                else:
                    antecedent_statements.append(f"indicates '{val}' for history question: '{q}'")
            
            if antecedent_statements:
                narrative_parts.append(f"{possessive} medical history and risk factors include: " + "; ".join(antecedent_statements) + ".")

        return " ".join(narrative_parts)

    def translate_case(self, case: PatientCase) -> Dict[str, Any]:
        """
        Translate an entire PatientCase into structured English clinical data.
        """
        # Parse initial evidence
        initial_symptom = self.translate_evidence(case.initial_evidence)

        # Parse all evidences
        translated_evidences = [self.translate_evidence(ev) for ev in case.evidences]

        # Separate symptoms vs antecedents
        symptoms = [ev for ev in translated_evidences if not ev["is_antecedent"]]
        antecedents = [ev for ev in translated_evidences if ev["is_antecedent"]]

        # Generate narrative
        narrative = self.generate_narrative(
            age=case.age,
            sex=case.sex,
            initial_symptom=initial_symptom,
            symptoms=symptoms,
            antecedents=antecedents
        )

        return {
            "demographics": {
                "age": case.age,
                "sex": case.sex,
                "gender_decoded": "male" if case.sex.upper() == "M" else "female"
            },
            "initial_evidence": initial_symptom,
            "symptoms": symptoms,
            "antecedents": antecedents,
            "narrative": narrative,
            "ground_truth": case.pathology,
            "differential": [{"pathology": item.pathology, "probability": item.probability} for item in case.differential_diagnosis]
        }
