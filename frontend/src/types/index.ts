export interface PatientSummary {
  age: number;
  sex: string;
  symptoms: string[];
  additional_information: string;
}

export interface PossibleCondition {
  condition: string;
  supporting_evidence: string[];
  similar_cases_found: number;
}

export interface KGEvidence {
  disease: string;
  icd10: string;
  severity: number;
  matched_symptoms: string[];
  unmatched_symptoms: string[];
  explanation: string;
}

export interface SimilarCase {
  ground_truth: string;
  similarity_score: number;
  symptoms: string[];
}

export interface AnalyzeResponse {
  patient_summary: PatientSummary;
  possible_conditions: PossibleCondition[];
  alternative_conditions: string[];
  confidence_level: string;
  clinical_rationale: string;
  knowledge_graph_support: KGEvidence[];
  similar_cases: SimilarCase[];
}

export interface AnalyzeRequest {
  age: number;
  sex: string;
  symptoms: string[];
  additional_information: string;
}
