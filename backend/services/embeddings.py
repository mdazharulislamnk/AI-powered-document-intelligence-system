from sentence_transformers import SentenceTransformer
import requests
from core.config import settings

local_model = None

def generate_embeddings(texts: list[str]) -> list[list[float]]:
    if settings.USE_LOCAL_EMBEDDINGS:
        global local_model
        if local_model is None:
            local_model = SentenceTransformer('all-MiniLM-L6-v2')
        return local_model.encode(texts).tolist()
    else:
        # Fallback to web API (Hugging Face Inference)
        api_url = "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2"
        headers = {"Authorization": f"Bearer {settings.HF_TOKEN}"}
        response = requests.post(api_url, headers=headers, json={"inputs": texts, "options": {"wait_for_model": True}})
        if response.status_code != 200:
             raise Exception(f"HF API Error: {response.text}")
        return response.json()
