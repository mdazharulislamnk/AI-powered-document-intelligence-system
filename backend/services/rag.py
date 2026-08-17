from services.embeddings import generate_embeddings
from services.vector_store import get_collection
from rank_bm25 import BM25Okapi
import numpy as np

def retrieve_context(query: str, top_k: int = 5):
    col = get_collection()
    # 1. Semantic Search (Vector)
    query_embedding = generate_embeddings([query])[0]
    results = col.query(
        query_embeddings=[query_embedding],
        n_results=top_k * 2  # fetch more for fusion
    )
    
    if not results['documents'] or not results['documents'][0]:
        return []
        
    semantic_docs = results['documents'][0]
    semantic_metas = results['metadatas'][0]
    
    # 2. Keyword Search (BM25) over ALL documents in DB
    all_docs = col.get()
    all_texts = all_docs['documents']
    all_metas = all_docs['metadatas']
    
    if not all_texts:
        return []

    tokenized_corpus = [doc.lower().split() for doc in all_texts]
    bm25 = BM25Okapi(tokenized_corpus)
    tokenized_query = query.lower().split()
    bm25_scores = bm25.get_scores(tokenized_query)
    
    # Get top BM25 indices
    top_bm25_indices = np.argsort(bm25_scores)[::-1][:top_k * 2]
    
    # 3. Reciprocal Rank Fusion (RRF)
    # RRF Score = 1 / (k + rank) where k is typically 60
    k_rrf = 60
    rrf_scores = {}
    doc_lookup = {}
    
    # Score Semantic ranks
    for rank, (doc, meta) in enumerate(zip(semantic_docs, semantic_metas)):
        rrf_scores[doc] = rrf_scores.get(doc, 0) + (1.0 / (k_rrf + rank + 1))
        doc_lookup[doc] = meta
        
    # Score BM25 ranks
    for rank, idx in enumerate(top_bm25_indices):
        doc = all_texts[idx]
        meta = all_metas[idx]
        rrf_scores[doc] = rrf_scores.get(doc, 0) + (1.0 / (k_rrf + rank + 1))
        doc_lookup[doc] = meta
        
    # Sort by RRF score
    sorted_docs = sorted(rrf_scores.items(), key=lambda item: item[1], reverse=True)
    
    # Return top_k
    chunks = []
    for doc, score in sorted_docs[:top_k]:
        chunks.append({"text": doc, "page": doc_lookup[doc].get("page", "Unknown")})
        
    return chunks
