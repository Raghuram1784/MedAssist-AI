import { useState, useEffect } from "react";
import { 
  Activity, 
  Layers, 
  Cpu, 
  Database,
  TrendingUp
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";

// API Services
import { checkHealth, analyzeCase } from "./services/api";
import type { AnalyzeResponse } from "./types";

// Modular UI Components
import Sidebar from "@/components/layout/Sidebar";
import HeroCard from "@/components/dashboard/HeroCard";
import MetricCard from "@/components/dashboard/MetricCard";
import HowItWorks from "@/components/dashboard/HowItWorks";
import PatientForm from "@/components/assessment/PatientForm";
import AnalysisProgress from "@/components/assessment/AnalysisProgress";
import PatientSummary from "@/components/results/PatientSummary";
import ConditionCard from "@/components/results/ConditionCard";
import SimilarCasesTable from "@/components/results/SimilarCasesTable";
import KnowledgeGraphEvidence from "@/components/results/KnowledgeGraphEvidence";
import ClinicalRationale from "@/components/results/ClinicalRationale";
import PipelineTimeline from "@/components/pipeline/PipelineTimeline";
import SafetyNotice from "@/components/results/SafetyNotice";
import MethodologyCard from "@/components/methodology/MethodologyCard";

const COMMON_DEMO_SYMPTOMS = [
  "Fever",
  "Cough",
  "Breathing difficulty",
  "Chest pain",
  "Wheezing",
  "Sore throat",
  "Shortness of breath",
  "Headache",
  "Fatigue",
  "Nausea",
  "Vomiting"
];

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "assessment" | "methodology" | "about">("dashboard");
  const [systemStatus, setSystemStatus] = useState<"connecting" | "healthy" | "error">("connecting");
  
  // Intake Form parameters State
  const [age, setAge] = useState<number | "">("");
  const [sex, setSex] = useState<string>("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [symptomSearch, setSymptomSearch] = useState<string>("");
  const [additionalInfo, setAdditionalInfo] = useState<string>("");
  
  // Pipeline analysis states
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<number>(0);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Monitor health checker of CDSS server
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await checkHealth();
        if (res.status === "healthy") {
          setSystemStatus("healthy");
        } else {
          setSystemStatus("error");
        }
      } catch (err) {
        setSystemStatus("error");
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  // Launch Simulated loader + actual API call
  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (age === "" || age < 0 || age > 120) {
      setErrorMsg("Please enter a valid age between 0 and 120.");
      return;
    }
    if (!sex) {
      setErrorMsg("Please select the patient's sex.");
      return;
    }
    if (selectedSymptoms.length === 0) {
      setErrorMsg("Please select at least one presenting symptom.");
      return;
    }

    setErrorMsg(null);
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setLoadingStep(1);

    // Active pipeline loading progress ticks
    const t1 = setTimeout(() => setLoadingStep(2), 300);
    const t2 = setTimeout(() => setLoadingStep(3), 600);
    const t3 = setTimeout(() => setLoadingStep(4), 900);
    const t4 = setTimeout(() => setLoadingStep(5), 1200);
    const t5 = setTimeout(() => setLoadingStep(6), 1500);

    try {
      const payload = {
        age: Number(age),
        sex,
        symptoms: selectedSymptoms,
        additional_information: additionalInfo
      };
      const data = await analyzeCase(payload);
      setAnalysisResult(data);
    } catch (err: any) {
      const serverErr = err.response?.data?.detail || err.message || "An unknown error occurred during clinical analysis.";
      setErrorMsg(serverErr);
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      setIsAnalyzing(false);
      setLoadingStep(0);
    }
  };

  const resetForm = () => {
    setAge("");
    setSex("");
    setSelectedSymptoms([]);
    setAdditionalInfo("");
    setSymptomSearch("");
    setAnalysisResult(null);
    setErrorMsg(null);
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-[#F7F9FC] overflow-hidden font-sans text-[#0F172A] antialiased">
        
        {/* Navigation Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} systemStatus={systemStatus} />

        {/* Core Main content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          
          {/* Dashboard Header Banner */}
          <header className="h-14 bg-white border-b border-[#E2E8F0] px-6 flex items-center justify-between shadow-sm shrink-0">
            <div>
              <h2 className="font-extrabold text-sm text-[#0F172A] leading-tight">
                {activeTab === "dashboard" ? "Dashboard" :
                 activeTab === "assessment" ? "Clinical Case Workspace" :
                 activeTab === "methodology" ? "Clinical Methodology" : "About MedAssist AI"}
              </h2>
              <p className="text-[10px] text-[#64748B] mt-0.5 font-medium leading-none">
                {activeTab === "dashboard" ? "Overview of the MedAssist AI clinical decision support system" :
                 activeTab === "assessment" ? "Input patient metrics and trigger evidence-grounded analysis" :
                 activeTab === "methodology" ? "Multi-layer clinical reasoning combining semantic search and knowledge graphs" : "Research prototype constraints & safety scope"}
              </p>
            </div>

            {/* Quick Metrics display */}
            <div className="flex items-center gap-2 text-[9px] font-mono select-none">
              <span className="px-2 py-0.5 bg-slate-100 rounded border border-slate-200 text-slate-600 font-semibold">
                Cases: 10,000
              </span>
              <span className="px-2 py-0.5 bg-slate-100 rounded border border-slate-200 text-slate-600 font-semibold">
                KG Nodes: 271
              </span>
              <span className="px-2 py-0.5 bg-slate-100 rounded border border-slate-200 text-slate-600 font-semibold text-slate-450">
                KG Edges: 888
              </span>
            </div>
          </header>

          {/* Scrollable View Area */}
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="p-6 max-w-[1550px] mx-auto space-y-6">
              
              {/* VIEW 1: DASHBOARD */}
              {activeTab === "dashboard" && (
                <div className="space-y-6">
                  
                  {/* Hero card gradient banner */}
                  <HeroCard 
                    onStartAssessment={() => setActiveTab("assessment")} 
                    onExploreMethodology={() => setActiveTab("methodology")} 
                  />

                  {/* Metrics Row */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard 
                      value="10,000" 
                      label="Clinical Cases" 
                      description="Indexed from preprocessed DDXPlus." 
                      icon={Database}
                      iconBgColor="bg-indigo-50"
                      iconColor="text-[#4F46E5]"
                      accentColor="border-t-2 border-t-[#4F46E5]"
                    />
                    <MetricCard 
                      value="768" 
                      label="Embedding Dimensions" 
                      description="Compiled via BioClinicalBERT." 
                      icon={Cpu}
                      iconBgColor="bg-violet-50"
                      iconColor="text-[#7C3AED]"
                      accentColor="border-t-2 border-t-[#7C3AED]"
                    />
                    <MetricCard 
                      value="271" 
                      label="Knowledge Graph Nodes" 
                      description="Candidate diseases & symptoms." 
                      icon={Layers}
                      iconBgColor="bg-cyan-50"
                      iconColor="text-[#06B6D4]"
                      accentColor="border-t-2 border-t-[#06B6D4]"
                    />
                    <MetricCard 
                      value="888" 
                      label="KG Relationships" 
                      description="Directed symptom template edges." 
                      icon={TrendingUp}
                      iconBgColor="bg-emerald-50"
                      iconColor="text-emerald-600"
                      accentColor="border-t-2 border-t-emerald-500"
                    />
                  </div>

                  {/* Flow chart stepper */}
                  <HowItWorks />

                  {/* System Capabilities Section */}
                  <div className="space-y-3 select-none">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">System Capabilities</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card className="p-4 bg-white border border-[#E2E8F0] rounded-xl space-y-1 hover:border-slate-300 transition-colors">
                        <h4 className="font-bold text-xs text-[#0F172A] leading-tight">Semantic Clinical Retrieval</h4>
                        <p className="text-[10px] text-[#64748B] leading-relaxed">
                          Extracts matching cohorts using cosine metrics over sentence encodings.
                        </p>
                      </Card>
                      <Card className="p-4 bg-white border border-[#E2E8F0] rounded-xl space-y-1 hover:border-slate-350 transition-colors">
                        <h4 className="font-bold text-xs text-[#0F172A] leading-tight">Knowledge Graph Verification</h4>
                        <p className="text-[10px] text-[#64748B] leading-relaxed">
                          Validates symptom pathways topologically to identify matching vs missing factors.
                        </p>
                      </Card>
                      <Card className="p-4 bg-white border border-[#E2E8F0] rounded-xl space-y-1 hover:border-slate-350 transition-colors">
                        <h4 className="font-bold text-xs text-[#0F172A] leading-tight">Evidence-Grounded Reasoning</h4>
                        <p className="text-[10px] text-[#64748B] leading-relaxed">
                          Locks inference context to database retrieved values, mitigating hallucinations.
                        </p>
                      </Card>
                      <Card className="p-4 bg-white border border-[#E2E8F0] rounded-xl space-y-1 hover:border-slate-350 transition-colors">
                        <h4 className="font-bold text-xs text-[#0F172A] leading-tight">Explainable Differential</h4>
                        <p className="text-[10px] text-[#64748B] leading-relaxed">
                          Compiles readable justifications detailing why conditions are rules in or out.
                        </p>
                      </Card>
                    </div>
                  </div>

                </div>
              )}

              {/* VIEW 2: CLINICAL ASSESSMENT TWO-COLUMN WORKSPACE */}
              {activeTab === "assessment" && (
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
                      onAnalyze={handleAnalyze}
                      onReset={resetForm}
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
              )}

              {/* VIEW 3: REDESIGNED METHODOLOGY SECTION */}
              {activeTab === "methodology" && (
                <div className="space-y-6">
                  
                  <Card className="border-l-4 border-l-[#4F46E5] bg-white rounded-xl shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-extrabold text-[#0F172A] tracking-tight leading-none">How MedAssist AI Works</CardTitle>
                      <CardDescription className="text-xs">
                        A multi-layer clinical reasoning architecture combining semantic retrieval, structured medical knowledge, and grounded LLM reasoning.
                      </CardDescription>
                    </CardHeader>
                  </Card>

                  <MethodologyCard />

                </div>
              )}

              {/* VIEW 4: REDESIGNED ABOUT SECTION */}
              {activeTab === "about" && (
                <div className="space-y-6 select-none">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    <Card className="shadow-sm border border-[#E2E8F0] bg-white rounded-xl p-5 space-y-2">
                      <h4 className="font-extrabold text-xs text-[#0F172A] uppercase tracking-wider">What is MedAssist AI?</h4>
                      <p className="text-xs text-[#64748B] leading-relaxed">
                        MedAssist AI is an explainable clinical decision support system (CDSS) prototype designed to reduce cognitive load for clinical researchers. It combines sentence transformers, FAISS database retrievals, directed NetworkX graph cross-checks, and LLM explanation generation.
                      </p>
                    </Card>

                    <Card className="shadow-sm border border-[#E2E8F0] bg-white rounded-xl p-5 space-y-2">
                      <h4 className="font-extrabold text-xs text-[#0F172A] uppercase tracking-wider">Research Scope</h4>
                      <p className="text-xs text-[#64748B] leading-relaxed">
                        The current cohort supports 49 unique diseases and 222 presenting symptoms, validated against synthetic clinical transcripts from the DDXPlus medical records. It operates purely as a reasoning support coordinator, and is banned from diagnosing patient presentations standalone.
                      </p>
                    </Card>

                  </div>

                  <SafetyNotice />

                </div>
              )}

            </div>
          </ScrollArea>

        </main>

      </div>
    </TooltipProvider>
  );
}
