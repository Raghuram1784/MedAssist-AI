import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface ClinicalRationaleProps {
  rationale: string;
  alternatives: string[];
}

export default function ClinicalRationale({ rationale, alternatives }: ClinicalRationaleProps) {
  return (
    <Card className="shadow-sm border border-[#E2E8F0] border-l-4 border-l-[#4F46E5] bg-white rounded-xl select-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clinical Rationale</CardTitle>
        <CardDescription className="text-xs">
          LLM-generated explanation grounded in retrieved cases and knowledge graph evidence.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Rationale text with formatting and line-breaks */}
        <p className="text-xs text-[#0F172A] leading-relaxed font-sans whitespace-pre-line">
          {rationale}
        </p>

        {/* Alternative Conditions block */}
        {alternatives.length > 0 && (
          <div className="space-y-1.5 pt-3 border-t border-slate-100">
            <span className="block text-[10px] text-[#64748B] font-extrabold uppercase tracking-wider">
              Alternative Conditions to Consider
            </span>
            <div className="flex flex-wrap gap-1">
              {alternatives.map((alt, idx) => (
                <Badge 
                  key={idx} 
                  variant="outline" 
                  className="text-[#0F172A] border-slate-350 text-[10px] bg-slate-50 font-semibold px-2 py-0.5 rounded"
                >
                  {alt}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
