import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ConditionCardProps {
  rank: number;
  condition: string;
  supportingEvidence: string[];
  similarCasesFound: number;
  icd10: string;
  severity: number;
  unmatchedSymptoms: string[];
}

function formatICD10(code?: string): string {
  if (!code || code.trim() === "" || code.toUpperCase() === "N/A") {
    return "N/A";
  }
  return code.trim().toUpperCase();
}

export default function ConditionCard({
  rank,
  condition,
  supportingEvidence,
  similarCasesFound,
  icd10,
  severity,
  unmatchedSymptoms
}: ConditionCardProps) {
  const [isOpen, setIsOpen] = useState<boolean>(rank === 1); // Expand first card by default

  const normalizedICD = formatICD10(icd10);

  return (
    <div className="border border-[#E2E8F0] rounded-xl bg-white shadow-sm overflow-hidden select-none hover:border-slate-300 transition-all duration-200">
      
      {/* Header bar */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Numerical Rank circle */}
          <div className="h-7 w-7 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center font-mono font-black text-xs text-indigo-600 shrink-0">
            {rank < 10 ? `0${rank}` : rank}
          </div>
          <div>
            <div className="flex items-center flex-wrap gap-2 leading-none">
              <h4 className="font-extrabold text-sm text-[#0F172A] tracking-tight">{condition}</h4>
              <span className="text-[10px] font-mono text-slate-400 font-medium">
                ICD-10: <strong className="text-slate-600">{normalizedICD}</strong> | Severity: <strong className="text-slate-600">{severity}</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100/60 border border-indigo-200 font-bold text-[9px] rounded-full px-2.5 py-0.5 gap-1">
            <Layers size={10} />
            {similarCasesFound} {similarCasesFound === 1 ? "case" : "cases"}
          </Badge>
          <div className="text-slate-400 p-0.5">
            {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </div>
        </div>
      </div>

      {/* Expanded Accordion Details */}
      {isOpen && (
        <div className="p-4 border-t border-slate-100 bg-slate-50/30 grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Matched symptoms */}
          <div className="space-y-1.5">
            <span className="block text-[8.5px] font-bold text-[#64748B] uppercase tracking-wider">MATCHED EVIDENCE</span>
            <ul className="space-y-1">
              {supportingEvidence.map((symptom, idx) => (
                <li key={idx} className="flex items-center gap-2 text-[11px] text-slate-700 font-medium">
                  <div className="h-4 w-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
                    <Check size={10} className="stroke-[3]" />
                  </div>
                  <span>{symptom}</span>
                </li>
              ))}
              {supportingEvidence.length === 0 && (
                <li className="text-[10px] text-slate-400 italic">No direct symptoms matched.</li>
              )}
            </ul>
          </div>

          {/* Additional / Not Reported symptoms */}
          <div className="space-y-1.5">
            <span className="block text-[8.5px] font-bold text-[#64748B] uppercase tracking-wider">ADDITIONAL / NOT REPORTED</span>
            <ul className="space-y-1">
              {unmatchedSymptoms.slice(0, 4).map((symptom, idx) => (
                <li key={idx} className="flex items-center gap-2 text-[11px] text-slate-600 font-medium">
                  <div className="h-4 w-4 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center shrink-0 border border-slate-200">
                    <span className="text-[10px] leading-none font-black">○</span>
                  </div>
                  <span>{symptom}</span>
                </li>
              ))}
              {unmatchedSymptoms.length === 0 && (
                <li className="text-[10px] text-slate-400 italic">All path indicators reported.</li>
              )}
            </ul>
          </div>

        </div>
      )}

    </div>
  );
}
