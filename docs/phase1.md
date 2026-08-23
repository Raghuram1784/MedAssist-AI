# MedAssist AI - Phase 1: Clinical Preprocessing & Translation Pipeline

This document explains the parser design, translation logic, and preprocessing pipeline implemented in Phase 1 of the MedAssist AI system.

---

## 1. The DDXPlus Dataset Analysis

DDXPlus is a highly structured, synthetic dataset containing patient case records designed for clinical decision support systems.

* **Pathologies**: Includes 49 unique medical conditions.
* **Evidences**: Contains 223 distinct evidence keys mapping to:
  * **Symptoms (110)**: Physical signs reported by the patient (e.g. cough, chest pain, fever).
  * **Antecedents (113)**: Patient risk factors, family history, and demographics (e.g. hiatal hernia, alcohol consumption, pregnancy).
* **Evidence Value Formats**:
  * **Binary (B)**: Simple boolean presence ('Yes' / 'No').
  * **Categorical (C)**: Single choice options.
  * **Multi-Choice (M)**: Multiple options from a checklist (e.g., pain character, pain location).
  * **Scale (V)**: Integer scaling values (e.g., pain intensity scale of `0-10`).

---

## 2. Low-Memory Streaming Parser

Loading the raw `train.csv` dataset (670+ MB, 1 million+ cases) into memory all at once can consume up to 4–6 GB of RAM, causing system slowdowns or out-of-memory errors on typical deployment environments.

### Streaming Solution (`parser.py`)
* We implemented `stream_cases`, a generator function that reads CSV data in chunks using Python's iterator interface.
* Using Pydantic models (`PatientCase`), each row is validated on-the-fly, converted to clean typing, and yielded. This maintains a **constant, low memory profile** (under 100MB RAM) regardless of dataset size.

---

## 3. Evidence Translation & Narrative Generation

Raw patient records are represented in abstract codes (e.g. `E_53` for cough, `V_181` for pain scale). For explainable AI and semantic vector search, these must be translated into natural medical English.

### Translation Logic (`translator.py`)
1. **Metadata Loading**: Loads `release_conditions.json` and `release_evidences.json` to resolve abstract codes to English questions and value options.
2. **Value Conversion**:
   - Converts boolean values into `Yes` or `No` statements.
   - Maps scales to fractions (e.g. `6` becomes `6/10`).
   - Parses multi-choice arrays (e.g., identifying pain location as `lower chest` and `upper chest`).
3. **Structured Translation Separation**:
   - Isolates active **Symptoms** from background **Antecedents/Risk Factors**.
4. **Clinical Narrative Synthesis**: Combines all demographics, symptoms, and medical history into a coherent clinical note format:
   > *"The patient is a 49-year-old female. She presents for a consultation, reporting 'Yes' for the initial symptom query: 'Do you have a cough?'. She presents with the following clinical symptoms: reports burning pain in lower/upper chest rated 6/10. Her medical history and risk factors include: has history of a hiatal hernia; indicates 'No' for travel history."*

---

## 4. Pipeline Execution Script

The [`preprocess.py`](file:///c:/Users/Raghu%20Ram/Desktop/AI-CDSS/backend/scripts/preprocess.py) execution engine coordinates Phase 1:
* Streams CSV rows, translates them to structured clinical notes, and outputs them into compressed, fast-reading JSONLines (`.jsonl`) files.
* Includes a `--sample-size` argument (defaulting to 10,000 cases for training and 2,000 cases for test/validation splits) for quick, reproducible local iterations.
* Processes raw data at a high-performance speed of **~2,900 records per second**.
