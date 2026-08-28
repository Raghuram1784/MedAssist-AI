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
  
  // Parse raw confidence level and extract prefix (High / Medium / Low)
  const isHigh = confidenceLevel.toLowerCase().includes("high");
  const isMedium = confidenceLevel.toLowerCase().includes("medium");
  const parsedLevel = isHigh ? "High" : isMedium ? "Medium" : "Low";

  // Formulate a compact 1-2 line description
  const shortExplanation = isHigh 
    ? "Strong evidence matches with index cohorts and knowledge graph paths." 
    : isMedium 
      ? "Supportive evidence with some missing distinguishing features." 
      : "Weak evidence matches with multiple missing clinical indicators.";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch select-none">
      
      {/* 1. Demographics Summary (5 columns) */}
      <Card className="lg:col-span-5 shadow-sm border border-[#E2E8F0] bg-white rounded-xl flex flex-col">
        <CardContent className="p-4 text-xs flex-1 flex flex-col justify-between space-y-3">
          <div className="space-y-2">
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
          </div>

          {additionalInfo && (
            <div className="space-y-0.5 border-t border-slate-50 pt-1.5">
              <span className="text-[#64748B] font-bold text-[9px] uppercase tracking-wider block">Clinical Narrative</span>
              <p className="text-[10px] text-slate-650 leading-normal line-clamp-2 italic font-medium">
                "{additionalInfo}"
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 2. Confidence Level Card (3 columns) */}
      <Card className="lg:col-span-3 shadow-sm border border-[#E2E8F0] bg-white rounded-xl flex flex-col">
        <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-3">
          <span className="block text-[10px] text-[#64748B] font-extrabold uppercase tracking-wider">Confidence Level</span>
          
          <div className="text-center py-0.5">
            <span className={`block font-black text-xl tracking-wider uppercase leading-none ${
              isHigh ? "text-emerald-600" : isMedium ? "text-amber-500" : "text-rose-500"
            }`}>
              {parsedLevel}
            </span>
          </div>

          {/* Clean Progress Dial slider line */}
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

          <p className="text-[10.5px] text-slate-600 font-medium text-center leading-normal pt-1.5 border-t border-slate-50 min-h-[2.5rem] flex items-center justify-center">
            {shortExplanation}
          </p>
        </CardContent>
      </Card>

      {/* 3. Key Pipeline counts Metrics (4 columns) */}
      <Card className="lg:col-span-4 shadow-sm border border-[#E2E8F0] bg-white rounded-xl flex flex-col">
        <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-3">
          <span className="block text-[10px] text-[#64748B] font-extrabold uppercase tracking-wider">Key Metrics</span>
          
          <div className="grid grid-cols-2 gap-2.5 pt-1.5 flex-1 items-center">
            <div className="text-center p-2 bg-slate-50 border border-slate-200/50 rounded-lg flex flex-col justify-center min-h-[48px]">
              <span className="block text-sm font-black text-[#0F172A] leading-none mb-0.5">{conditionsCount}</span>
              <span className="text-[8px] text-slate-450 font-bold block uppercase leading-tight tracking-wider">Conditions</span>
            </div>
            <div className="text-center p-2 bg-slate-50 border border-slate-200/50 rounded-lg flex flex-col justify-center min-h-[48px]">
              <span className="block text-sm font-black text-[#0F172A] leading-none mb-0.5">{casesCount}</span>
              <span className="text-[8px] text-slate-450 font-bold block uppercase leading-tight tracking-wider">Similar Cases</span>
            </div>
            <div className="text-center p-2 bg-slate-50 border border-slate-200/50 rounded-lg flex flex-col justify-center min-h-[48px]">
              <span className="block text-sm font-black text-emerald-600 leading-none mb-0.5">{matchedCount}</span>
              <span className="text-[8px] text-slate-450 font-bold block uppercase leading-tight tracking-wider">Matched Sym.</span>
            </div>
            <div className="text-center p-2 bg-slate-50 border border-slate-200/50 rounded-lg flex flex-col justify-center min-h-[48px]">
              <span className="block text-sm font-black text-amber-500 leading-none mb-0.5">{missingCount}</span>
              <span className="text-[8px] text-slate-450 font-bold block uppercase leading-tight tracking-wider">Missing Ind.</span>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
