import os
import re
from google import genai
from google.genai import types as genai_types
from google.genai import errors
from openai import OpenAI, APIError
from core.config import settings

gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
groq_client = OpenAI(base_url="https://api.groq.com/openai/v1", api_key=settings.GROQ_API_KEY)

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
    
    current_prompt = f"{context_str}\n\nUSER QUESTION: {messages[-1]['content']}"

    ui_name = {
        "gemini-3-flash-preview": "Gemini 3.0 Flash", 
        "gemini-3.6-flash": "Gemini 3.6 Flash", 
        "gemini-3.5-flash": "Gemini 3.5 Flash",
        "openai/gpt-oss-120b": "GPT-OSS 120B (Groq)",
        "openai/gpt-oss-20b": "GPT-OSS 20B (Groq)"
    }.get(model_name, model_name)

    is_groq = "groq" in ui_name.lower()

    try:
        if is_groq:
            # Groq / OpenAI standard format
            openai_messages = [{"role": "system", "content": system_instruction}]
            for msg in messages[:-1]:
                role = "assistant" if msg["role"] == "model" else msg["role"]
                openai_messages.append({"role": role, "content": msg["content"]})
            openai_messages.append({"role": "user", "content": current_prompt})

            response_stream = groq_client.chat.completions.create(
                model=model_name,
                messages=openai_messages,
                temperature=0.2,
                stream=True
            )
            
            for chunk in response_stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

        else:
            # Google GenAI format
            formatted_contents = []
            for msg in messages[:-1]:
                role = "user" if msg["role"] == "user" else "model"
                formatted_contents.append(genai_types.Content(role=role, parts=[genai_types.Part.from_text(text=msg["content"])]))
            formatted_contents.append(genai_types.Content(role="user", parts=[genai_types.Part.from_text(text=current_prompt)]))
            
            config = genai_types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.2,
            )
            
            response_stream = gemini_client.models.generate_content_stream(
                model=model_name,
                contents=formatted_contents,
                config=config
            )
            
            for chunk in response_stream:
                if chunk.text:
                    yield chunk.text

    # Gemini Error Handling
    except errors.ServerError as e:
        yield f"\n\n**Service Unavailable**: The `{ui_name}` model is currently experiencing unusually high demand. Spikes in demand are temporary. Please wait a few moments and try your request again, or I highly recommend switching to another model in the settings menu above to continue immediately."
    except errors.ClientError as e:
        error_str = str(e)
        if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
            retry_match = re.search(r'retryDelay\':\s*\'(\d+)s\'', error_str)
            wait_time = f" approximately {retry_match.group(1)} seconds" if retry_match else " a few moments"
            yield f"\n\n**Usage Limit Reached**: The current API token quota for the `{ui_name}` model has been exhausted. Please wait{wait_time} before trying again. Alternatively, I highly recommend switching to another model (like `GPT-OSS 120B (Groq)`) in the settings menu above to continue our conversation right away."
        else:
            clean_err = getattr(e, 'message', str(e).split("{'error'")[0].strip())
            yield f"\n\n**System Notice**: I encountered an unexpected error while communicating with the `{ui_name}` model. To resolve this, please switch to another model in the dropdown menu. Details: {clean_err}"
            
    # Groq Error Handling
    except APIError as e:
        error_str = str(e)
        if "429" in error_str:
            yield f"\n\n**Usage Limit Reached**: The free Groq API token quota for the `{ui_name}` model has been temporarily exhausted. Please wait a few moments before trying again, or switch to another model."
        else:
            yield f"\n\n**System Notice**: I encountered an unexpected Groq API error while communicating with the `{ui_name}` model. Details: {e.message}"
            
    except Exception as e:
        yield f"\n\n**System Error**: An unexpected system error occurred. {str(e)}"
