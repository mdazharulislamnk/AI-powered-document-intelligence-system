import os
from google import genai
from google.genai import types
from core.config import settings

client = genai.Client(api_key=settings.GEMINI_API_KEY)

from google.genai import errors

def stream_rag_response(messages: list[dict], context_chunks: list[dict], model_name: str = "gemini-flash-latest"):
    # Format context for the LLM
    context_str = "CONTEXT:\n"
    for chunk in context_chunks:
        context_str += f"[Page {chunk['page']}] {chunk['text']}\n\n"
        
    system_instruction = (
        "You are an AI Document Intelligence assistant. Answer the user's question strictly using ONLY the provided CONTEXT. "
        "If the answer is not in the context, say 'I cannot answer this based on the provided document.' "
        "IMPORTANT: Always include source citations in your answer referring to the page number."
    )
    
    # Format chat history
    formatted_contents = []
    for msg in messages[:-1]: # history
        role = "user" if msg["role"] == "user" else "model"
        formatted_contents.append(types.Content(role=role, parts=[types.Part.from_text(text=msg["content"])]))
        
    # The current prompt
    current_prompt = f"{context_str}\n\nUSER QUESTION: {messages[-1]['content']}"
    formatted_contents.append(types.Content(role="user", parts=[types.Part.from_text(text=current_prompt)]))
    
    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        temperature=0.2,
    )
    
    try:
        response_stream = client.models.generate_content_stream(
            model=model_name,
            contents=formatted_contents,
            config=config
        )
        
        for chunk in response_stream:
            if chunk.text:
                yield chunk.text
    except errors.ServerError as e:
        yield f"\n\n**API Overloaded**: Google's Gemini API is currently experiencing unusually high demand for the `{model_name}` model. Please wait a few moments and try your request again, or switch to a different model in the settings."
    except errors.ClientError as e:
        yield f"\n\n**API Error**: An error occurred while communicating with the Google Gemini API for the `{model_name}` model. It might be unsupported. Try switching to a different model in the settings.\n\nError Details: {str(e)}"
    except Exception as e:
        yield f"\n\n**System Error**: An unexpected error occurred. {str(e)}"
