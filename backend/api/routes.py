from fastapi import APIRouter, Request, HTTPException
from backend.api import schemas

router = APIRouter()

@router.post("/analyze", response_model=schemas.AnalyzeResponse)
async def analyze_case(payload: schemas.AnalyzeRequest, request: Request):
    """
    Intake patient demographics and symptoms, execute retrieval-augmented clinical reasoning,
    and return grounded diagnostic supports with explanations.
    """
    # 1. Retrieve the singleton ClinicalReasoningSystem instance from FastAPI state
    reasoning_system = getattr(request.app.state, "reasoning_system", None)
    if not reasoning_system:
        raise HTTPException(
            status_code=503,
            detail="CDSS Reasoning System is initializing. Please try again shortly."
        )

    try:
        # 2. Query the orchestration layer (Phase 4 reasoning system)
        # It handles case narrative generation, FAISS search, Graph lookups, prompt compilation, and Groq reasoning.
        result = reasoning_system.generate_clinical_reasoning(
            age=payload.age,
            sex=payload.sex,
            symptoms=payload.symptoms,
            narrative=payload.additional_information
        )
        
        # 3. Map Phase 4 outputs directly to the response schema

        # Map Patient Summary
        patient_summary = schemas.PatientSummary(
            age=payload.age,
            sex=payload.sex,
            symptoms=payload.symptoms,
            additional_information=payload.additional_information or ""
        )

        # Map Possible Conditions
        possible_conditions = []
        for cond in result.get("possible_conditions", []):
            possible_conditions.append(schemas.PossibleCondition(
                condition=cond.get("condition", "Unknown"),
                supporting_evidence=cond.get("supporting_evidence", []),
                similar_cases_found=cond.get("similar_cases_found", 0)
            ))

        # Map Knowledge Graph Evidence (matched vs unmatched signs)
        knowledge_graph_support = []
        raw_kg_evidence = result.get("kg_evidence", [])
        for item in raw_kg_evidence:
            if "error" in item:
                continue
            knowledge_graph_support.append(schemas.KGEvidence(
                disease=item.get("disease", "Unknown"),
                icd10=item.get("icd10", "N/A"),
                severity=item.get("severity", 0),
                matched_symptoms=item.get("matched_symptoms", []),
                unmatched_symptoms=item.get("unmatched_symptoms", []),
                explanation=item.get("explanation", "")
            ))

        # Map FAISS Similar Historical Cases (RAG evidence)
        similar_cases = []
        raw_similar_cases = result.get("similar_cases", [])
        for case in raw_similar_cases:
            # Extract names of symptoms that were present ("Yes") in the historical case
            active_symptoms = [
                s.get("question", s.get("id")) for s in case.get("symptoms", [])
                if s.get("value") in ("Yes", "1", 1, True, "True")
            ]
            similar_cases.append(schemas.SimilarCase(
                ground_truth=case.get("ground_truth", "Unknown"),
                similarity_score=float(case.get("similarity_score", 0.0)),
                symptoms=active_symptoms
            ))

        # Assemble and return type-safe response
        response = schemas.AnalyzeResponse(
            patient_summary=patient_summary,
            possible_conditions=possible_conditions,
            alternative_conditions=result.get("alternative_conditions", []),
            confidence_level=result.get("confidence_level", "Medium"),
            clinical_rationale=result.get("explanation", ""),
            knowledge_graph_support=knowledge_graph_support,
            similar_cases=similar_cases
        )
        return response

    except Exception as e:
        # Handle errors gracefully
        print(f"Error in clinical analyze route: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal Clinical Decision Support error: {str(e)}"
        )
