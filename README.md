# AI-Powered Document Intelligence System

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Python](https://img.shields.io/badge/Python-3.10-green)
![React](https://img.shields.io/badge/React-18-blueviolet)
![Author](https://img.shields.io/badge/Author-Md._Azharul_Islam-orange)

## 1. Title & Overview
A sophisticated full-stack application that enables intelligent semantic search and conversational querying over documents. Designed to operate flawlessly on resource-constrained deployment environments (like Render) while delivering a premium, rich aesthetic user experience. The core objective is a comprehensive Retrieval-Augmented Generation (RAG) system that can ingest PDF or TXT files, extract and process their text, and answer user questions with highly accurate, hallucination-free evidence drawn directly from the original document.

---

## 2. Complete Tech Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS (Typography & Forms), Lucide React, React Dropzone, React Markdown (`remark-gfm`, `rehype-raw`) |
| **Backend** | Python 3.10, FastAPI, Uvicorn, PyMuPDF (`fitz`), Python-Multipart |
| **AI / ML** | Google GenAI SDK (Gemini), OpenAI SDK (Groq API integration for GPT-OSS models), HuggingFace Inference API |
| **Vector DB / Search**| ChromaDB, Sentence-Transformers (`all-MiniLM-L6-v2`), `rank_bm25` (Keyword search) |
| **Infrastructure** | Docker, Docker Compose |

---

## 3. Table of Contents
1. [Title & Overview](#1-title--overview)
2. [Complete Tech Stack](#2-complete-tech-stack)
3. [Table of Contents](#3-table-of-contents)
4. [Project Directory Structure](#4-project-directory-structure)
5. [Prerequisites](#5-prerequisites)
6. [Environment Variables](#6-environment-variables)
7. [A to Z Setup Guide (Manual Installation)](#7-a-to-z-setup-guide-manual-installation)
8. [A to Z Setup Guide (Docker Compose)](#8-a-to-z-setup-guide-docker-compose)
9. [Architecture & Design Tradeoffs](#9-architecture--design-tradeoffs)
10. [Vector Data Model (ChromaDB)](#10-vector-data-model-chromadb)
11. [Feature Matrix & Task Completion](#11-feature-matrix--task-completion)
12. [Complete API Reference](#12-complete-api-reference)
13. [Problems Faced & Solutions](#13-problems-faced--solutions)
14. [Cloud Deployment (Render Guide)](#14-cloud-deployment-render-guide)
15. [Troubleshooting & Git Practices](#15-troubleshooting--git-practices)
16. [Developer Signature](#16-developer-signature)

---

## 4. Project Directory Structure
```text
AI-powered-document-intelligence-system/
├── backend/
│   ├── api/
│   │   ├── chat.py           # LLM Streaming routes
│   │   ├── evaluate.py       # Automated testing routes
│   │   └── upload.py         # Document ingestion & indexing routes
│   ├── core/
│   │   └── config.py         # Environment parsing
│   ├── services/
│   │   ├── document_parser.py# PyMuPDF extraction
│   │   ├── embeddings.py     # SentenceTransformer / HF Inference
│   │   ├── llm.py            # Gemini & Groq router & stream formatting
│   │   ├── rag.py            # Hybrid Search (BM25 + ChromaDB) logic
│   │   └── vector_store.py   # ChromaDB collection management
│   ├── evaluate.py           # Standalone terminal evaluation script
│   ├── main.py               # FastAPI entry point
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Main UI & State Management
│   │   ├── index.css         # Tailwind & Typography configuration
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## 5. Prerequisites
*   **Docker & Docker Compose** (Recommended for isolated environments).
*   **Python 3.10+** (For manual backend execution).
*   **Node.js 20.19+ or 22.12+** (For manual frontend execution).

---

## 6. Environment Variables
Create a `.env` file in the root directory and define the following keys. You can reference `.env.example`.

| Key | Description | Required? |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Your Google Gemini API Key used for standard LLM queries and evaluation suites. | Yes |
| `GROQ_API_KEY` | Your Groq API Key used to power the high-speed GPT-OSS models via OpenAI compatibility layer. | Yes |
| `USE_LOCAL_EMBEDDINGS` | `True` to use local PyTorch transformers. `False` to offload to HuggingFace API (Saves ~1GB RAM). | Optional (Defaults to `True`) |
| `HF_TOKEN` | HuggingFace Token required if `USE_LOCAL_EMBEDDINGS=False` to prevent rate limits. | Required if local = False |

---

## 7. A to Z Setup Guide (Manual Installation)

This guide provides absolutely every command required to start the project from scratch, assuming you have Python (3.10+) and Node.js (20+) installed.

### Step 1: Clone the Repository
Open your terminal (Command Prompt, PowerShell, or Bash) and clone the project to your local machine:
```bash
git clone https://github.com/mdazharulislamnk/AI-powered-document-intelligence-system.git
cd AI-powered-document-intelligence-system
```

### Step 2: Environment Configuration
You must create a `.env` file to securely store your API keys.
1. In the root directory of the project, create a new file named exactly `.env`.
2. Open the `.env` file in any text editor and paste the following configuration:
```env
# Gemini API Key (Required for standard LLM queries)
# Get yours here: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# Groq API Key (Required for GPT-OSS 120B/20B high-speed models)
# Get yours here: https://console.groq.com/keys
GROQ_API_KEY=your_groq_api_key_here

# Embeddings Configuration (Set to False on low-RAM servers like Render)
USE_LOCAL_EMBEDDINGS=True

# HuggingFace Token (Only required if USE_LOCAL_EMBEDDINGS=False)
HF_TOKEN=your_huggingface_token_here
```

### Step 3: Backend Setup (Python & FastAPI)
1. Navigate into the backend directory:
```bash
cd backend
```
2. Create an isolated Python Virtual Environment to prevent dependency conflicts:
```bash
python -m venv venv
```
3. Activate the Virtual Environment. The command depends on your operating system:
   * **Windows (Command Prompt):**
     ```cmd
     venv\Scripts\activate.bat
     ```
   * **Windows (PowerShell):**
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   * **macOS & Linux:**
     ```bash
     source venv/bin/activate
     ```
4. Install all required Python dependencies into the virtual environment:
```bash
pip install -r requirements.txt
```
5. Start the FastAPI Development Server:
```bash
python -m uvicorn main:app --port 8001 --reload
```
*Leave this terminal open. The backend API is now running at `http://localhost:8001`.*

### Step 4: Frontend Setup (React & Vite)
1. Open a **new, separate terminal window** (do not close the backend terminal).
2. Navigate into the frontend directory from the root project folder:
```bash
cd frontend
```
3. Install all Node.js dependencies using npm:
```bash
npm install
```
4. Start the Vite Development Server:
```bash
npm run dev
```
*The frontend is now running at `http://localhost:5173`. Open this URL in your web browser to use the application!*

---

## 8. A to Z Setup Guide (Docker Compose)

If you prefer a completely isolated setup without manually installing Python, Node.js, or virtual environments globally, you can use Docker.

### Step 1: Install Prerequisites
* Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) for Windows/Mac or Docker Engine for Linux.

### Step 2: Configure Environment
* Ensure your `.env` file is created in the root directory exactly as described in Step 2 of the manual installation.

### Step 3: Build and Launch
1. Open a terminal in the root directory of the project (where the `docker-compose.yml` file is located).
2. Execute the build and up command:
```bash
docker-compose up --build
```
3. Wait for the terminal to finish downloading the images and building the containers. This may take a few minutes the first time.
4. **Verify Services:**
   - The Frontend React app is mapped to: `http://localhost:5173`
   - The Backend API is mapped to: `http://localhost:8001` (You can visit `http://localhost:8001/docs` for the interactive Swagger API UI).

### Step 4: Shutting Down
To stop the containers safely, press `CTRL+C` in the terminal where Docker is running. Alternatively, open a new terminal in the root directory and run:
```bash
docker-compose down
```

---

## 9. Architecture & Design Tradeoffs

### The RAG Pipeline Data Flow
1. **Ingestion**: PDF/TXT files are parsed via `PyMuPDF`. Text is cleaned (newlines, multiple spaces stripped).
2. **Chunking**: Text is split into manageable chunks (~500 characters) while preserving page number metadata.
3. **Embedding**: Chunks are passed through `all-MiniLM-L6-v2` to generate semantic vectors.
4. **Vector Store**: Embeddings and chunks are stored in persistent ChromaDB.
5. **Hybrid Search**: When a user queries, the system uses **Reciprocal Rank Fusion (RRF)** to combine Semantic Search (ChromaDB) and Keyword Search (BM25) to find the absolute most relevant chunks.
6. **LLM Synthesis**: The chunks are sent as context to either Gemini or Groq (GPT-OSS) with strict system instructions to cite page numbers and prevent hallucination. The response is streamed back via Server-Sent Events (SSE).

### Tradeoff: Hybrid Embeddings & RAM Constraints
Sentence Transformers (`all-MiniLM-L6-v2`) require heavy Torch dependencies and significant RAM. To accommodate deployments on free/hobby tiers (like Render, which limits apps to 512MB RAM), I engineered a toggle (`USE_LOCAL_EMBEDDINGS`). This allows the system to switch from a heavy local PyTorch model to a lightweight HuggingFace Inference API call, sacrificing a tiny bit of latency to save nearly 1GB of memory overhead.

### Tradeoff: Dynamic Model Routing
To provide fallback stability and performance testing, the backend dynamically routes prompts. Gemini acts as the baseline, while Groq acts as a high-speed LPU alternative. 

---

## 10. Vector Data Model (ChromaDB)

The ChromaDB implementation is stored locally on disk (`./chroma_db`). The database is explicitly cleared upon every new file upload to prevent cross-contamination between assessments and ensure the AI strictly searches the currently focused document.

**Collection Name:** `documents`

**Schema:**
*   `ids`: Unique UUID strings (`str`) for every chunk.
*   `documents`: The raw extracted text payload of the chunk (`str`).
*   `embeddings`: The vector array generated by the embedding model (`List[float]`).
*   `metadatas`: A dictionary containing `{ "page": 1, "chunk_index": 0 }` used for precise source attribution during LLM generation.

---

## 11. Feature Matrix & Task Completion

| Requirement | Description | Status |
| :--- | :--- | :--- |
| **Document Ingestion** | Accept PDF or TXT files, extract raw text, and clean it. | ✅ Done |
| **Chunking** | Split text into meaningful chunks and store metadata (page number). | ✅ Done |
| **Embedding Gen.** | Produce vector embeddings for each chunk (Sentence-Transformers). | ✅ Done |
| **Vector Store** | Persist embeddings in a vector database (ChromaDB). | ✅ Done |
| **Semantic Search** | Embed query and perform vector search to retrieve top chunks. | ✅ Done |
| **RAG Pipeline** | LLM relies primarily on retrieved context, avoiding hallucinations. | ✅ Done |
| **Source Attribution** | Answers accompanied by explicit page-level citations. | ✅ Done |
| **Frontend Display** | React/Next.js frontend showing answers and source chunks. | ✅ Done |
| **Bonus: Memory** | Preserve context across follow-up questions. | ✅ Done |
| **Bonus: Hybrid Search**| Combine semantic (vector) search with keyword (BM25) search. | ✅ Done |
| **Bonus: Eval Suite** | Provide predefined questions testing accuracy, relevance, latency. | ✅ Done |
| **Bonus: Streaming** | Stream LLM responses to frontend in real-time. | ✅ Done |
| **Bonus: Docker** | Single-command startup via `docker-compose.yml`. | ✅ Done |

---

## 12. Complete API Reference

### 1. Upload Document
*   **Endpoint**: `POST /api/upload`
*   **Payload**: `multipart/form-data` with `file`
*   **Behavior**: Clears existing ChromaDB, chunks document, generates embeddings, stores in DB.
*   **Response**: `{ "status": "success", "message": "Processed 15 chunks" }`

### 2. Stream Chat
*   **Endpoint**: `POST /api/chat`
*   **Payload (JSON)**: 
    ```json
    {
      "messages": [
        { "role": "user", "content": "What is the primary methodology?" }
      ],
      "model": "openai/gpt-oss-120b"
    }
    ```
*   **Behavior**: Performs Hybrid RRF Search. Formulates context. Translates roles if needed. Streams response.
*   **Response**: `text/plain` via Server-Sent Events (SSE).

### 3. Automated Evaluation Suite
*   **Endpoint**: `GET /api/evaluate?model=openai/gpt-oss-120b`
*   **Behavior**: Executes 5 predefined questions against the current document, evaluates Faithfulness and Relevance using an LLM-as-a-judge, and computes average latency.
*   **Response (JSON)**:
    ```json
    {
      "success": true,
      "avg_latency": 1.45,
      "avg_retrieval": 5.0,
      "details": [
        { "question": "...", "retrieval_score": 5, "explanation": "..." }
      ]
    }
    ```

---

## 13. Problems Faced & Solutions

### 1. Windows Console Unicode Crash (`charmap` codec)
*   **Problem**: While printing automated evaluation reasoning to the backend terminal, Groq models occasionally generated a special "non-breaking hyphen" (`\u2011`). Windows Command Prompt (CP1252 default encoding) crashed the entire Python process when attempting to `print()` this character.
*   **Solution**: Wrapped the console print statements in a safe ASCII encoder: `.encode('ascii', 'replace').decode('ascii')`. This replaces unsupported terminal characters with standard ASCII without corrupting the API response sent to the frontend.

### 2. API Standard Mismatch (Gemini vs OpenAI/Groq)
*   **Problem**: The frontend managed chat history using Google's role standard (`{ role: 'model' }`). When dynamically switching to Groq (which enforces OpenAI standards), Groq's API rejected the request with a 400 Bad Request: `discriminator property 'role' has invalid value` because it expects `{ role: 'assistant' }`.
*   **Solution**: Implemented a middleware layer in `llm.py` that intercepts the chat array and dynamically translates roles (`"model" -> "assistant"`) before routing to Groq, ensuring universal compatibility without changing the React frontend logic.

### 3. ChromaDB Stale Cache on Re-Upload (Cross-Contamination)
*   **Problem**: When uploading a new PDF, the backend `clear_chroma()` function successfully deleted the database, but `rag.py` retained a cached memory reference to the old deleted collection, causing a "Collection does not exist" crash on the next query.
*   **Solution**: Refactored `vector_store.py` to use a dynamic getter function (`get_collection()`). `rag.py` now invokes this getter on every query, guaranteeing it always references the newly built collection.

### 4. Raw HTML Generated inside Markdown Tables
*   **Problem**: Groq models often generated HTML tags (like `<br>`) inside Markdown tables to handle spacing. The `react-markdown` library explicitly strips dangerous HTML, causing the literal string `<br>` to render visibly in the UI.
*   **Solution**: Installed the `rehype-raw` plugin and injected it into the ReactMarkdown component, allowing safe, sanitized HTML tags to render naturally within the beautifully styled tables.

### 5. Horizontal Overflow on Mobile Devices
*   **Problem**: When the AI generated dense, multi-column tables, the physical width exceeded standard mobile viewports (e.g., iPhone 16 Pro Max), causing the entire application layout to stretch and break horizontal scrolling.
*   **Solution**: Applied `overflow-x-auto break-words w-full` strictly to the chat bubble container in Tailwind CSS. This isolates the scrolling behavior, meaning only the table itself scrolls horizontally while the app layout remains completely locked.

---

## 14. Cloud Deployment (Render Guide)

When deploying the FastAPI backend to Render's free tier, memory limits (512MB) are the primary constraint.

1.  Connect your GitHub repository to Render and create a new **Web Service**.
2.  Set the environment to **Python 3**.
3.  Set the Build Command: `pip install -r backend/requirements.txt`
4.  Set the Start Command: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
5.  **CRITICAL**: Under Environment Variables, add `USE_LOCAL_EMBEDDINGS=False` and supply a valid `HF_TOKEN`. This prevents the heavy PyTorch library from loading into RAM, keeping your application footprint under ~300MB.
6.  *Note: Render free instances have ephemeral storage. Uploaded PDFs and ChromaDB indexes will be wiped if the server sleeps.*

---

## 15. Troubleshooting & Git Practices

*   **Missing API Keys:** If the system hangs or returns 500 errors during chat, verify that `.env` contains valid keys and is placed in the **root directory**.
*   **Port Conflicts:** Ensure ports `8001` (Backend) and `5173` (Frontend) are not being used by other local services.
*   **Git Cleanliness:** The `.env` file, `prompt.txt`, Python caches (`__pycache__`), Node modules (`node_modules`), and the local ChromaDB storage folder (`chroma_db`) are intentionally excluded via `.gitignore` to maintain security and keep the repository weight low.

---

## 16. Developer Signature

|  |  |
| :--- | :--- |
| **Developer** | Md. Azharul Islam |
| **GitHub Profile** | [@mdazharulislamnk](https://github.com/mdazharulislamnk) |
| **Repository** | [AI-powered-document-intelligence-system](https://github.com/mdazharulislamnk/AI-powered-document-intelligence-system) |
