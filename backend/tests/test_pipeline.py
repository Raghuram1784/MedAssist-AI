import os
import pytest
from backend.app.data.parser import PatientCase, DifferentialItem, load_conditions, load_evidences, stream_cases
from backend.app.data.translator import ClinicalTranslator

# Define path constants for raw dataset files (for end-to-end checks)
TEST_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(TEST_DIR)
DATASETS_DIR = os.path.join(os.path.dirname(PROJECT_ROOT), "datasets", "ddxplus")

CONDITIONS_JSON = os.path.join(DATASETS_DIR, "release_conditions.json")
EVIDENCES_JSON = os.path.join(DATASETS_DIR, "release_evidences.json")
TEST_CSV = os.path.join(DATASETS_DIR, "test.csv")

# Mock metadata for isolated translator unit testing
MOCK_EVIDENCES = {
    "E_53": {
        "name": "E_53",
        "question_en": "Do you have pain somewhere, related to your reason for consulting?",
        "is_antecedent": False,
        "default_value": 0,
        "possible-values": [],
        "data_type": "B"
    },
    "E_54": {
        "name": "E_54",
        "question_en": "Characterize your pain:",
        "is_antecedent": False,
        "default_value": "V_11",
        "possible-values": ["V_11", "V_181"],
        "value_meaning": {
            "V_11": {"en": "NA"},
            "V_181": {"en": "burning"}
        },
        "data_type": "M"
    },
    "E_56": {
        "name": "E_56",
        "question_en": "How intense is the pain?",
        "is_antecedent": False,
        "default_value": 0,
        "possible-values": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        "data_type": "C"
    },
    "E_204": {
        "name": "E_204",
        "question_en": "Have you traveled out of the country in the last 4 weeks?",
        "is_antecedent": True,
        "default_value": "V_10",
        "possible-values": ["V_10", "V_9"],
        "value_meaning": {
            "V_10": {"en": "N"},
            "V_9": {"en": "Europe"}
        },
        "data_type": "C"
    }
}

MOCK_CONDITIONS = {
    "GERD": {
        "condition_name": "GERD",
        "icd10-id": "K21"
    }
}


def test_patient_case_validation():
    """
    Test that the Pydantic PatientCase schema properly validates and parses data types.
    """
    raw_case = {
        "age": 45,
        "sex": "M",
        "pathology": "GERD",
        "evidences": "['E_53', 'E_54_@_V_181']",
        "differential_diagnosis": "[['GERD', 0.8], ['Anemia', 0.2]]",
        "initial_evidence": "E_53"
    }
    
    case = PatientCase(**raw_case)
    assert case.age == 45
    assert case.sex == "M"
    assert case.pathology == "GERD"
    assert case.evidences == ["E_53", "E_54_@_V_181"]
    assert len(case.differential_diagnosis) == 2
    assert case.differential_diagnosis[0].pathology == "GERD"
    assert case.differential_diagnosis[0].probability == 0.8
    assert case.initial_evidence == "E_53"


def test_translator_value_decoding():
    """
    Test that the ClinicalTranslator correctly decodes binary, categorical, and continuous values.
    """
    translator = ClinicalTranslator(MOCK_EVIDENCES, MOCK_CONDITIONS)
    
    # Binary decoding
    assert translator.decode_value("E_53", "1") == "Yes"
    assert translator.decode_value("E_53", "0") == "No"
    
    # Multi-choice decoding
    assert translator.decode_value("E_54", "V_181") == "burning"
    assert translator.decode_value("E_54", "V_11") == "Not Applicable" # V_11 meaning is 'NA' -> maps to 'Not Applicable'
    
    # Graded scale decoding
    assert translator.decode_value("E_56", "7") == "7/10"
    
    # Continuous code-meaning decoding
    assert translator.decode_value("E_204", "V_9") == "Europe"
    assert translator.decode_value("E_204", "V_10") == "No" # V_10 meaning is 'N' -> maps to 'No'


def test_case_translation():
    """
    Test translation of a full PatientCase structure into a clinical narrative.
    """
    translator = ClinicalTranslator(MOCK_EVIDENCES, MOCK_CONDITIONS)
    
    case = PatientCase(
        age=30,
        sex="F",
        pathology="GERD",
        evidences=["E_53", "E_54_@_V_181", "E_56_@_8", "E_204_@_V_9"],
        differential_diagnosis=[["GERD", 0.9]],
        initial_evidence="E_53"
    )
    
    translated = translator.translate_case(case)
    
    assert translated["demographics"]["age"] == 30
    assert translated["demographics"]["sex"] == "F"
    assert translated["demographics"]["gender_decoded"] == "female"
    
    # Check that symptoms are parsed and translated
    assert len(translated["symptoms"]) == 3
    symptom_ids = [s["id"] for s in translated["symptoms"]]
    assert "E_53" in symptom_ids
    assert "E_54" in symptom_ids
    assert "E_56" in symptom_ids
    
    # Check pain character translation
    pain_char = next(s for s in translated["symptoms"] if s["id"] == "E_54")
    assert pain_char["value"] == "burning"
    
    # Check risk factor translation
    assert len(translated["antecedents"]) == 1
    assert translated["antecedents"][0]["id"] == "E_204"
    assert translated["antecedents"][0]["value"] == "Europe"
    
    # Check narrative generation details
    narrative = translated["narrative"]
    assert "30-year-old female" in narrative
    assert "burning" in narrative
    assert "8/10" in narrative
    assert "Europe" in narrative


def test_metadata_loading():
    """
    Test loading conditions and evidences metadata from real files.
    """
    assert os.path.exists(CONDITIONS_JSON), f"Metadata missing at {CONDITIONS_JSON}"
    assert os.path.exists(EVIDENCES_JSON), f"Metadata missing at {EVIDENCES_JSON}"
    
    conditions = load_conditions(CONDITIONS_JSON)
    evidences = load_evidences(EVIDENCES_JSON)
    
    assert len(conditions) > 0
    assert len(evidences) > 0
    assert "GERD" in conditions
    assert "E_53" in evidences


def test_streaming_and_parsing_real_data():
    """
    Test streaming and parsing clinical records from the actual raw CSV test file.
    """
    assert os.path.exists(TEST_CSV), f"Test CSV missing at {TEST_CSV}"
    
    # Stream the first 5 records
    cases = list(stream_cases(TEST_CSV, limit=5))
    assert len(cases) == 5
    for case in cases:
        assert isinstance(case, PatientCase)
        assert case.age >= 0
        assert case.sex in ("M", "F")
        assert len(case.evidences) > 0
        assert len(case.differential_diagnosis) > 0
