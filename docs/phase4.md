# MedAssist AI - Phase 4: LLM Reasoning Layer

This document details the engineering design, prompt structure, API client routing, and verification metrics for the LLM Reasoning Layer.

---

## 1. Goal & Rationale

Large Language Models (LLMs) used as standalone diagnostic systems are prone to hallucinations, lack clinical evidence grounding, and do not explain their reasoning against local hospital cases or structured clinical guidelines.

### The CDSS Hybrid Architecture
In **Phase 4**, the LLM acts exclusively as a **reasoning and explainability layer** rather than a diagnosis model. It merges three evidence paths:
1. **Patient Context**: Demographics, presenting symptoms, and clinical narrative.
2. **FAISS Retrieval (RAG)**: The top 5 similar historical patient cases matching the query.
3. **Clinical Knowledge Graph (KG)**: Outgoing disease-symptom maps for candidates retrieved by FAISS.

```text
Patient Symptoms
        │
        ├──────────────────────────────┐
        ▼                              ▼
 ┌──────────────┐              ┌──────────────┐
 │ FAISS Search │              │  NetworkX KG │
 └──────┬───────┘              └──────┬───────┘
        │                             │
        │ similar cases               │ candidate guidelines
        └──────────────┬──────────────┘
                       ▼
            ┌──────────────────────┐
            │ Grounded Prompt      │
            │ (Context-Restricted) │
            └──────────┬───────────┘
                       ▼
            ┌──────────────────────┐
            │   Groq LLM Client    │
            │   (groq/compound)    │
            └──────────┬───────────┘
                       ▼
            ┌──────────────────────┐
            │ Structured JSON Output│
            └──────────────────────┘
```

---

## 2. Environment Configuration & Safety

* **Environment Separation**: API keys and model parameters are kept in `.env` and loaded using `python-dotenv`.
* **Configurable Model Routing**: The prompt client retrieves the target model via `GROQ_MODEL=groq/compound` directly from `.env`, keeping the codebase model-agnostic.
* **Exclusions**: The `.env` file is excluded from commits via `.gitignore`, while a placeholder `.env.example` is committed.

---

## 3. Prompts & Instructions

### Prompt Constraints
The system prompt enforces strict rules on the model:
* Must base rationale **only** on RAG similar cases and KG mappings.
* Must not make unsupported clinical claims.
* Must provide differential diagnosis options instead of stating a single definitive diagnosis.
* Must explicitly state uncertainty when evidence is missing.

### Output JSON Schema
```json
{
    "possible_conditions": [
        {
            "condition": "Name of the condition",
            "supporting_evidence": ["Symptom A", "Symptom B"],
            "similar_cases_found": 3
        }
    ],
    "alternative_conditions": ["Alternative A", "Alternative B"],
    "knowledge_graph_support": ["KG findings description"],
    "confidence_level": "High/Medium/Low - explain reasoning",
    "explanation": "Natural language rationale..."
}
```

---

## 4. End-to-End Pipeline Execution Results

The pipeline is verified using [`test_llm_reasoning.py`](file:///c:/Users/Raghu%20Ram/Desktop/AI-CDSS/backend/scripts/test_llm_reasoning.py).

### Test Case 1: 49 year old female with fever, cough and breathing difficulty
* **FAISS Retrieval**: Retrieved Bronchiectasis cases (4 matches) and Acute COPD exacerbation cases (1 match).
* **KG Support**: Queried graph relations for Bronchiectasis (ICD-10 `J47`, severity 3) and Acute COPD exacerbation (ICD-10 `j44.1`, severity 3).
* **LLM Completion (JSON)**:
  ```json
  {
      "possible_conditions": [
          {
              "condition": "Bronchiectasis",
              "supporting_evidence": ["Fever", "Cough", "Breathing difficulty"],
              "similar_cases_found": 4
          },
          {
              "condition": "Acute COPD exacerbation / infection",
              "supporting_evidence": ["Fever", "Cough", "Breathing difficulty"],
              "similar_cases_found": 1
          }
      ],
      "alternative_conditions": ["Pneumonia", "Influenza"],
      "confidence_level": "Medium",
      "explanation": "The patient's fever, cough, and breathing difficulty overlap with both Bronchiectasis and Acute COPD exacerbation, which are the most common diagnoses among the retrieved cases. The Knowledge Graph confirms that the core symptoms are present for both, yet key distinguishing features (hemoptysis/colored sputum for bronchiectasis; wheeze/colored sputum for COPD) are absent, reducing certainty. Therefore, a medium confidence is assigned."
  }
  ```

### Test Case 2: Patient with chest pain and cough
* **Symptom Mapping**: Normalizes symptoms to graph nodes `"Pain"`, `"Cough"`.
* **FAISS Retrieval**: Retrieved Acute COPD cases (3 matches) and Bronchiectasis cases (2 matches).
* **LLM Completion (JSON)**:
  ```json
  {
      "possible_conditions": [
          {
              "condition": "Bronchiectasis",
              "supporting_evidence": ["Cough"],
              "similar_cases_found": 2
          },
          {
              "condition": "Acute COPD exacerbation / infection",
              "supporting_evidence": ["Cough"],
              "similar_cases_found": 3
          }
      ],
      "alternative_conditions": ["Other respiratory infections", "Pneumonia"],
      "confidence_level": "Medium",
      "explanation": "The patient's symptoms of pain and cough align with both Bronchiectasis and Acute COPD. The RAG evidence includes several similar cases for each, and the KG confirms a match on cough while noting missing additional characteristic symptoms (colored sputum, wheezing, hemoptysis). Moderate confidence is assigned."
  }
  ```
