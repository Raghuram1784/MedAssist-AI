import React, { useState, useEffect } from "react";
import { 
  Activity, 
  BookOpen, 
  Check, 
  Circle, 
  ChevronRight, 
  Cpu, 
  Database, 
  FileText, 
  HeartHandshake, 
  Layers, 
  Plus, 
  RotateCcw, 
  Search, 
  ShieldAlert, 
  User, 
  X,
  ArrowRight,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";

import { checkHealth, analyzeCase } from "./services/api";
import type { AnalyzeResponse } from "./types";

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

// ==========================================
// REUSABLE SUB-COMPONENTS
// ==========================================

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-800 antialiased selection:bg-indigo-100">
      {children}
    </div>
  );
}

function Sidebar({ 
  activeTab, 
  setActiveTab, 
  systemStatus 
}: { 
  activeTab: string; 
  setActiveTab: (tab: "dashboard" | "assessment" | "about") => void; 
  systemStatus: string;
}) {
  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col justify-between border-r border-slate-800 shrink-0">
      <div>
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-md shadow-indigo-600/10">
              <Activity size={20} />
            </div>
            <div>
              <h1 className="font-bold text-sm leading-tight tracking-tight text-white">MedAssist AI</h1>
              <p className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase">CDSS Engine</p>
            </div>
          </div>
        </div>
        
        <nav className="p-4 space-y-1.5">
          <button 
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-medium transition-all ${
              activeTab === "dashboard" 
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15" 
                : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
            }`}
          >
            <Layers size={15} />
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab("assessment")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-medium transition-all ${
              activeTab === "assessment" 
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15" 
                : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
            }`}
          >
            <FileText size={15} />
            New Assessment
          </button>
          <button 
            onClick={() => setActiveTab("about")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-medium transition-all ${
              activeTab === "about" 
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15" 
                : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
            }`}
          >
            <BookOpen size={15} />
            Methodology & About
          </button>
        </nav>
      </div>

      <div className="p-5 border-t border-slate-800">
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>System Status</span>
          <div className="flex items-center gap-1.5 font-medium">
            <span className={`h-2 w-2 rounded-full ${
              systemStatus === "healthy" ? "bg-green-500" :
              systemStatus === "connecting" ? "bg-yellow-500 animate-pulse" : "bg-red-500"
            }`} />
            <span className="capitalize">{systemStatus === "healthy" ? "Online" : systemStatus === "connecting" ? "Syncing" : "Offline"}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function PageHeader({ 
  title, 
  subtitle, 
  metric1, 
  metric2 
}: { 
  title: string; 
  subtitle: string; 
  metric1?: string; 
  metric2?: string; 
}) {
  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between shadow-sm shrink-0">
      <div>
        <h2 className="font-bold text-sm tracking-tight text-slate-900">{title}</h2>
        <p className="text-[11px] text-slate-500">{subtitle}</p>
      </div>
      
      <div className="flex items-center gap-3 text-[10px]">
        {metric1 && (
          <span className="px-2.5 py-1 bg-slate-100 rounded-full font-mono text-slate-600 border border-slate-200">
            {metric1}
          </span>
        )}
        {metric2 && (
          <span className="px-2.5 py-1 bg-slate-100 rounded-full font-mono text-slate-600 border border-slate-200">
            {metric2}
          </span>
        )}
      </div>
    </header>
  );
}

function MetricCard({ 
  value, 
  label, 
  description 
}: { 
  value: string; 
  label: string; 
  description: string;
}) {
  return (
    <Card className="shadow-sm border border-slate-200 hover:border-slate-300 transition-all duration-200">
      <CardContent className="p-5 space-y-1.5">
        <span className="block text-2xl font-extrabold text-slate-900 tracking-tight">{value}</span>
        <h4 className="font-bold text-xs text-slate-800 tracking-tight leading-none">{label}</h4>
        <p className="text-[11px] text-slate-500 leading-normal">{description}</p>
      </CardContent>
    </Card>
  );
}

function HowItWorksStep({ 
  step, 
  icon: Icon, 
  title, 
  description 
}: { 
  step: string; 
  icon: React.ComponentType<{ size?: number; className?: string }>; 
  title: string; 
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center p-4 bg-white border border-slate-200 rounded-xl relative group hover:border-indigo-200 transition-all flex-1">
      <div className="absolute -top-3 left-4 px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono text-[9px] font-bold rounded-full">
        Step {step}
      </div>
      <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-lg mt-1 mb-3 group-hover:scale-105 transition-transform">
        <Icon size={18} />
      </div>
      <h5 className="font-bold text-xs text-slate-900 mb-1">{title}</h5>
      <p className="text-[11px] text-slate-500 leading-relaxed">{description}</p>
    </div>
  );
}

function SafetyNotice() {
  return (
    <Card className="bg-slate-50 border border-slate-200 shadow-sm shrink-0 mt-auto">
      <CardContent className="p-4 flex gap-3.5">
        <ShieldAlert className="text-slate-600 shrink-0 mt-0.5" size={18} />
        <div className="space-y-1">
          <h4 className="font-bold text-xs text-slate-900 leading-none">Methodological Safety Notice</h4>
          <p className="text-[10px] text-slate-600 leading-normal">
            MedAssist AI is a clinical decision support research prototype. It is not a replacement for professional medical diagnosis, clinical judgment, or patient treatment. All generated recommendations represent matches to historical records in the experimental cohort and must be interpreted by qualified clinicians.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ==========================================
// MAIN APP COMPONENT
// ==========================================

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "assessment" | "about">("dashboard");
  const [systemStatus, setSystemStatus] = useState<"connecting" | "healthy" | "error">("connecting");
  
  // Intake Form State
  const [age, setAge] = useState<number | "">("");
  const [sex, setSex] = useState<string>("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [symptomSearch, setSymptomSearch] = useState<string>("");
  const [additionalInfo, setAdditionalInfo] = useState<string>("");
  
  // Pipeline Loading Progress simulation
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<number>(0);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Monitor API Health status
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

  // Filter symptoms list for command selector
  const filteredSymptoms = COMMON_DEMO_SYMPTOMS.filter(
    symptom => 
      symptom.toLowerCase().includes(symptomSearch.toLowerCase()) &&
      !selectedSymptoms.includes(symptom)
  );

  const addSymptom = (symptom: string) => {
    if (symptom.trim() && !selectedSymptoms.includes(symptom.trim())) {
      setSelectedSymptoms([...selectedSymptoms, symptom.trim()]);
    }
    setSymptomSearch("");
  };

  const removeSymptom = (symptom: string) => {
    setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptom));
  };

  const handleSymptomKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && symptomSearch.trim()) {
      e.preventDefault();
      addSymptom(symptomSearch);
    }
  };

  // Launch Simulated pipeline sequence + real backend call
  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (age === "" || age < 0 || age > 120) {
      setErrorMsg("Please specify a valid patient age between 0 and 120.");
      return;
    }
    if (!sex) {
      setErrorMsg("Please select the patient's sex.");
      return;
    }
    if (selectedSymptoms.length === 0) {
      setErrorMsg("Please select at least one clinical symptom.");
      return;
    }

    setErrorMsg(null);
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setLoadingStep(1);

    // Set up step-by-step progress loaders
    const t1 = setTimeout(() => setLoadingStep(2), 350);
    const t2 = setTimeout(() => setLoadingStep(3), 700);
    const t3 = setTimeout(() => setLoadingStep(4), 1050);
    const t4 = setTimeout(() => setLoadingStep(5), 1400);

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
      const serverErr = err.response?.data?.detail || err.message || "An error occurred in the clinical support engine.";
      setErrorMsg(serverErr);
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
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
      <AppShell>
        
        {/* Navigation Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} systemStatus={systemStatus} />

        {/* View Routing Area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          
          <PageHeader 
            title={activeTab === "dashboard" ? "System Overview Dashboard" : 
                   activeTab === "assessment" ? "Case Diagnosis Workspace" : "Clinical Foundations"} 
            subtitle="MedAssist AI CDSS Research Prototype"
            metric1="Cases: 10,000"
            metric2="Nodes: 271"
          />

          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="p-8 max-w-6xl mx-auto space-y-8">
              
              {/* TAB 1: REDESIGNED DASHBOARD OVERVIEW */}
              {activeTab === "dashboard" && (
                <div className="space-y-8">
                  
                  {/* Hero Banner Section */}
                  <Card className="border-l-4 border-l-indigo-600 shadow-sm overflow-hidden bg-white">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <div className="space-y-1.5">
                          <h2 className="font-extrabold text-2xl tracking-tight text-slate-900">MedAssist AI</h2>
                          <p className="font-bold text-xs text-indigo-600 uppercase tracking-widest leading-none">
                            AI-Assisted Clinical Decision Support System
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-2 space-y-4">
                      <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                        Evidence-grounded clinical reasoning using semantic retrieval, medical knowledge graphs, and LLM-based explanation. MedAssist AI grounds LLM inferences against actual database cohorts and structured icd10 rules, minimizing hallucination risks.
                      </p>
                      
                      <div className="flex gap-3 pt-2">
                        <Button onClick={() => setActiveTab("assessment")} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/10">
                          Start New Assessment <ArrowRight size={14} />
                        </Button>
                        <Button onClick={() => setActiveTab("about")} variant="outline" className="gap-2 text-xs font-semibold border-slate-300">
                          Explore Methodology
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quantitative Analytics Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                    <MetricCard 
                      value="10,000" 
                      label="Clinical Cases" 
                      description="Indexed from the DDXPlus database." 
                    />
                    <MetricCard 
                      value="768" 
                      label="Embedding Dimensions" 
                      description="Generated by Emily Alsentzer's BioClinicalBERT." 
                    />
                    <MetricCard 
                      value="271" 
                      label="Knowledge Graph Nodes" 
                      description="49 pathologies and 222 mapped evidence values." 
                    />
                    <MetricCard 
                      value="888" 
                      label="KG Relationships" 
                      description="Directed symptom associations pointing from disease to evidence." 
                    />
                  </div>

                  {/* Pipeline PipelineStepper */}
                  <Card className="shadow-sm border border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">How MedAssist AI Works</CardTitle>
                      <CardDescription className="text-xs">Five visual pipeline stages mapping clinical analysis.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <div className="flex flex-col lg:flex-row gap-4 items-stretch">
                        <HowItWorksStep 
                          step="1" 
                          icon={User} 
                          title="Patient Input" 
                          description="Doctor inputs demographics and symptom tags." 
                        />
                        <div className="hidden lg:flex items-center text-slate-300 px-1"><ChevronRight size={18} /></div>
                        <HowItWorksStep 
                          step="2" 
                          icon={Cpu} 
                          title="BioClinicalBERT" 
                          description="Generates clinical semantic text embeddings." 
                        />
                        <div className="hidden lg:flex items-center text-slate-300 px-1"><ChevronRight size={18} /></div>
                        <HowItWorksStep 
                          step="3" 
                          icon={Database} 
                          title="FAISS Retrieval" 
                          description="Retrieves the top 5 most similar cases." 
                        />
                        <div className="hidden lg:flex items-center text-slate-300 px-1"><ChevronRight size={18} /></div>
                        <HowItWorksStep 
                          step="4" 
                          icon={Layers} 
                          title="Knowledge Graph" 
                          description="Verifies clinical symptoms topologically." 
                        />
                        <div className="hidden lg:flex items-center text-slate-300 px-1"><ChevronRight size={18} /></div>
                        <HowItWorksStep 
                          step="5" 
                          icon={HeartHandshake} 
                          title="Groq LLM" 
                          description="Reconciles evidence and compiles explanations." 
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <SafetyNotice />
                </div>
              )}

              {/* TAB 2: REDESIGNED CLINICAL ASSESSMENT WORKSPACE */}
              {activeTab === "assessment" && (
                <div className="space-y-8">
                  
                  {/* Two-Column Responsive Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Left Column: Stable 35% Input Panel */}
                    <div className="lg:col-span-4 space-y-6">
                      <Card className="shadow-sm border border-slate-200">
                        <CardHeader className="border-b border-slate-100 pb-4">
                          <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Patient Presentation</CardTitle>
                          <CardDescription className="text-xs">Define patient profile parameters.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-5">
                          <form onSubmit={handleAnalyze} className="space-y-5">
                            
                            {/* Age and Sex Inputs */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label htmlFor="age" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Age</label>
                                <Input 
                                  id="age"
                                  type="number" 
                                  placeholder="e.g. 49"
                                  value={age} 
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
                                  min={0}
                                  max={120}
                                  className="h-9 text-xs"
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <label htmlFor="sex" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sex</label>
                                <Select value={sex} onValueChange={setSex}>
                                  <SelectTrigger id="sex" className="h-9 text-xs">
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="M">Male</SelectItem>
                                    <SelectItem value="F">Female</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {/* Symptoms Multi-Select */}
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Presenting Symptoms</label>
                              
                              {/* Selected badging */}
                              {selectedSymptoms.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200">
                                  {selectedSymptoms.map((symptom, idx) => (
                                    <Badge key={idx} variant="secondary" className="pl-2 pr-1.5 py-0.5 flex items-center gap-1 text-[10px] bg-white border border-slate-200">
                                      {symptom}
                                      <button 
                                        type="button" 
                                        onClick={() => removeSymptom(symptom)} 
                                        className="text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-full p-0.5 transition-colors"
                                      >
                                        <X size={9} />
                                      </button>
                                    </Badge>
                                  ))}
                                </div>
                              )}

                              {/* Search bar input dropdown */}
                              <div className="relative">
                                <div className="relative">
                                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                  <Input 
                                    placeholder="Search or enter custom symptom..."
                                    value={symptomSearch}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSymptomSearch(e.target.value)}
                                    onKeyDown={handleSymptomKeyDown}
                                    className="pl-8 h-9 text-xs pr-8"
                                  />
                                  {symptomSearch && (
                                    <button
                                      type="button"
                                      onClick={() => addSymptom(symptomSearch)}
                                      className="absolute right-2.5 top-2 text-slate-400 hover:text-indigo-600 p-0.5"
                                    >
                                      <Plus size={14} />
                                    </button>
                                  )}
                                </div>

                                {symptomSearch && filteredSymptoms.length > 0 && (
                                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                                    {filteredSymptoms.map((symptom, idx) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => addSymptom(symptom)}
                                        className="w-full text-left px-3 py-1.5 hover:bg-indigo-50 text-xs transition-colors"
                                      >
                                        {symptom}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Clickable Quick-Add Tags */}
                              <div className="space-y-1">
                                <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Suggested Symptoms</span>
                                <div className="flex flex-wrap gap-1">
                                  {COMMON_DEMO_SYMPTOMS.map((s, idx) => {
                                    const isSelected = selectedSymptoms.includes(s);
                                    return (
                                      <button
                                        key={idx}
                                        type="button"
                                        disabled={isSelected}
                                        onClick={() => addSymptom(s)}
                                        className={`px-2 py-0.5 border text-[9px] font-medium rounded-md transition-all ${
                                          isSelected 
                                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                            : "bg-white text-slate-600 border-slate-300 hover:border-indigo-400 hover:text-indigo-600"
                                        }`}
                                      >
                                        {s}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* Additional Information textarea */}
                            <div className="space-y-1">
                              <label htmlFor="additional-info" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Additional Clinical Information</label>
                              <Textarea 
                                id="additional-info"
                                placeholder="Clinical onset notes, smoking history, or relevant observations..."
                                value={additionalInfo}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAdditionalInfo(e.target.value)}
                                rows={3}
                                className="resize-none text-xs"
                              />
                            </div>

                            {errorMsg && (
                              <Alert variant="destructive" className="py-2.5 px-3">
                                <ShieldAlert size={14} className="shrink-0" />
                                <AlertTitle className="text-xs font-bold leading-none">Intake Parameter Error</AlertTitle>
                                <AlertDescription className="text-[10px] leading-tight mt-1">{errorMsg}</AlertDescription>
                              </Alert>
                            )}

                            <div className="flex gap-2 pt-2">
                              <Button 
                                type="submit" 
                                disabled={isAnalyzing || systemStatus !== "healthy"}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/10 h-9"
                              >
                                {isAnalyzing ? "Analyzing presentation..." : "Analyze Clinical Case"}
                              </Button>
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={resetForm}
                                disabled={isAnalyzing}
                                className="px-3 border-slate-300 h-9"
                                title="Clear form"
                              >
                                <RotateCcw size={14} />
                              </Button>
                            </div>

                          </form>
                        </CardContent>
                      </Card>

                      <SafetyNotice />
                    </div>

                    {/* Right Column: 65% Output Results Area */}
                    <div className="lg:col-span-8 space-y-6">
                      
                      {/* Idle State Banner */}
                      {!isAnalyzing && !analysisResult && (
                        <div className="flex flex-col items-center justify-center text-center p-16 border-2 border-dashed border-slate-200 rounded-2xl bg-white shadow-sm h-full">
                          <Activity className="text-slate-300 w-12 h-12 mb-4" />
                          <h3 className="font-bold text-slate-800 text-sm">Clinical Results Panel</h3>
                          <p className="text-xs text-slate-400 mt-1 max-w-sm">
                            Configure demographics and symptom parameters on the Left Panel, then trigger analysis to render FAISS retrieve metrics and explainable graph supports.
                          </p>
                        </div>
                      )}

                      {/* REDESIGNED STEPPER LOADING STATE */}
                      {isAnalyzing && (
                        <Card className="shadow-sm border border-slate-200">
                          <CardHeader className="pb-4">
                            <CardTitle className="text-sm font-bold text-slate-800">Analyzing Clinical Presentation...</CardTitle>
                            <CardDescription className="text-xs">Please wait while MedAssist AI processes your case metrics.</CardDescription>
                          </CardHeader>
                          <CardContent className="pt-2 space-y-4">
                            
                            <div className="space-y-3.5 p-5 bg-slate-50 rounded-xl border border-slate-200/80">
                              
                              <div className="flex items-center justify-between text-xs font-semibold">
                                <div className="flex items-center gap-2.5">
                                  <span className={`h-2.5 w-2.5 rounded-full ${loadingStep >= 1 ? "bg-indigo-600" : "bg-slate-300 animate-pulse"}`} />
                                  <span className={loadingStep >= 1 ? "text-slate-800 font-bold" : "text-slate-400"}>Preparing clinical presentation</span>
                                </div>
                                {loadingStep > 1 ? <Check size={14} className="text-green-600" /> : loadingStep === 1 ? <Loader2 size={12} className="animate-spin text-indigo-600" /> : null}
                              </div>

                              <div className="flex items-center justify-between text-xs font-semibold">
                                <div className="flex items-center gap-2.5">
                                  <span className={`h-2.5 w-2.5 rounded-full ${loadingStep >= 2 ? "bg-indigo-600" : "bg-slate-300 animate-pulse"}`} />
                                  <span className={loadingStep >= 2 ? "text-slate-800 font-bold" : "text-slate-400"}>Generating semantic embedding</span>
                                </div>
                                {loadingStep > 2 ? <Check size={14} className="text-green-600" /> : loadingStep === 2 ? <Loader2 size={12} className="animate-spin text-indigo-600" /> : null}
                              </div>

                              <div className="flex items-center justify-between text-xs font-semibold">
                                <div className="flex items-center gap-2.5">
                                  <span className={`h-2.5 w-2.5 rounded-full ${loadingStep >= 3 ? "bg-indigo-600" : "bg-slate-300 animate-pulse"}`} />
                                  <span className={loadingStep >= 3 ? "text-slate-800 font-bold" : "text-slate-400"}>Searching similar cases (FAISS)</span>
                                </div>
                                {loadingStep > 3 ? <Check size={14} className="text-green-600" /> : loadingStep === 3 ? <Loader2 size={12} className="animate-spin text-indigo-600" /> : null}
                              </div>

                              <div className="flex items-center justify-between text-xs font-semibold">
                                <div className="flex items-center gap-2.5">
                                  <span className={`h-2.5 w-2.5 rounded-full ${loadingStep >= 4 ? "bg-indigo-600" : "bg-slate-300 animate-pulse"}`} />
                                  <span className={loadingStep >= 4 ? "text-slate-800 font-bold" : "text-slate-400"}>Verifying with knowledge graph</span>
                                </div>
                                {loadingStep > 4 ? <Check size={14} className="text-green-600" /> : loadingStep === 4 ? <Loader2 size={12} className="animate-spin text-indigo-600" /> : null}
                              </div>

                              <div className="flex items-center justify-between text-xs font-semibold">
                                <div className="flex items-center gap-2.5">
                                  <span className={`h-2.5 w-2.5 rounded-full ${loadingStep >= 5 ? "bg-indigo-600" : "bg-slate-300 animate-pulse"}`} />
                                  <span className={loadingStep >= 5 ? "text-slate-800 font-bold" : "text-slate-400"}>Generating clinical reasoning (Groq LLM)</span>
                                </div>
                                {loadingStep === 5 ? <Loader2 size={12} className="animate-spin text-indigo-600" /> : null}
                              </div>

                            </div>
                            
                            <p className="text-[10px] text-slate-400 bg-slate-100 p-2.5 rounded border border-slate-200 text-center leading-normal">
                              Note: Startup requires loading deep learning models. Subsequent queries take sub-seconds.
                            </p>

                          </CardContent>
                        </Card>
                      )}

                      {/* REDESIGNED RESULTS VIEWER */}
                      {analysisResult && (
                        <div className="space-y-6">
                          
                          {/* Title banner */}
                          <div className="flex items-center justify-between">
                            <h3 className="font-extrabold text-slate-900 text-base tracking-tight">Clinical Assessment Results</h3>
                            <span className="text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                              AI-Assisted Decision Support
                            </span>
                          </div>

                          {/* Demographics Summary & Confidence Card */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            
                            {/* Summary Card */}
                            <Card className="col-span-2 shadow-sm border border-slate-200">
                              <CardContent className="p-4 text-xs space-y-2">
                                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Clinical Summary</span>
                                <div className="grid grid-cols-2 gap-4 pb-2 border-b border-slate-100 font-medium">
                                  <div>
                                    <span className="text-slate-400">Age:</span> <strong className="text-slate-800 font-bold">{analysisResult.patient_summary.age} Years</strong>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">Sex:</span> <strong className="text-slate-800 font-bold">{analysisResult.patient_summary.sex === "M" ? "Male" : "Female"}</strong>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-slate-400 font-medium">Presenting Symptoms:</span>
                                  <div className="flex flex-wrap gap-1">
                                    {analysisResult.patient_summary.symptoms.map((s, sIdx) => (
                                      <Badge key={sIdx} variant="secondary" className="bg-slate-100 border border-slate-200 text-slate-700 text-[9px] py-0 px-1.5">
                                        {s}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Confidence Card */}
                            <Card className="shadow-sm border border-slate-200 flex flex-col justify-between">
                              <CardContent className="p-4 text-xs flex-1 flex flex-col justify-between">
                                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Confidence Level</span>
                                
                                <div className="text-center py-2 space-y-1 shrink-0">
                                  <span className={`block font-extrabold text-sm tracking-tight ${
                                    analysisResult.confidence_level.toLowerCase().includes("high") ? "text-green-600" :
                                    analysisResult.confidence_level.toLowerCase().includes("medium") ? "text-amber-600" : "text-red-500"
                                  }`}>
                                    {analysisResult.confidence_level.split(" - ")[0].toUpperCase()}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block leading-tight">Match distribution</span>
                                </div>

                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                  <div className={`h-full rounded-full ${
                                    analysisResult.confidence_level.toLowerCase().includes("high") ? "bg-green-500 w-full" :
                                    analysisResult.confidence_level.toLowerCase().includes("medium") ? "bg-amber-500 w-2/3" : "bg-red-500 w-1/3"
                                  }`} />
                                </div>
                              </CardContent>
                            </Card>

                          </div>

                          {/* Possible Conditions list */}
                          <Card className="shadow-sm border border-slate-200">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Possible Conditions</CardTitle>
                              <CardDescription className="text-xs">Conditions supported by retrieved cases and clinical evidence.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0 space-y-4">
                              {analysisResult.possible_conditions.map((cond, idx) => {
                                // Find matching KG support for more details
                                const kgInfo = analysisResult.knowledge_graph_support.find(
                                  k => k.disease.toLowerCase() === cond.condition.toLowerCase()
                                );
                                
                                return (
                                  <div key={idx} className="p-5 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition-all flex flex-col md:flex-row justify-between gap-4">
                                    <div className="space-y-3 flex-1">
                                      <div className="flex flex-wrap items-baseline gap-2">
                                        <h4 className="font-extrabold text-sm text-slate-900 tracking-tight">{cond.condition}</h4>
                                        {kgInfo && (
                                          <span className="text-[10px] font-mono text-slate-400">
                                            ICD-10: {kgInfo.icd10} | Severity: {kgInfo.severity}
                                          </span>
                                        )}
                                      </div>

                                      {/* Matched symptom tags */}
                                      <div>
                                        <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Matched Evidence</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {cond.supporting_evidence.map((ev, eIdx) => (
                                            <Badge key={eIdx} className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] font-medium py-0 px-1.5">
                                              ✓ {ev}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Additional symptom indicators from KG */}
                                      {kgInfo && kgInfo.unmatched_symptoms.length > 0 && (
                                        <div>
                                          <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Additional Indicators</span>
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {kgInfo.unmatched_symptoms.slice(0, 3).map((un, uIdx) => (
                                              <Badge key={uIdx} variant="outline" className="text-slate-500 border-slate-200 text-[9px] py-0 px-1.5 bg-slate-50/50">
                                                ○ {un}
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    <div className="md:w-36 shrink-0 md:border-l border-slate-100 md:pl-4 flex flex-col justify-center text-[10px] text-slate-500 space-y-1">
                                      <div className="flex justify-between md:block md:space-y-0.5">
                                        <span>RAG Cosine Match:</span>
                                        <strong className="block font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded md:bg-transparent md:p-0">
                                          {cond.similar_cases_found} similar cases
                                        </strong>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </CardContent>
                          </Card>

                          {/* Tabbed Evidence Visualizers (RAG + KG) */}
                          <div className="grid grid-cols-1 gap-6">
                            
                            {/* Knowledge Graph Evidence Card */}
                            <Card className="shadow-sm border border-slate-200">
                              <CardHeader>
                                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Knowledge Graph Evidence</CardTitle>
                                <CardDescription className="text-xs">
                                  Topological disease-symptom maps for candidate conditions.
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="pt-0">
                                {analysisResult.knowledge_graph_support.length > 0 ? (
                                  <Tabs defaultValue={analysisResult.knowledge_graph_support[0].disease} className="w-full">
                                    <TabsList className="flex flex-wrap w-full bg-slate-100 p-1 rounded-lg gap-1 shrink-0 mb-4 h-auto">
                                      {analysisResult.knowledge_graph_support.map((kg, kIdx) => (
                                        <TabsTrigger 
                                          key={kIdx} 
                                          value={kg.disease} 
                                          className="text-xs py-1 px-3 flex-1 whitespace-normal text-center min-w-28 leading-tight"
                                        >
                                          {kg.disease.split(" / ")[0]}
                                        </TabsTrigger>
                                      ))}
                                    </TabsList>

                                    {analysisResult.knowledge_graph_support.map((kg, kIdx) => {
                                      // Split unmatched symptoms into additional and missing checks
                                      const matched = kg.matched_symptoms;
                                      const additional = kg.unmatched_symptoms.slice(0, Math.ceil(kg.unmatched_symptoms.length / 2));
                                      const missing = kg.unmatched_symptoms.slice(Math.ceil(kg.unmatched_symptoms.length / 2));

                                      return (
                                        <TabsContent key={kIdx} value={kg.disease} className="space-y-4 mt-0">
                                          
                                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            
                                            {/* Present (Green) */}
                                            <div className="p-4 bg-emerald-50/20 border border-emerald-200 rounded-xl space-y-2">
                                              <span className="block text-[9px] text-emerald-600 font-extrabold uppercase tracking-wider">MATCHED (Present)</span>
                                              <ul className="space-y-1">
                                                {matched.map((s, idx) => (
                                                  <li key={idx} className="flex items-center gap-1.5 text-xs text-slate-700">
                                                    <Check className="text-emerald-600 shrink-0" size={13} />
                                                    <span>{s}</span>
                                                  </li>
                                                ))}
                                                {matched.length === 0 && <span className="text-[10px] text-slate-400 italic">No symptoms match.</span>}
                                              </ul>
                                            </div>

                                            {/* Additional (Blue) */}
                                            <div className="p-4 bg-indigo-50/20 border border-indigo-200 rounded-xl space-y-2">
                                              <span className="block text-[9px] text-indigo-600 font-extrabold uppercase tracking-wider">ADDITIONAL (May Support)</span>
                                              <ul className="space-y-1">
                                                {additional.map((s, idx) => (
                                                  <li key={idx} className="flex items-center gap-1.5 text-xs text-slate-700">
                                                    <Circle className="text-indigo-400 shrink-0" size={10} />
                                                    <span>{s}</span>
                                                  </li>
                                                ))}
                                                {additional.length === 0 && <span className="text-[10px] text-slate-400 italic">No indicators.</span>}
                                              </ul>
                                            </div>

                                            {/* Missing (Red) */}
                                            <div className="p-4 bg-red-50/20 border border-red-200 rounded-xl space-y-2">
                                              <span className="block text-[9px] text-red-600 font-extrabold uppercase tracking-wider">MISSING / NOT REPORTED</span>
                                              <ul className="space-y-1">
                                                {missing.map((s, idx) => (
                                                  <li key={idx} className="flex items-center gap-1.5 text-xs text-slate-700">
                                                    <span className="h-1.5 w-1.5 bg-red-500 rounded-full shrink-0" />
                                                    <span>{s}</span>
                                                  </li>
                                                ))}
                                                {missing.length === 0 && <span className="text-[10px] text-slate-400 italic">No indicators.</span>}
                                              </ul>
                                            </div>

                                          </div>

                                          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 leading-relaxed italic">
                                            {kg.explanation}
                                          </div>

                                        </TabsContent>
                                      );
                                    })}
                                  </Tabs>
                                ) : (
                                  <p className="text-xs text-slate-400">No Knowledge Graph details found.</p>
                                )}
                              </CardContent>
                            </Card>

                            {/* Similar Historical Cases Card */}
                            <Card className="shadow-sm border border-slate-200">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Similar Historical Cases (Top 5)</CardTitle>
                                <CardDescription className="text-xs">
                                  Retrieved from 10,000 indexed clinical cases using BioClinicalBERT semantic similarity.
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="pt-0 overflow-x-auto">
                                <table className="w-full text-xs text-left border-collapse">
                                  <thead>
                                    <tr className="border-b border-slate-200 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                      <th className="py-2.5 pr-2">Rank</th>
                                      <th className="py-2.5 px-2">Diagnosis</th>
                                      <th className="py-2.5 px-2 text-right">Similarity</th>
                                      <th className="py-2.5 px-3">Key Symptoms</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {analysisResult.similar_cases.map((c, idx) => (
                                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                                        <td className="py-3 pr-2 font-mono text-slate-400">#{idx + 1}</td>
                                        <td className="py-3 px-2 font-bold text-slate-800">{c.ground_truth}</td>
                                        <td className="py-3 px-2 text-right font-mono font-semibold text-slate-700">
                                          {(c.similarity_score * 100).toFixed(2)}%
                                        </td>
                                        <td className="py-3 px-3">
                                          <div className="flex flex-wrap gap-1 max-w-sm">
                                            {c.symptoms.slice(0, 3).map((sym, sIdx) => (
                                              <Badge key={sIdx} variant="outline" className="text-[8px] py-0 px-1 border-slate-200 text-slate-500 font-normal">
                                                {sym.replace("Do you have a ", "").replace("Do you have ", "").replace("?", "")}
                                              </Badge>
                                            ))}
                                            {c.symptoms.length > 3 && (
                                              <span className="text-[9px] text-slate-400 font-medium">+{c.symptoms.length - 3} more</span>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                <p className="text-[10px] text-slate-400 italic mt-3 leading-tight">
                                  Retrieval processes FAISS Inner Product search over L2-normalized embeddings, equivalent to cosine similarity.
                                </p>
                              </CardContent>
                            </Card>

                          </div>

                          {/* Full Width Clinical Rationale */}
                          <Card className="shadow-sm border border-slate-200 border-l-4 border-l-indigo-600">
                            <CardHeader>
                              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clinical Rationale</CardTitle>
                              <CardDescription className="text-xs">LLM-based differential diagnosis validation and safety rule grounding.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0 space-y-4">
                              <p className="text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-line">
                                {analysisResult.clinical_rationale}
                              </p>
                              
                              {analysisResult.alternative_conditions.length > 0 && (
                                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Alternative Exclusions</span>
                                  <div className="flex flex-wrap gap-1">
                                    {analysisResult.alternative_conditions.map((alt, idx) => (
                                      <Badge key={idx} variant="outline" className="text-slate-700 border-slate-300 text-[10px] bg-slate-50">
                                        {alt}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>

                          {/* REDESIGNED HORIZONTAL STEPPER GRAPH */}
                          <Card className="shadow-sm border border-slate-200">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clinical Reasoning Pipeline Path</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-4 bg-slate-900 text-white rounded-xl font-mono text-[10px] border border-slate-800 leading-tight">
                                <div className="flex flex-col items-center p-2.5 bg-slate-800/80 rounded border border-slate-700 text-center w-full md:w-32">
                                  <span className="text-indigo-400 font-extrabold text-[9px] mb-1">01 Patient Input</span>
                                  <span className="text-slate-300">Demographics & symptoms</span>
                                </div>
                                <ArrowRight className="text-slate-600 hidden md:block" size={14} />
                                <div className="flex flex-col items-center p-2.5 bg-slate-800/80 rounded border border-slate-700 text-center w-full md:w-32">
                                  <span className="text-indigo-400 font-extrabold text-[9px] mb-1">02 BioClinicalBERT</span>
                                  <span className="text-slate-300">768D text encoding</span>
                                </div>
                                <ArrowRight className="text-slate-600 hidden md:block" size={14} />
                                <div className="flex flex-col items-center p-2.5 bg-slate-800/80 rounded border border-slate-700 text-center w-full md:w-32">
                                  <span className="text-indigo-400 font-extrabold text-[9px] mb-1">03 FAISS RAG</span>
                                  <span className="text-slate-300">Top 5 similar cases</span>
                                </div>
                                <ArrowRight className="text-slate-600 hidden md:block" size={14} />
                                <div className="flex flex-col items-center p-2.5 bg-slate-800/80 rounded border border-slate-700 text-center w-full md:w-32">
                                  <span className="text-indigo-400 font-extrabold text-[9px] mb-1">04 Knowledge Graph</span>
                                  <span className="text-slate-300">Evidence overlaps</span>
                                </div>
                                <ArrowRight className="text-slate-600 hidden md:block" size={14} />
                                <div className="flex flex-col items-center p-2.5 bg-indigo-950 border border-indigo-700 text-center w-full md:w-32 shadow shadow-indigo-500/10">
                                  <span className="text-indigo-300 font-extrabold text-[9px] mb-1">05 Groq LLM</span>
                                  <span className="text-indigo-100">Grounded rationale</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                        </div>
                      )}

                    </div>

                  </div>

                </div>
              )}

              {/* TAB 3: REDESIGNED ABOUT & METHODOLOGY PAGE */}
              {activeTab === "about" && (
                <div className="space-y-6">
                  
                  {/* System Architecture Section */}
                  <Card className="shadow-sm border border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">System Architecture</CardTitle>
                      <CardDescription className="text-xs">Core pipelines integrating semantic retrievals and topological graph validation.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-2 text-slate-600 text-xs leading-relaxed">
                      <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-5 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[10px] leading-tight">
                        <span className="font-bold text-slate-800">Patient Intake</span>
                        <ChevronRight className="rotate-90 md:rotate-0 text-slate-400" size={12} />
                        <span className="font-bold text-slate-800">Narrative Synthesis</span>
                        <ChevronRight className="rotate-90 md:rotate-0 text-slate-400" size={12} />
                        <span className="font-bold text-indigo-700">BioClinicalBERT Encoding</span>
                        <ChevronRight className="rotate-90 md:rotate-0 text-slate-400" size={12} />
                        <span className="font-bold text-slate-800">FAISS Index Search (RAG)</span>
                        <ChevronRight className="rotate-90 md:rotate-0 text-slate-400" size={12} />
                        <span className="font-bold text-slate-800">Knowledge Graph Cross-Check</span>
                        <ChevronRight className="rotate-90 md:rotate-0 text-slate-400" size={12} />
                        <span className="font-bold text-indigo-700">Groq LLM Reasoning</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Technology Stack Grid */}
                  <Card className="shadow-sm border border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Technology Stack</CardTitle>
                      <CardDescription className="text-xs">Underlying frameworks and platforms supporting the CDSS engine.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2 grid grid-cols-2 md:grid-cols-5 gap-3">
                      {[
                        "Python 3.14", "FastAPI", "BioClinicalBERT", "FAISS-CPU", "NetworkX",
                        "Groq SDK", "React 19", "TypeScript", "Tailwind CSS v4", "shadcn/ui"
                      ].map((tech, idx) => (
                        <div key={idx} className="p-3 bg-white border border-slate-200 text-center rounded-lg font-semibold text-xs text-slate-700 shadow-sm">
                          {tech}
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Why Each Component Cards */}
                  <Card className="shadow-sm border border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Component Justification</CardTitle>
                      <CardDescription className="text-xs">Why each piece is selected for the research pipeline.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                        <h4 className="font-bold text-xs text-slate-900 flex items-center gap-2">
                          <Cpu size={14} className="text-indigo-600" /> BioClinicalBERT
                        </h4>
                        <p className="text-[11px] text-slate-500 leading-normal">
                          Generates specialized medical embeddings. Replaces generic language models that lack representation of clinical nomenclature.
                        </p>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                        <h4 className="font-bold text-xs text-slate-900 flex items-center gap-2">
                          <Database size={14} className="text-indigo-600" /> FAISS index
                        </h4>
                        <p className="text-[11px] text-slate-500 leading-normal">
                          Performs fast inner-product (IP) vector similarity search over L2-normalized embeddings, retrieving cohorts in milliseconds.
                        </p>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                        <h4 className="font-bold text-xs text-slate-900 flex items-center gap-2">
                          <Layers size={14} className="text-indigo-600" /> NetworkX Graph
                        </h4>
                        <p className="text-[11px] text-slate-500 leading-normal">
                          Maps exact symptom-disease structures dynamically. Provides topological grounding checking matched vs missing indications.
                        </p>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                        <h4 className="font-bold text-xs text-slate-900 flex items-center gap-2">
                          <HeartHandshake size={14} className="text-indigo-600" /> Groq LLM Reasoning
                        </h4>
                        <p className="text-[11px] text-slate-500 leading-normal">
                          Serves as a logical explanation layer. Banned from diagnosing standalone, it compiles rationales strictly from the vector/KG context.
                        </p>
                      </div>

                    </CardContent>
                  </Card>

                  <SafetyNotice />
                </div>
              )}

            </div>
          </ScrollArea>
        </main>
        
      </AppShell>
    </TooltipProvider>
  );
}
