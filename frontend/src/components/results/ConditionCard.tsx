import { useState } from "react";
import { Check, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
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

  return (
    <div className="border border-[#E2E8F0] rounded-xl bg-white shadow-sm overflow-hidden select-none hover:border-slate-300 transition-all duration-200">
      
      {/* Header bar */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Numerical Rank circle */}
          <div className="h-6.5 w-6.5 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center font-mono font-bold text-[11px] text-[#4F46E5] shrink-0">
            {rank < 10 ? `0${rank}` : rank}
          </div>
          <div>
            <div className="flex items-center flex-wrap gap-2 leading-none">
              <h4 className="font-extrabold text-xs text-[#0F172A] tracking-tight">{condition}</h4>
              <span className="text-[9px] font-mono text-slate-400 font-medium">
                ICD-10: {icd10} | Severity: {severity}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge className="bg-indigo-50 text-[#4F46E5] hover:bg-indigo-100/50 border border-indigo-200 font-bold text-[8.5px] rounded-full px-2 py-0">
            RAG: {similarCasesFound} cases
          </Badge>
          <div className="text-slate-400 p-0.5">
            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </div>
      </div>

      {/* Expanded Accordion Details */}
      {isOpen && (
        <div className="p-4 border-t border-slate-100 bg-slate-50/20 grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Matched symptoms */}
          <div className="space-y-1.5">
            <span className="block text-[8px] font-bold text-[#64748B] uppercase tracking-wider">MATCHED EVIDENCE</span>
            <ul className="space-y-1">
              {supportingEvidence.map((symptom, idx) => (
                <li key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-700 font-medium">
                  <div className="h-3.5 w-3.5 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
                    <Check size={9} className="stroke-[3]" />
                  </div>
                  <span>{symptom}</span>
                </li>
              ))}
              {supportingEvidence.length === 0 && (
                <li className="text-[10px] text-slate-400 italic">No symptoms match patient notes.</li>
              )}
            </ul>
          </div>

          {/* Missing symptoms */}
          <div className="space-y-1.5">
            <span className="block text-[8px] font-bold text-[#64748B] uppercase tracking-wider">ADDITIONAL / NOT REPORTED</span>
            <ul className="space-y-1">
              {unmatchedSymptoms.slice(0, 4).map((symptom, idx) => (
                <li key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-700 font-medium">
                  <div className="h-3.5 w-3.5 rounded bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
                    <AlertCircle size={9} />
                  </div>
                  <span>{symptom}</span>
                </li>
              ))}
              {unmatchedSymptoms.length === 0 && (
                <li className="text-[10px] text-slate-400 italic">All indicators reported.</li>
              )}
            </ul>
          </div>

        </div>
      )}

    </div>
  );
}
