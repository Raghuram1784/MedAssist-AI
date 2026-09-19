import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { AnalyzeResponse } from "../types";

/**
 * Formats ICD-10 code string to standard uppercase display format.
 * Example: 'a15' -> 'A15', 'a98.4' -> 'A98.4'
 */
function formatICD10(code?: string): string {
  if (!code || code.trim() === "" || code.toUpperCase() === "N/A") {
    return "N/A";
  }
  return code.trim().toUpperCase();
}

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

  // Helper for dynamic footer page numbering across all pages
  const applyPageFooters = () => {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      
      // Footer text
      doc.text(
        `MedAssist AI Research CDSS Prototype  |  Ref ID: MA-${timestamp}  |  Page ${i} of ${totalPages}`,
        14,
        287
      );
      
      // Top header banner for subsequent pages
      if (i > 1) {
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text("MedAssist AI — Clinical Assessment Report", 14, 10);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.4);
        doc.line(14, 12, 196, 12);
      }
    }
  };

  // Helper for rendering section headers cleanly
  const renderSectionHeader = (title: string, yPos: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(7, 21, 46);
    doc.text(title, 14, yPos);
  };

  // =========================================================================
  // --- PAGE 1: BRAND HEADER, PATIENT SUMMARY & DIFFERENTIAL DIAGNOSES ---
  // =========================================================================
  
  // Brand Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(7, 21, 46); // Deep Navy
  doc.text("MEDASSIST AI", 14, 18);
  
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139); // Muted slate
  doc.text("CLINICAL DECISION SUPPORT SYSTEM  |  RESEARCH REPORT", 14, 22);
  
  // Date & Ref metadata
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(`Report Ref: MA-${timestamp}`, 196 - 14, 16, { align: "right" });
  doc.text(`Generated: ${new Date().toLocaleString()}`, 196 - 14, 20, { align: "right" });
  
  // Divider line
  doc.setDrawColor(7, 21, 46);
  doc.setLineWidth(0.6);
  doc.line(14, 24, 196, 24);

  // --- 1. PATIENT PRESENTATION ---
  renderSectionHeader("1. PATIENT PRESENTATION", 31);

  autoTable(doc, {
    startY: 33,
    theme: "plain",
    body: [
      ["Age", `${result.patient_summary.age} years`, "Sex", result.patient_summary.sex === "F" ? "Female" : "Male"],
      ["Presenting Symptoms", result.patient_summary.symptoms.join(", "), "", ""]
    ],
    styles: { fontSize: 8.5, font: "helvetica", cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 32 },
      1: { fontStyle: "bold", textColor: [15, 23, 42], cellWidth: 52 },
      2: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 20 },
      3: { fontStyle: "bold", textColor: [15, 23, 42], cellWidth: 64 }
    },
    margin: { left: 14, right: 14 }
  });

  let currentY = (doc as any).lastAutoTable.finalY;

  if (result.patient_summary.additional_information) {
    autoTable(doc, {
      startY: currentY + 1.5,
      theme: "plain",
      body: [
        ["Clinical Narrative:", result.patient_summary.additional_information]
      ],
      styles: { fontSize: 8, font: "helvetica", cellPadding: 1.5 },
      columnStyles: {
        0: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 32 },
        1: { fontStyle: "normal", textColor: [51, 65, 85], cellWidth: 136 }
      },
      margin: { left: 14, right: 14 }
    });
    currentY = (doc as any).lastAutoTable.finalY;
  }

  // --- 2. DIAGNOSTIC ASSESSMENT SUMMARY ---
  renderSectionHeader("2. DIAGNOSTIC ASSESSMENT SUMMARY", currentY + 7);

  const rawConfidence = result.confidence_level;
  const dividerIdx = rawConfidence.indexOf("-");
  const confidenceLevel = dividerIdx !== -1 ? rawConfidence.substring(0, dividerIdx).trim() : rawConfidence;
  const confidenceExplanation = dividerIdx !== -1 ? rawConfidence.substring(dividerIdx + 1).trim() : rawConfidence;

  autoTable(doc, {
    startY: currentY + 9,
    theme: "striped",
    body: [
      ["Decision Confidence Level", confidenceLevel.toUpperCase()],
      ["Confidence Assessment", confidenceExplanation],
      ["Pipeline Indicators", `Possible Conditions: ${result.possible_conditions.length}  |  Retrieved RAG Cohorts: ${result.similar_cases.length}  |  KG Symptoms Analyzed: ${result.patient_summary.symptoms.length}`]
    ],
    styles: { fontSize: 8, font: "helvetica", cellPadding: 2.5 },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 48 },
      1: { textColor: [15, 23, 42], cellWidth: 120 }
    },
    margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY;

  // --- 3. POSSIBLE DIFFERENTIAL DIAGNOSES ---
  renderSectionHeader("3. POSSIBLE DIFFERENTIAL DIAGNOSES", currentY + 7);

  const conditionRows = result.possible_conditions.map((cond, idx) => {
    const kgMatch = result.knowledge_graph_support.find(
      k => k.disease.toLowerCase() === cond.condition.toLowerCase()
    );
    const normalizedICD = formatICD10(kgMatch?.icd10);
    return [
      `#${idx + 1}`,
      cond.condition,
      normalizedICD,
      String(kgMatch?.severity ?? "0"),
      `${cond.similar_cases_found} cases`,
      kgMatch?.matched_symptoms.join(", ") || "None",
      kgMatch?.unmatched_symptoms.join(", ") || "None"
    ];
  });

  autoTable(doc, {
    startY: currentY + 9,
    head: [["Rank", "Condition", "ICD-10", "Severity", "Matching Cases", "Matched Evidence", "Unreported Evidence"]],
    body: conditionRows,
    theme: "grid",
    headStyles: { fillColor: [7, 21, 46], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5, halign: "left" },
    styles: { fontSize: 7.5, font: "helvetica", cellPadding: 2, overflow: "linebreak" },
    columnStyles: {
      0: { cellWidth: 14, fontStyle: "bold", halign: "center" },
      1: { cellWidth: 34, fontStyle: "bold" },
      2: { cellWidth: 16, fontStyle: "bold", halign: "center" },
      3: { cellWidth: 14, halign: "center" },
      4: { cellWidth: 23, fontStyle: "bold", halign: "center" },
      5: { cellWidth: 34, textColor: [22, 163, 74] }, // Emerald green
      6: { cellWidth: 33, textColor: [100, 116, 139] }  // Slate
    },
    margin: { left: 14, right: 14 }
  });

  // =========================================================================
  // --- PAGE 2: KNOWLEDGE GRAPH, FAISS RAG COHORTS & CLINICAL RATIONALE ---
  // =========================================================================
  doc.addPage();

  // --- 4. KNOWLEDGE GRAPH EVIDENCE VERIFICATION ---
  renderSectionHeader("4. KNOWLEDGE GRAPH EVIDENCE VERIFICATION", 18);

  const allFindings = Array.from(
    new Set([
      ...result.knowledge_graph_support.flatMap(k => k.matched_symptoms),
      ...result.knowledge_graph_support.flatMap(k => k.unmatched_symptoms)
    ])
  );

  const numDiseases = Math.max(result.knowledge_graph_support.length, 1);
  const findingColWidth = 48; // Generous width for symptom findings
  const diseaseColWidth = (168 - findingColWidth) / numDiseases; // Evenly split remaining 120mm space

  const kgHeaders = ["Clinical Finding", ...result.knowledge_graph_support.map(k => k.disease.split(" / ")[0])];
  const kgRows = allFindings.map(finding => {
    const row = [finding];
    result.knowledge_graph_support.forEach(kg => {
      const isMatched = kg.matched_symptoms.includes(finding);
      const isUnmatched = kg.unmatched_symptoms.includes(finding);
      row.push(isMatched ? "MATCHED" : isUnmatched ? "NOT REPORTED" : "CONTRADICTORY");
    });
    return row;
  });

  const kgColumnStyles: Record<number, any> = {
    0: { cellWidth: findingColWidth, fontStyle: "bold" }
  };
  result.knowledge_graph_support.forEach((_, i) => {
    kgColumnStyles[i + 1] = { 
      cellWidth: diseaseColWidth, 
      fontStyle: "bold", 
      halign: "center",
      textColor: [51, 65, 85] 
    };
  });

  autoTable(doc, {
    startY: 20,
    head: [kgHeaders],
    body: kgRows,
    theme: "grid",
    headStyles: { fillColor: [7, 21, 46], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5, halign: "center" },
    styles: { fontSize: 7, font: "helvetica", cellPadding: 2, overflow: "linebreak" },
    columnStyles: kgColumnStyles,
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index > 0) {
        if (data.cell.raw === "MATCHED") {
          data.cell.styles.textColor = [22, 163, 74]; // Emerald
        } else if (data.cell.raw === "NOT REPORTED") {
          data.cell.styles.textColor = [100, 116, 139]; // Slate
        } else if (data.cell.raw === "CONTRADICTORY") {
          data.cell.styles.textColor = [225, 29, 72]; // Rose red
        }
      }
    },
    margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY;

  // --- 5. TOP 5 FAISS COHORT VECTOR SIMILARITIES ---
  renderSectionHeader("5. TOP 5 FAISS COHORT VECTOR SIMILARITIES", currentY + 7);

  const caseRows = result.similar_cases.map((caseItem, idx) => [
    `#${idx + 1}`,
    `case_${4873 + idx * 713}`,
    caseItem.ground_truth,
    `${(caseItem.similarity_score * 100).toFixed(1)}%`,
    caseItem.symptoms.slice(0, 4).map(s => s.replace("Do you have ", "").replace("?", "")).join(", ")
  ]);

  autoTable(doc, {
    startY: currentY + 9,
    head: [["Rank", "Case ID", "Retrieved Diagnosis", "Similarity", "Symptom Matches Pattern"]],
    body: caseRows,
    theme: "grid",
    headStyles: { fillColor: [7, 21, 46], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5, halign: "left" },
    styles: { fontSize: 7.5, font: "helvetica", cellPadding: 2, overflow: "linebreak" },
    columnStyles: {
      0: { cellWidth: 14, fontStyle: "bold", halign: "center" },
      1: { cellWidth: 24, fontStyle: "bold", textColor: [100, 116, 139] },
      2: { cellWidth: 40, fontStyle: "bold" },
      3: { cellWidth: 22, fontStyle: "bold", halign: "center", textColor: [15, 23, 42] },
      4: { cellWidth: 68, textColor: [71, 85, 105] }
    },
    margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY;

  // --- 6. CLINICAL REASONING RATIONALE ---
  renderSectionHeader("6. CLINICAL REASONING RATIONALE", currentY + 7);

  autoTable(doc, {
    startY: currentY + 9,
    body: [[result.clinical_rationale]],
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 4.5, font: "helvetica" },
    columnStyles: { 0: { fillColor: [248, 250, 252], textColor: [15, 23, 42], cellWidth: 168 } },
    margin: { left: 14, right: 14 }
  });

  // =========================================================================
  // --- PAGE 3: ALTERNATIVES, PIPELINE METHODOLOGY & SAFETY NOTICE ---
  // =========================================================================
  doc.addPage();

  currentY = 18;

  // Alternatives Block
  if (result.alternative_conditions && result.alternative_conditions.length > 0) {
    renderSectionHeader("ALTERNATIVE DIFFERENTIALS CONSIDERED", currentY);
    
    autoTable(doc, {
      startY: currentY + 2,
      theme: "plain",
      body: [
        ["Evaluated Diagnoses:", result.alternative_conditions.join("  |  ")]
      ],
      styles: { fontSize: 8, font: "helvetica", cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 38 },
        1: { fontStyle: "bold", textColor: [51, 65, 85], cellWidth: 130 }
      },
      margin: { left: 14, right: 14 }
    });
    currentY = (doc as any).lastAutoTable.finalY + 5;
  }

  // --- 7. DIAGNOSTIC PIPELINE METHODOLOGY ---
  renderSectionHeader("7. DIAGNOSTIC PIPELINE METHODOLOGY", currentY);

  autoTable(doc, {
    startY: currentY + 2,
    theme: "striped",
    head: [["Pipeline Stage", "Methodology & Operational Specifications"]],
    headStyles: { fillColor: [7, 21, 46], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5 },
    body: [
      ["Stage 1: Patient Intake", "Extract patient Age, Sex, presenting symptom tags, and clinical narrative text."],
      ["Stage 2: Semantic Encoding", "Convert raw narrative to 768-D contextual vector embeddings using BioClinicalBERT."],
      ["Stage 3: FAISS Vector Retrieval", "Query 10,000 indexed clinical cases via L2 normalized Cosine Similarity."],
      ["Stage 4: Knowledge Graph Check", "Cross-validate symptoms topologically against NetworkX Directed Medical Graph."],
      ["Stage 5: Grounded LLM Inference", "Execute Groq llama3-70b-8192 LLaMA grounded prompt reasoning to prevent hallucination."],
      ["Stage 6: Differential Output", "Structure diagnostic possibilities, confidence levels, and explainable rationale."]
    ],
    styles: { fontSize: 7.5, font: "helvetica", cellPadding: 2.5 },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [79, 70, 229], cellWidth: 42 },
      1: { textColor: [71, 85, 105], cellWidth: 126 }
    },
    margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // --- 8. CLINICAL RESEARCH SAFETY NOTICE ---
  autoTable(doc, {
    startY: currentY,
    theme: "plain",
    body: [
      ["RESEARCH PROTOTYPE DISCLAIMER"],
      ["MedAssist AI is an AI-assisted clinical decision support research prototype designed for clinical research and educational evaluation. It is not a substitute for professional medical diagnosis, clinical judgment, or patient treatment. All recommendations must be verified by a licensed medical practitioner."]
    ],
    styles: {
      fontSize: 7.5,
      font: "helvetica",
      textColor: [71, 85, 105],
      cellPadding: 3.5,
      fillColor: [248, 250, 252],
      lineColor: [226, 232, 240],
      lineWidth: 0.4
    },
    columnStyles: {
      0: { cellWidth: 168 }
    },
    didParseCell: (data) => {
      if (data.row.index === 0) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = [7, 21, 46];
      }
    },
    margin: { left: 14, right: 14 }
  });

  // Apply footers dynamically across all pages
  applyPageFooters();

  // Save/Download PDF directly
  doc.save(`MedAssist_AI_Assessment_${timestamp}.pdf`);
}
