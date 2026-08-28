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
  X 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
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

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "assessment" | "about">("dashboard");
  const [systemStatus, setSystemStatus] = useState<"connecting" | "healthy" | "error">("connecting");
  
  // Intake Form State
  const [age, setAge] = useState<number | "">("");
  const [sex, setSex] = useState<string>("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [symptomSearch, setSymptomSearch] = useState<string>("");
  const [additionalInfo, setAdditionalInfo] = useState<string>("");
  
  // Pipeline State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Monitor API Health
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

  // Filter symptoms for search dropdown
  const filteredSymptoms = COMMON_DEMO_SYMPTOMS.filter(
    symptom => 
      symptom.toLowerCase().includes(symptomSearch.toLowerCase()) &&
      !selectedSymptoms.includes(symptom)
  );

  // Add symptom helper
  const addSymptom = (symptom: string) => {
    if (symptom.trim() && !selectedSymptoms.includes(symptom.trim())) {
      setSelectedSymptoms([...selectedSymptoms, symptom.trim()]);
    }
    setSymptomSearch("");
  };

  // Remove symptom helper
  const removeSymptom = (symptom: string) => {
    setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptom));
  };

  // Handle custom symptom entry via Enter key
  const handleSymptomKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && symptomSearch.trim()) {
      e.preventDefault();
      addSymptom(symptomSearch);
    }
  };

  // Run CDSS Clinical Analysis
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
      const serverErr = err.response?.data?.detail || err.message || "An unknown error occurred during analysis.";
      setErrorMsg(serverErr);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Reset intake form state
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
      <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-800">
        
        {/* Sidebar Nav */}
        <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col justify-between border-r border-slate-800">
          <div>
            <div className="p-6 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-600 rounded-lg text-white">
                  <Activity size={20} />
                </div>
                <div>
                  <h1 className="font-bold text-lg leading-tight tracking-tight">MedAssist AI</h1>
                  <p className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase">CDSS Engine</p>
                </div>
              </div>
            </div>
            
            <nav className="p-4 space-y-1">
              <button 
                onClick={() => setActiveTab("dashboard")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "dashboard" 
                    ? "bg-indigo-600 text-white shadow-sm" 
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                }`}
              >
                <Layers size={16} />
                Dashboard
              </button>
              <button 
                onClick={() => setActiveTab("assessment")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "assessment" 
                    ? "bg-indigo-600 text-white shadow-sm" 
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                }`}
              >
                <FileText size={16} />
                New Assessment
              </button>
              <button 
                onClick={() => setActiveTab("about")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "about" 
                    ? "bg-indigo-600 text-white shadow-sm" 
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                }`}
              >
                <BookOpen size={16} />
                About MedAssist AI
              </button>
            </nav>
          </div>

          <div className="p-6 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>System Engines</span>
              <div className="flex items-center gap-1.5 font-medium">
                <span className={`h-2.5 w-2.5 rounded-full ${
                  systemStatus === "healthy" ? "bg-green-500 animate-pulse" :
                  systemStatus === "connecting" ? "bg-yellow-500 animate-pulse" : "bg-red-500"
                }`} />
                <span className="capitalize">{systemStatus === "healthy" ? "Online" : systemStatus === "connecting" ? "Syncing" : "Offline"}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          
          {/* Header */}
          <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shadow-sm shrink-0">
            <div>
              <h2 className="font-semibold text-lg text-slate-900">
                {activeTab === "dashboard" ? "System Overview" : 
                 activeTab === "assessment" ? "Clinical Case Assessment" : "Clinical Methodology"}
              </h2>
              <p className="text-xs text-slate-500">AI-Assisted Clinical Decision Support System (CDSS)</p>
            </div>
            
            <div className="flex items-center gap-4 text-xs">
              <span className="px-2.5 py-1 bg-slate-100 rounded-full font-mono text-slate-600 border border-slate-200">
                FAISS Cases: 10,000
              </span>
              <span className="px-2.5 py-1 bg-slate-100 rounded-full font-mono text-slate-600 border border-slate-200">
                KG Edges: 888
              </span>
            </div>
          </header>

          {/* Scrollable Body */}
          <ScrollArea className="flex-1 bg-slate-50 overflow-y-auto">
            <div className="p-8 max-w-6xl mx-auto space-y-8">
              
              {/* TAB 1: DASHBOARD OVERVIEW */}
              {activeTab === "dashboard" && (
                <div className="space-y-6">
                  {/* Banner */}
                  <Card className="border-l-4 border-l-indigo-600 shadow-sm overflow-hidden">
                    <CardHeader className="bg-slate-50/50">
                      <CardTitle className="text-xl text-slate-900">Welcome to MedAssist AI</CardTitle>
                      <CardDescription>
                        A clinical research platform linking semantic similarity searches with topological evidence graphs.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <p className="text-sm text-slate-600 leading-relaxed">
                        This Decision Support system synthesizes medical intake notes using **BioClinicalBERT** (Emily Alsentzer et al.), 
                        retrieves matching cohorts from a database of **10,000 diagnostic cases**, verifies disease-symptom linkages 
                        against a **directed clinical Knowledge Graph**, and utilizes **Groq LLM reasoning** to deliver explainable differentials.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                        <div className="p-4 bg-slate-100/50 rounded-lg border border-slate-200 flex items-start gap-3">
                          <Database className="text-indigo-600 shrink-0 mt-0.5" size={18} />
                          <div>
                            <h4 className="font-semibold text-xs text-slate-900">Vector Embeddings</h4>
                            <p className="text-xs text-slate-500 mt-0.5">FAISS indices referencing 768-dim clinical vectors.</p>
                          </div>
                        </div>
                        <div className="p-4 bg-slate-100/50 rounded-lg border border-slate-200 flex items-start gap-3">
                          <Cpu className="text-indigo-600 shrink-0 mt-0.5" size={18} />
                          <div>
                            <h4 className="font-semibold text-xs text-slate-900">Methodological Graph</h4>
                            <p className="text-xs text-slate-500 mt-0.5">Directed NetworkX relationships from DDXPlus metadata.</p>
                          </div>
                        </div>
                        <div className="p-4 bg-slate-100/50 rounded-lg border border-slate-200 flex items-start gap-3">
                          <Layers className="text-indigo-600 shrink-0 mt-0.5" size={18} />
                          <div>
                            <h4 className="font-semibold text-xs text-slate-900">Explainable Grounding</h4>
                            <p className="text-xs text-slate-500 mt-0.5">Compounded prompt validation with safety boundaries.</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="pt-4">
                        <Button onClick={() => setActiveTab("assessment")} className="gap-2">
                          <Plus size={16} /> Start Case Assessment
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Pipelines Diagram */}
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base text-slate-900">System Architecture & Pipeline Integration</CardTitle>
                      <CardDescription>Visual dataflow mapping from patient intake to clinical reasoning output.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-6 bg-slate-900 text-white rounded-lg font-mono text-[11px] border border-slate-800">
                        <div className="flex flex-col items-center p-3 bg-slate-800/80 rounded border border-slate-700 w-full md:w-36 text-center">
                          <span className="text-indigo-400 font-bold uppercase tracking-wider text-[9px] mb-1">Step 1</span>
                          <span>Demographics & Symptoms</span>
                        </div>
                        <ChevronRight className="text-slate-600 hidden md:block" />
                        <div className="flex flex-col items-center p-3 bg-slate-800/80 rounded border border-slate-700 w-full md:w-36 text-center">
                          <span className="text-indigo-400 font-bold uppercase tracking-wider text-[9px] mb-1">Step 2</span>
                          <span>BioClinicalBERT Embeddings</span>
                        </div>
                        <ChevronRight className="text-slate-600 hidden md:block" />
                        <div className="flex flex-col items-center p-3 bg-slate-800/80 rounded border border-slate-700 w-full md:w-36 text-center">
                          <span className="text-indigo-400 font-bold uppercase tracking-wider text-[9px] mb-1">Step 3</span>
                          <span>FAISS Case Similarity</span>
                        </div>
                        <ChevronRight className="text-slate-600 hidden md:block" />
                        <div className="flex flex-col items-center p-3 bg-slate-800/80 rounded border border-slate-700 w-full md:w-36 text-center">
                          <span className="text-indigo-400 font-bold uppercase tracking-wider text-[9px] mb-1">Step 4</span>
                          <span>Knowledge Graph Overlap</span>
                        </div>
                        <ChevronRight className="text-slate-600 hidden md:block" />
                        <div className="flex flex-col items-center p-3 bg-indigo-900/50 rounded border border-indigo-700/80 w-full md:w-36 text-center">
                          <span className="text-indigo-400 font-bold uppercase tracking-wider text-[9px] mb-1">Step 5</span>
                          <span>Groq LLM Reasoning</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* TAB 2: CLINICAL ASSESSMENT */}
              {activeTab === "assessment" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  
                  {/* Left Column: Input Form */}
                  <div className="lg:col-span-5 space-y-6">
                    <Card className="shadow-sm border border-slate-200">
                      <CardHeader className="border-b border-slate-100">
                        <CardTitle className="text-base text-slate-900">Case Intake Panel</CardTitle>
                        <CardDescription>Input patient metrics and click analyze to run the inference pipelines.</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <form onSubmit={handleAnalyze} className="space-y-5">
                          
                          {/* Demographics Row */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label htmlFor="age" className="text-xs font-semibold text-slate-600">Age</label>
                              <Input 
                                id="age"
                                type="number" 
                                placeholder="e.g. 49"
                                value={age} 
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
                                min={0}
                                max={120}
                                required
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label htmlFor="sex" className="text-xs font-semibold text-slate-600">Sex</label>
                              <Select value={sex} onValueChange={setSex}>
                                <SelectTrigger id="sex">
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="M">Male</SelectItem>
                                  <SelectItem value="F">Female</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Searchable Multi-Select Symptoms */}
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-600">Presenting Symptoms</label>
                            
                            {/* Selected badges */}
                            {selectedSymptoms.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 p-2 bg-slate-100/50 rounded-md border border-slate-200 mb-2">
                                {selectedSymptoms.map((symptom, idx) => (
                                  <Badge key={idx} variant="secondary" className="pl-2 pr-1 py-0.5 flex items-center gap-1 text-[11px] bg-white border border-slate-300">
                                    {symptom}
                                    <button 
                                      type="button" 
                                      onClick={() => removeSymptom(symptom)} 
                                      className="text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-full p-0.5"
                                    >
                                      <X size={10} />
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {/* Dropdown search inputs */}
                            <div className="relative">
                              <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <Input 
                                  placeholder="Search or enter custom symptom..."
                                  value={symptomSearch}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSymptomSearch(e.target.value)}
                                  onKeyDown={handleSymptomKeyDown}
                                  className="pl-9 pr-8"
                                />
                                {symptomSearch && (
                                  <button
                                    type="button"
                                    onClick={() => addSymptom(symptomSearch)}
                                    className="absolute right-3 top-2.5 text-slate-500 hover:text-indigo-600"
                                    title="Add custom symptom"
                                  >
                                    <Plus size={16} />
                                  </button>
                                )}
                              </div>

                              {/* Search results overlay dropdown */}
                              {symptomSearch && filteredSymptoms.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                                  {filteredSymptoms.map((symptom, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => addSymptom(symptom)}
                                      className="w-full text-left px-4 py-2 hover:bg-indigo-50 text-xs transition-colors"
                                    >
                                      {symptom}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400">
                              Common demo symptoms are searchable. Type custom signs and press Enter or click "+" to add.
                            </p>
                          </div>

                          {/* Additional clinical info */}
                          <div className="space-y-1.5">
                            <label htmlFor="additional-info" className="text-xs font-semibold text-slate-600">Additional Information / Duration</label>
                            <Textarea 
                              id="additional-info"
                              placeholder="e.g. Symptoms started 3 days ago. No previous respiratory illness history."
                              value={additionalInfo}
                              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAdditionalInfo(e.target.value)}
                              rows={3}
                              className="resize-none"
                            />
                          </div>

                          {errorMsg && (
                            <Alert variant="destructive" className="py-2.5 px-3">
                              <ShieldAlert size={14} className="shrink-0" />
                              <AlertTitle className="text-xs font-bold leading-none">Intake Error</AlertTitle>
                              <AlertDescription className="text-[11px] leading-tight mt-1">{errorMsg}</AlertDescription>
                            </Alert>
                          )}

                          <div className="flex gap-2 pt-2">
                            <Button 
                              type="submit" 
                              disabled={isAnalyzing || systemStatus !== "healthy"}
                              className="flex-1 bg-indigo-600 hover:bg-indigo-700 gap-2 text-white font-medium"
                            >
                              {isAnalyzing ? (
                                <>
                                  <RotateCcw className="animate-spin" size={16} />
                                  Analyzing Case...
                                </>
                              ) : (
                                "Analyze Clinical Case"
                              )}
                            </Button>
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={resetForm}
                              disabled={isAnalyzing}
                              className="px-3"
                              title="Reset intake fields"
                            >
                              <RotateCcw size={16} />
                            </Button>
                          </div>

                        </form>
                      </CardContent>
                    </Card>

                    {/* Disclaimer */}
                    <Card className="bg-amber-50/50 border border-amber-200">
                      <CardContent className="p-4 flex gap-3">
                        <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={18} />
                        <div className="space-y-1">
                          <h4 className="font-semibold text-xs text-amber-900">Methodological Safety Notice</h4>
                          <p className="text-[10px] text-amber-800 leading-normal">
                            MedAssist AI provides AI-assisted clinical decision support for research and educational purposes. 
                            It is not a substitute for professional medical diagnosis, judgment, or treatment. 
                            Matches indicate similarities to historical database records only.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Column: Output Results */}
                  <div className="lg:col-span-7 space-y-6">
                    
                    {/* Idle State */}
                    {!isAnalyzing && !analysisResult && (
                      <div className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/20">
                        <Activity className="text-slate-300 w-12 h-12 mb-4 animate-pulse" />
                        <h3 className="font-semibold text-slate-600 text-sm">Awaiting Intake Submission</h3>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm">
                          Configure patient age, gender, and presenting symptom vectors in the Intake Panel, then submit to retrieve grounded clinical reasoning.
                        </p>
                      </div>
                    )}

                    {/* Loading State Skeletons */}
                    {isAnalyzing && (
                      <div className="space-y-6">
                        <Card className="shadow-sm">
                          <CardContent className="p-6 space-y-4">
                            <div className="flex items-center gap-3">
                              <Skeleton className="h-5 w-5 rounded-full" />
                              <Skeleton className="h-4 w-48" />
                            </div>
                            <div className="space-y-2">
                              <Skeleton className="h-3 w-full" />
                              <Skeleton className="h-3 w-full" />
                              <Skeleton className="h-3 w-3/4" />
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card className="shadow-sm">
                          <CardContent className="p-6 space-y-4">
                            <div className="flex justify-between items-center">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-6 w-16 rounded-full" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <Skeleton className="h-28 w-full rounded-lg" />
                              <Skeleton className="h-28 w-full rounded-lg" />
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Results Dashboard */}
                    {analysisResult && (
                      <div className="space-y-6">
                        
                        {/* 1. Clinical Summary Header Card */}
                        <Card className="shadow-sm border-l-4 border-l-emerald-500">
                          <CardHeader className="pb-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-sm font-bold text-slate-900">Active Patient Presentation</CardTitle>
                                <CardDescription className="text-xs">Summary of mapped input coordinates.</CardDescription>
                              </div>
                              <Badge className={`${
                                analysisResult.confidence_level.toLowerCase().includes("high") ? "bg-green-600 text-white" :
                                analysisResult.confidence_level.toLowerCase().includes("medium") ? "bg-amber-600 text-white" : "bg-red-500 text-white"
                              }`}>
                                Confidence: {analysisResult.confidence_level.split(" - ")[0]}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="text-xs space-y-3 pt-0">
                            <div className="grid grid-cols-3 gap-4 p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
                              <div>
                                <span className="block text-slate-400 font-medium">Age</span>
                                <span className="font-bold text-slate-800">{analysisResult.patient_summary.age} Years</span>
                              </div>
                              <div>
                                <span className="block text-slate-400 font-medium">Gender</span>
                                <span className="font-bold text-slate-800">{analysisResult.patient_summary.sex === "M" ? "Male" : "Female"}</span>
                              </div>
                              <div>
                                <span className="block text-slate-400 font-medium">Primary Presenting</span>
                                <span className="font-bold text-slate-800">{analysisResult.patient_summary.symptoms.length} Symptoms</span>
                              </div>
                            </div>
                            
                            {analysisResult.patient_summary.additional_information && (
                              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
                                <span className="block text-slate-400 font-medium">Clinical Narrative Context</span>
                                <p className="text-slate-600 mt-1 italic leading-relaxed">"{analysisResult.patient_summary.additional_information}"</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Tabs content: Main reasoning vs RAG similarity vs KG graph support */}
                        <Tabs defaultValue="reasoning" className="w-full">
                          <TabsList className="grid grid-cols-3 w-full bg-slate-100 p-1 rounded-lg">
                            <TabsTrigger value="reasoning" className="text-xs py-1.5">Differential & Rationale</TabsTrigger>
                            <TabsTrigger value="kg" className="text-xs py-1.5">Knowledge Graph</TabsTrigger>
                            <TabsTrigger value="rag" className="text-xs py-1.5">Similar Cases (RAG)</TabsTrigger>
                          </TabsList>
                          
                          {/* Tab Content 1: LLM Reasoning Rationale */}
                          <TabsContent value="reasoning" className="space-y-6 mt-4">
                            
                            {/* Possible Conditions Card */}
                            <Card className="shadow-sm">
                              <CardHeader>
                                <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wider text-slate-500">Possible Conditions</CardTitle>
                              </CardHeader>
                              <CardContent className="pt-0 space-y-4">
                                {analysisResult.possible_conditions.length > 0 ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {analysisResult.possible_conditions.map((cond, idx) => (
                                      <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between hover:border-indigo-200 transition-colors">
                                        <div className="space-y-2">
                                          <h4 className="font-bold text-sm text-slate-900">{cond.condition}</h4>
                                          
                                          <div>
                                            <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Matched Evidence</span>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                              {cond.supporting_evidence.map((ev, sIdx) => (
                                                <Badge key={sIdx} variant="secondary" className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] py-0 px-1.5">
                                                  ✓ {ev}
                                                </Badge>
                                              ))}
                                            </div>
                                          </div>
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-500">
                                          <span>RAG matches:</span>
                                          <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">{cond.similar_cases_found} Cases</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-500">No primary matches generated by the clinical system.</p>
                                )}
                              </CardContent>
                            </Card>

                            {/* Alternative Conditions */}
                            {analysisResult.alternative_conditions.length > 0 && (
                              <Card className="shadow-sm">
                                <CardContent className="p-4 space-y-2">
                                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alternative Conditions to Rule Out</h4>
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {analysisResult.alternative_conditions.map((alt, idx) => (
                                      <Badge key={idx} variant="outline" className="text-slate-700 border-slate-300 text-[10px] bg-slate-50">
                                        {alt}
                                      </Badge>
                                    ))}
                                  </div>
                                </CardContent>
                              </Card>
                            )}

                            {/* Clinical Rationale Explanation */}
                            <Card className="shadow-sm border-l-4 border-l-indigo-500">
                              <CardHeader>
                                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clinical Rationale & Reasoning</CardTitle>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <p className="text-xs text-slate-600 leading-relaxed font-sans whitespace-pre-line">
                                  {analysisResult.clinical_rationale}
                                </p>
                              </CardContent>
                            </Card>

                          </TabsContent>

                          {/* Tab Content 2: Knowledge Graph Evidences */}
                          <TabsContent value="kg" className="space-y-6 mt-4">
                            <Card className="shadow-sm">
                              <CardHeader>
                                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Knowledge Graph Path Validation</CardTitle>
                                <CardDescription className="text-xs">
                                  Cross-checking patient vectors against the clinical NetworkX model mapping.
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="pt-0 space-y-6">
                                {analysisResult.knowledge_graph_support.length > 0 ? (
                                  <div className="space-y-6">
                                    {analysisResult.knowledge_graph_support.map((kg, idx) => (
                                      <div key={idx} className="p-4 rounded-xl border border-slate-200/80 bg-white space-y-4">
                                        
                                        {/* Header */}
                                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                          <div>
                                            <h4 className="font-bold text-sm text-slate-900">{kg.disease}</h4>
                                            <span className="text-[10px] font-mono text-slate-400">ICD-10: {kg.icd10} | Severity: {kg.severity}</span>
                                          </div>
                                        </div>

                                        {/* Grid comparing symptoms */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          
                                          {/* Matched symptoms */}
                                          <div className="space-y-2">
                                            <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">✓ Matched Symptoms (Present)</span>
                                            <ul className="space-y-1.5">
                                              {kg.matched_symptoms.map((s, sIdx) => (
                                                <li key={sIdx} className="flex items-center gap-2 text-xs text-slate-700 bg-emerald-50/50 p-1.5 rounded border border-emerald-100">
                                                  <Check className="text-emerald-600 shrink-0" size={14} />
                                                  <span>{s}</span>
                                                </li>
                                              ))}
                                            </ul>
                                          </div>

                                          {/* Missing symptoms */}
                                          <div className="space-y-2">
                                            <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">! Unreported/Missing Evidence</span>
                                            <ul className="space-y-1.5">
                                              {kg.unmatched_symptoms.map((s, sIdx) => (
                                                <li key={sIdx} className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200">
                                                  <Circle className="text-slate-400 shrink-0" size={12} />
                                                  <span>{s}</span>
                                                </li>
                                              ))}
                                            </ul>
                                          </div>

                                        </div>

                                        {/* Local Explanation text */}
                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-600 leading-relaxed font-sans">
                                          {kg.explanation}
                                        </div>

                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-500">No Knowledge Graph connections found for the candidate conditions.</p>
                                )}
                              </CardContent>
                            </Card>
                          </TabsContent>

                          {/* Tab Content 3: RAG Cases similarity */}
                          <TabsContent value="rag" className="space-y-6 mt-4">
                            <Card className="shadow-sm">
                              <CardHeader>
                                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">FAISS Similar Historical Cases</CardTitle>
                                <CardDescription className="text-xs">
                                  Top 5 matching patient narratives retrieved by semantic cosine distance from BioClinicalBERT embeddings.
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <div className="space-y-4">
                                  {analysisResult.similar_cases.map((caseItem, idx) => (
                                    <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col justify-between gap-3 hover:border-indigo-200 transition-colors">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                            Case {idx + 1}
                                          </span>
                                          <h4 className="font-bold text-sm text-slate-900 mt-2">{caseItem.ground_truth}</h4>
                                        </div>
                                        <div className="text-right">
                                          <span className="block text-[10px] text-slate-400">Cosine Similarity</span>
                                          <span className="font-bold text-xs text-slate-800">{(caseItem.similarity_score * 100).toFixed(2)}%</span>
                                        </div>
                                      </div>

                                      <div>
                                        <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Symptoms Present in Case</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {caseItem.symptoms.map((s, sIdx) => (
                                            <Badge key={sIdx} variant="outline" className="text-slate-600 border-slate-300 text-[9px] py-0 px-1 bg-slate-50/50">
                                              {s.replace("Do you have a ", "").replace("Do you have ", "").replace("Are you experiencing ", "").replace("?", "")}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          </TabsContent>
                        </Tabs>

                        {/* Explainability Section Diagram */}
                        <Card className="shadow-sm">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                              How MedAssist AI Reached This Result
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex flex-col space-y-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                              
                              <div className="flex items-start gap-3">
                                <div className="p-1.5 bg-indigo-100 rounded text-indigo-700 shrink-0 mt-0.5">
                                  <User size={14} />
                                </div>
                                <div className="space-y-0.5">
                                  <h5 className="font-bold text-xs text-slate-900">1. Patient Clinical Input</h5>
                                  <p className="text-[10px] text-slate-500">
                                    Patient demographics ({analysisResult.patient_summary.age}y/o {analysisResult.patient_summary.sex}) and selected symptom indices are structured.
                                  </p>
                                </div>
                              </div>

                              <ChevronRight className="rotate-90 text-slate-300 ml-2.5 h-3 w-3 shrink-0" />

                              <div className="flex items-start gap-3">
                                <div className="p-1.5 bg-indigo-100 rounded text-indigo-700 shrink-0 mt-0.5">
                                  <Cpu size={14} />
                                </div>
                                <div className="space-y-0.5">
                                  <h5 className="font-bold text-xs text-slate-900">2. Embedding & FAISS RAG Retrieval</h5>
                                  <p className="text-[10px] text-slate-500">
                                    BioClinicalBERT encodes the presentation. Cosine distance identifies the top 5 most similar cases out of 10,000 in index.
                                  </p>
                                </div>
                              </div>

                              <ChevronRight className="rotate-90 text-slate-300 ml-2.5 h-3 w-3 shrink-0" />

                              <div className="flex items-start gap-3">
                                <div className="p-1.5 bg-indigo-100 rounded text-indigo-700 shrink-0 mt-0.5">
                                  <Layers size={14} />
                                </div>
                                <div className="space-y-0.5">
                                  <h5 className="font-bold text-xs text-slate-900">3. Knowledge Graph Verification</h5>
                                  <p className="text-[10px] text-slate-500">
                                    The clinical graph checks matched vs missing/discriminating evidence pathways for the candidate conditions.
                                  </p>
                                </div>
                              </div>

                              <ChevronRight className="rotate-90 text-slate-300 ml-2.5 h-3 w-3 shrink-0" />

                              <div className="flex items-start gap-3">
                                <div className="p-1.5 bg-indigo-100 rounded text-indigo-700 shrink-0 mt-0.5">
                                  <HeartHandshake size={14} />
                                </div>
                                <div className="space-y-0.5">
                                  <h5 className="font-bold text-xs text-slate-900">4. LLM Reasoning Layer</h5>
                                  <p className="text-[10px] text-slate-500">
                                    Groq Llama model reconciles RAG vectors and KG evidence mapping to construct differential JSONs and clinical rationales.
                                  </p>
                                </div>
                              </div>

                            </div>
                          </CardContent>
                        </Card>

                      </div>
                    )}

                  </div>

                </div>
              )}

              {/* TAB 3: ABOUT METHODOLOGY */}
              {activeTab === "about" && (
                <div className="space-y-6">
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base text-slate-900">Clinical Methodology & System Parameters</CardTitle>
                      <CardDescription>Methodological foundations behind the MedAssist AI decision support layers.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 text-sm text-slate-600 leading-relaxed">
                      
                      <div className="space-y-2">
                        <h3 className="font-bold text-sm text-slate-900">1. BioClinicalBERT Encoder</h3>
                        <p>
                          Intake notes are compiled into narrative formats and tokenized. We pass them through `Emilyalsentzer/Bio_ClinicalBERT`, 
                          a BERT model pretrained on clinical notes from the MIMIC-III database. This yields a dense 768-dimensional clinical 
                          context embedding vector that captures deep semantic associations between symptoms.
                        </p>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <h3 className="font-bold text-sm text-slate-900">2. Vector Search (FAISS Index)</h3>
                        <p>
                          Our indexed cases directory references **10,000 clinical records** processed from the DDXPlus database. 
                          Using Facebook AI Similarity Search (FAISS) with a flat L2 metric index, the retriever performs sub-millisecond 
                          cosine checks to gather the top 5 matches that display symptom distributions matching the current patient.
                        </p>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <h3 className="font-bold text-sm text-slate-900">3. Directed Knowledge Graph</h3>
                        <p>
                          Our medical NetworkX graph maps clinical pathways derived from metadata registries:
                          * **Nodes**: 49 unique disease/condition nodes and 222 evidence/symptom nodes.
                          * **Edges**: 888 directed links showing symptom associations (e.g. `Disease --has_symptom--&gt; Evidence`).
                          The graph query layer computes intersection ratios between the patient's reported symptoms and the disease's 
                          full indicator profile. This highlights which indicators are present vs which key indicators are missing or unreported.
                        </p>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <h3 className="font-bold text-sm text-slate-900">4. LLM Explainer & Rationale Layer</h3>
                        <p>
                          Rather than using LLMs to invent diagnoses (which causes hallucinations), the system limits model scope:
                          1. Prompt builder compiles demographic facts + RAG case statistics + KG overlap indicators.
                          2. Model acts exclusively as a clinical reasoning layer to summarize findings, format differential outputs, and compute confidence thresholds.
                          3. Model outputs structured JSON schemas that are parsed and validated by backend Pydantic models.
                        </p>
                      </div>

                    </CardContent>
                  </Card>
                </div>
              )}

            </div>
          </ScrollArea>
        </main>
        
      </div>
    </TooltipProvider>
  );
}
