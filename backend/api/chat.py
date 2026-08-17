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

@router.post("/chat")
async def chat_endpoint(req: ChatRequest):
    if not req.messages:
        raise HTTPException(status_code=400, detail="Messages cannot be empty")
        
    user_query = req.messages[-1].content
    context_chunks = retrieve_context(user_query)
    
    # Return a streaming response generator
    return StreamingResponse(
        stream_rag_response([m.model_dump() for m in req.messages], context_chunks), 
        media_type="text/plain"
    )
