import { Cpu, Database, Layers, HeartHandshake } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function MethodologyCard() {
  const techStack = [
    { name: "BioClinicalBERT", desc: "768-dimensional clinical sentence embeddings" },
    { name: "FAISS", desc: "10,000 indexed clinical cases using cosine similarity" },
    { name: "NetworkX", desc: "Directed Knowledge Graph: 271 nodes / 888 edges" },
    { name: "Groq LLM", desc: "Grounded differential reasoning and explainability" },
    { name: "React + TS", desc: "Premium responsive front-end dashboard interface" },
    { name: "FastAPI", desc: "High-performance models lifespan routing APIs" }
  ];

  return (
    <div className="space-y-6">
      
      {/* 1. Visual Flowchart */}
      <Card className="shadow-sm border border-[#E2E8F0] bg-white rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">System Architecture</CardTitle>
          <CardDescription className="text-xs">End-to-end clinical reasoning pipeline.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-4 bg-slate-50 border border-[#E2E8F0] rounded-xl font-mono text-[9px] text-[#0F172A] leading-tight">
            <span className="font-extrabold">Patient Input</span>
            <span className="text-slate-400 hidden md:inline">→</span>
            <span className="font-semibold">Clinical Narrative</span>
            <span className="text-slate-400 hidden md:inline">→</span>
            <span className="font-bold text-indigo-600">BioClinicalBERT Embedding</span>
            <span className="text-slate-400 hidden md:inline">→</span>
            <span className="font-semibold">FAISS Retrieval</span>
            <span className="text-slate-400 hidden md:inline">→</span>
            <span className="font-semibold">Knowledge Graph (271 Nodes)</span>
            <span className="text-slate-400 hidden md:inline">→</span>
            <span className="font-semibold">Groq LLM Reasoning</span>
            <span className="text-slate-400 hidden md:inline">→</span>
            <span className="font-extrabold text-indigo-700">Explainable Output</span>
          </div>
        </CardContent>
      </Card>

      {/* 2. Tech Stack Cards */}
      <Card className="shadow-sm border border-[#E2E8F0] bg-white rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Technology Stack</CardTitle>
          <CardDescription className="text-xs">Frameworks backing the MedAssist AI system.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0 grid grid-cols-2 md:grid-cols-6 gap-3">
          {techStack.map((tech, idx) => (
            <div key={idx} className="p-3 bg-slate-50/50 border border-[#E2E8F0] text-center rounded-lg hover:border-slate-350 transition-colors">
              <h5 className="font-extrabold text-[10.5px] text-[#0F172A] leading-none mb-1">{tech.name}</h5>
              <p className="text-[8px] text-[#64748B] leading-tight">{tech.desc}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 3. Why each component card */}
      <Card className="shadow-sm border border-[#E2E8F0] bg-white rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Why Each Component?</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <div className="p-3.5 bg-slate-50/50 border border-slate-200/50 rounded-xl space-y-1">
            <h4 className="font-bold text-xs text-[#0F172A] flex items-center gap-2 leading-none">
              <Cpu size={14} className="text-[#4F46E5]" /> BioClinicalBERT
            </h4>
            <p className="text-[10px] text-[#64748B] leading-normal font-medium">
              Replaces generic LLMs for text matching. Captures deep, contextual semantic representations of specialized clinical text notes.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50/50 border border-slate-200/50 rounded-xl space-y-1">
            <h4 className="font-bold text-xs text-[#0F172A] flex items-center gap-2 leading-none">
              <Database size={14} className="text-[#4F46E5]" /> FAISS retrieval
            </h4>
            <p className="text-[10px] text-[#64748B] leading-normal font-medium">
              Runs L2-normalized cosine inner product vector matches in sub-milliseconds, fetching matching cohorts securely from 10,000 case profiles.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50/50 border border-slate-200/50 rounded-xl space-y-1">
            <h4 className="font-bold text-xs text-[#0F172A] flex items-center gap-2 leading-none">
              <Layers size={14} className="text-[#4F46E5]" /> Knowledge Graph (NetworkX)
            </h4>
            <p className="text-[10px] text-[#64748B] leading-normal font-medium">
              Checks symptoms topologically to verify candidates. Delineates matched indicators from missing factors of candidate templates.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50/50 border border-slate-200/50 rounded-xl space-y-1">
            <h4 className="font-bold text-xs text-[#0F172A] flex items-center gap-2 leading-none">
              <HeartHandshake size={14} className="text-[#4F46E5]" /> Groq reasoning
            </h4>
            <p className="text-[10px] text-[#64748B] leading-normal font-medium">
              Serves as a logical explainability coordinator. Grounded strictly by retrieved cases and graph structures, it avoids independent claims.
            </p>
          </div>

        </CardContent>
      </Card>

    </div>
  );
}
