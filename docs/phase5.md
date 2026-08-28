# Phase 5: Full-Stack Web Application Construction

This document details the design, implementation, and integration of the full-stack web application layers for the **MedAssist AI** clinical decision support platform.

---

## 1. Phase 5 Objective
The goal of Phase 5 is to transition the standalone medical research scripts built during Phases 1–4 into a cohesive, high-performance, and explainable full-stack application. 

This is achieved by implementing:
1. A **FastAPI Backend Server** that initializes BioClinicalBERT models and Knowledge Graph pickle files exactly once at startup, exposing type-safe Pydantic APIs for clinical analyzes.
2. A **React + TypeScript Frontend Portal** using Vite and Tailwind CSS. The interface provides searchable symptom badges, interactive loading skeletons, differential diagnostic charts, and visual reasoning paths.

---

## 2. System Architecture & Request Flow

The clinical dataflow follows a strict grounding path to ensure evidence-based reasoning:

```
[ User/Doctor Intake ]
        ↓ (Age, Sex, Symptom Badges, Narrative Notes)
[ React + TypeScript Frontend ]
        ↓ (POST /api/analyze JSON payload)
[ FastAPI Application Server ]
        ↓ (Passes specs to Singleton instance)
[ ClinicalReasoningSystem Orchestration ]
        ↓
   ├── [ BioClinicalBERT + FAISS Vector DB ] ➜ retrieves top 5 cohort similarity matches
   └── [ Directed NetworkX Knowledge Graph ] ➜ cross-checks symptoms for candidate diseases
        ↓
   [ Grounded Prompts Context Compilation ]
        ↓ (Iterative token safety limits applied)
   [ Groq LLM Inference API ]
        ↓ (Enforces differential diagnosis schema)
[ Structured JSON Reasoning Output ]
        ↓ (Pydantic type-safe verification)
[ React Explainability Dashboard ]
```

---

## 3. API Documentation

### 3.1. Health Check
* **Endpoint**: `GET /health`
* **Purpose**: Verifies that the API service is online and ready.
* **Response Schema (`200 OK`)**:
  ```json
  {
    "status": "healthy",
    "service": "MedAssist AI"
  }
  ```

### 3.2. Clinical Analyze
* **Endpoint**: `POST /api/analyze`
* **Purpose**: Submits patient demography and presenting symptoms, retrieves matching cases, queries graph overlaps, executes Groq inference, and returns grounded differentials.
* **Request Schema (`AnalyzeRequest`)**:
  ```json
  {
    "age": 49,
    "sex": "F",
    "symptoms": [
      "Fever",
      "Cough",
      "Breathing difficulty"
    ],
    "additional_information": "Symptoms started 3 days ago, accompanied by mild fatigue."
  }
  ```
* **Response Schema (`AnalyzeResponse`)**:
  ```json
  {
    "patient_summary": {
      "age": 49,
      "sex": "F",
      "symptoms": ["Fever", "Cough", "Breathing difficulty"],
      "additional_information": "Symptoms started 3 days ago, accompanied by mild fatigue."
    },
    "possible_conditions": [
      {
        "condition": "Bronchiectasis",
        "supporting_evidence": ["Cough", "Breathing difficulty", "Fever"],
        "similar_cases_found": 3
      },
      {
        "condition": "Acute COPD exacerbation / infection",
        "supporting_evidence": ["Cough", "Breathing difficulty", "Fever"],
        "similar_cases_found": 1
      }
    ],
    "alternative_conditions": [
      "Community-acquired pneumonia",
      "Acute viral bronchitis",
      "COVID-19 infection",
      "Asthma exacerbation"
    ],
    "confidence_level": "Medium",
    "clinical_rationale": "Explanation detailing symptom matches against Knowledge Graph indicators...",
    "knowledge_graph_support": [
      {
        "disease": "Bronchiectasis",
        "icd10": "J47",
        "severity": 3,
        "matched_symptoms": ["Cough", "Breathing difficulty"],
        "unmatched_symptoms": ["Cough with colored sputum", "Coughing up blood"],
        "explanation": "The pathology 'Bronchiectasis' is clinically connected to..."
      }
    ],
    "similar_cases": [
      {
        "ground_truth": "Bronchiectasis",
        "similarity_score": 0.8872,
        "symptoms": ["Shortness of breath", "Cough"]
      }
    ]
  }
  ```

---

## 4. How Existing Phases are Reused

The FastAPI backend functions exclusively as the orchestration layer:
* **Startup Event (Lifespan)**: During server startup, the application loads the **BioClinicalBERT encoder weights**, instantiates the **FAISS case retriever index**, and loads the serialized NetworkX **medical graph pickle**. These are configured globally in `app.state.reasoning_system`.
* **No Logic Duplication**: All queries are sent directly to `ClinicalReasoningSystem.generate_clinical_reasoning()`. The backend parses this result directly into Pydantic models.

---

## 5. Deployment & Execution Instructions

### 5.1. Start Backend Server
Run the FastAPI application from the project root directory:
```bash
# Activate virtual environment and launch uvicorn
.venv\Scripts\python.exe -m uvicorn backend.api.main:app --port 8000
```
The server will initialize models and start listening at `http://localhost:8000`.

### 5.2. Start Frontend Server
Navigate to the `frontend/` directory, install packages, and launch Vite dev server:
```bash
cd frontend
npm install
npm run dev
```
The application will launch at `http://localhost:5173/`.

---

## 6. Verification & Automated Tests

To run automated checks verifying endpoint structures and model retrievals:
```bash
.venv\Scripts\python.exe backend/api/test_api.py
```
This executes health checks, demographics validation limits (rejecting invalid ages and sex values), and triggers the end-to-end clinical reasoning pipelines for our test queries.
