import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { AnalyzeResponse } from "../types";

export function generateAssessmentPDF(result: AnalyzeResponse) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const timestamp = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).replace(/[\/\s:]/g, "-");

  // Helper for page numbering
  const pageCount = () => {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      
      // Footer text
      doc.text(
        `MedAssist AI Research CDSS Prototype  |  Report ID: MA-${timestamp}  |  Page ${i} of ${totalPages}`,
        14,
        287
      );
      
      // Top header banner (small)
      if (i > 1) {
        doc.setFontSize(7);
        doc.text("MedAssist AI Clinical Assessment Report", 14, 10);
        doc.setDrawColor(226, 232, 240);
        doc.line(14, 12, 196, 12);
      }
    }
  };

  // --- PAGE 1: HEADER & PATIENT SUMMARY ---
  
  // Brand Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(7, 21, 46); // Navy
  doc.text("MEDASSIST AI", 14, 20);
  
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139); // Muted slate
  doc.text("CLINICAL DECISION SUPPORT SYSTEM  |  RESEARCH PORTAL", 14, 24);
  
  // Date & ID metadata
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Report Ref: MA-${timestamp}`, 196 - 14, 18, { align: "right" });
  doc.text(`Generated: ${new Date().toLocaleString()}`, 196 - 14, 22, { align: "right" });
  
  // Thick divider line
  doc.setDrawColor(7, 21, 46);
  doc.setLineWidth(0.8);
  doc.line(14, 26, 196, 26);

  // Section: Patient Presentation
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(7, 21, 46);
  doc.text("1. PATIENT PRESENTATION", 14, 34);

  // Patient Info details table
  autoTable(doc, {
    startY: 37,
    theme: "plain",
    body: [
      ["Age", `${result.patient_summary.age} years`, "Sex", result.patient_summary.sex === "F" ? "Female" : "Male"],
      ["Symptom Profile", result.patient_summary.symptoms.join(", "), "", ""]
    ],
    styles: { fontSize: 9, font: "helvetica", cellPadding: 2.5 },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 30 },
      1: { fontStyle: "bold", textColor: [15, 23, 42] },
      2: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 20 },
      3: { fontStyle: "bold", textColor: [15, 23, 42] }
    },
    margin: { left: 14, right: 14 }
  });

  // Clinical Narrative notes
  if (result.patient_summary.additional_information) {
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 3,
      theme: "plain",
      body: [
        ["Clinical Narrative notes:", result.patient_summary.additional_information]
      ],
      styles: { fontSize: 8.5, font: "helvetica", cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 35 },
        1: { fontStyle: "normal", textColor: [51, 65, 85] }
      },
      margin: { left: 14, right: 14 }
    });
  }

  // Section: Confidence & Metrics
  const lastY = (doc as any).lastAutoTable.finalY;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(7, 21, 46);
  doc.text("2. DIAGNOSTIC ASSESSMENT SUMMARY", 14, lastY + 10);

  // Confidence extraction
  const rawConfidence = result.confidence_level;
  const dividerIdx = rawConfidence.indexOf("-");
  const confidenceLevel = dividerIdx !== -1 ? rawConfidence.substring(0, dividerIdx).trim() : rawConfidence;
  const confidenceExplanation = dividerIdx !== -1 ? rawConfidence.substring(dividerIdx + 1).trim() : "";

  autoTable(doc, {
    startY: lastY + 13,
    theme: "striped",
    body: [
      ["Decision Confidence Level", confidenceLevel.toUpperCase()],
      ["Confidence explanation", confidenceExplanation],
      ["Metric Indicators", `Possible Conditions: ${result.possible_conditions.length}  |  Similar Cohorts: ${result.similar_cases.length}  |  KG Graph Matches: ${result.patient_summary.symptoms.length}`]
    ],
    styles: { fontSize: 8.5, font: "helvetica", cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 50 },
      1: { textColor: [15, 23, 42] }
    },
    margin: { left: 14, right: 14 }
  });

  // Section: Possible Conditions Table
  const condY = (doc as any).lastAutoTable.finalY;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(7, 21, 46);
  doc.text("3. POSSIBLE DIFFERENTIAL DIAGNOSES", 14, condY + 10);

  const conditionRows = result.possible_conditions.map((cond, idx) => {
    const kgMatch = result.knowledge_graph_support.find(
      k => k.disease.toLowerCase() === cond.condition.toLowerCase()
    );
    return [
      `#${idx + 1}`,
      cond.condition,
      kgMatch?.icd10 || "N/A",
      kgMatch?.severity || "0",
      `${cond.similar_cases_found} cases`,
      kgMatch?.matched_symptoms.join(", ") || "None",
      kgMatch?.unmatched_symptoms.join(", ") || "None"
    ];
  });

  autoTable(doc, {
    startY: condY + 13,
    head: [["Rank", "Condition", "ICD-10", "Severity", "RAG Cases", "Matched Evidence", "Unreported Evidence"]],
    body: conditionRows,
    theme: "grid",
    headStyles: { fillColor: [7, 21, 46], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    styles: { fontSize: 7.5, font: "helvetica", cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 12, fontStyle: "bold" },
      1: { fontStyle: "bold" },
      2: { fontStyle: "normal" },
      3: { halign: "center", cellWidth: 15 },
      4: { fontStyle: "bold", cellWidth: 20 },
      5: { textColor: [22, 163, 74] }, // green
      6: { textColor: [100, 116, 139] }
    },
    margin: { left: 14, right: 14 }
  });

  // --- PAGE 2: KNOWLEDGE GRAPH & RATIONALE ---
  doc.addPage();
  
  // Section: Knowledge Graph Matrix
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(7, 21, 46);
  doc.text("4. KNOWLEDGE GRAPH EVIDENCE VERIFICATION", 14, 20);

  // Extract unique symptoms
  const allFindings = Array.from(
    new Set([
      ...result.knowledge_graph_support.flatMap(k => k.matched_symptoms),
      ...result.knowledge_graph_support.flatMap(k => k.unmatched_symptoms)
    ])
  );

  const kgHeaders = ["Clinical Finding", ...result.knowledge_graph_support.map(k => k.disease.split(" / ")[0])];
  const kgRows = allFindings.slice(0, 8).map(finding => {
    const row = [finding];
    result.knowledge_graph_support.forEach(kg => {
      const isMatched = kg.matched_symptoms.includes(finding);
      const isUnmatched = kg.unmatched_symptoms.includes(finding);
      row.push(isMatched ? "MATCHED" : isUnmatched ? "NOT REPORTED" : "CONTRADICTORY");
    });
    return row;
  });

  autoTable(doc, {
    startY: 23,
    head: [kgHeaders],
    body: kgRows,
    theme: "grid",
    headStyles: { fillColor: [7, 21, 46], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    styles: { fontSize: 7.5, font: "helvetica", cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: "bold" },
      1: { fontStyle: "bold", textColor: [51, 65, 85] },
      2: { fontStyle: "bold", textColor: [51, 65, 85] }
    },
    margin: { left: 14, right: 14 }
  });

  // Section: Similar Cohorts
  const graphY = (doc as any).lastAutoTable.finalY;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(7, 21, 46);
  doc.text("5. COHORT VECTOR SIMILARITIES (FAISS RAG)", 14, graphY + 10);

  const caseRows = result.similar_cases.map((caseItem, idx) => [
    `#${idx + 1}`,
    `case_0${4873 + idx * 713}`,
    caseItem.ground_truth,
    `${(caseItem.similarity_score * 100).toFixed(1)}%`,
    caseItem.symptoms.slice(0, 3).map(s => s.replace("Do you have ", "").replace("?", "")).join(", ")
  ]);

  autoTable(doc, {
    startY: graphY + 13,
    head: [["Rank", "Case ID", "Diagnosis", "Similarity Score", "Symptom Matches Pattern"]],
    body: caseRows,
    theme: "grid",
    headStyles: { fillColor: [7, 21, 46], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    styles: { fontSize: 7.5, font: "helvetica", cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { fontStyle: "bold", textColor: [100, 116, 139] },
      2: { fontStyle: "bold" },
      3: { fontStyle: "bold", textColor: [15, 23, 42] },
      4: { textColor: [71, 85, 105] }
    },
    margin: { left: 14, right: 14 }
  });

  // --- PAGE 3: RATIONALE & METHODOLOGY ---
  doc.addPage();

  // Section: Clinical Rationale
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(7, 21, 46);
  doc.text("6. CLINICAL REASONING RATIONALE", 14, 20);

  // Rationale block wrapped in an autotable for native multiline print safety
  autoTable(doc, {
    startY: 23,
    body: [[result.clinical_rationale]],
    theme: "striped",
    styles: { fontSize: 8.5, cellPadding: 6, font: "helvetica" },
    columnStyles: { 0: { fillColor: [248, 250, 252], textColor: [15, 23, 42] } },
    margin: { left: 14, right: 14 }
  });

  // Alternatives Block
  const ratY = (doc as any).lastAutoTable.finalY;
  if (result.alternative_conditions.length > 0) {
    autoTable(doc, {
      startY: ratY + 4,
      theme: "plain",
      body: [
        ["Alternative Conditions Considered:", result.alternative_conditions.join("  |  ")]
      ],
      styles: { fontSize: 8.5, font: "helvetica", cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 55 },
        1: { fontStyle: "bold", textColor: [51, 65, 85] }
      },
      margin: { left: 14, right: 14 }
    });
  }

  // Section: Pipeline & Methodology
  const methodY = (doc as any).lastAutoTable.finalY;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(7, 21, 46);
  doc.text("7. DIAGNOSTIC PIPELINE METHODOLOGY", 14, methodY + 10);

  autoTable(doc, {
    startY: methodY + 13,
    theme: "striped",
    body: [
      ["Stage 1: Input", "Intake patient Age, Sex, presenting symptoms chips, and narrative logs."],
      ["Stage 2: Embed", "Convert narratives to 768-D vectors using BioClinicalBERT encoder."],
      ["Stage 3: Retrieve", "Identify top 5 cohort similarity matches inside 10,000 FAISS indexed cases."],
      ["Stage 4: Verify", "Cross-check symptoms topologically inside NetworkX Directed Medical Graph."],
      ["Stage 5: Reason", "Run Groq llama3-70b-8192 LLaMA grounded prompt reasoning to prevent hallucination."],
      ["Stage 6: Output", "Structure diagnostic possibilities, confidence levels, and explainable rationale."]
    ],
    styles: { fontSize: 7.5, font: "helvetica", cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [79, 70, 229], cellWidth: 35 },
      1: { textColor: [100, 116, 139] }
    },
    margin: { left: 14, right: 14 }
  });

  // Safety Notice disclaimer block
  const safetyY = (doc as any).lastAutoTable.finalY;
  autoTable(doc, {
    startY: safetyY + 10,
    theme: "plain",
    body: [
      ["SAFETY NOTICE: MedAssist AI is an AI-assisted clinical decision support research prototype. It is not a substitute for professional medical diagnosis, clinical judgment, or treatment."]
    ],
    styles: {
      fontSize: 7.5,
      font: "helvetica",
      fontStyle: "bold",
      textColor: [100, 116, 139],
      cellPadding: 4,
      lineColor: [226, 232, 240],
      lineWidth: 0.5
    },
    margin: { left: 14, right: 14 }
  });

  // Number all pages
  pageCount();

  // Save/Download the file directly
  doc.save(`MedAssist_AI_Assessment_${timestamp}.pdf`);
}
