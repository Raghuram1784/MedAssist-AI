from typing import List, Dict

# Canonical mapping of common patient symptom phrasing to DDXPlus evidence terminology.
# IMPORTANT: This maps equivalent symptom terminology ONLY. It does NOT map symptoms to diagnoses.
SYMPTOM_TERMINOLOGY_MAP: Dict[str, str] = {
    "shortness of breath": "Breathing difficulty",
    "breathlessness": "Breathing difficulty",
    "sob": "Breathing difficulty",
    "difficulty breathing": "Breathing difficulty",
    "dyspnea": "Breathing difficulty",
    "coughing": "Cough",
    "coughing up blood": "Coughing up blood",
    "hemoptysis": "Coughing up blood",
    "cough with colored sputum": "Cough with colored sputum",
    "colored sputum": "Cough with colored sputum",
    "high temperature": "Fever",
    "feverish": "Fever",
    "pyrexia": "Fever",
    "chest tightness": "Chest pain",
    "chest pain": "Chest pain",
    "wheezing": "Wheezing",
    "sore throat": "Sore throat",
    "pharyngitis": "Sore throat",
    "runny nose": "Nasal congestion",
    "nasal congestion": "Nasal congestion",
    "stuffy nose": "Nasal congestion",
    "acid reflux": "Acid reflux",
    "heartburn": "Acid reflux",
    "gerd": "Acid reflux",
    "chills": "Chills / shivers",
    "shivering": "Chills / shivers",
    "dizziness": "Dizziness / faintness",
    "lightheadedness": "Dizziness / faintness",
    "fainting": "Dizziness / faintness",
    "nausea": "Nausea / vomiting",
    "vomiting": "Nausea / vomiting",
    "loss of appetite": "Loss of appetite",
    "weight loss": "Weight loss",
    "palpitations": "Palpitations",
    "fatigue": "Fatigue",
    "tiredness": "Fatigue",
    "headache": "Headache",
}

def normalize_symptom(symptom: str) -> str:
    """
    Normalize a single symptom string to standard clinical terminology if a direct synonym exists.
    Otherwise returns the cleaned title-cased input.
    """
    if not symptom or not symptom.strip():
        return ""
    
    cleaned = symptom.strip().lower()
    if cleaned in SYMPTOM_TERMINOLOGY_MAP:
        return SYMPTOM_TERMINOLOGY_MAP[cleaned]
        
    # Check exact match against standard keys
    for key, canonical in SYMPTOM_TERMINOLOGY_MAP.items():
        if cleaned == key.lower():
            return canonical
            
    # Fallback: preserve original text with proper capitalization
    return symptom.strip().capitalize()

def normalize_symptom_list(symptoms: List[str]) -> List[str]:
    """
    Normalize a list of user-entered symptom strings.
    """
    normalized = []
    for s in symptoms:
        norm_s = normalize_symptom(s)
        if norm_s and norm_s not in normalized:
            normalized.append(norm_s)
    return normalized
