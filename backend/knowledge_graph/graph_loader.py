import os
import pickle
import networkx as nx

def load_medical_graph(graph_path: str = None) -> nx.DiGraph:
    """
    Load the compiled clinical knowledge graph from the serialized pickle file.
    
    Args:
        graph_path: Optional path to the medical_graph.pkl. If None, it defaults
                    to the local package directory.
                    
    Returns:
        The NetworkX DiGraph instance.
    """
    if graph_path is None:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        graph_path = os.path.join(script_dir, "medical_graph.pkl")
        
    if not os.path.exists(graph_path):
        raise FileNotFoundError(
            f"Compiled medical graph file not found at {graph_path}. "
            "Please run backend/knowledge_graph/graph_builder.py first to compile it."
        )
        
    with open(graph_path, 'rb') as f:
        G = pickle.load(f)
        
    return G
