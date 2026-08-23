# MedAssist AI - Phase 3: Medical Knowledge Graph Construction

This document details the design, mapping rules, queries, and verification results of the Medical Knowledge Graph layer implemented in Phase 3.

---

## 1. Goal & Rationale

While vector retrieval (RAG) finds similar cases based on overall text semantics, it does not explicitly capture structured, logical rules between pathologies and clinical signs.

### The Purpose
The **Medical Knowledge Graph (KG)** maps explicit, verified clinical relationships between diseases and evidence concepts. This structured representation serves to:
* **Validate LLM diagnostic decisions** by checking if its recommendations match clinical facts.
* **Explain diagnostic recommendations** by tracing why specific symptoms connect to a target pathology.
* **Anchor medical reasoning** by checking overlapping features between the active patient and candidate diseases.

---

## 2. Graph Node & Edge Design

We use a directed graph representation (`nx.DiGraph()`) from `NetworkX`.

```text
┌─────────────────────────────────┐
│          Disease Node           │
│  ID: "Pneumonia"                │
│  type: "disease"                │
│  icd10: "J18"                   │
│  severity: 3                    │
└────────────────┬────────────────┘
                 │
                 │ Edge Attributes:
                 │ - relation: "has_symptom"
                 │ - weight: 1.0 (default)
                 ▼
┌─────────────────────────────────┐
│          Symptom Node           │
│  ID: "Fever"                    │
│  type: "symptom"                │
│  evidence_id: "E_91"            │
│  description: "Do you have..."  │
└─────────────────────────────────┘
```

### Directed Edge Direction
Edges point directedly from **Disease to Symptom/Evidence**:
$$\text{Disease} \xrightarrow{\text{has\_symptom}} \text{Symptom}$$
This directed structure represents the causal model of disease pathophysiology (diseases cause symptoms) and allows for flexible future traversal paths (such as calculating incoming symptom intersections).

---

## 3. Symptom Label Cleaning Algorithm

DDXPlus metadata represents symptoms as long questions (e.g., *"Do you have a fever (either felt or measured with a thermometer)?"*). Storing these questions directly as node IDs leads to messy layouts and poor LLM prompt formatting.

### Cleaning Strategy
1. **Custom Map**: Standard, critical symptom codes are resolved to direct labels:
   * `E_91` -> `"Fever"`
   * `E_201` -> `"Cough"`
   * `E_66` -> `"Breathing difficulty"`
   * `E_82` -> `"Dizziness / faintness"`
   * `E_148` -> `"Nausea / vomiting"`
2. **Regex Prefix Cleanup**: Any other symptom query is parsed dynamically by stripping leading phrases (case-insensitive) like:
   - *"Do you have "*
   - *"Have you noticed "*
   - *"Are you experiencing "*
   - *"Is your "*
   - *Trailing question marks `?`*
   This converts *"Do you have a sore throat?"* to *"Sore throat"* automatically.

---

## 4. Query API Interfaces (`graph_queries.py`)

1. **`get_symptoms_for_disease(graph, disease)`**:
   - Queries the successors of a disease node case-insensitively, returning the list of associated symptoms.
2. **`get_related_diseases(graph, symptom)`**:
   - Queries the predecessors of a symptom node case-insensitively, returning all conditions that can cause it.
3. **`get_disease_explanation(graph, disease, symptoms)`**:
   - Calculates the overlap between a target list of active symptoms and the disease node's outgoing symptom edges, returning a structured clinical explanation:
     > *"The pathology 'Pneumonia' (ICD-10: j17, j18, Severity Level: 3) is clinically connected to your presentation of: Fever, Cough. According to the medical knowledge graph, Pneumonia is associated with a total of 27 symptoms, including: Fever, Cough, Breathing difficulty... Other findings supporting this diagnosis may include: Pain with deep breath."*

---

## 5. Verification Metrics

* **Nodes Created**: **271** (49 Disease nodes and 222 Symptom/Evidence nodes).
* **Edges Created**: **888** directed relationships.
* **Verification Status**: All query, lookup, directionality, and explanation assertions pass successfully in the test suite ([`test_knowledge_graph.py`](file:///c:/Users/Raghu%20Ram/Desktop/AI-CDSS/backend/scripts/test_knowledge_graph.py)).
