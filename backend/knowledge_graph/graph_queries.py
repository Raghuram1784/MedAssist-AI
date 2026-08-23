import networkx as nx
from typing import List, Dict, Any, Union, Optional

def _find_node_by_name(graph: nx.DiGraph, name: str, node_type: Optional[str] = None) -> Optional[str]:
    """
    Helper function to search for a node in the graph case-insensitively.
    """
    for node in graph.nodes:
        if node.lower() == name.lower():
            if node_type is None or graph.nodes[node].get('type') == node_type:
                return node
    return None

def get_symptoms_for_disease(graph: nx.DiGraph, disease: str) -> List[str]:
    """
    Get all symptoms associated with a disease (targets of outgoing edges).
    
    Args:
        graph: The NetworkX DiGraph instance.
        disease: Name of the disease (case-insensitive).
        
    Returns:
        List of symptom names associated with the disease.
    """
    resolved_disease = _find_node_by_name(graph, disease, "disease")
    if not resolved_disease:
        return []
        
    symptoms = []
    # Iterate over outgoing edges from the disease node
    for target in graph.successors(resolved_disease):
        edge_data = graph.edges[resolved_disease, target]
        if edge_data.get("relation") == "has_symptom":
            symptoms.append(target)
            
    return symptoms

def get_related_diseases(graph: nx.DiGraph, symptom: str) -> List[str]:
    """
    Get all diseases associated with a symptom (sources of incoming edges).
    
    Args:
        graph: The NetworkX DiGraph instance.
        symptom: Name of the symptom (case-insensitive).
        
    Returns:
        List of disease names associated with the symptom.
    """
    resolved_symptom = _find_node_by_name(graph, symptom, "symptom")
    if not resolved_symptom:
        return []
        
    diseases = []
    # Incoming edges to a symptom node are its predecessors
    for source in graph.predecessors(resolved_symptom):
        edge_data = graph.edges[source, resolved_symptom]
        if edge_data.get("relation") == "has_symptom":
            diseases.append(source)
            
    return diseases

def get_disease_explanation(graph: nx.DiGraph, disease: str, symptoms: List[str]) -> Dict[str, Any]:
    """
    Generate a detailed clinical explanation showing why a disease is associated with a list
    of symptoms, highlighting query matches and unmatched descriptors.
    
    Args:
        graph: The NetworkX DiGraph instance.
        disease: Name of the disease (case-insensitive).
        symptoms: List of symptom query strings.
        
    Returns:
        A dictionary containing structured clinical explanation details.
    """
    resolved_disease = _find_node_by_name(graph, disease, "disease")
    if not resolved_disease:
        return {
            "disease": disease,
            "error": f"Disease '{disease}' not found in the knowledge graph.",
            "explanation": f"The disease '{disease}' is not registered in the clinical knowledge graph."
        }
        
    # Load node metadata
    meta = graph.nodes[resolved_disease]
    icd10 = meta.get("icd10", "N/A")
    severity = meta.get("severity", "N/A")
    
    # Get all graph-registered symptoms for this disease
    all_graph_symptoms = get_symptoms_for_disease(graph, resolved_disease)
    
    # Resolve symptom query inputs to matching nodes in the graph
    resolved_query_symptoms = []
    for s in symptoms:
        resolved_s = _find_node_by_name(graph, s, "symptom")
        if resolved_s:
            resolved_query_symptoms.append(resolved_s)
            
    # Calculate matches and mismatches
    matched = [s for s in resolved_query_symptoms if s in all_graph_symptoms]
    unmatched_graph = [s for s in all_graph_symptoms if s not in resolved_query_symptoms]
    
    if not matched:
        explanation = (
            f"The pathology '{resolved_disease}' (ICD-10: {icd10}, Severity Level: {severity}) "
            f"has no direct connections in the knowledge graph to the queried symptoms ({', '.join(symptoms)}). "
            f"Typically, {resolved_disease} presents with: {', '.join(all_graph_symptoms[:6])}."
        )
    else:
        explanation = (
            f"The pathology '{resolved_disease}' (ICD-10: {icd10}, Severity Level: {severity}) "
            f"is clinically connected to your presentation of: {', '.join(matched)}. "
            f"According to the medical knowledge graph, {resolved_disease} is associated with a total of "
            f"{len(all_graph_symptoms)} symptoms, including: {', '.join(all_graph_symptoms[:8])}. "
            f"Other findings supporting this diagnosis may include: {', '.join(unmatched_graph[:4])}."
        )
        
    return {
        "disease": resolved_disease,
        "icd10": icd10,
        "severity": severity,
        "matched_symptoms": matched,
        "unmatched_symptoms": unmatched_graph,
        "explanation": explanation
    }
