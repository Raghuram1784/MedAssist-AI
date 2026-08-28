import React from "react";
import { Activity } from "lucide-react";
import PatientForm from "@/components/assessment/PatientForm";
import SafetyNotice from "@/components/results/SafetyNotice";
import AnalysisProgress from "@/components/assessment/AnalysisProgress";
import PatientSummary from "@/components/results/PatientSummary";
import ConditionCard from "@/components/results/ConditionCard";
import KnowledgeGraphEvidence from "@/components/results/KnowledgeGraphEvidence";
import SimilarCasesTable from "@/components/results/SimilarCasesTable";
import ClinicalRationale from "@/components/results/ClinicalRationale";
import PipelineTimeline from "@/components/pipeline/PipelineTimeline";
import type { AnalyzeResponse } from "../types";

interface NewAssessmentProps {
  age: number | "";
  setAge: (age: number | "") => void;
  sex: string;
  setSex: (sex: string) => void;
  selectedSymptoms: string[];
  setSelectedSymptoms: (syms: string[] | ((prev: string[]) => string[])) => void;
  symptomSearch: string;
  setSymptomSearch: (search: string) => void;
  additionalInfo: string;
  setAdditionalInfo: (info: string) => void;
  isAnalyzing: boolean;
  loadingStep: number;
  analysisResult: AnalyzeResponse | null;
  errorMsg: string | null;
  systemStatus: "connecting" | "healthy" | "error";
  onAnalyze: (e: React.FormEvent) => void;
  onReset: () => void;
  COMMON_DEMO_SYMPTOMS: string[];
}

export default function NewAssessment({
  age,
  setAge,
  sex,
  setSex,
  selectedSymptoms,
  setSelectedSymptoms,
  symptomSearch,
  setSymptomSearch,
  additionalInfo,
  setAdditionalInfo,
  isAnalyzing,
  loadingStep,
  analysisResult,
  errorMsg,
  systemStatus,
  onAnalyze,
  onReset,
  COMMON_DEMO_SYMPTOMS
}: NewAssessmentProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">
      
      {/* Left Column: Intake Parameter form & Safety Notice (Sticky) */}
      <div className="lg:sticky lg:top-6 self-start space-y-4 shrink-0">
        <PatientForm 
          age={age}
          setAge={setAge}
          sex={sex}
          setSex={setSex}
          selectedSymptoms={selectedSymptoms}
          setSelectedSymptoms={setSelectedSymptoms}
          symptomSearch={symptomSearch}
          setSymptomSearch={setSymptomSearch}
          additionalInfo={additionalInfo}
          setAdditionalInfo={setAdditionalInfo}
          isAnalyzing={isAnalyzing}
          systemStatus={systemStatus}
          onAnalyze={onAnalyze}
          onReset={onReset}
          errorMsg={errorMsg}
          COMMON_DEMO_SYMPTOMS={COMMON_DEMO_SYMPTOMS}
        />
        <SafetyNotice />
      </div>

      {/* Right Column: Output Results Display */}
      <div className="min-w-0 space-y-6">
        
        {/* Idle State banner */}
        {!isAnalyzing && !analysisResult && (
          <div className="flex flex-col items-center justify-center text-center p-14 border border-dashed border-[#E2E8F0] rounded-2xl bg-white shadow-sm h-full select-none">
            <div className="p-3 bg-indigo-50 text-[#4F46E5] rounded-full mb-4">
              <Activity size={24} />
            </div>
            <h3 className="font-extrabold text-sm text-[#0F172A] tracking-tight">Ready for Clinical Assessment</h3>
            <p className="text-xs text-[#64748B] mt-1 max-w-sm leading-normal">
              Enter patient demographics and presenting symptoms on the Left panel to begin evidence-grounded reasoning.
            </p>
          </div>
        )}

        {/* Stepper Loader */}
        {isAnalyzing && (
          <AnalysisProgress loadingStep={loadingStep} />
        )}

        {/* Results Dashboard Render */}
        {analysisResult && (
          <div className="space-y-5">
            
            <div className="flex justify-between items-baseline select-none">
              <h3 className="font-extrabold text-[#0F172A] text-sm tracking-tight">Clinical Assessment Results</h3>
              <span className="text-[10px] text-slate-400 font-mono">Completed</span>
            </div>

            {/* Top demographics summary & slider dial */}
            <PatientSummary 
              age={analysisResult.patient_summary.age}
              sex={analysisResult.patient_summary.sex}
              symptoms={analysisResult.patient_summary.symptoms}
              additionalInfo={analysisResult.patient_summary.additional_information}
              confidenceLevel={analysisResult.confidence_level}
              conditionsCount={analysisResult.possible_conditions.length}
              casesCount={analysisResult.similar_cases.length}
              matchedCount={analysisResult.patient_summary.symptoms.length}
              missingCount={analysisResult.knowledge_graph_support[0]?.unmatched_symptoms.length || 0}
            />

            {/* Mapped conditions accordions */}
            <div className="space-y-3">
              <span className="block text-[10px] text-[#64748B] font-extrabold uppercase tracking-wider select-none">Possible Conditions</span>
              {analysisResult.possible_conditions.map((cond, idx) => {
                const kgMatch = analysisResult.knowledge_graph_support.find(
                  k => k.disease.toLowerCase() === cond.condition.toLowerCase()
                );
                return (
                  <ConditionCard 
                    key={idx}
                    rank={idx + 1}
                    condition={cond.condition}
                    supportingEvidence={cond.supporting_evidence}
                    similarCasesFound={cond.similar_cases_found}
                    icd10={kgMatch?.icd10 || "N/A"}
                    severity={kgMatch?.severity || 0}
                    unmatchedSymptoms={kgMatch?.unmatched_symptoms || []}
                  />
                );
              })}
            </div>

            {/* Knowledge Graph compact evidence matrix */}
            <KnowledgeGraphEvidence kgSupport={analysisResult.knowledge_graph_support} />

            {/* RAG Cases similarity table */}
            <SimilarCasesTable 
              similarCases={analysisResult.similar_cases} 
            />

            {/* Grounded rationale text block */}
            <ClinicalRationale 
              rationale={analysisResult.clinical_rationale} 
              alternatives={analysisResult.alternative_conditions}
            />

            {/* Visual timeline */}
            <PipelineTimeline />

          </div>
        )}

      </div>

    </div>
  );
}
