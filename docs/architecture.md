# MedAssist AI - System Architecture

This document describes the high-level architecture, patient data flow, and AI pipeline designs of the MedAssist AI Decision Support System.

---

## 1. System Architecture

MedAssist AI utilizes a modular, retrieval-augmented design consisting of three primary layers:

```text
┌────────────────────────────────────────────────────────┐
│                   Clinical Front-End                   │
│   (React + TypeScript Interactive Doctor Dashboard)   │
└───────────────────────────┬────────────────────────────┘
                            │ API Request (JSON Cases)
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Back-End API Layer                   │
│         (Python + FastAPI Clinical Web Server)         │
└───────────────────────────┬────────────────────────────┘
                            │ Modular Invocation
                            ▼
┌────────────────────────────────────────────────────────┐
│                   AI/ML Engine Layer                   │
│                                                        │
│  ┌──────────────────────┐    ┌──────────────────────┐  │
│  │   Clinical Narrative  │    │  BioClinicalBERT     │  │
│  │   Pipeline (Phase 1)  │───>│  Encoder (Phase 2)   │  │
│  └──────────────────────┘    └──────────┬───────────┘  │
│                                         │ Dense Vector  │
│                                         ▼              │
│  ┌──────────────────────┐    ┌──────────────────────┐  │
│  │  Knowledge Graph     │    │  FAISS Vector Store  │  │
│  │  Reasoning (Phase 3) │    │  Cohort Match (Ph 2) │  │
│  └──────────┬───────────┘    └──────────┬───────────┘  │
│             │                           │              │
│             └─────────────┬─────────────┘              │
│                           ▼                            │
│              ┌─────────────────────────┐               │
│              │   Diagnostic LLM        │               │
│              │   In-Context Grounder   │               │
│              └─────────────────────────┘               │
└────────────────────────────────────────────────────────┘
```

### Layer Rationale
1. **Clinical Front-End**: Provides an intuitive user interface for doctors to input patient parameters (symptoms, history, demographics) and inspect explainable diagnostic predictions.
2. **Back-End API**: Serves as the high-throughput connector orchestration layer, managing data flows and running unit tests.
3. **AI/ML Engine Layer**: The reasoning core of the system. It uses vector similarity matches to anchor the LLM, preventing hallucination by feeding it real clinical history.

---

## 2. Clinical Data Flow

```text
[Input Case Data]
      │
      ▼
(Data Parser & Translator) ──> Reconstructs codes into a natural clinical narrative
      │
      ▼
(Sentence Embedding)       ──> Encodes narrative using BioClinicalBERT + Mean Pooling
      │
      ▼
(L2 Vector Normalization)  ──> Standardizes vectors for Cosine Similarity
      │
      ▼
(FAISS Search Query)       ──> Scans the IndexFlatIP database for similar case cohorts
      │
      ▼
(Context Prompt Assembly)  ──> Merges patient narrative with the top 5 retrieved cases
      │
      ▼
(Diagnostic LLM Execution) ──> Generates differential recommendations and explanations
```

---

## 3. The AI Processing Pipeline

1. **Narrative Construction**: Unpacks clinical signs, demographic values, and patient risk factors into structured textual narratives.
2. **Vector Space Encoding**: Uses BioClinicalBERT to map text descriptions into a dense 768-dimensional vector space. Mean pooling is applied across sequence length with attention mask mapping.
3. **High-Performance Retrieval**: Uses Facebook AI Similarity Search (FAISS) with Inner Product metric flat indexes (`IndexFlatIP`). The matching is done in sub-milliseconds on CPU.
4. **Knowledge Graph Graph-Overlay**: (Future Phase) Applies a NetworkX pathology-symptom graph to verify if the LLM recommendations match structured clinical rules.
5. **Generative Diagnosis Grounding**: Merges retrieved similarity vectors as medical contexts into generative model prompts, guiding reasoning via actual patient cohorts.
