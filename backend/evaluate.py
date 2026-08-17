import time
import json
from google import genai
from google.genai import types
from services.rag import retrieve_context
from core.config import settings

# Initialize Gemini Client for Evaluation
eval_client = genai.Client(api_key=settings.GEMINI_API_KEY)

QUESTIONS = [
    "What is the main objective of the document?",
    "Can you summarize the key findings?",
    "What methodology or approach was proposed?",
    "Are there any specific limitations mentioned?",
    "Who is the target audience or what is the scope of this work?"
]

def run_evaluation(model_name="gemini-3.5-flash"):
    print("=" * 60)
    print("Starting BATCH RAG System Evaluation (High Speed)")
    print("=" * 60)
    
    start_time = time.time()
    results = []
    
    try:
        # Phase 1: Local Retrieval (No API calls)
        print("[1/3] Retrieving contexts from vector database...")
        batch_contexts = []
        for q in QUESTIONS:
            chunks = retrieve_context(q)
            if not chunks:
                return {"error": "[X] No context retrieved. Is the database empty? Please upload a document first."}
            context_str = "\n".join([f"Page {c['page']}: {c['text']}" for c in chunks])
            batch_contexts.append(context_str)
            
        # Phase 2: Batch Generation (1 API Call)
        print(f"[2/3] Generating answers using {model_name} (Batch Process)...")
        gen_prompt = "You are a helpful AI assistant. Answer the following 5 questions based strictly on the provided context for each. Output your response STRICTLY as a JSON array containing 5 strings. Example: [\"Answer 1\", \"Answer 2\", \"Answer 3\", \"Answer 4\", \"Answer 5\"]\n\n"
        for i, (q, ctx) in enumerate(zip(QUESTIONS, batch_contexts)):
            gen_prompt += f"--- Question {i+1} ---\nContext:\n{ctx}\nQuestion: {q}\n\n"
            
        gen_response = eval_client.models.generate_content(
            model=model_name,
            contents=gen_prompt,
            config=types.GenerateContentConfig(temperature=0.1)
        )
        
        raw_answers = gen_response.text.replace('```json', '').replace('```', '').strip()
        answers = json.loads(raw_answers)
        
        if len(answers) != 5:
            raise ValueError("LLM did not return exactly 5 answers.")
            
        # Phase 3: Batch Evaluation (1 API Call)
        print("[3/3] Grading answers using internal Judge Model (Batch Process)...")
        eval_prompt = "You are an expert AI evaluator. Evaluate the following 5 Q&A pairs based on their retrieved contexts. For each pair, output a JSON object with scores (1 to 5) and a brief explanation. Output strictly a JSON array containing exactly 5 objects.\n\n"
        eval_prompt += "Required JSON Format for each object:\n"
        eval_prompt += '{"retrieval_accuracy_score": 5, "answer_relevance_score": 5, "hallucination_score": 5, "explanation": "Brief reasoning"}\n\n'
        
        for i, (q, ctx, ans) in enumerate(zip(QUESTIONS, batch_contexts, answers)):
            eval_prompt += f"--- Pair {i+1} ---\nQuestion: {q}\nContext: {ctx}\nSystem Answer: {ans}\n\n"
            
        eval_response = eval_client.models.generate_content(
            model="gemini-3.5-flash", # Dedicated judge model
            contents=eval_prompt,
            config=types.GenerateContentConfig(temperature=0.1)
        )
        
        raw_evals = eval_response.text.replace('```json', '').replace('```', '').strip()
        evaluations = json.loads(raw_evals)
        
        if len(evaluations) != 5:
            raise ValueError("Judge did not return exactly 5 evaluations.")
            
        # Compile Results
        total_latency = time.time() - start_time
        avg_latency = round((total_latency) / 5, 2)
        
        total_retrieval = 0
        total_relevance = 0
        total_hallucination = 0
        
        for i, (q, ans, ev) in enumerate(zip(QUESTIONS, answers, evaluations)):
            total_retrieval += ev.get("retrieval_accuracy_score", 0)
            total_relevance += ev.get("answer_relevance_score", 0)
            total_hallucination += ev.get("hallucination_score", 0)
            
            results.append({
                "question": q,
                "latency": avg_latency, # Distribute total time evenly
                "retrieval_score": ev.get("retrieval_accuracy_score", 0),
                "relevance_score": ev.get("answer_relevance_score", 0),
                "hallucination_score": ev.get("hallucination_score", 0),
                "explanation": ev.get("explanation", "")
            })
            print(f"\n[Q{i+1}] {q}")
            print(f"Answer: {ans[:100]}...")
            print(f"Scores -> Retrieval: {ev.get('retrieval_accuracy_score', 0)}/5 | Relevance: {ev.get('answer_relevance_score', 0)}/5 | Faithfulness: {ev.get('hallucination_score', 0)}/5")
            print(f"Reasoning: {ev.get('explanation', '')}")
            
        avg_retrieval = round(total_retrieval / 5, 1)
        avg_relevance = round(total_relevance / 5, 1)
        avg_hallucination = round(total_hallucination / 5, 1)
        
        print("\n" + "=" * 60)
        print("FINAL EVALUATION REPORT")
        print("=" * 60)
        print(f"Avg Latency:          {avg_latency}s per query")
        print(f"Avg Retrieval Acc:    {avg_retrieval}/5.0")
        print(f"Avg Answer Relevance: {avg_relevance}/5.0")
        print(f"Avg Faithfulness:     {avg_hallucination}/5.0")
        print("=" * 60)
        
        return {
            "success": True,
            "avg_latency": avg_latency,
            "avg_retrieval": avg_retrieval,
            "avg_relevance": avg_relevance,
            "avg_hallucination": avg_hallucination,
            "details": results
        }
        
    except Exception as e:
        error_msg = str(e)
        explanation = "Evaluation failed due to an unexpected error."
        if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
            import re
            retry_match = re.search(r'retryDelay\':\s*\'(\d+)s\'', error_msg)
            wait_time = f" {retry_match.group(1)} seconds" if retry_match else " a few moments"
            explanation = f"Judge Model Quota Exceeded. Please wait{wait_time} before evaluating again, or try testing a different chat model."
        elif "503" in error_msg:
            explanation = "Judge Model Overloaded. Please try evaluating again in a few moments."
            
        print(f"Error parsing evaluation: {error_msg}")
        
        # Fallback empty results to satisfy frontend format safely
        for q in QUESTIONS:
            results.append({
                "question": q,
                "latency": 0,
                "retrieval_score": 0,
                "relevance_score": 0,
                "hallucination_score": 0,
                "explanation": explanation
            })
            
        return {
            "success": False,
            "avg_latency": 0.0,
            "avg_retrieval": 0.0,
            "avg_relevance": 0.0,
            "avg_hallucination": 0.0,
            "details": results
        }

if __name__ == "__main__":
    run_evaluation()
