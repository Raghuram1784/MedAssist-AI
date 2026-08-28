import React from "react";
import { ArrowRight, User, Cpu, Database, Layers, HeartHandshake, FileCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function PipelineTimeline() {
  const steps = [
    { num: "01", label: "Patient Input", detail: "Symptoms & Demographics", icon: User },
    { num: "02", label: "BioClinicalBERT", detail: "768D text embedding", icon: Cpu },
    { num: "03", label: "FAISS RAG", detail: "Top 5 Similar Cases from 10,000", icon: Database },
    { num: "04", label: "Knowledge Graph", detail: "Evidence Verification", icon: Layers },
    { num: "05", label: "Groq LLM", detail: "Grounded Reasoning", icon: HeartHandshake },
    { num: "06", label: "Explainable Output", detail: "Differential & Rationale", icon: FileCheck }
  ];

  return (
    <Card className="shadow-sm border border-[#E2E8F0] bg-white rounded-xl select-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">How MedAssist AI Reached This Result</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col md:flex-row items-stretch justify-between gap-2.5 p-3.5 bg-slate-900 text-white rounded-xl border border-slate-800 font-mono text-[9px] leading-tight">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <React.Fragment key={idx}>
                {/* Step details container */}
                <div className="flex flex-row md:flex-col items-center md:text-center p-2 bg-slate-850 rounded border border-slate-800 flex-grow w-full md:w-28 gap-3 md:gap-1 shadow-sm hover:border-indigo-800 transition-colors">
                  
                  {/* Icon + Num indicator */}
                  <div className="flex items-center gap-1.5 md:flex-col md:gap-0.5">
                    <span className="text-indigo-400 font-bold text-[8.5px] tracking-widest block leading-none md:mb-1">
                      {step.num}
                    </span>
                    <Icon size={12} className="text-indigo-300" />
                  </div>

                  {/* Title labels */}
                  <div className="space-y-0.5 leading-snug">
                    <span className="font-bold text-slate-200 block text-[9.5px]">{step.label}</span>
                    <span className="text-slate-450 block text-[8px]">{step.detail}</span>
                  </div>

                </div>

                {/* Arrow connector */}
                {idx < steps.length - 1 && (
                  <div className="hidden md:flex items-center justify-center text-slate-700 self-center shrink-0">
                    <ArrowRight size={12} className="stroke-[1.5]" />
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
