import { Card } from "@/components/ui/card";
import SafetyNotice from "@/components/results/SafetyNotice";

export default function About() {
  return (
    <div className="space-y-6 select-none">
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <Card className="shadow-sm border border-[#E2E8F0] bg-white rounded-xl p-5 space-y-2">
          <h4 className="font-extrabold text-xs text-[#0F172A] uppercase tracking-wider">What is MedAssist AI?</h4>
          <p className="text-xs text-[#64748B] leading-relaxed">
            MedAssist AI is an explainable clinical decision support system (CDSS) prototype designed to reduce cognitive load for clinical researchers. It combines sentence transformers, FAISS database retrievals, directed NetworkX graph cross-checks, and LLM explanation generation.
          </p>
        </Card>

        <Card className="shadow-sm border border-[#E2E8F0] bg-white rounded-xl p-5 space-y-2">
          <h4 className="font-extrabold text-xs text-[#0F172A] uppercase tracking-wider">Research Scope</h4>
          <p className="text-xs text-[#64748B] leading-relaxed">
            The current cohort supports 49 unique diseases and 222 presenting symptoms, validated against synthetic clinical transcripts from the DDXPlus medical records. It operates purely as a reasoning support coordinator, and is banned from diagnosing patient presentations standalone.
          </p>
        </Card>

      </div>

      <SafetyNotice />

    </div>
  );
}
