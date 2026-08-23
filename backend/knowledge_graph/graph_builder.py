import os
import json
import pickle
import re
import networkx as nx
from typing import Dict, Any

def clean_symptom_name(evidence_id: str, question_en: str) -> str:
    """
    Clean clinical questions to create short, clean symptom labels for the graph nodes.
    E.g. "Do you have a fever (either felt or measured...)" -> "Fever"
         "Do you have a cough?" -> "Cough"
    """
    # 1. Custom mappings for key clinical concepts
    custom_map = {
        "E_91": "Fever",
        "E_201": "Cough",
        "E_66": "Breathing difficulty",
        "E_53": "Pain",
        "E_45": "Coughing up blood",
        "E_77": "Cough with colored sputum",
        "E_114": "Irritability / mood instability",
        "E_82": "Dizziness / faintness",
        "E_148": "Nausea / vomiting",
        "E_220": "Pain with deep breath",
        "E_161": "Loss of appetite",
        "E_162": "Weight loss",
        "E_173": "Acid reflux",
        "E_155": "Palpitations",
        "E_94": "Chills / shivers",
    }
    
    if evidence_id in custom_map:
        return custom_map[evidence_id]
        
    # 2. Rule-based regex cleanup
    cleaned = question_en
    
    # List of leading phrases to remove (case-insensitive)
    prefixes = [
        r"^\s*do you have a\s+",
        r"^\s*do you have an\s+",
        r"^\s*do you have\s+",
        r"^\s*have you noticed any\s+",
        r"^\s*have you noticed\s+",
        r"^\s*have you been\s+",
        r"^\s*have you recently had a\s+",
        r"^\s*have you recently had\s+",
        r"^\s*have you had\s+",
        r"^\s*have you\s+",
        r"^\s*are you experiencing a\s+",
        r"^\s*are you experiencing\s+",
        r"^\s*are you\s+",
        r"^\s*did you\s+",
        r"^\s*do you feel\s+",
        r"^\s*do you\s+",
        r"^\s*is your\s+",
        r"^\s*does the person have a\s+",
        r"^\s*does the person have\s+",
        r"^\s*does the\s+",
        r"^\s*does your\s+"
    ]
    
    for pattern in prefixes:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)
        
    # Clean question marks and strip extra spaces
    cleaned = cleaned.replace("?", "").strip()
    
    # Capitalize the first letter
    if cleaned:
        cleaned = cleaned[0].upper() + cleaned[1:]
        
    return cleaned

def build_graph(conditions_path: str, evidences_path: str) -> nx.DiGraph:
    """
    Construct the clinical directed knowledge graph from raw json metadata.
    """
    # Load metadata JSON files
    with open(conditions_path, 'r', encoding='utf-8') as f:
        conditions = json.load(f)
    with open(evidences_path, 'r', encoding='utf-8') as f:
        evidences = json.load(f)
        
    # Initialize Directed Graph
    G = nx.DiGraph()
    
    # 1. Map and Add Symptom/Evidence Nodes
    # We resolve each raw evidence into its clean short label
    evidence_id_to_short_name = {}
    
    for ev_id, ev_meta in evidences.items():
        question_en = ev_meta.get("question_en", ev_meta.get("name", ev_id))
        is_antecedent = ev_meta.get("is_antecedent", False)
        
        # Clean symptom label
        short_name = clean_symptom_name(ev_id, question_en)
        evidence_id_to_short_name[ev_id] = short_name
        
        # Determine clinical node type
        node_type = "symptom"
        
        G.add_node(
            short_name,
            type=node_type,
            evidence_id=ev_id,
            description=question_en,
            is_antecedent=is_antecedent
        )
        
    # 2. Map and Add Disease Nodes & Directed Edges
    for cond_name, cond_meta in conditions.items():
        disease_name = cond_meta.get("cond-name-eng", cond_name)
        icd10 = cond_meta.get("icd10-id", "")
        severity = cond_meta.get("severity", 0)
        
        # Add Disease Node
        G.add_node(
            disease_name,
            type="disease",
            description=disease_name,
            icd10=icd10,
            severity=severity
        )
        
        # Add edges for active symptoms
        symptoms_dict = cond_meta.get("symptoms", {})
        for ev_id in symptoms_dict.keys():
            if ev_id in evidence_id_to_short_name:
                symptom_node = evidence_id_to_short_name[ev_id]
                # Edge points from Disease -> Symptom
                G.add_edge(
                    disease_name,
                    symptom_node,
                    relation="has_symptom",
                    weight=1.0
                )
                
        # Add edges for history/antecedents
        antecedents_dict = cond_meta.get("antecedents", {})
        for ev_id in antecedents_dict.keys():
            if ev_id in evidence_id_to_short_name:
                antecedent_node = evidence_id_to_short_name[ev_id]
                # Edge points from Disease -> Symptom (labeled has_antecedent)
                G.add_edge(
                    disease_name,
                    antecedent_node,
                    relation="has_antecedent",
                    weight=1.0
                )
                
    return G

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    
    # Setup path constants
    ddxplus_dir = os.path.join(os.path.dirname(project_root), "datasets", "ddxplus")
    conditions_path = os.path.join(ddxplus_dir, "release_conditions.json")
    evidences_path = os.path.join(ddxplus_dir, "release_evidences.json")
    
    output_path = os.path.join(script_dir, "medical_graph.pkl")
    
    print("--- Medical Knowledge Graph Builder ---")
    print(f"Loading metadata from: {ddxplus_dir}")
    
    if not os.path.exists(conditions_path) or not os.path.exists(evidences_path):
        print("Error: Raw metadata JSON files not found in datasets/ddxplus/.")
        sys.exit(1)
        
    G = build_graph(conditions_path, evidences_path)
    
    # Save graph using pickle
    print(f"Saving compiled NetworkX DiGraph to: {output_path}")
    with open(output_path, 'wb') as f:
        pickle.dump(G, f)
        
    print(f"Successfully compiled graph with {G.number_of_nodes()} nodes and {G.number_of_edges()} edges!")

if __name__ == "__main__":
    main()
