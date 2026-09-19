import { useState } from "react";
import { User, Activity, FileText, ArrowRight, Layers, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";

interface PatientSummaryProps {
  age: number;
  sex: string;
  symptoms: string[];
  additionalInfo: string;
  confidenceLevel: string;
  conditionsCount: number;
  casesCount: number;
  matchedCount: number;
  missingCount: number;
}

export default function PatientSummary({
  age,
  sex,
  symptoms,
  additionalInfo,
  confidenceLevel,
  conditionsCount,
  casesCount,
  matchedCount,
  missingCount
}: PatientSummaryProps) {
  const [isReasoningOpen, setIsReasoningOpen] = useState(false);

  // Parse raw confidence level and extract prefix
  const isHigh = confidenceLevel.toLowerCase().includes("high");
  const isMedium = confidenceLevel.toLowerCase().includes("medium");
  const parsedLevel = isHigh ? "High" : isMedium ? "Medium" : "Low";

  // Formulate a compact short explanation
  const shortExplanation = isHigh 
    ? "Strong evidence matches with index cohorts and graph paths." 
    : isMedium 
      ? "Supportive evidence with some missing distinguishing features." 
      : "Weak evidence matches with multiple missing clinical indicators.";

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch select-none">
        
        {/* 1. Clinical Summary (5 columns) */}
        <Card className="lg:col-span-5 shadow-sm border border-[#E2E8F0] bg-white rounded-xl flex flex-col justify-between">
          <CardContent className="p-4 text-xs flex-1 flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="block text-[10px] text-[#64748B] font-extrabold uppercase tracking-wider">Clinical Summary</span>
                <span className="text-[10px] text-indigo-600 font-bold flex items-center gap-1">
                  <User size={11} /> Patient Profile
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-100 font-semibold text-[#0F172A]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#64748B] font-medium">Age:</span>
                  <strong className="font-bold text-slate-800">{age} years</strong>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[#64748B] font-medium">Sex:</span>
                  <strong className="font-bold text-slate-800">{sex === "M" ? "Male" : "Female"}</strong>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[#64748B] font-bold text-[9px] uppercase tracking-wider flex items-center gap-1">
                  <Activity size={10} className="text-indigo-500" /> Presenting Symptoms
                </span>
                <div className="flex flex-wrap gap-1 max-h-12 overflow-y-auto pt-0.5">
                  {symptoms.map((s, idx) => (
                    <Badge key={idx} variant="secondary" className="bg-slate-100 border border-slate-200 text-slate-700 text-[9px] font-semibold py-0 px-1.5 rounded-md">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {additionalInfo && (
              <div className="space-y-0.5 border-t border-slate-100 pt-2">
                <span className="text-[#64748B] font-bold text-[9px] uppercase tracking-wider flex items-center gap-1">
                  <FileText size={10} className="text-slate-400" /> Clinical Narrative
                </span>
                <p className="text-[10px] text-slate-600 leading-normal line-clamp-2 italic font-medium">
                  "{additionalInfo}"
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* 2. Confidence Level Card (3 columns) */}
        <Card className="lg:col-span-3 shadow-sm border border-[#E2E8F0] bg-white rounded-xl flex flex-col justify-between">
          <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-2">
            <span className="block text-[10px] text-[#64748B] font-extrabold uppercase tracking-wider">Confidence Level</span>
            
            <div className="text-center py-0.5">
              <span className={`block font-black text-2xl tracking-wider uppercase leading-none ${
                isHigh ? "text-emerald-600" : isMedium ? "text-amber-500" : "text-rose-500"
              }`}>
                {parsedLevel}
              </span>
            </div>

            {/* Slider line indicator */}
            <div className="space-y-1">
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200/50">
                <div className={`h-full rounded-full transition-all duration-500 ${
                  isHigh ? "bg-emerald-500 w-[85%]" : isMedium ? "bg-amber-500 w-[55%]" : "bg-rose-500 w-[25%]"
                }`} />
              </div>
              <div className="flex justify-between text-[8px] text-slate-400 font-extrabold uppercase tracking-widest pt-0.5 leading-none">
                <span>Low</span>
                <span>Medium</span>
                <span>High</span>
              </div>
            </div>

            <div className="pt-1 border-t border-slate-100 space-y-1">
              <p className="text-[10px] text-slate-600 font-medium leading-tight">
                <strong className="text-slate-700">Why?</strong> "{shortExplanation}"
              </p>
              <Button 
                onClick={() => setIsReasoningOpen(true)}
                variant="link" 
                className="p-0 h-auto text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
              >
                View reasoning <ArrowRight size={10} />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 3. Key Pipeline Metrics (4 columns) */}
        <Card className="lg:col-span-4 shadow-sm border border-[#E2E8F0] bg-white rounded-xl flex flex-col justify-between">
          <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-3">
            <span className="block text-[10px] text-[#64748B] font-extrabold uppercase tracking-wider">Key Metrics</span>
            
            <div className="grid grid-cols-2 gap-2.5 pt-1 flex-1 items-center">
              <div className="p-2 bg-slate-50 border border-slate-200/60 rounded-lg flex items-center gap-2.5">
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md shrink-0">
                  <Activity size={14} />
                </div>
                <div>
                  <span className="block text-sm font-black text-[#0F172A] leading-none">{conditionsCount}</span>
                  <span className="text-[8px] text-slate-500 font-bold block uppercase leading-tight tracking-wider mt-0.5">Conditions</span>
                </div>
              </div>

              <div className="p-2 bg-slate-50 border border-slate-200/60 rounded-lg flex items-center gap-2.5">
                <div className="p-1.5 bg-cyan-50 text-cyan-600 rounded-md shrink-0">
                  <Layers size={14} />
                </div>
                <div>
                  <span className="block text-sm font-black text-[#0F172A] leading-none">{casesCount}</span>
                  <span className="text-[8px] text-slate-500 font-bold block uppercase leading-tight tracking-wider mt-0.5">Similar Cases</span>
                </div>
              </div>

              <div className="p-2 bg-slate-50 border border-slate-200/60 rounded-lg flex items-center gap-2.5">
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md shrink-0">
                  <CheckCircle2 size={14} />
                </div>
                <div>
                  <span className="block text-sm font-black text-emerald-600 leading-none">{matchedCount}</span>
                  <span className="text-[8px] text-slate-500 font-bold block uppercase leading-tight tracking-wider mt-0.5">Matched Sym.</span>
                </div>
              </div>

              <div className="p-2 bg-slate-50 border border-slate-200/60 rounded-lg flex items-center gap-2.5">
                <div className="p-1.5 bg-amber-50 text-amber-600 rounded-md shrink-0">
                  <AlertCircle size={14} />
                </div>
                <div>
                  <span className="block text-sm font-black text-amber-500 leading-none">{missingCount}</span>
                  <span className="text-[8px] text-slate-500 font-bold block uppercase leading-tight tracking-wider mt-0.5">Missing Ind.</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Complete Confidence Explanation Dialog */}
      <Dialog open={isReasoningOpen} onOpenChange={setIsReasoningOpen}>
        <DialogContent className="bg-white border border-[#E2E8F0] rounded-xl max-w-lg p-6 select-none">
          <DialogHeader>
            <DialogTitle className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span className={`px-2 py-0.5 text-xs rounded-full font-bold uppercase ${
                isHigh ? "bg-emerald-100 text-emerald-700" : isMedium ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
              }`}>
                {parsedLevel} Confidence
              </span>
              Detailed Confidence Rationale
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Full backend evidence-grounding breakdown returned by the clinical reasoning engine.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 leading-relaxed font-medium">
            {confidenceLevel}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
