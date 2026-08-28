import { useState, useEffect } from "react";
import { Search, Trash2, Eye, Download, ClipboardList, Calendar, Filter } from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
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
import { generateAssessmentPDF } from "../lib/pdfGenerator";
import type { AnalyzeResponse } from "../types";

interface SavedAssessment extends AnalyzeResponse {
  id: string;
  timestamp: string;
}

interface AssessmentHistoryProps {
  onViewRecord: (record: AnalyzeResponse) => void;
  setActiveTab: (tab: "dashboard" | "assessment" | "methodology" | "about") => void;
}

export default function AssessmentHistory({ onViewRecord, setActiveTab }: AssessmentHistoryProps) {
  const [history, setHistory] = useState<SavedAssessment[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [confidenceFilter, setConfidenceFilter] = useState("All");
  const [dateSort, setDateSort] = useState("Newest");
  
  // AlertDialog state for deletion
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Load records from localStorage on mount
  useEffect(() => {
    const loadHistory = () => {
      const stored = localStorage.getItem("medassist_assessment_history");
      if (stored) {
        try {
          setHistory(JSON.parse(stored));
        } catch (err) {
          console.error("Failed to parse local assessment history:", err);
        }
      }
    };
    loadHistory();
  }, []);

  // Filter and sort matching assessments
  const filteredHistory = history.filter(item => {
    // 1. Search Query filter (matches symptoms, conditions, or age)
    const matchesSearch = searchQuery === "" || 
      item.patient_summary.symptoms.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.possible_conditions.some(c => c.condition.toLowerCase().includes(searchQuery.toLowerCase())) ||
      String(item.patient_summary.age).includes(searchQuery) ||
      new Date(item.timestamp).toLocaleDateString().includes(searchQuery);

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

  const handleDeleteClick = (id: string) => {
    setDeleteTargetId(id);
  };

  const confirmDelete = () => {
    if (!deleteTargetId) return;
    const updated = history.filter(item => item.id !== deleteTargetId);
    setHistory(updated);
    localStorage.setItem("medassist_assessment_history", JSON.stringify(updated));
    setDeleteTargetId(null);
  };

  const handleDownload = (record: SavedAssessment) => {
    try {
      generateAssessmentPDF(record);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to export historical report PDF.");
    }
  };

  // Derive simple statistics
  const totalCount = history.length;
  const recentDiagnosis = history.length > 0 ? history[0].possible_conditions[0]?.condition : "None";
  
  // Calculate average confidence distribution percentages
  const highCount = history.filter(i => i.confidence_level.toLowerCase().startsWith("high")).length;
  const medCount = history.filter(i => i.confidence_level.toLowerCase().startsWith("medium")).length;
  const lowCount = history.filter(i => i.confidence_level.toLowerCase().startsWith("low")).length;

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex justify-between items-center select-none">
        <div>
          <h2 className="text-sm font-extrabold text-[#0F172A] tracking-tight uppercase leading-none">Assessment History</h2>
          <p className="text-[10px] text-[#64748B] mt-1 font-medium leading-none">
            Review previous clinical decision-support assessments stored on this device.
          </p>
        </div>
        <Button 
          onClick={() => setActiveTab("assessment")}
          size="sm"
          className="h-7 text-[10px] px-3 font-bold uppercase tracking-wider bg-indigo-600 text-white hover:bg-indigo-75 rounded-lg cursor-pointer"
        >
          New Assessment
        </Button>
      </div>

      {/* Metrics Row */}
      {totalCount > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 select-none">
          <Card className="shadow-sm border border-[#E2E8F0] bg-white rounded-xl border-t-2 border-t-[#4F46E5]">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <span className="block text-[9px] text-[#64748B] font-bold uppercase tracking-wider">Total Assessments</span>
                <span className="block text-lg font-black text-slate-800 mt-1 leading-none">{totalCount}</span>
              </div>
              <ClipboardList size={22} className="text-indigo-500 opacity-60" />
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border border-[#E2E8F0] bg-white rounded-xl border-t-2 border-t-[#06B6D4]">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <span className="block text-[9px] text-[#64748B] font-bold uppercase tracking-wider">Most Recent Target</span>
                <span className="block text-xs font-bold text-slate-800 mt-1.5 leading-none truncate max-w-[160px]">
                  {recentDiagnosis}
                </span>
              </div>
              <Calendar size={22} className="text-cyan-500 opacity-60" />
            </CardContent>
          </Card>

          <Card className="shadow-sm border border-[#E2E8F0] bg-white rounded-xl border-t-2 border-t-[#7C3AED]">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <span className="block text-[9px] text-[#64748B] font-bold uppercase tracking-wider">Confidence Profile</span>
                <span className="block text-[9px] font-semibold text-slate-600 mt-1.5 leading-none">
                  H: {highCount}  |  M: {medCount}  |  L: {lowCount}
                </span>
              </div>
              <Filter size={20} className="text-violet-500 opacity-60" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter and Search Controls */}
      <div className="flex flex-col md:flex-row gap-3 bg-white p-3.5 border border-[#E2E8F0] rounded-xl shadow-sm items-center">
        
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search size={13} className="absolute left-3 top-3 text-[#64748B]" />
          <Input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search symptoms, conditions, ages, or dates..."
            className="pl-8 text-xs h-8 bg-slate-50 border-slate-200 focus:bg-white rounded-lg"
          />
        </div>

        {/* Confidence filter */}
        <div className="flex items-center gap-1.5 shrink-0 w-full md:w-auto">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Confidence</span>
          <select 
            value={confidenceFilter}
            onChange={(e) => setConfidenceFilter(e.target.value)}
            className="text-xs h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-[#0F172A] w-full md:w-28 focus:outline-none"
          >
            <option value="All">All</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        {/* Date Sort */}
        <div className="flex items-center gap-1.5 shrink-0 w-full md:w-auto">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Sort By</span>
          <select 
            value={dateSort}
            onChange={(e) => setDateSort(e.target.value)}
            className="text-xs h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-[#0F172A] w-full md:w-28 focus:outline-none"
          >
            <option value="Newest">Newest First</option>
            <option value="Oldest">Oldest First</option>
          </select>
        </div>

      </div>

      {/* Main section: Table or Empty state */}
      {filteredHistory.length === 0 ? (
        
        // Polished Empty State
        <Card className="flex flex-col items-center justify-center text-center p-14 border border-dashed border-[#E2E8F0] rounded-2xl bg-white shadow-sm select-none">
          <div className="p-3 bg-slate-50 text-slate-400 rounded-full border border-slate-200 mb-4">
            <ClipboardList size={24} />
          </div>
          <h3 className="font-extrabold text-sm text-[#0F172A] tracking-tight">No assessments found</h3>
          <p className="text-xs text-[#64748B] mt-1 max-w-sm leading-normal">
            {totalCount === 0 
              ? "Completed clinical assessments will appear here once generated." 
              : "No historical records match your search filters."}
          </p>
          {totalCount === 0 && (
            <Button 
              onClick={() => setActiveTab("assessment")}
              size="sm" 
              className="mt-4 h-8 text-[10px] font-bold uppercase tracking-wider bg-indigo-600 text-white rounded-lg cursor-pointer px-4"
            >
              Start New Assessment
            </Button>
          )}
        </Card>
      ) : (
        
        // History log table
        <Card className="shadow-sm border border-[#E2E8F0] bg-white rounded-xl overflow-hidden">
          <div className="overflow-x-auto min-w-0">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-200 text-[9px] text-[#64748B] font-bold uppercase tracking-wider bg-slate-50/50">
                  <TableHead className="py-2.5 px-4">Date & Time</TableHead>
                  <TableHead className="py-2.5 px-3">Patient</TableHead>
                  <TableHead className="py-2.5 px-3">Presenting Symptoms</TableHead>
                  <TableHead className="py-2.5 px-3">Top Condition Match</TableHead>
                  <TableHead className="py-2.5 px-3 text-center">Confidence</TableHead>
                  <TableHead className="py-2.5 px-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map((item) => {
                  const dateStr = new Date(item.timestamp).toLocaleString("en-US", {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false
                  });

                  const isHigh = item.confidence_level.toLowerCase().startsWith("high");
                  const isMedium = item.confidence_level.toLowerCase().startsWith("medium");
                  const parsedConf = isHigh ? "High" : isMedium ? "Medium" : "Low";

                  const topCondition = item.possible_conditions[0]?.condition || "N/A";

                  return (
                    <TableRow key={item.id} className="border-b border-slate-100 hover:bg-slate-50/40 transition-colors text-[11px]">
                      <TableCell className="py-3 px-4 font-mono font-medium text-slate-500 whitespace-nowrap">
                        {dateStr}
                      </TableCell>
                      <TableCell className="py-3 px-3 font-semibold text-slate-700 whitespace-nowrap">
                        {item.patient_summary.age} y/o {item.patient_summary.sex === "F" ? "Female" : "Male"}
                      </TableCell>
                      <TableCell className="py-3 px-3 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {item.patient_summary.symptoms.slice(0, 3).map((sym, sIdx) => (
                            <Badge key={sIdx} variant="outline" className="text-[8px] py-0 px-1 border-slate-200 bg-slate-50 text-slate-500 rounded font-semibold">
                              {sym}
                            </Badge>
                          ))}
                          {item.patient_summary.symptoms.length > 3 && (
                            <span className="text-[9px] text-slate-400 font-bold">+{item.patient_summary.symptoms.length - 3}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-3 font-bold text-[#0F172A]">
                        {topCondition}
                      </TableCell>
                      <TableCell className="py-3 px-3 text-center">
                        <Badge className={`text-[8.5px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border ${
                          isHigh ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                          isMedium ? "bg-amber-50 text-amber-600 border-amber-100" :
                          "bg-rose-50 text-rose-600 border-rose-100"
                        }`}>
                          {parsedConf}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button 
                            onClick={() => onViewRecord(item)}
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                          >
                            <Eye size={12} className="stroke-[2.5]" />
                          </Button>
                          <Button 
                            onClick={() => handleDownload(item)}
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"
                          >
                            <Download size={12} className="stroke-[2.5]" />
                          </Button>
                          <Button 
                            onClick={() => handleDeleteClick(item.id)}
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          >
                            <Trash2 size={12} className="stroke-[2.5]" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Local Storage Privacy Limitation Alert */}
      <p className="text-[10px] text-slate-400 text-center font-medium italic select-none">
        Note: Assessment history is stored locally in this browser cache and is not synchronized with any remote patient database.
      </p>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={deleteTargetId !== null} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent className="bg-white border border-[#E2E8F0] rounded-xl max-w-sm select-none p-5">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-extrabold text-slate-900 leading-tight uppercase tracking-tight">Delete Assessment?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500 mt-1 leading-normal">
              Are you sure you want to remove this clinical assessment from local device history? This action is permanent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex gap-2 justify-end text-xs">
            <AlertDialogCancel className="h-8 text-[10px] px-3 font-bold uppercase tracking-wider bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 rounded-lg cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="h-8 text-[10px] px-3 font-bold uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
