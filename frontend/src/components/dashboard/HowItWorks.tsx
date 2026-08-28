import React from "react";
import { 
  User, 
  FileText, 
  Cpu, 
  Database, 
  Layers, 
  HeartHandshake, 
  CheckSquare,
  ChevronRight
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface StepItem {
  num: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  desc: string;
}

const pipelineSteps: StepItem[] = [
  { num: "1", icon: User, title: "Patient Input", desc: "Symptoms & Demographics" },
  { num: "2", icon: FileText, title: "Clinical Narrative", desc: "Structured Patient Presentation" },
  { num: "3", icon: Cpu, title: "BioClinicalBERT", desc: "768D Clinical Embedding" },
  { num: "4", icon: Database, title: "FAISS Retrieval", desc: "Top Similar Cases (10,000 DB)" },
  { num: "5", icon: Layers, title: "Knowledge Graph", desc: "Evidence Verification" },
  { num: "6", icon: HeartHandshake, title: "Groq LLM", desc: "Reasoning & Explanation" },
  { num: "7", icon: CheckSquare, title: "Expl. Output", desc: "Differential & Rationale" }
];

export default function HowItWorks() {
  return (
    <Card className="shadow-sm border border-[#E2E8F0] bg-white rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">How MedAssist AI Works</CardTitle>
        <CardDescription className="text-xs">From patient input to explainable clinical insight.</CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex flex-col xl:flex-row items-stretch gap-2.5">
          {pipelineSteps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <React.Fragment key={idx}>
                {/* Step block */}
                <div className="flex flex-row xl:flex-col items-center xl:text-center p-3 bg-slate-50/50 border border-[#E2E8F0] rounded-xl flex-1 hover:border-indigo-100 hover:bg-indigo-50/10 transition-all gap-4 xl:gap-2 relative group">
                  
                  {/* Step Num badge */}
                  <div className="absolute top-2 right-2 text-[9px] font-mono font-bold text-slate-400">
                    Step {step.num}
                  </div>

                  {/* Icon circle */}
                  <div className="p-2 bg-indigo-50 text-[#4F46E5] rounded-xl group-hover:scale-105 transition-transform shrink-0">
                    <Icon size={16} />
                  </div>

                  {/* Title & info */}
                  <div className="space-y-0.5 select-none">
                    <h5 className="font-bold text-[11px] text-[#0F172A] leading-tight">{step.title}</h5>
                    <p className="text-[9px] text-[#64748B] leading-snug">{step.desc}</p>
                  </div>

                </div>

                {/* Arrow Connector between steps */}
                {idx < pipelineSteps.length - 1 && (
                  <div className="hidden xl:flex items-center justify-center text-slate-300 self-center shrink-0">
                    <ChevronRight size={14} className="stroke-[1.5]" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
