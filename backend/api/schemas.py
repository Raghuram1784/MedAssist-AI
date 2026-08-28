from pydantic import BaseModel, Field, field_validator
from typing import List, Optional

class AnalyzeRequest(BaseModel):
    age: int = Field(..., ge=0, le=120, description="Age of the patient in years (0 to 120)")
    sex: str = Field(..., description="Gender of the patient ('M' or 'F')")
    symptoms: List[str] = Field(..., min_items=1, description="List of presenting symptoms")
    additional_information: Optional[str] = Field("", description="Optional duration or context notes")

    @field_validator("sex")
    @classmethod
    def validate_sex(cls, v: str) -> str:
        upper_v = v.strip().upper()
        if upper_v not in ("M", "F"):
            raise ValueError("Sex must be 'M' or 'F'")
        return upper_v

    @field_validator("symptoms")
    @classmethod
    def validate_symptoms(cls, v: List[str]) -> List[str]:
        # Filter out empty or whitespace-only symptoms
        cleaned = [s.strip() for s in v if s.strip()]
        if not cleaned:
            raise ValueError("At least one valid symptom must be specified")
        return cleaned

class PatientSummary(BaseModel):
    age: int
    sex: str
    symptoms: List[str]
    additional_information: str

class PossibleCondition(BaseModel):
    condition: str
    supporting_evidence: List[str]
    similar_cases_found: int

class KGEvidence(BaseModel):
    disease: str
    icd10: str
    severity: int
    matched_symptoms: List[str]
    unmatched_symptoms: List[str]
    explanation: str

class SimilarCase(BaseModel):
    ground_truth: str
    similarity_score: float
    symptoms: List[str]

class AnalyzeResponse(BaseModel):
    patient_summary: PatientSummary
    possible_conditions: List[PossibleCondition]
    alternative_conditions: List[str]
    confidence_level: str
    clinical_rationale: str
    knowledge_graph_support: List[KGEvidence]
    similar_cases: List[SimilarCase]
