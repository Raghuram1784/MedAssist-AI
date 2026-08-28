import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";

// API Services
import { checkHealth, analyzeCase } from "./services/api";
import type { AnalyzeResponse } from "./types";

// Layout Component
import Sidebar from "@/components/layout/Sidebar";

// Page Views
import Dashboard from "./pages/Dashboard";
import NewAssessment from "./pages/NewAssessment";
import AssessmentHistory from "./pages/AssessmentHistory";
import Methodology from "./pages/Methodology";
import About from "./pages/About";

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
  const [activeTab, setActiveTab] = useState<"dashboard" | "assessment" | "methodology" | "about" | "history">("dashboard");
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

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

      // --- SAVE TO LOCALSTORAGE ASSESSMENT HISTORY ---
      const historyItem = {
        id: `assessment_${Date.now()}`,
        timestamp: new Date().toISOString(),
        ...data
      };
      const storedStr = localStorage.getItem("medassist_assessment_history");
      const stored = storedStr ? JSON.parse(storedStr) : [];

      // Avoid duplication on rapid re-renders
      const isDup = stored.some((item: any) => 
        item.patient_summary.age === historyItem.patient_summary.age &&
        item.patient_summary.sex === historyItem.patient_summary.sex &&
        JSON.stringify(item.patient_summary.symptoms.sort()) === JSON.stringify(historyItem.patient_summary.symptoms.sort()) &&
        item.patient_summary.additional_information === historyItem.patient_summary.additional_information &&
        Math.abs(new Date(item.timestamp).getTime() - new Date(historyItem.timestamp).getTime()) < 10000
      );

      if (!isDup) {
        const updated = [historyItem, ...stored];
        localStorage.setItem("medassist_assessment_history", JSON.stringify(updated));
        
        // Show subtle non-blocking toast confirmation
        setToastMessage("✓ Assessment saved to history");
        setTimeout(() => setToastMessage(null), 3000);
      }
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

  // Reopen a saved record without re-running API analysis
  const handleViewRecord = (record: AnalyzeResponse) => {
    setAge(record.patient_summary.age);
    setSex(record.patient_summary.sex);
    setSelectedSymptoms(record.patient_summary.symptoms);
    setAdditionalInfo(record.patient_summary.additional_information || "");
    setAnalysisResult(record);
    setActiveTab("assessment");
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-[#F7F9FC] overflow-hidden font-sans text-[#0F172A] antialiased">
        
        {/* Navigation Sidebar */}
        <div className="print:hidden flex shrink-0">
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} systemStatus={systemStatus} />
        </div>

        {/* Core Main content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          
          {/* Dashboard Header Banner */}
          <header className="h-14 bg-white border-b border-[#E2E8F0] px-6 flex items-center justify-between shadow-sm shrink-0 print:hidden select-none">
            <div>
              <h2 className="font-extrabold text-sm text-[#0F172A] leading-tight">
                {activeTab === "dashboard" ? "Dashboard" :
                 activeTab === "assessment" ? "Clinical Case Workspace" :
                 activeTab === "history" ? "Assessment History" :
                 activeTab === "methodology" ? "Clinical Methodology" : "About MedAssist AI"}
              </h2>
              <p className="text-[10px] text-[#64748B] mt-0.5 font-medium leading-none">
                {activeTab === "dashboard" ? "Overview of the MedAssist AI clinical decision support system" :
                 activeTab === "assessment" ? "Input patient metrics and trigger evidence-grounded analysis" :
                 activeTab === "history" ? "Review and manage previously generated clinical report records" :
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
              <span className="px-2 py-0.5 bg-slate-100 rounded border border-slate-200 text-slate-655 font-semibold">
                KG Edges: 888
              </span>
            </div>
          </header>

          {/* Scrollable View Area */}
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="p-6 max-w-[1550px] mx-auto space-y-6">
              
              {activeTab === "dashboard" && (
                <Dashboard setActiveTab={setActiveTab} />
              )}

              {activeTab === "assessment" && (
                <NewAssessment 
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
                  loadingStep={loadingStep}
                  analysisResult={analysisResult}
                  errorMsg={errorMsg}
                  systemStatus={systemStatus}
                  onAnalyze={handleAnalyze}
                  onReset={resetForm}
                  COMMON_DEMO_SYMPTOMS={COMMON_DEMO_SYMPTOMS}
                />
              )}

              {activeTab === "history" && (
                <AssessmentHistory 
                  onViewRecord={handleViewRecord} 
                  setActiveTab={setActiveTab}
                />
              )}

              {activeTab === "methodology" && (
                <Methodology />
              )}

              {activeTab === "about" && (
                <About />
              )}

            </div>
          </ScrollArea>

        </main>

        {/* Global floating toast notification block */}
        {toastMessage && (
          <div className="fixed bottom-5 right-5 bg-[#07152E] text-white border border-[#4F46E5]/40 text-xs px-4 py-2.5 rounded-lg shadow-lg font-bold select-none tracking-wide z-50 flex items-center gap-2 animate-bounce">
            <span className="text-emerald-400">✓</span>
            {toastMessage}
          </div>
        )}

      </div>
    </TooltipProvider>
  );
}
