from fastapi import APIRouter, UploadFile, File, HTTPException
from services.document_parser import process_document
from services.embeddings import generate_embeddings
from services.vector_store import store_in_chroma

router = APIRouter()

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    if not file.filename.endswith(('.pdf', '.txt')):
        raise HTTPException(status_code=400, detail="Only PDF or TXT files allowed")
    
    # 1. Extract and split text
    chunks = await process_document(file)
    
    # 2. Generate hybrid embeddings
    texts = [chunk["text"] for chunk in chunks]
    embeddings = generate_embeddings(texts)
    
    # 3. Store in Vector DB
    store_in_chroma(chunks, embeddings)
    
    return {"status": "success", "message": f"Processed {len(chunks)} chunks"}
