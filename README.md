# AI-Powered Document Intelligence System

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Python](https://img.shields.io/badge/Python-3.10-green)
![React](https://img.shields.io/badge/React-18-blueviolet)
![Author](https://img.shields.io/badge/Author-Md._Azharul_Islam-orange)

A sophisticated full-stack application that enables intelligent semantic search and conversational querying over documents. Designed to operate flawlessly on resource-constrained deployment environments (like Render) while delivering a premium, rich aesthetic user experience.

---

## 🏗 System Architecture

The application adopts a robust Client-Server architecture utilizing a modern stack:

*   **Frontend**: Built with **React** and **Vite** using pure JavaScript. Styled entirely with **Tailwind CSS** focusing on dark-mode glassmorphism.
*   **Backend**: A high-performance **FastAPI** Python server managing document parsing, embedding generation, and LLM communication.
*   **Vector Database**: **ChromaDB** for fast semantic vector retrieval of document chunks.
*   **LLM Engine**: **Gemini 3 Flash** via the `google-genai` SDK, configured with strict system instructions to prevent hallucination and provide verified source citations.

### RAG (Retrieval-Augmented Generation) Design Tradeoffs
1.  **Hybrid Embeddings**: Sentence Transformers (`all-MiniLM-L6-v2`) require heavy Torch dependencies and significant RAM. To accommodate deployments on free/hobby tiers (like Render), a toggle (`USE_LOCAL_EMBEDDINGS`) allows switching from the heavy local model to a lightweight HuggingFace Inference API call.
2.  **Streaming Architecture**: Instead of waiting 10-15 seconds for Gemini to formulate a complete answer from the context chunks, the backend utilizes `StreamingResponse` over HTTP. The React frontend immediately parses these chunks, providing an instantaneous, native-feeling typing effect.

---

## 🚀 Local Setup Instructions

### Prerequisites
*   Docker & Docker Compose installed.
*   Alternatively, Node.js (v22+) and Python (v3.10+) for manual setup.

### 1. Environment Configuration
Create a `.env` file in the root directory:
```env
# Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Embeddings (Set to False to use the API on low-RAM servers)
USE_LOCAL_EMBEDDINGS=True
HF_TOKEN=your_huggingface_token_here
```

### 2. Using Docker (Recommended)
You can launch the entire stack (Backend + Frontend) via Docker Compose:
```bash
docker-compose up --build
```
*   **Frontend**: http://localhost:5173
*   **Backend API**: http://localhost:8000

---

## 📡 API Contracts

### 1. Upload Document
*   **Endpoint**: `POST /api/upload`
*   **Content-Type**: `multipart/form-data`
*   **Payload**: `file` (PDF or TXT)
*   **Response**: 
    ```json
    { "message": "Successfully parsed 15 chunks." }
    ```

### 2. Chat (Streaming)
*   **Endpoint**: `POST /api/chat`
*   **Content-Type**: `application/json`
*   **Payload**: 
    ```json
    {
      "messages": [
        { "role": "user", "content": "What is the summary of this document?" }
      ]
    }
    ```
*   **Response**: `text/plain` (Streamed Server-Sent chunks)

---

## ☁️ Deployment Notes for Render
When deploying the FastAPI backend to Render's free tier:
1. Ensure the `requirements.txt` is updated.
2. Set the Environment Variable `USE_LOCAL_EMBEDDINGS` to `False` in the Render dashboard. This completely bypasses downloading the PyTorch models, allowing the application to stay comfortably within the 512MB RAM limit.
3. Ensure the start command is `uvicorn main:app --host 0.0.0.0 --port $PORT`.

---

## ✨ Bonus Implementations
*   **Streaming UI**: Real-time token streaming directly into the beautiful glassmorphism chat interface.
*   **Source Attributions**: The AI is strictly instructed to return page-number citations, bringing high transparency to its answers.
*   **Drag & Drop**: Seamless React Dropzone integration with pulsing loading indicators.

---
**Author:** Md. Azharul Islam
