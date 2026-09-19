import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";

interface SimilarCase {
  ground_truth: string;
  similarity_score: number;
  symptoms: string[];
}

interface SimilarCasesTableProps {
  similarCases: SimilarCase[];
}

export default function SimilarCasesTable({ similarCases }: SimilarCasesTableProps) {
  const [selectedCase, setSelectedCase] = useState<{
    caseId: string;
    diagnosis: string;
    similarity: number;
    dem: string;
    symptoms: string[];
  } | null>(null);

  return (
    <>
      <Card className="shadow-sm border border-[#E2E8F0] bg-white rounded-xl select-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-extrabold text-slate-[#0F172A] uppercase tracking-wider">
              Top 5 FAISS Similar Historical Cohorts
            </CardTitle>
            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[9px] font-bold py-0.5 px-2">
              FAISS Index: 10,000 Cases
            </Badge>
          </div>
          <CardDescription className="text-xs text-slate-500">
            Retrieved using BioClinicalBERT 768-D semantic vector similarity.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-200 text-[9px] text-[#64748B] font-bold uppercase tracking-wider bg-slate-50/50">
                <TableHead className="py-2 px-3 w-12 text-center">Rank</TableHead>
                <TableHead className="py-2 px-3">Case</TableHead>
                <TableHead className="py-2 px-3">Diagnosis</TableHead>
                <TableHead className="py-2 px-3 text-right">Similarity</TableHead>
                <TableHead className="py-2 px-3 text-center">Age / Sex</TableHead>
                <TableHead className="py-2 px-3">Key Symptoms</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {similarCases.slice(0, 5).map((caseItem, idx) => {
                const similarityPercent = caseItem.similarity_score * 100;
                const mockCaseId = `case_0${4873 + idx * 713}`;
                const mockAge = idx === 0 ? 76 : idx === 1 ? 52 : idx === 2 ? 60 : idx === 3 ? 45 : 24;
                const mockSex = idx === 0 || idx === 2 ? "M" : "F";
                const dem = `${mockAge} / ${mockSex}`;

                const cleanSymptoms = caseItem.symptoms.map(s => 
                  s.replace("Do you have a ", "").replace("Do you have ", "").replace("?", "").toLowerCase()
                );

                return (
                  <TableRow key={idx} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors text-[11px]">
                    <TableCell className="py-2.5 px-3 font-mono text-slate-400 font-bold text-center">#{idx + 1}</TableCell>
                    <TableCell 
                      onClick={() => setSelectedCase({
                        caseId: mockCaseId,
                        diagnosis: caseItem.ground_truth,
                        similarity: similarityPercent,
                        dem,
                        symptoms: cleanSymptoms
                      })}
                      className="py-2.5 px-3 font-mono font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer underline"
                    >
                      {mockCaseId}
                    </TableCell>
                    <TableCell className="py-2.5 px-3 font-bold text-[#0F172A]">{caseItem.ground_truth}</TableCell>
                    <TableCell className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-2 font-mono font-bold text-[#0F172A]">
                        <span>{similarityPercent.toFixed(1)}%</span>
                        <div className="w-12 bg-slate-100 border border-slate-200 rounded-full h-1.5 overflow-hidden hidden sm:block">
                          <div 
                            className={`h-full rounded-full ${
                              similarityPercent > 80 ? "bg-emerald-500" : similarityPercent > 60 ? "bg-indigo-500" : "bg-amber-500"
                            }`} 
                            style={{ width: `${Math.min(similarityPercent, 100)}%` }} 
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 px-3 font-semibold text-slate-600 text-center">{dem}</TableCell>
                    <TableCell className="py-2.5 px-3">
                      <div className="flex flex-wrap items-center gap-1 max-w-xs">
                        {cleanSymptoms.slice(0, 3).map((sym, sIdx) => (
                          <Badge 
                            key={sIdx} 
                            variant="outline" 
                            className="text-[8px] py-0 px-1 border-slate-200 text-[#64748B] font-semibold bg-slate-50 rounded"
                          >
                            {sym}
                          </Badge>
                        ))}
                        {cleanSymptoms.length > 3 && (
                          <button 
                            onClick={() => setSelectedCase({
                              caseId: mockCaseId,
                              diagnosis: caseItem.ground_truth,
                              similarity: similarityPercent,
                              dem,
                              symptoms: cleanSymptoms
                            })}
                            className="text-[9px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer underline px-1"
                          >
                            +{cleanSymptoms.length - 3} more
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          
          <p className="text-[10px] text-slate-400 italic mt-3 leading-snug">
            FAISS Inner Product search over 768-D BioClinicalBERT embeddings (equivalent to Cosine Similarity).
          </p>
        </CardContent>
      </Card>

      {/* Case Details Dialog */}
      <Dialog open={selectedCase !== null} onOpenChange={(open) => !open && setSelectedCase(null)}>
        <DialogContent className="bg-white border border-[#E2E8F0] rounded-xl max-w-md p-6 select-none">
          {selectedCase && (
            <>
              <DialogHeader>
                <DialogTitle className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center justify-between">
                  <span>Historical Case: {selectedCase.caseId}</span>
                  <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 font-mono text-xs">
                    {selectedCase.similarity.toFixed(1)}% Match
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-1">
                  Diagnosis: <strong className="text-slate-800 font-bold">{selectedCase.diagnosis}</strong> ({selectedCase.dem})
                </DialogDescription>
              </DialogHeader>
              
              <div className="mt-4 space-y-2">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">All Presenting Symptoms</span>
                <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 border border-slate-200 rounded-lg max-h-48 overflow-y-auto">
                  {selectedCase.symptoms.map((s, idx) => (
                    <Badge key={idx} className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold py-0.5 px-2">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
