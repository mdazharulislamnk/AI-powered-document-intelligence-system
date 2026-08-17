from services.embeddings import generate_embeddings
from services.vector_store import collection

def retrieve_context(query: str, top_k: int = 5):
    query_embedding = generate_embeddings([query])[0]
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k
    )
    
    chunks = []
    if results['documents']:
        for doc, meta in zip(results['documents'][0], results['metadatas'][0]):
            chunks.append({"text": doc, "page": meta.get("page", "Unknown")})
            
    return chunks
