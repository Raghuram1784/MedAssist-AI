import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Check, AlertCircle, HelpCircle } from "lucide-react";

interface KGEvidence {
  disease: string;
  icd10: string;
  severity: number;
  matched_symptoms: string[];
  unmatched_symptoms: string[];
  explanation: string;
}

interface KnowledgeGraphEvidenceProps {
  kgSupport: KGEvidence[];
}

export default function KnowledgeGraphEvidence({ kgSupport }: KnowledgeGraphEvidenceProps) {
  if (kgSupport.length === 0) return null;

  // Extract unique symptoms across all candidate conditions dynamically
  const allFindings = Array.from(
    new Set([
      ...kgSupport.flatMap(k => k.matched_symptoms),
      ...kgSupport.flatMap(k => k.unmatched_symptoms)
    ])
  );

  return (
    <Card className="shadow-sm border border-[#E2E8F0] bg-white rounded-xl select-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Knowledge Graph Evidence Overview</CardTitle>
        <CardDescription className="text-xs">
          Evidence pathways for top candidate conditions.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[9px] text-[#64748B] font-bold uppercase tracking-wider">
                <th className="py-2.5 pr-3">Clinical Finding</th>
                {kgSupport.map((kg, idx) => (
                  <th key={idx} className="py-2.5 px-3 font-bold text-center">
                    {kg.disease.split(" / ")[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allFindings.slice(0, 8).map((finding, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="py-2.5 pr-3 font-semibold text-slate-700">{finding}</td>
                  
                  {kgSupport.map((kg, kIdx) => {
                    const isMatched = kg.matched_symptoms.includes(finding);
                    const isUnmatched = kg.unmatched_symptoms.includes(finding);

                    return (
                      <td key={kIdx} className="py-2.5 px-3 text-center">
                        {isMatched ? (
                          <div className="inline-flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 text-[9px] uppercase tracking-wider">
                            <Check size={9} className="stroke-[3]" />
                            Matched
                          </div>
                        ) : isUnmatched ? (
                          <div className="inline-flex items-center gap-1 text-slate-500 font-semibold bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200 text-[9px] uppercase tracking-wider">
                            <AlertCircle size={9} />
                            Not reported
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 text-[9px] uppercase tracking-wider">
                            <HelpCircle size={9} />
                            Contradictory
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex gap-4 pt-3 border-t border-slate-100 text-[9px] text-[#64748B] font-bold uppercase tracking-wider mt-2.5 justify-center md:justify-start">
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full" />
            <span>✓ Matched</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 bg-slate-400 rounded-full" />
            <span>○ Not Reported</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 bg-amber-500 rounded-full" />
            <span>! Contradictory</span>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
