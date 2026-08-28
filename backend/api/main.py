import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

# Add project root to python search path for relative package loading
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.rag.retriever import ClinicalCaseRetriever
from backend.knowledge_graph.graph_loader import load_medical_graph
from backend.llm.reasoning import ClinicalReasoningSystem
from backend.api.routes import router as api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles application startup and shutdown lifespan events.
    Loads deep learning models, indices, and graph pickles ONCE at startup as singleton states.
    """
    print("\n==================================================")
    print("      MEDASSIST AI CDSS BACKEND INITIALIZING      ")
    print("==================================================")
    
    # Resolve absolute paths to project directories
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    index_dir = os.path.join(project_root, "backend", "rag", "faiss_index")
    graph_path = os.path.join(project_root, "backend", "knowledge_graph", "medical_graph.pkl")
    
    print(f"[Startup] Loading RAG Retriever index from: {index_dir}")
    retriever = ClinicalCaseRetriever(index_dir)
    print("[Startup] RAG Retriever loaded successfully.")
    
    print(f"[Startup] Loading Knowledge Graph pickle from: {graph_path}")
    graph = load_medical_graph(graph_path)
    print("[Startup] Knowledge Graph loaded successfully.")
    
    # Instantiate the main clinical reasoning coordinator
    app.state.reasoning_system = ClinicalReasoningSystem(retriever, graph)
    print("[Startup] ClinicalReasoningSystem singleton initialized.")
    print("==================================================\n")
    
    yield
    
    print("[Shutdown] Cleaning clinical resource holds...")

# Instantiate FastAPI application
app = FastAPI(
    title="MedAssist AI - API",
    description="Explainable Retrieval-Augmented Clinical Decision Support System API Service",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Route mounting
app.include_router(api_router, prefix="/api")

@app.get("/health")
async def health_check():
    """
    FastAPI Health Check Endpoint.
    """
    return {
        "status": "healthy",
        "service": "MedAssist AI"
    }

if __name__ == "__main__":
    import uvicorn
    # Allow running directly using python main.py
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
