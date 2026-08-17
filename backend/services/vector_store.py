import chromadb
from core.config import settings
import uuid
import os

# Ensure the DB directory exists
os.makedirs(settings.VECTOR_DB_PATH, exist_ok=True)

client = chromadb.PersistentClient(path=settings.VECTOR_DB_PATH)
collection = client.get_or_create_collection(name="documents")

def store_in_chroma(chunks: list[dict], embeddings: list[list[float]]):
    ids = [str(uuid.uuid4()) for _ in chunks]
    texts = [chunk["text"] for chunk in chunks]
    metadatas = [chunk["metadata"] for chunk in chunks]
    
    collection.add(
        documents=texts,
        embeddings=embeddings,
        metadatas=metadatas,
        ids=ids
    )
