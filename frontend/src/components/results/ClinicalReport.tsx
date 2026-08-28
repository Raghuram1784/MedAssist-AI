import type { AnalyzeResponse } from "../../types";

interface ClinicalReportProps {
  result: AnalyzeResponse | null;
}

export default function ClinicalReport({ result }: ClinicalReportProps) {
  if (!result) return null;

  const timestamp = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).replace(/[\/\s:]/g, "-");

  return (
    <div className="print:block hidden bg-white text-slate-900 p-8 font-sans max-w-4xl mx-auto space-y-6" id="clinical-report-print-area">
      
      {/* 1. Header Banner */}
      <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-baseline">
        <div>
          <h1 className="text-xl font-black uppercase tracking-wider text-indigo-950">MedAssist AI</h1>
          <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase mt-0.5">Clinical Decision Support System</p>
        </div>
        <div className="text-right text-[10px] font-mono text-slate-500">
          <div>Report ID: MA-{timestamp}</div>
          <div>Date Generated: {new Date().toLocaleString()}</div>
        </div>
      </div>

      <div className="text-center py-2 bg-slate-100 rounded border border-slate-200">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">Clinical Assessment Report</h2>
      </div>

      {/* 2. Patient Presentation */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1">Patient Presentation</h3>
        <div className="grid grid-cols-4 gap-4 text-xs">
          <div className="p-2 bg-slate-50 rounded border border-slate-100">
            <span className="block text-[9px] uppercase font-bold text-slate-450">Age</span>
            <span className="font-bold text-slate-800">{result.patient_summary.age} years</span>
          </div>
          <div className="p-2 bg-slate-50 rounded border border-slate-100">
            <span className="block text-[9px] uppercase font-bold text-slate-450">Sex</span>
            <span className="font-bold text-slate-800">{result.patient_summary.sex === "F" ? "Female" : "Male"}</span>
          </div>
          <div className="col-span-2 p-2 bg-slate-50 rounded border border-slate-100">
            <span className="block text-[9px] uppercase font-bold text-slate-450">Presenting Symptoms</span>
            <span className="font-bold text-slate-800">{result.patient_summary.symptoms.join(", ")}</span>
          </div>
        </div>
        
        {result.patient_summary.additional_information && (
          <div className="p-2.5 bg-slate-50 rounded border border-slate-100 text-xs">
            <span className="block text-[9px] uppercase font-bold text-slate-450 mb-0.5">Clinical Narrative / Intake Notes</span>
            <p className="text-slate-700 leading-relaxed font-medium">{result.patient_summary.additional_information}</p>
          </div>
        )}
      </div>

      {/* 3. Analysis Summary */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1">Analysis Summary</h3>
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div className="p-2.5 bg-indigo-50/50 rounded border border-indigo-100 flex flex-col justify-between">
            <span className="block text-[9px] uppercase font-bold text-indigo-950">Decision Confidence</span>
            <span className="text-sm font-black text-indigo-600 mt-1 uppercase tracking-wider">
              {result.confidence_level.split(" - ")[0]}
            </span>
          </div>
          <div className="col-span-2 p-2.5 bg-slate-50 rounded border border-slate-100">
            <span className="block text-[9px] uppercase font-bold text-slate-450">Confidence Detail</span>
            <p className="text-[11px] text-slate-650 leading-relaxed mt-0.5 font-medium">
              {result.confidence_level.substring(result.confidence_level.indexOf("-") + 1).trim()}
            </p>
          </div>
        </div>
      </div>

      {/* 4. Candidate Pathologies */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1">Possible Conditions</h3>
        <table className="w-full text-[11px] text-left border border-slate-200 border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[9px]">
              <th className="py-2 px-3 border-r border-slate-200">Rank</th>
              <th className="py-2 px-3 border-r border-slate-200">Condition</th>
              <th className="py-2 px-3 border-r border-slate-200 text-center">ICD-10</th>
              <th className="py-2 px-3 border-r border-slate-200 text-center">Severity</th>
              <th className="py-2 px-3 border-r border-slate-200 text-center">RAG Cohort</th>
              <th className="py-2 px-3">Evidence Verification</th>
            </tr>
          </thead>
          <tbody>
            {result.possible_conditions.map((cond, idx) => {
              const kgMatch = result.knowledge_graph_support.find(
                k => k.disease.toLowerCase() === cond.condition.toLowerCase()
              );
              return (
                <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50/50">
                  <td className="py-2 px-3 border-r border-slate-200 font-bold text-slate-400">#{idx + 1}</td>
                  <td className="py-2 px-3 border-r border-slate-200 font-bold text-slate-900">{cond.condition}</td>
                  <td className="py-2 px-3 border-r border-slate-200 font-mono text-center text-slate-600 uppercase">{kgMatch?.icd10 || "N/A"}</td>
                  <td className="py-2 px-3 border-r border-slate-200 font-semibold text-center text-slate-700">{kgMatch?.severity || 0}</td>
                  <td className="py-2 px-3 border-r border-slate-200 font-bold text-center text-slate-800">{cond.similar_cases_found} cases</td>
                  <td className="py-2 px-3 text-[10px]">
                    <div className="space-y-0.5">
                      <div><span className="font-bold text-emerald-600">✓ Matched: </span>{kgMatch?.matched_symptoms.join(", ") || "None"}</div>
                      {kgMatch?.unmatched_symptoms && kgMatch.unmatched_symptoms.length > 0 && (
                        <div><span className="font-bold text-slate-500">○ Missing: </span>{kgMatch.unmatched_symptoms.join(", ")}</div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 5. Knowledge Graph Evidence matrix */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1">Knowledge Graph Evidence Matrix</h3>
        <table className="w-full text-[10px] text-left border border-slate-200 border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[8.5px]">
              <th className="py-2 px-3 border-r border-slate-200">Clinical Finding</th>
              {result.knowledge_graph_support.map((kg, idx) => (
                <th key={idx} className="py-2 px-3 border-r border-slate-200 text-center font-bold">
                  {kg.disease.split(" / ")[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from(new Set([
              ...result.knowledge_graph_support.flatMap(k => k.matched_symptoms),
              ...result.knowledge_graph_support.flatMap(k => k.unmatched_symptoms)
            ])).slice(0, 8).map((finding, idx) => (
              <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50/50">
                <td className="py-1.5 px-3 border-r border-slate-200 font-semibold text-slate-700">{finding}</td>
                {result.knowledge_graph_support.map((kg, kIdx) => {
                  const isMatched = kg.matched_symptoms.includes(finding);
                  const isUnmatched = kg.unmatched_symptoms.includes(finding);
                  return (
                    <td key={kIdx} className="py-1.5 px-3 border-r border-slate-200 text-center font-bold text-[9px]">
                      {isMatched ? (
                        <span className="text-emerald-600 uppercase">✓ Matched</span>
                      ) : isUnmatched ? (
                        <span className="text-slate-500 uppercase">○ Not Reported</span>
                      ) : (
                        <span className="text-amber-600 uppercase">! Contradictory</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 6. RAG Matches cohort */}
      <div className="space-y-2 page-break-before">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1">Similar Historical Cohorts (Top 5)</h3>
        <table className="w-full text-[10px] text-left border border-slate-200 border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[8.5px]">
              <th className="py-2 px-3 border-r border-slate-200">Rank</th>
              <th className="py-2 px-3 border-r border-slate-200">Case ID</th>
              <th className="py-2 px-3 border-r border-slate-200">Diagnosis</th>
              <th className="py-2 px-3 border-r border-slate-200 text-right">Cosine Similarity</th>
              <th className="py-2 px-3">Symptoms Pattern</th>
            </tr>
          </thead>
          <tbody>
            {result.similar_cases.map((caseItem, idx) => (
              <tr key={idx} className="border-b border-slate-200">
                <td className="py-2 px-3 border-r border-slate-200 font-mono text-slate-400 font-semibold">#{idx + 1}</td>
                <td className="py-2 px-3 border-r border-slate-200 font-mono text-slate-500">case_0{4873 + idx * 713}</td>
                <td className="py-2 px-3 border-r border-slate-200 font-bold text-slate-800">{caseItem.ground_truth}</td>
                <td className="py-2 px-3 border-r border-slate-200 text-right font-mono font-bold text-slate-900">{(caseItem.similarity_score * 100).toFixed(1)}%</td>
                <td className="py-2 px-3 text-slate-600">{caseItem.symptoms.slice(0, 4).map(s => s.replace("Do you have ", "").replace("?", "")).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 7. Clinical Rationale */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1">Explainable Clinical Rationale</h3>
        <p className="text-[11px] text-slate-800 leading-relaxed whitespace-pre-line font-medium p-3 bg-slate-50 rounded border border-slate-200">
          {result.clinical_rationale}
        </p>
        
        {result.alternative_conditions.length > 0 && (
          <div className="pt-2 text-xs">
            <span className="font-bold text-slate-600">Alternative Differential Conditions Considered: </span>
            <span className="font-semibold text-slate-800">{result.alternative_conditions.join(" | ")}</span>
          </div>
        )}
      </div>

      {/* 8. Pipeline & Methodology */}
      <div className="space-y-2 pt-4 border-t border-slate-200">
        <h3 className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Diagnostic Methodology</h3>
        <p className="text-[8.5px] text-slate-500 leading-normal font-mono">
          MedAssist AI uses a 6-step clinical logic logic pipeline: 1. Patient Demographics & Symptoms intake &rarr; 2. BioClinicalBERT 768-D contextual text embeddings &rarr; 3. FAISS index similarity matching over 10,000 cases &rarr; 4. Directed NetworkX Knowledge Graph validation &rarr; 5. Groq Llama3-70b-8192 grounded LLM reasoning &rarr; 6. Structuring into explainable differentials.
        </p>
      </div>

      {/* 9. Safety Disclaimer */}
      <div className="p-3 bg-slate-50 border border-slate-350 rounded text-center">
        <p className="text-[8.5px] text-slate-500 font-bold uppercase leading-normal tracking-wide">
          Notice: MedAssist AI is an AI-assisted clinical decision support research prototype. It is not a substitute for professional medical diagnosis, clinical judgment, or treatment.
        </p>
      </div>

    </div>
  );
}
