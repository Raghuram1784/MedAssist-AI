import React, { useState } from "react";
import { Activity, Download, Loader2 } from "lucide-react";
import PatientForm from "@/components/assessment/PatientForm";
import SafetyNotice from "@/components/results/SafetyNotice";
import AnalysisProgress from "@/components/assessment/AnalysisProgress";
import PatientSummary from "@/components/results/PatientSummary";
import ConditionCard from "@/components/results/ConditionCard";
import KnowledgeGraphEvidence from "@/components/results/KnowledgeGraphEvidence";
import SimilarCasesTable from "@/components/results/SimilarCasesTable";
import ClinicalRationale from "@/components/results/ClinicalRationale";
import PipelineTimeline from "@/components/pipeline/PipelineTimeline";
import { Button } from "@/components/ui/button";
import type { AnalyzeResponse } from "../types";
import { generateAssessmentPDF } from "../lib/pdfGenerator";

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
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadReport = () => {
    if (!analysisResult) return;
    setIsDownloading(true);
    
    setTimeout(() => {
      try {
        generateAssessmentPDF(analysisResult);
        alert("Report downloaded successfully.");
      } catch (err) {
        console.error("Report generation failed:", err);
        alert("Unable to generate report. Please try again.");
      } finally {
        setIsDownloading(false);
      }
    }, 800);
  };

  return (
    <>
      {/* Main Assessment UI Workstation */}
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
              
              {/* Results Header */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 select-none pb-1 border-b border-slate-200/80">
                <div>
                  <h3 className="font-black text-slate-900 text-base tracking-tight flex items-center gap-2">
                    Clinical Assessment Results
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Evidence-grounded differential analysis
                  </p>
                  
                  {/* Metadata Badges */}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Assessment Complete
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {analysisResult.similar_cases.length} Similar Cases
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {analysisResult.possible_conditions.length} Candidate Conditions
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <Button 
                    onClick={handleDownloadReport} 
                    variant="outline" 
                    size="sm" 
                    disabled={isDownloading}
                    className="h-8 text-xs gap-2 px-3.5 font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 bg-white cursor-pointer rounded-lg shadow-xs transition-all"
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 size={13} className="animate-spin text-indigo-600" />
                        Generating Report...
                      </>
                    ) : (
                      <>
                        <Download size={13} className="stroke-[2.5]" />
                        Download Report
                      </>
                    )}
                  </Button>
                </div>
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
    </>
  );
}
