import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface AnalysisProgressProps {
  loadingStep: number;
}

export default function AnalysisProgress({ loadingStep }: AnalysisProgressProps) {
  const [progressVal, setProgressVal] = useState<number>(10);

  // Smoothly animate progress bar values based on active step
  useEffect(() => {
    if (loadingStep === 1) setProgressVal(18);
    else if (loadingStep === 2) setProgressVal(35);
    else if (loadingStep === 3) setProgressVal(55);
    else if (loadingStep === 4) setProgressVal(75);
    else if (loadingStep === 5) {
      // Slow tick during LLM response wait state
      setProgressVal(85);
      const interval = setInterval(() => {
        setProgressVal(prev => (prev < 96 ? prev + 1 : prev));
      }, 800);
      return () => clearInterval(interval);
    }
  }, [loadingStep]);

  const steps = [
    { label: "Patient presentation structured", threshold: 1 },
    { label: "Clinical narrative generated", threshold: 2 },
    { label: "BioClinicalBERT embedding", threshold: 3 },
    { label: "FAISS searched 10,000 cases", threshold: 4 },
    { label: "Knowledge graph verification", threshold: 5 },
    { label: "Groq LLM reasoning", threshold: 6 } // final step is Groq reasoning in progress
  ];

  return (
    <Card className="shadow-sm border border-[#E2E8F0] bg-white rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Analysis Pipeline</CardTitle>
        <CardDescription className="text-xs">Real-time processing status</CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-4">
        
        <div className="space-y-3 p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
          {steps.map((step, idx) => {
            const isCompleted = loadingStep > step.threshold;
            const isInProgress = loadingStep === step.threshold;
            
            return (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  {/* Status Circle indicator */}
                  <div className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 border ${
                    isCompleted ? "bg-emerald-50 border-emerald-300 text-emerald-600" :
                    isInProgress ? "bg-indigo-50 border-indigo-300 text-indigo-600 animate-pulse" :
                    "bg-white border-slate-200 text-slate-350"
                  }`}>
                    {isCompleted ? (
                      <Check size={9} className="stroke-[3]" />
                    ) : isInProgress ? (
                      <span className="h-1.5 w-1.5 bg-[#4F46E5] rounded-full" />
                    ) : null}
                  </div>
                  
                  <span className={`font-semibold tracking-tight ${
                    isCompleted ? "text-slate-800" :
                    isInProgress ? "text-[#4F46E5]" : "text-slate-400"
                  }`}>
                    {step.label}
                  </span>
                </div>

                <div className="text-[10px] font-bold text-slate-400">
                  {isCompleted ? (
                    <span className="text-emerald-600 font-semibold text-[10px]">Completed</span>
                  ) : isInProgress ? (
                    <div className="flex items-center gap-1 text-[#4F46E5] font-semibold text-[10px]">
                      <Loader2 size={10} className="animate-spin" />
                      In Progress
                    </div>
                  ) : (
                    <span className="text-slate-350 font-normal">Pending</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress bar estimation */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-baseline text-[10px]">
            <span className="text-slate-450 font-bold uppercase tracking-wider">Est. time remaining</span>
            <span className="font-mono font-bold text-slate-700">~ 10-15 seconds</span>
          </div>
          <Progress value={progressVal} className="h-1.5 bg-slate-100 rounded-full" />
        </div>

      </CardContent>
    </Card>
  );
}
