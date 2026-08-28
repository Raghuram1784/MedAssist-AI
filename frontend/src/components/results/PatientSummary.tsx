import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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
  
  const isHigh = confidenceLevel.toLowerCase().includes("high");
  const isMedium = confidenceLevel.toLowerCase().includes("medium");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 select-none">
      
      {/* 1. Demographics Summary */}
      <Card className="lg:col-span-5 shadow-sm border border-[#E2E8F0] bg-white rounded-xl">
        <CardContent className="p-4 text-xs space-y-2">
          <span className="block text-[10px] text-[#64748B] font-extrabold uppercase tracking-wider">Clinical Summary</span>
          
          <div className="grid grid-cols-2 gap-4 pb-2 border-b border-slate-100 font-semibold text-[#0F172A]">
            <div>
              <span className="text-[#64748B] font-medium">Age:</span> <strong className="font-bold">{age} Years</strong>
            </div>
            <div>
              <span className="text-[#64748B] font-medium">Sex:</span> <strong className="font-bold">{sex === "M" ? "Male" : "Female"}</strong>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[#64748B] font-bold text-[9px] uppercase tracking-wider block">Presenting Symptoms</span>
            <div className="flex flex-wrap gap-1 max-h-12 overflow-y-auto">
              {symptoms.map((s, idx) => (
                <Badge key={idx} variant="secondary" className="bg-slate-100 border border-slate-200 text-slate-700 text-[9px] font-semibold py-0 px-1.5 rounded-md">
                  {s}
                </Badge>
              ))}
            </div>
          </div>

          {additionalInfo && (
            <div className="space-y-0.5 pt-1">
              <span className="text-[#64748B] font-bold text-[9px] uppercase tracking-wider block">Clinical Narrative</span>
              <p className="text-[10px] text-slate-600 leading-normal line-clamp-2 italic">
                "{additionalInfo}"
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Confidence Level Slider Gauge */}
      <Card className="lg:col-span-3 shadow-sm border border-[#E2E8F0] bg-white rounded-xl flex flex-col justify-between">
        <CardContent className="p-4 flex-1 flex flex-col justify-between">
          <span className="block text-[10px] text-[#64748B] font-extrabold uppercase tracking-wider">Confidence Level</span>
          
          <div className="text-center py-1 space-y-0.5">
            <span className={`block font-extrabold text-sm tracking-tight ${
              isHigh ? "text-green-600" : isMedium ? "text-amber-600" : "text-red-500"
            }`}>
              {confidenceLevel.split(" - ")[0].toUpperCase()}
            </span>
            <span className="text-[9px] text-[#64748B] block leading-none font-medium">Match distribution</span>
          </div>

          {/* Clean Progress Dial slider line */}
          <div className="space-y-1">
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${
                isHigh ? "bg-green-500 w-full" : isMedium ? "bg-amber-500 w-2/3" : "bg-red-500 w-1/3"
              }`} />
            </div>
            <div className="flex justify-between text-[8px] text-slate-400 font-bold uppercase tracking-widest pt-0.5 leading-none">
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Key Pipeline counts Metrics */}
      <Card className="lg:col-span-4 shadow-sm border border-[#E2E8F0] bg-white rounded-xl">
        <CardContent className="p-4 text-xs space-y-2">
          <span className="block text-[10px] text-[#64748B] font-extrabold uppercase tracking-wider">Key Metrics</span>
          
          <div className="grid grid-cols-4 gap-2 pt-1">
            <div className="text-center p-1.5 bg-slate-50 border border-slate-200/50 rounded-lg">
              <span className="block text-sm font-extrabold text-[#0F172A]">{conditionsCount}</span>
              <span className="text-[8px] text-slate-450 font-bold block uppercase leading-tight mt-0.5">Conditions</span>
            </div>
            <div className="text-center p-1.5 bg-slate-50 border border-slate-200/50 rounded-lg">
              <span className="block text-sm font-extrabold text-[#0F172A]">{casesCount}</span>
              <span className="text-[8px] text-slate-450 font-bold block uppercase leading-tight mt-0.5">Similar Cases</span>
            </div>
            <div className="text-center p-1.5 bg-slate-50 border border-slate-200/50 rounded-lg">
              <span className="block text-sm font-extrabold text-green-600">{matchedCount}</span>
              <span className="text-[8px] text-slate-450 font-bold block uppercase leading-tight mt-0.5">Matched Sym.</span>
            </div>
            <div className="text-center p-1.5 bg-slate-50 border border-slate-200/50 rounded-lg">
              <span className="block text-sm font-extrabold text-amber-500">{missingCount}</span>
              <span className="text-[8px] text-slate-450 font-bold block uppercase leading-tight mt-0.5">Missing Ind.</span>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
