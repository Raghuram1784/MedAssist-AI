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

              {activeTab === "methodology" && (
                <Methodology />
              )}

              {activeTab === "about" && (
                <About />
              )}

            </div>
          </ScrollArea>

        </main>

      </div>
    </TooltipProvider>
  );
}
