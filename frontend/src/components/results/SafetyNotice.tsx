import { ShieldAlert } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function SafetyNotice() {
  return (
    <Alert className="bg-slate-50 border border-[#E2E8F0] shadow-sm select-none p-3.5 flex gap-3 items-start rounded-xl text-slate-800">
      <ShieldAlert className="text-slate-500 shrink-0 mt-0.5" size={16} />
      <div className="space-y-0.5">
        <AlertTitle className="text-xs font-bold text-[#0F172A] leading-none">
          Safety Notice & Usage Limitations
        </AlertTitle>
        <AlertDescription className="text-[10px] text-[#64748B] leading-relaxed">
          MedAssist AI is an AI-assisted clinical research prototype. Results are derived from similarity searches over historical cohorts and rules checking, and do not constitute professional diagnosis, clinical judgment, or medical advice.
        </AlertDescription>
      </div>
    </Alert>
  );
}
