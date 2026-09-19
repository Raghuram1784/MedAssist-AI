import { useState, useEffect } from "react";
import { 
  Search, 
  Trash2, 
  Eye, 
  Download, 
  ClipboardList, 
  Filter, 
  ArrowUpDown,
  History
} from "lucide-react";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { generateAssessmentPDF } from "../lib/pdfGenerator";
import type { AnalyzeResponse } from "../types";

export interface SavedAssessment extends AnalyzeResponse {
  id: string;
  timestamp: string;
}

interface AssessmentHistoryProps {
  onViewRecord: (record: AnalyzeResponse) => void;
  setActiveTab: (tab: "dashboard" | "assessment" | "methodology" | "about" | "history") => void;
}

const STORAGE_KEY = "medassist_assessment_history";

export default function AssessmentHistory({ onViewRecord, setActiveTab }: AssessmentHistoryProps) {
  const [history, setHistory] = useState<SavedAssessment[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [confidenceFilter, setConfidenceFilter] = useState("All");
  const [dateSort, setDateSort] = useState("Newest");
  
  // AlertDialog state for single item deletion
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // AlertDialog state for clear all history
  const [isClearAllOpen, setIsClearAllOpen] = useState(false);

  // Load records safely from localStorage on mount
  useEffect(() => {
    loadHistoryData();
  }, []);

  const loadHistoryData = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        } else {
          setHistory([]);
        }
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.error("Failed to parse local assessment history:", err);
      setHistory([]);
    }
  };

  // Filter and sort matching assessments
  const filteredHistory = history.filter(item => {
    const q = searchQuery.toLowerCase().trim();

    // 1. Search Query filter (matches assessment ID, age, sex, symptoms, condition names)
    const matchesSearch = q === "" || 
      (item.id && item.id.toLowerCase().includes(q)) ||
      item.patient_summary.symptoms.some(s => s.toLowerCase().includes(q)) ||
      item.possible_conditions.some(c => c.condition.toLowerCase().includes(q)) ||
      (item.alternative_conditions && item.alternative_conditions.some(a => a.toLowerCase().includes(q))) ||
      String(item.patient_summary.age).includes(q) ||
      (item.patient_summary.sex === "F" ? "female" : "male").includes(q) ||
      (item.patient_summary.additional_information && item.patient_summary.additional_information.toLowerCase().includes(q)) ||
      new Date(item.timestamp).toLocaleDateString().toLowerCase().includes(q);

    // 2. Confidence Level filter
    const matchesConfidence = confidenceFilter === "All" ||
      item.confidence_level.toLowerCase().startsWith(confidenceFilter.toLowerCase());

    return matchesSearch && matchesConfidence;
  }).sort((a, b) => {
    // 3. Date Sort
    const dateA = new Date(a.timestamp).getTime();
    const dateB = new Date(b.timestamp).getTime();
    return dateSort === "Newest" ? dateB - dateA : dateA - dateB;
  });

  // Single Item Delete Handler
  const confirmDelete = () => {
    if (!deleteTargetId) return;
    const updated = history.filter(item => item.id !== deleteTargetId);
    setHistory(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to update localStorage after deletion:", err);
    }
    setDeleteTargetId(null);
  };

  // Clear All History Handler
  const confirmClearAll = () => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error("Failed to clear localStorage history:", err);
    }
    setIsClearAllOpen(false);
  };

  // Download Historical PDF Report
  const handleDownload = (record: SavedAssessment) => {
    try {
      generateAssessmentPDF(record);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Unable to generate report PDF.");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 select-none pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
            Assessment History
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Review previously analyzed clinical cases.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {history.length > 0 && (
            <Button
              onClick={() => setIsClearAllOpen(true)}
              variant="outline"
              size="sm"
              className="h-8 text-xs font-bold gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 bg-white rounded-lg cursor-pointer transition-colors"
            >
              <Trash2 size={13} />
              Clear History
            </Button>
          )}

          <Button 
            onClick={() => setActiveTab("assessment")}
            size="sm"
            className="h-8 text-xs font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer transition-colors shadow-xs"
          >
            <History size={13} />
            New Assessment
          </Button>
        </div>
      </div>

      {/* Top Controls: Search, Filter, Sort */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white p-3.5 border border-[#E2E8F0] rounded-xl shadow-sm items-center">
        
        {/* Search Input (6 cols) */}
        <div className="relative sm:col-span-6 w-full">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <Input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assessments..."
            className="pl-8 text-xs h-8 bg-slate-50 border-slate-200 focus:bg-white rounded-lg"
          />
        </div>

        {/* Confidence Filter (3 cols) */}
        <div className="sm:col-span-3 flex items-center gap-2 w-full">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0 flex items-center gap-1">
            <Filter size={12} /> Confidence:
          </span>
          <select 
            value={confidenceFilter}
            onChange={(e) => setConfidenceFilter(e.target.value)}
            className="text-xs h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 w-full focus:outline-none cursor-pointer"
          >
            <option value="All">All</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        {/* Date Sort (3 cols) */}
        <div className="sm:col-span-3 flex items-center gap-2 w-full">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0 flex items-center gap-1">
            <ArrowUpDown size={12} /> Sort:
          </span>
          <select 
            value={dateSort}
            onChange={(e) => setDateSort(e.target.value)}
            className="text-xs h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 w-full focus:outline-none cursor-pointer"
          >
            <option value="Newest">Newest</option>
            <option value="Oldest">Oldest</option>
          </select>
        </div>

      </div>

      {/* Main Grid of Compact Assessment Cards */}
      {filteredHistory.length === 0 ? (
        
        /* Polished Empty State */
        <Card className="flex flex-col items-center justify-center text-center p-14 border border-dashed border-[#E2E8F0] rounded-2xl bg-white shadow-sm select-none">
          <div className="p-3 bg-slate-50 text-slate-400 rounded-full border border-slate-200 mb-4">
            <ClipboardList size={26} />
          </div>
          <h3 className="font-extrabold text-sm text-[#0F172A] tracking-tight">No assessments yet</h3>
          <p className="text-xs text-[#64748B] mt-1 max-w-sm leading-normal">
            {history.length === 0 
              ? "Completed clinical assessments will appear here." 
              : "No saved assessments match your active filters."}
          </p>
          {history.length === 0 && (
            <Button 
              onClick={() => setActiveTab("assessment")}
              size="sm" 
              className="mt-4 h-8 text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg cursor-pointer px-4 shadow-xs"
            >
              Start New Assessment
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHistory.map((item) => {
            const dateObj = new Date(item.timestamp);
            const dateFormatted = dateObj.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric"
            });
            const timeFormatted = dateObj.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit"
            });

            const isHigh = item.confidence_level.toLowerCase().includes("high");
            const isMedium = item.confidence_level.toLowerCase().includes("medium");
            const parsedConf = isHigh ? "HIGH" : isMedium ? "MEDIUM" : "LOW";

            const conditionsCount = item.possible_conditions.length;
            const casesCount = item.similar_cases.length;
            const topCondition = item.possible_conditions[0]?.condition || "Unknown";

            return (
              <Card 
                key={item.id} 
                className="shadow-sm border border-[#E2E8F0] bg-white rounded-xl select-none hover:border-slate-300 transition-all duration-200 flex flex-col justify-between"
              >
                <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  
                  {/* Header Row: Date/Time & Confidence Badge */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 font-mono font-medium">
                        {dateFormatted} • {timeFormatted}
                      </span>
                      <Badge className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                        isHigh ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        isMedium ? "bg-amber-50 text-amber-700 border-amber-200" :
                        "bg-rose-50 text-rose-700 border-rose-200"
                      }`}>
                        {parsedConf}
                      </Badge>
                    </div>

                    {/* Patient Age & Sex */}
                    <h4 className="font-extrabold text-sm text-slate-900 tracking-tight pt-0.5">
                      {item.patient_summary.age} years • {item.patient_summary.sex === "F" ? "Female" : "Male"}
                    </h4>
                  </div>

                  {/* Presenting Symptoms Badges */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                      Presenting Symptoms
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {item.patient_summary.symptoms.slice(0, 4).map((sym, sIdx) => (
                        <Badge 
                          key={sIdx} 
                          variant="secondary" 
                          className="bg-slate-100 border border-slate-200 text-slate-700 text-[9px] font-semibold py-0 px-1.5 rounded-md"
                        >
                          {sym}
                        </Badge>
                      ))}
                      {item.patient_summary.symptoms.length > 4 && (
                        <span className="text-[9px] text-slate-400 font-bold self-center">
                          +{item.patient_summary.symptoms.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Summary Pipeline Numbers */}
                  <div className="py-2 px-3 bg-slate-50 border border-slate-200/70 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800 block text-[11px] truncate max-w-[170px]">
                        {topCondition}
                      </span>
                      <span className="text-[9px] text-slate-500 font-medium block">
                        Primary Differential Match
                      </span>
                    </div>
                    <div className="text-right shrink-0 font-medium text-[10px] text-slate-600">
                      <div><strong className="text-indigo-600 font-bold">{conditionsCount}</strong> Conditions</div>
                      <div><strong className="text-slate-700 font-bold">{casesCount}</strong> Similar Cases</div>
                    </div>
                  </div>

                  {/* Card Actions: View Assessment, Download Report, Delete */}
                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                    <Button 
                      onClick={() => onViewRecord(item)}
                      size="sm" 
                      className="h-8 flex-1 text-xs font-bold gap-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer transition-colors shadow-xs"
                    >
                      <Eye size={12} className="stroke-[2.5]" />
                      View Assessment
                    </Button>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          onClick={() => handleDownload(item)}
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8 text-indigo-600 border-indigo-200 hover:bg-indigo-50 rounded-lg cursor-pointer shrink-0"
                        >
                          <Download size={13} className="stroke-[2.5]" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Download Report</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          onClick={() => setDeleteTargetId(item.id)}
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8 text-rose-600 border-rose-200 hover:bg-rose-50 rounded-lg cursor-pointer shrink-0"
                        >
                          <Trash2 size={13} className="stroke-[2.5]" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                  </div>

                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Single Assessment Confirmation Alert Dialog */}
      <AlertDialog open={deleteTargetId !== null} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent className="bg-white border border-[#E2E8F0] rounded-xl max-w-sm select-none p-5">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-extrabold text-slate-900 leading-tight">
              Delete Assessment?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500 mt-1 leading-normal">
              This assessment will be permanently removed from local history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex gap-2 justify-end text-xs">
            <AlertDialogCancel className="h-8 text-xs px-3.5 font-bold bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 rounded-lg cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="h-8 text-xs px-3.5 font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer"
            >
              Delete Assessment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear All History Confirmation Alert Dialog */}
      <AlertDialog open={isClearAllOpen} onOpenChange={setIsClearAllOpen}>
        <AlertDialogContent className="bg-white border border-[#E2E8F0] rounded-xl max-w-sm select-none p-5">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-extrabold text-slate-900 leading-tight">
              Clear all assessment history?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500 mt-1 leading-normal">
              This will remove all saved assessments from this browser.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex gap-2 justify-end text-xs">
            <AlertDialogCancel className="h-8 text-xs px-3.5 font-bold bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 rounded-lg cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmClearAll}
              className="h-8 text-xs px-3.5 font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer"
            >
              Clear History
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
