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
        yield f"\n\n**Service Unavailable**: The `{model_name}` model is currently experiencing unusually high demand. Spikes in demand are temporary. Please wait a few moments and try your request again, or I highly recommend switching to the `gemini-3.6-flash` or `gemini-3-flash-preview` model in the settings menu to continue immediately."
    except errors.ClientError as e:
        error_str = str(e)
        if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
            import re
            retry_match = re.search(r'retryDelay\':\s*\'(\d+)s\'', error_str)
            wait_time = f" approximately {retry_match.group(1)} seconds" if retry_match else " a few moments"
            yield f"\n\n**Usage Limit Reached**: The current API token quota for the `{model_name}` model has been exhausted. Please wait{wait_time} before trying again. Alternatively, I highly recommend switching to the `gemini-3.6-flash` or `gemini-3-flash-preview` model in the settings menu to continue our conversation right away."
        else:
            clean_err = getattr(e, 'message', str(e).split("{'error'")[0].strip())
            yield f"\n\n**System Notice**: I encountered an unexpected error while communicating with the `{model_name}` model. To resolve this, please switch to the `gemini-3.6-flash` or `gemini-3-flash-preview` model. Details: {clean_err}"
    except Exception as e:
        yield f"\n\n**System Error**: An unexpected system error occurred. {str(e)}"
