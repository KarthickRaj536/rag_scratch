"""
main.py — Agentic RAG with Real-Time Tools

Entry point for the 05-agentic-rag-realtime project.  Assembles the full
pipeline: knowledge base indexing → tool registry → agent → interactive Q&A.

Usage examples:
    # Single query
    python main.py --query "What is AAPL's current stock price?"

    # Interactive multi-turn session
    python main.py --interactive

    # Use a specific knowledge base directory
    python main.py --kb-dir /path/to/docs --interactive

    # Disable conversation memory (stateless mode)
    python main.py --interactive --no-memory

    # Hide the agent's reasoning trace
    python main.py --query "Weather in Tokyo" --no-verbose
"""

import os
import sys
from contextlib import asynccontextmanager
from typing import List

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load .env before importing project modules (they may read env vars at import time).
load_dotenv()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _check_api_keys(config: dict) -> None:
    """
    Print a startup banner showing which tools are ready / missing API keys.
    This helps users quickly see what's available before running queries.
    """
    google_key = config.get("google_api_key")
    tavily_key = config.get("tavily_api_key")
    owm_key = config.get("openweathermap_api_key")

    rag_status    = "✅ RAG Tool ready"
    finance_status = "✅ Finance Tool ready (yfinance — no key needed)"
    wiki_status   = "✅ Wikipedia Tool ready (no key needed)"
    web_status    = "✅ Web Search ready" if tavily_key else "❌ Web Search (no TAVILY_API_KEY)"
    weather_status = "✅ Weather Tool ready" if owm_key else "⚠️  Weather Tool (mock mode — no OPENWEATHERMAP_API_KEY)"
    gemini_status = "✅ Gemini connected" if google_key else "❌ Gemini (no GOOGLE_API_KEY — required)"

    print("\n" + "=" * 60)
    print("  Agentic RAG — Tool Availability")
    print("=" * 60)
    for status in [gemini_status, rag_status, finance_status, wiki_status, web_status, weather_status]:
        print(f"  {status}")
    print("=" * 60)

    if not google_key:
        print("\n[ERROR] GOOGLE_API_KEY is required. Add it to your .env file.")
        sys.exit(1)


def _print_example_queries() -> None:
    """Print suggested example queries so new users know what to try."""
    print("\nExample queries:")
    print('  • "What is the current price of AAPL?"')
    print('  • "What\'s the weather in London today?"')
    print('  • "Search Wikipedia for transformer neural networks"')
    print('  • "What does our internal strategy document say about AI adoption?"')
    print('  • "What is AAPL price and how does it compare to our internal valuation?"')
    print('  • "What are latest AI news stories relevant to our strategy?"')
    print()


def _build_config() -> dict:
    """Read all configuration from environment variables and return as a dict."""
    return {
        "google_api_key":          os.getenv("GOOGLE_API_KEY", ""),
        "gemini_model":            os.getenv("GEMINI_MODEL", "gemini-1.5-flash-latest"),
        "tavily_api_key":          os.getenv("TAVILY_API_KEY", ""),
        "openweathermap_api_key":  os.getenv("OPENWEATHERMAP_API_KEY", ""),
        "domain_description":      "internal company documents and knowledge base",
    }


# ---------------------------------------------------------------------------
# Global Agent State
# ---------------------------------------------------------------------------
agent_executor = None
vector_store_global = None


class ChatRequest(BaseModel):
    query: str


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup event: index docs, build tools, create the LLM agent.
    """
    global agent_executor, vector_store_global
    config = _build_config()
    _check_api_keys(config)

    kb_dir = os.getenv("KNOWLEDGE_BASE_DIR", "data/knowledge_base")
    # Ensure dir exists so users can upload files
    os.makedirs(kb_dir, exist_ok=True)
    
    print(f"\n[Setup] Indexing knowledge base from '{kb_dir}' …")
    from src.knowledge_indexer import index_knowledge_base  # noqa: PLC0415
    vector_store_global = index_knowledge_base(
        kb_dir=kb_dir,
        index_path=os.path.join(kb_dir, ".faiss_index"),
    )

    print("[Setup] Building tool registry …")
    from src.tool_registry import build_tool_registry, get_tool_descriptions  # noqa: PLC0415
    tools = build_tool_registry(vector_store_global, config)
    print(get_tool_descriptions(tools))

    print(f"\n[Setup] Connecting to Gemini model '{config['gemini_model']}' …")
    from langchain_google_genai import ChatGoogleGenerativeAI  # noqa: PLC0415
    llm = ChatGoogleGenerativeAI(
        model=config["gemini_model"],
        google_api_key=config["google_api_key"],
        temperature=0,  
    )

    print("[Setup] Creating agent …")
    from src.agent import create_agent  # noqa: PLC0415
    agent_executor = create_agent(tools, llm, memory=True, verbose=True)
    
    yield  # API serves traffic here

    print("\n[Shutdown] Tearing down server.")


# ---------------------------------------------------------------------------
# FastAPI App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Agentic RAG API",
    description="Backend server for the RAG Agent",
    lifespan=lifespan
)

# Enable CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Receive a query from the frontend and process it via the agent.
    """
    global agent_executor
    if not agent_executor:
        raise HTTPException(status_code=500, detail="Agent is not initialized.")
    
    from src.response_formatter import extract_tools_from_steps  # noqa: PLC0415
    try:
        # Note: In production you might use invoke() asynchronously if supported
        result = agent_executor.invoke({"input": request.query})
        answer = result.get("output", str(result))
        steps = result.get("intermediate_steps", [])
        tools_used = extract_tools_from_steps(steps)
        
        return {
            "answer": answer,
            "tools_used": tools_used
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    """
    Endpoint stringently receiving knowledge base files up to 15MB total.
    """
    global vector_store_global
    
    kb_dir = os.getenv("KNOWLEDGE_BASE_DIR", "data/knowledge_base")
    os.makedirs(kb_dir, exist_ok=True)
    
    MAX_SIZE = 15 * 1024 * 1024 # 15 MB
    total_size = 0
    saved_paths = []

    for file in files:
        content = await file.read()
        total_size += len(content)
        
        if total_size > MAX_SIZE:
            # Revert any saved files logic if sizes exceed
            for p in saved_paths:
                if os.path.exists(p):
                    os.remove(p)
            raise HTTPException(status_code=400, detail="Total file size exceeds 15MB limit.")
        
        file_path = os.path.join(kb_dir, file.filename)
        with open(file_path, "wb") as f:
            f.write(content)
        saved_paths.append(file_path)

    if vector_store_global and saved_paths:
        from src.knowledge_indexer import add_files_to_index
        index_path = os.path.join(kb_dir, ".faiss_index")
        add_files_to_index(saved_paths, vector_store_global, index_path)

    return {
        "message": "Files uploaded and knowledge base updated successfully", 
        "files": [os.path.basename(p) for p in saved_paths]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

# (CLI code removed in favor of FastAPI)