import { useState } from "react";
import { 
  BarChart3, 
  Database, 
  Cpu, 
  Layers, 
  Zap, 
  CheckCircle2, 
  Search, 
  ArrowUpDown,
  Info,
  ShieldAlert,
  BookOpen
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import modelMetricsData from "../data/model_metrics.json";

interface ModelEvaluationProps {
  setActiveTab: (tab: any) => void;
}

export default function ModelEvaluation({ setActiveTab }: ModelEvaluationProps) {
  const [searchPathology, setSearchPathology] = useState("");
  const [sortField, setSortField] = useState<"pathology" | "eval_cases" | "top1_accuracy" | "top5_accuracy" | "f1_score">("pathology");
  const [sortAsc, setSortAsc] = useState(true);

  const metrics = modelMetricsData;

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // Default descending for numeric columns
    }
  };

  const filteredPathologies = (metrics.per_pathology_performance || []).filter(p => 
    p.pathology.toLowerCase().includes(searchPathology.toLowerCase())
  ).sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    if (typeof valA === "string") {
      return sortAsc ? (valA as string).localeCompare(valB as string) : (valB as string).localeCompare(valA as string);
    }
    return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
  });

  return (
    <div className="space-y-6 select-none">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-6 border border-[#E2E8F0] rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
              Research Evaluation
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Held-Out DDXPlus Test Split
            </span>
          </div>
          <h2 className="text-xl font-black text-[#0F172A] tracking-tight mt-1.5">
            Model Evaluation & Benchmark Performance
          </h2>
          <p className="text-xs text-[#64748B] font-medium mt-0.5">
            Offline evaluation of MedAssist AI on held-out DDXPlus test cases (0 Groq API calls)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setActiveTab("assessment")} 
            variant="default"
            size="sm"
            className="h-9 px-4 text-xs font-extrabold bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white shadow-md hover:opacity-95 cursor-pointer rounded-lg"
          >
            Go to Clinical Workspace
          </Button>
        </div>
      </div>

      {/* Disclaimers & Methodology Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl text-amber-900 text-xs font-medium space-y-1">
          <div className="flex items-center gap-1.5 text-amber-900 font-extrabold text-[11px] uppercase tracking-wider">
            <ShieldAlert size={14} className="text-amber-600" /> Benchmark Research Disclaimer
          </div>
          <p className="text-[11px] leading-relaxed text-amber-800">
            {metrics.disclaimer || "Benchmark results are measured on the synthetic DDXPlus held-out test set. They do not represent real-world clinical accuracy, patient outcomes, or clinical safety."}
          </p>
        </div>

        <div className="p-4 bg-indigo-50/60 border border-indigo-200/70 rounded-xl text-indigo-950 text-xs font-medium space-y-1">
          <div className="flex items-center gap-1.5 text-indigo-900 font-extrabold text-[11px] uppercase tracking-wider">
            <Info size={14} className="text-indigo-600" /> Evaluation Isolation & Deterministic Protocol
          </div>
          <p className="text-[11px] leading-relaxed text-indigo-800">
            Evaluation is conducted on a balanced held-out DDXPlus test subset (up to 50 cases per pathology, deterministic random seed 42). Offline evaluation uses 0 Groq API calls.
          </p>
        </div>

      </div>

      {/* Top 6 Core Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        
        <Card className="shadow-xs border border-[#E2E8F0] bg-white rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">Eval Cases</span>
              <Database size={13} className="text-indigo-500" />
            </div>
            <div className="text-xl font-black text-[#0F172A]">{(metrics.sample_size || 2436).toLocaleString()}</div>
            <span className="text-[9px] text-slate-500 font-semibold mt-0.5 block">Held-out test cases</span>
          </CardContent>
        </Card>

        <Card className="shadow-xs border border-[#E2E8F0] bg-white rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">Pathologies</span>
              <Layers size={13} className="text-cyan-500" />
            </div>
            <div className="text-xl font-black text-[#0F172A]">{metrics.pathologies_evaluated || 49}</div>
            <span className="text-[9px] text-slate-500 font-semibold mt-0.5 block">Evaluated classes</span>
          </CardContent>
        </Card>

        <Card className="shadow-xs border border-[#E2E8F0] bg-white rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">Top-1 Exact</span>
              <CheckCircle2 size={13} className="text-emerald-500" />
            </div>
            <div className="text-xl font-black text-emerald-600">{metrics.top1_exact_accuracy}%</div>
            <span className="text-[9px] text-slate-500 font-semibold mt-0.5 block">Exact Ground-Truth</span>
          </CardContent>
        </Card>

        <Card className="shadow-xs border border-[#E2E8F0] bg-white rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">Top-5 Exact</span>
              <BarChart3 size={13} className="text-indigo-500" />
            </div>
            <div className="text-xl font-black text-indigo-600">{metrics.top5_exact_accuracy}%</div>
            <span className="text-[9px] text-slate-500 font-semibold mt-0.5 block">Candidate Coverage</span>
          </CardContent>
        </Card>

        <Card className="shadow-xs border border-[#E2E8F0] bg-white rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">MRR</span>
              <ArrowUpDown size={13} className="text-amber-500" />
            </div>
            <div className="text-xl font-black text-[#0F172A]">{metrics.mrr}</div>
            <span className="text-[9px] text-slate-500 font-semibold mt-0.5 block">Mean Recip. Rank</span>
          </CardContent>
        </Card>

        <Card className="shadow-xs border border-[#E2E8F0] bg-white rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">Macro F1</span>
              <Zap size={13} className="text-purple-500" />
            </div>
            <div className="text-xl font-black text-purple-600">{metrics.macro_f1}%</div>
            <span className="text-[9px] text-slate-500 font-semibold mt-0.5 block">All Pathologies</span>
          </CardContent>
        </Card>

      </div>

      {/* Main Tabs Navigation */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-white border border-[#E2E8F0] p-1 rounded-xl flex flex-wrap gap-1">
          <TabsTrigger value="overview" className="text-xs font-bold px-4 py-1.5 rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            Benchmark Metrics
          </TabsTrigger>
          <TabsTrigger value="pathologies" className="text-xs font-bold px-4 py-1.5 rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            Pathology Breakdown ({metrics.pathologies_evaluated || 49})
          </TabsTrigger>
          <TabsTrigger value="latency" className="text-xs font-bold px-4 py-1.5 rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            Latency Breakdown
          </TabsTrigger>
          <TabsTrigger value="methodology" className="text-xs font-bold px-4 py-1.5 rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            Architecture & Specs
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW METRICS */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Candidate Ranking Metrics Card */}
            <Card className="shadow-sm border border-[#E2E8F0] bg-white rounded-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-500" /> DDXPlus Benchmark — Exact Match Metrics
                </CardTitle>
                <CardDescription className="text-[11px] text-slate-500">
                  Ground-truth pathology hit rates across candidate ranks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200/60">
                  <span className="font-semibold text-slate-700">Top-1 Exact Ground-Truth Hit</span>
                  <span className="font-black text-emerald-600 text-sm">{metrics.top1_exact_accuracy}%</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200/60">
                  <span className="font-semibold text-slate-700">Top-3 Exact Ground-Truth Hit</span>
                  <span className="font-black text-indigo-600 text-sm">{metrics.top3_exact_accuracy}%</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200/60">
                  <span className="font-semibold text-slate-700">Top-5 Exact Ground-Truth Hit</span>
                  <span className="font-black text-indigo-600 text-sm">{metrics.top5_exact_accuracy}%</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200/60">
                  <span className="font-semibold text-slate-700">Mean Reciprocal Rank (MRR)</span>
                  <span className="font-black text-slate-800 text-sm">{metrics.mrr}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200/60">
                  <span className="font-semibold text-slate-700">Macro F1 Score (49 Pathologies)</span>
                  <span className="font-black text-[#0F172A] text-sm">{metrics.macro_f1}%</span>
                </div>
              </CardContent>
            </Card>

            {/* Retrieval & Candidate Recall Card */}
            <Card className="shadow-sm border border-[#E2E8F0] bg-white rounded-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={14} className="text-indigo-500" /> FAISS Retrieval & Candidate Recall
                </CardTitle>
                <CardDescription className="text-[11px] text-slate-500">
                  52,679 indexed training case retrieval ground-truth hit rates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200/60">
                  <span className="font-semibold text-slate-700">FAISS Recall @ K=5</span>
                  <span className="font-black text-slate-800 text-sm">{metrics.retrieval_recall_at_5}%</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200/60">
                  <span className="font-semibold text-slate-700">FAISS Recall @ K=10</span>
                  <span className="font-black text-slate-800 text-sm">{metrics.retrieval_recall_at_10}%</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200/60">
                  <span className="font-semibold text-slate-700">FAISS Recall @ K=25</span>
                  <span className="font-black text-purple-600 text-sm">{metrics.retrieval_recall_at_25}%</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200/60">
                  <span className="font-semibold text-slate-700">Candidate Recall @ K=5</span>
                  <span className="font-black text-indigo-600 text-sm">{metrics.candidate_recall_at_5}%</span>
                </div>
              </CardContent>
            </Card>

            {/* Differential Diagnosis Metrics Card */}
            <Card className="shadow-sm border border-[#E2E8F0] bg-white rounded-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
                  <Zap size={14} className="text-amber-500" /> DDXPlus Differential Metrics
                </CardTitle>
                <CardDescription className="text-[11px] text-slate-500">
                  Differential overlap calculated after thresholding ground-truth prob &gt; 0.01
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200/60">
                  <span className="font-semibold text-slate-700">Differential Recall (DDR@5)</span>
                  <span className="font-black text-amber-600 text-sm">{metrics.ddr_5}%</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200/60">
                  <span className="font-semibold text-slate-700">Differential Precision (DDP@5)</span>
                  <span className="font-black text-slate-800 text-sm">{metrics.ddp_5}%</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200/60">
                  <span className="font-semibold text-slate-700">Differential F1 Score (DDF1@5)</span>
                  <span className="font-black text-indigo-600 text-sm">{metrics.ddf1_5}%</span>
                </div>
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        {/* TAB 2: PATHOLOGY BREAKDOWN */}
        <TabsContent value="pathologies" className="space-y-4">
          <Card className="shadow-sm border border-[#E2E8F0] bg-white rounded-xl">
            <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">
                  Per-Pathology Benchmark Accuracy
                </CardTitle>
                <CardDescription className="text-[11px] text-slate-500 mt-0.5">
                  Class-specific performance across all evaluated DDXPlus pathologies
                </CardDescription>
              </div>

              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Filter pathology..."
                  value={searchPathology}
                  onChange={(e) => setSearchPathology(e.target.value)}
                  className="pl-8 h-8 text-xs bg-slate-50 border-slate-200"
                />
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-y border-slate-200 text-[10px] uppercase text-slate-500 font-extrabold sticky top-0">
                    <tr>
                      <th className="p-3 cursor-pointer hover:text-slate-900" onClick={() => handleSort("pathology")}>
                        Pathology {sortField === "pathology" && (sortAsc ? "↑" : "↓")}
                      </th>
                      <th className="p-3 text-right cursor-pointer hover:text-slate-900" onClick={() => handleSort("eval_cases")}>
                        Eval Cases {sortField === "eval_cases" && (sortAsc ? "↑" : "↓")}
                      </th>
                      <th className="p-3 text-right cursor-pointer hover:text-slate-900" onClick={() => handleSort("top1_accuracy")}>
                        Top-1 Acc % {sortField === "top1_accuracy" && (sortAsc ? "↑" : "↓")}
                      </th>
                      <th className="p-3 text-right cursor-pointer hover:text-slate-900" onClick={() => handleSort("top5_accuracy")}>
                        Top-5 Acc % {sortField === "top5_accuracy" && (sortAsc ? "↑" : "↓")}
                      </th>
                      <th className="p-3 text-right cursor-pointer hover:text-slate-900" onClick={() => handleSort("f1_score")}>
                        F1 Score % {sortField === "f1_score" && (sortAsc ? "↑" : "↓")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredPathologies.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 font-bold text-slate-900">{row.pathology}</td>
                        <td className="p-3 text-right text-slate-500">{row.eval_cases}</td>
                        <td className="p-3 text-right">
                          <span className={`font-black ${row.top1_accuracy >= 80 ? "text-emerald-600" : row.top1_accuracy >= 50 ? "text-indigo-600" : "text-slate-600"}`}>
                            {row.top1_accuracy}%
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className="font-bold text-slate-800">{row.top5_accuracy}%</span>
                        </td>
                        <td className="p-3 text-right font-semibold text-slate-700">{row.f1_score}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: LATENCY BREAKDOWN */}
        <TabsContent value="latency" className="space-y-4">
          <Card className="shadow-sm border border-[#E2E8F0] bg-white rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
                <Cpu size={14} className="text-indigo-500" /> Pipeline Stage Execution Latencies (Measured per case)
              </CardTitle>
              <CardDescription className="text-[11px] text-slate-500">
                Independent pre-LLM timer measurements recorded in milliseconds
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
                
                <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-lg">
                  <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">BERT Encoding</span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-slate-600 font-semibold">P50 (Median):</span>
                    <strong className="font-black text-slate-900 text-sm">{metrics.latencies?.encoding_ms?.p50 ?? 0} ms</strong>
                  </div>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <span className="text-slate-500 text-[10px]">P95 (95th %):</span>
                    <span className="font-bold text-slate-700 text-xs">{metrics.latencies?.encoding_ms?.p95 ?? 0} ms</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-lg">
                  <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">FAISS Search</span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-slate-600 font-semibold">P50 (Median):</span>
                    <strong className="font-black text-slate-900 text-sm">{metrics.latencies?.faiss_search_ms?.p50 ?? 0} ms</strong>
                  </div>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <span className="text-slate-500 text-[10px]">P95 (95th %):</span>
                    <span className="font-bold text-slate-700 text-xs">{metrics.latencies?.faiss_search_ms?.p95 ?? 0} ms</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-lg">
                  <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Knowledge Graph</span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-slate-600 font-semibold">P50 (Median):</span>
                    <strong className="font-black text-slate-900 text-sm">{metrics.latencies?.kg_discovery_ms?.p50 ?? 0} ms</strong>
                  </div>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <span className="text-slate-500 text-[10px]">P95 (95th %):</span>
                    <span className="font-bold text-slate-700 text-xs">{metrics.latencies?.kg_discovery_ms?.p95 ?? 0} ms</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-lg">
                  <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Hybrid Scoring</span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-slate-600 font-semibold">P50 (Median):</span>
                    <strong className="font-black text-slate-900 text-sm">{metrics.latencies?.hybrid_scoring_ms?.p50 ?? 0} ms</strong>
                  </div>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <span className="text-slate-500 text-[10px]">P95 (95th %):</span>
                    <span className="font-bold text-slate-700 text-xs">{metrics.latencies?.hybrid_scoring_ms?.p95 ?? 0} ms</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-lg">
                  <span className="block text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider">Total Pre-LLM</span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-indigo-900 font-semibold">P50 (Median):</span>
                    <strong className="font-black text-indigo-600 text-sm">{metrics.latencies?.total_pre_llm_ms?.p50 ?? 0} ms</strong>
                  </div>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <span className="text-indigo-800 text-[10px]">P95 (95th %):</span>
                    <span className="font-bold text-indigo-900 text-xs">{metrics.latencies?.total_pre_llm_ms?.p95 ?? 0} ms</span>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: METHODOLOGY & SPECS */}
        <TabsContent value="methodology" className="space-y-4">
          <Card className="shadow-sm border border-[#E2E8F0] bg-white rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen size={14} className="text-indigo-500" /> Architecture & Protocol Specifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-semibold">Dataset</span>
                    <strong className="font-bold text-slate-900">{metrics.dataset || "DDXPlus"}</strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-semibold">Split</span>
                    <strong className="font-bold text-slate-900">{metrics.split || "Held-Out Test Split"}</strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-semibold">Training Cases Indexed in FAISS</span>
                    <strong className="font-bold text-slate-900">{(metrics.indexed_training_cases || 52679).toLocaleString()} training cases</strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-semibold">Held-Out Test Cases Evaluated</span>
                    <strong className="font-bold text-slate-900">{(metrics.sample_size || 2436).toLocaleString()} test cases</strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-semibold">Pathologies Available / Evaluated</span>
                    <strong className="font-bold text-slate-900">{metrics.pathologies_evaluated || 49} pathologies</strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-semibold">Maximum Cases per Pathology</span>
                    <strong className="font-bold text-slate-900">50 cases</strong>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-semibold">Random Seed</span>
                    <strong className="font-bold text-slate-900">{metrics.random_seed || 42}</strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-semibold">Retrieval Depth (K)</span>
                    <strong className="font-bold text-slate-900">Top-{metrics.retrieval_k || 25}</strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-semibold">Embedding Model</span>
                    <strong className="font-bold text-slate-900">BioClinicalBERT</strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-semibold">Embedding Dimension</span>
                    <strong className="font-bold text-slate-900">{metrics.embedding_dimension || 768}</strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-semibold">Vector Store Type</span>
                    <strong className="font-bold text-slate-900">FAISS IndexFlatIP (Cosine Similarity)</strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-semibold">Groq API Calls in Benchmark</span>
                    <strong className="font-black text-emerald-600">0 calls</strong>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

    </div>
  );
}
