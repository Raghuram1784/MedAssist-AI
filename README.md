# MedAssist AI

MedAssist AI is an explainable, retrieval-augmented clinical decision support system (CDSS) designed to assist healthcare professionals by retrieving highly relevant historical clinical cases and generating grounded diagnostic recommendations.

## 📋 Overview

### The Problem
Healthcare professionals face immense cognitive load when analyzing complex patient histories. Standard AI solutions are often black boxes, making suggestions without explanation or historical grounding. This can lead to decreased trust and a higher risk of clinical errors.

### The Solution
MedAssist AI addresses this gap by combining:
* **Clinical NLP**: Parsing complex symptom presentations into structured medical narratives.
* **Retrieval-Augmented Generation (RAG)**: Anchoring diagnoses by retrieving similar historical patient cohorts.
* **BioClinicalBERT Embeddings**: Computing highly specialized medical semantic representations.
* **FAISS Vector Search**: Running high-speed cosine similarity match queries.
* **Medical Knowledge Graphs**: Performing multi-hop reasoning over pathological relationships (Future Phase).
* **LLM Explainable Diagnostic Reasoning**: Grounding clinical recommendations to prevent hallucinations (Future Phase).

---

## 🏗️ Architecture

```text
       Patient Symptoms (Raw Inputs)
                   │
                   ▼
     Clinical Narrative Generation
                   │
                   ▼
     BioClinicalBERT Text Encoding
                   │
                   ▼
        L2 Vector Normalization
                   │
                   ▼
      FAISS Clinical Case Retrieval (Cosine Similarity)
                   │
                   ▼
     Knowledge Graph Multi-Hop Reasoning  <── [Future Phase]
                   │
                   ▼
      LLM Explainable Diagnostic Support  <── [Future Phase]
```

---

## 🚀 Completed Development Phases

### Phase 1: Clinical Narrative & Preprocessing Pipeline
* Designed a clinical evidence parser to read case records.
* Implemented a translation system converting raw codes (e.g., symptom query keys) to natural English medical narrative summaries.
* Built a pipeline streaming large datasets (`train.csv`, `test.csv`) to JSONLines format in a low memory profile.

### Phase 2: RAG Retrieval & FAISS Indexing Layer
* Integrated `Emilyalsentzer/Bio_ClinicalBERT` to generate clinical sentence embeddings.
* Configured mean pooling with token attention masking and vector L2 normalization.
* Implemented a `faiss.IndexFlatIP` (Inner Product) search database representing exact Cosine Similarity.
* Applied bucket sorting optimizations by character length to minimize padding overhead, reducing CPU encoding time from 57 minutes to ~19 minutes.

### Phase 3: Medical Knowledge Graph Construction
* Constructed a directed Clinical Knowledge Graph (`nx.DiGraph()`) linking diseases to symptoms dynamically.
* Structured node metadata representing `icd10`, `severity`, `evidence_id`, and original English questions.
* Implemented a regex-based translation strategy resolving raw clinical queries to clean, normalized node labels (e.g., *"Sore throat"*).
* Developed query APIs retrieving symptoms for a disease, diseases for a symptom, and generating natural clinical explanations showing diagnostic overlaps.
* Serialized graph structure using `pickle` for sub-millisecond retrieval operations.

### Phase 4: LLM Reasoning Layer
* Integrated python SDK client with the `groq/compound` reasoning model.
* Engineered a dynamic prompt builder merging patient logs, similarity scores from 5 retrieved RAG cases, and structural facts from the Knowledge Graph.
* Enforced prompt constraints restricting the LLM to an advisory reasoning layer, banning standalone diagnostics.
* Structured parsing logic to clean completion tokens and deserialize compliant JSON output including a custom confidence level assessment.

---

## 🧠 LLM Reasoning Architecture

The reasoning pipeline grounds the LLM reasoning process using a double-barrier safety model (FAISS RAG + NetworkX Knowledge Graph):

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
            │ Explainable Clinical │
            │   Support Response   │
            └──────────────────────┘
```

### Why the LLM is Not Used Standalone
* **Hallucination Risk**: Standard LLMs fail by inventing non-existent conditions or fabricating symptoms to support incorrect diagnoses.
* **Lack of Local Context**: Standard LLMs lack awareness of local case logs or specific regional cohorts.
* **Ungrounded Explanations**: A standalone LLM outputting a diagnosis cannot verify its rationale against structured database rules.

### How RAG and the Knowledge Graph Prevent Hallucinations
1. **Semantic Anchoring**: FAISS retrieves actual historical cases of similar symptom patterns, restricting the LLM’s focus to conditions present in the local database.
2. **Structural Verification**: The Knowledge Graph queries candidate conditions to check if the patient's symptoms match ICD-10 templates. If the patient has a cough but lacks key antecedents (e.g., chest pain, smoking history), the graph flags this mismatch.
3. **Reasoned Confidence Estimation**: The LLM uses these inputs to justify a custom `confidence_level` (High/Medium/Low), explaining clinical uncertainty based on the retrieved evidence.

---

## 🛠️ Technology Stack
* **Language**: Python 3.14
* **AI/ML Layer**: PyTorch, Transformers, BioClinicalBERT, FAISS-CPU, Sentence-Transformers, NetworkX (Graph reasoning), Groq SDK (Reasoning agent)
* **Parsing/Data**: Pandas, Pydantic, JSONLines, python-dotenv
* **Testing Suite**: Pytest, TQDM

---

## 🚀 Quick Start

### 1. Setup Environment
Ensure you have Python installed, then clone the repository:
```bash
# Install dependencies
pip install -r backend/requirements.txt
```

Create a `.env` file at the project root matching the template in `.env.example`:
```env
GROK_API_KEY=your_groq_api_key_here
GROQ_MODEL=groq/compound
```

### 2. Run Preprocessing Pipeline
Preprocess a sample of 10,000 cases to build the training files:
```bash
python backend/scripts/preprocess.py --sample-size 10000
```

### 3. Compile FAISS Vector Database
Generate the semantic embeddings and populate the FAISS indexing layer:
```bash
python backend/scripts/build_vector_store.py
```

### 4. Verify Similarity Retrievals
Run the retriever verification test suite to check similarity queries:
```bash
python backend/scripts/test_retriever.py
```

### 5. Build and Verify Medical Knowledge Graph
Construct the knowledge graph and verify lookup APIs and clinical explanation text:
```bash
# Build the graph pickle
python backend/knowledge_graph/graph_builder.py

# Verify the queries
python backend/scripts/test_knowledge_graph.py
```

### 6. Verify End-to-End LLM Diagnostic Reasoning
Execute the CDSS reasoning pipeline combining RAG, KG lookup, and Groq API calls:
```bash
python backend/scripts/test_llm_reasoning.py
```

---

## 🔮 Future Roadmap
* **Phase 5**: Create a React + TypeScript frontend dashboard for clinical case queries and graph visualizations.
