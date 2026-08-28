import { Database, Cpu, Layers, TrendingUp } from "lucide-react";
import HeroCard from "@/components/dashboard/HeroCard";
import MetricCard from "@/components/dashboard/MetricCard";
import HowItWorks from "@/components/dashboard/HowItWorks";
import { Card } from "@/components/ui/card";

interface DashboardProps {
  setActiveTab: (tab: "dashboard" | "assessment" | "methodology" | "about") => void;
}

export default function Dashboard({ setActiveTab }: DashboardProps) {
  return (
    <div className="space-y-6">
      
      {/* Hero card gradient banner */}
      <HeroCard 
        onStartAssessment={() => setActiveTab("assessment")} 
        onExploreMethodology={() => setActiveTab("methodology")} 
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          value="10,000" 
          label="Clinical Cases" 
          description="Indexed from preprocessed DDXPlus." 
          icon={Database}
          iconBgColor="bg-indigo-50"
          iconColor="text-[#4F46E5]"
          accentColor="border-t-2 border-t-[#4F46E5]"
        />
        <MetricCard 
          value="768" 
          label="Embedding Dimensions" 
          description="Compiled via BioClinicalBERT." 
          icon={Cpu}
          iconBgColor="bg-violet-50"
          iconColor="text-[#7C3AED]"
          accentColor="border-t-2 border-t-[#7C3AED]"
        />
        <MetricCard 
          value="271" 
          label="Knowledge Graph Nodes" 
          description="Candidate diseases & symptoms." 
          icon={Layers}
          iconBgColor="bg-cyan-50"
          iconColor="text-[#06B6D4]"
          accentColor="border-t-2 border-t-[#06B6D4]"
        />
        <MetricCard 
          value="888" 
          label="KG Relationships" 
          description="Directed symptom template edges." 
          icon={TrendingUp}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-600"
          accentColor="border-t-2 border-t-emerald-500"
        />
      </div>

      {/* Flow chart stepper */}
      <HowItWorks />

      {/* System Capabilities Section */}
      <div className="space-y-3 select-none">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">System Capabilities</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-white border border-[#E2E8F0] rounded-xl space-y-1 hover:border-slate-300 transition-colors">
            <h4 className="font-bold text-xs text-[#0F172A] leading-tight">Semantic Clinical Retrieval</h4>
            <p className="text-[10px] text-[#64748B] leading-relaxed">
              Extracts matching cohorts using cosine metrics over sentence encodings.
            </p>
          </Card>
          <Card className="p-4 bg-white border border-[#E2E8F0] rounded-xl space-y-1 hover:border-slate-350 transition-colors">
            <h4 className="font-bold text-xs text-[#0F172A] leading-tight">Knowledge Graph Verification</h4>
            <p className="text-[10px] text-[#64748B] leading-relaxed">
              Validates symptom pathways topologically to identify matching vs missing factors.
            </p>
          </Card>
          <Card className="p-4 bg-white border border-[#E2E8F0] rounded-xl space-y-1 hover:border-slate-350 transition-colors">
            <h4 className="font-bold text-xs text-[#0F172A] leading-tight">Evidence-Grounded Reasoning</h4>
            <p className="text-[10px] text-[#64748B] leading-relaxed">
              Locks inference context to database retrieved values, mitigating hallucinations.
            </p>
          </Card>
          <Card className="p-4 bg-white border border-[#E2E8F0] rounded-xl space-y-1 hover:border-slate-350 transition-colors">
            <h4 className="font-bold text-xs text-[#0F172A] leading-tight">Explainable Differential</h4>
            <p className="text-[10px] text-[#64748B] leading-relaxed">
              Compiles readable justifications detailing why conditions are rules in or out.
            </p>
          </Card>
        </div>
      </div>

    </div>
  );
}
