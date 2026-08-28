import React from "react";
import { Search, Plus, RotateCcw, X, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface PatientFormProps {
  age: number | "";
  setAge: (age: number | "") => void;
  sex: string;
  setSex: (sex: string) => void;
  selectedSymptoms: string[];
  setSelectedSymptoms: (symptoms: string[]) => void;
  symptomSearch: string;
  setSymptomSearch: (search: string) => void;
  additionalInfo: string;
  setAdditionalInfo: (info: string) => void;
  isAnalyzing: boolean;
  systemStatus: string;
  onAnalyze: (e: React.FormEvent) => void;
  onReset: () => void;
  errorMsg: string | null;
  COMMON_DEMO_SYMPTOMS: string[];
}

export default function PatientForm({
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
  systemStatus,
  onAnalyze,
  onReset,
  errorMsg,
  COMMON_DEMO_SYMPTOMS
}: PatientFormProps) {
  
  // Filter demo symptoms for quick selection suggestions dropdown
  const filteredSuggestions = COMMON_DEMO_SYMPTOMS.filter(
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && symptomSearch.trim()) {
      e.preventDefault();
      addSymptom(symptomSearch);
    }
  };

  return (
    <Card className="shadow-sm border border-[#E2E8F0] bg-white rounded-xl">
      <CardHeader className="border-b border-slate-100 pb-3">
        <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Patient Presentation</CardTitle>
        <CardDescription className="text-xs">Define patient profile parameters.</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={onAnalyze} className="space-y-4">
          
          {/* Patient Information: Age and Sex */}
          <div className="space-y-1">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Patient Information</span>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="age" className="text-[10px] font-bold text-[#64748B]">Age</label>
                <Input 
                  id="age"
                  type="number" 
                  placeholder="e.g. 49"
                  value={age} 
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
                  min={0}
                  max={120}
                  className="h-8.5 text-xs rounded-lg border-slate-200"
                  required
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="sex" className="text-[10px] font-bold text-[#64748B]">Sex</label>
                <Select value={sex} onValueChange={setSex}>
                  <SelectTrigger id="sex" className="h-8.5 text-xs rounded-lg border-slate-200">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Male</SelectItem>
                    <SelectItem value="F">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Presenting Symptoms section */}
          <div className="space-y-2">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Presenting Symptoms</span>
            
            {/* Displaying badges for selected symptoms */}
            {selectedSymptoms.length > 0 && (
              <div className="flex flex-wrap gap-1 p-2 bg-slate-50 border border-slate-200/80 rounded-lg max-h-24 overflow-y-auto">
                {selectedSymptoms.map((symptom, idx) => (
                  <Badge key={idx} variant="secondary" className="pl-2 pr-1 py-0.5 flex items-center gap-1 text-[10px] bg-white border border-slate-200 text-[#0F172A] font-semibold">
                    {symptom}
                    <button 
                      type="button" 
                      onClick={() => removeSymptom(symptom)} 
                      className="text-slate-450 hover:text-red-500 hover:bg-slate-100 rounded-full p-0.5 transition-colors"
                    >
                      <X size={9} />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Input Search Command Dropdown overlay */}
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input 
                  placeholder="Search symptoms or type custom..."
                  value={symptomSearch}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSymptomSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-8.5 pr-8 h-8.5 text-xs rounded-lg border-slate-200"
                />
                {symptomSearch && (
                  <button
                    type="button"
                    onClick={() => addSymptom(symptomSearch)}
                    className="absolute right-2.5 top-2 text-slate-450 hover:text-[#4F46E5] p-0.5"
                    title="Add custom symptom"
                  >
                    <Plus size={14} />
                  </button>
                )}
              </div>

              {symptomSearch && filteredSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-[#E2E8F0] rounded-md shadow-lg max-h-36 overflow-y-auto">
                  {filteredSuggestions.map((symptom, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => addSymptom(symptom)}
                      className="w-full text-left px-3 py-1.5 hover:bg-indigo-50/50 text-xs transition-colors font-medium text-slate-700"
                    >
                      {symptom}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick add suggested chips */}
            <div className="space-y-1">
              <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Suggested Symptoms</span>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {COMMON_DEMO_SYMPTOMS.map((s, idx) => {
                  const isSelected = selectedSymptoms.includes(s);
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isSelected}
                      onClick={() => addSymptom(s)}
                      className={`px-2 py-0.5 border text-[9px] font-semibold rounded-md transition-all ${
                        isSelected 
                          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                          : "bg-white text-slate-600 border-[#E2E8F0] hover:border-indigo-400 hover:text-[#4F46E5]"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Additional details textarea */}
          <div className="space-y-1">
            <label htmlFor="additional-info" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Additional Clinical Information</label>
            <Textarea 
              id="additional-info"
              placeholder="Symptoms duration, history, and relevant clinical observations..."
              value={additionalInfo}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAdditionalInfo(e.target.value)}
              rows={3}
              maxLength={500}
              className="resize-none text-xs rounded-lg border-slate-200"
            />
            <div className="text-[9px] text-slate-400 text-right select-none">
              {additionalInfo.length}/500
            </div>
          </div>

          {errorMsg && (
            <Alert variant="destructive" className="py-2.5 px-3 rounded-lg">
              <ShieldAlert size={14} className="shrink-0" />
              <AlertTitle className="text-xs font-bold leading-none">Intake Parameter Error</AlertTitle>
              <AlertDescription className="text-[10px] leading-tight mt-1">{errorMsg}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 pt-1.5">
            <Button 
              type="submit" 
              disabled={isAnalyzing || systemStatus !== "healthy"}
              className="flex-1 bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] hover:opacity-95 text-white font-bold text-xs shadow-md shadow-indigo-600/10 h-9 rounded-lg border-0"
            >
              {isAnalyzing ? "Analyzing presentation..." : "Analyze Clinical Case"}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onReset}
              disabled={isAnalyzing}
              className="px-3 border-slate-300 h-9 rounded-lg hover:bg-slate-50"
              title="Clear form"
            >
              <RotateCcw size={13} className="text-slate-500" />
            </Button>
          </div>

        </form>
      </CardContent>
    </Card>
  );
}
