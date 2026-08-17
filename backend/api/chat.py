from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.rag import retrieve_context
from services.llm import stream_rag_response

router = APIRouter()

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: list[Message]
    model: str = "gemini-3-flash-preview"

@router.post("/chat")
async def chat_endpoint(req: ChatRequest):
    if not req.messages:
        raise HTTPException(status_code=400, detail="Messages cannot be empty")
        
    user_query = req.messages[-1].content
    
    # Increase chunk retrieval limit if the user wants a full document summary or complete analysis
    lower_query = user_query.lower()
    top_k = 5
    if any(word in lower_query for word in ["completely", "entire", "whole document", "all pages", "summarize", "full analysis"]):
        top_k = 30 # Fetch much more context for comprehensive analysis
        
    context_chunks = retrieve_context(user_query, top_k=top_k)
    
    # Return a streaming response generator
    return StreamingResponse(
        stream_rag_response([m.model_dump() for m in req.messages], context_chunks, req.model), 
        media_type="text/plain"
    )
