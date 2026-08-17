import time
import json
from google import genai
from google.genai import types
from services.rag import retrieve_context
from services.llm import stream_rag_response
from core.config import settings

# Initialize Gemini Client for Evaluation
eval_client = genai.Client(api_key=settings.GEMINI_API_KEY)

# Predefined Questions (assumes a document has been uploaded)
QUESTIONS = [
    "What is the main objective of the document?",
    "Can you summarize the key findings?",
    "What methodology or approach was proposed?",
    "Are there any specific limitations mentioned?",
    "Who is the target audience or what is the scope of this work?"
]

def evaluate_response(question, answer, context_chunks):
    """Uses Gemini to evaluate the answer based on the context."""
    context_str = "\n".join([f"Page {c['page']}: {c['text']}" for c in context_chunks])
    
    prompt = f"""
    You are an expert AI evaluator judging a RAG system.
    Evaluate the following Q&A pair based on the provided context.
    Provide your evaluation in strict JSON format with three scores (1 to 5, where 5 is best) and brief explanations.
    
    Question: {question}
    Context Retrieved: {context_str}
    System Answer: {answer}
    
    Evaluate the following metrics:
    1. Retrieval Accuracy: Did the context contain the information needed? (1=No, 5=Perfectly)
    2. Answer Relevance: Did the answer directly address the question? (1=No, 5=Perfectly)
    3. Hallucination Rate: Did the system invent facts not in the context? (1=Invented everything, 5=Zero hallucination/strictly faithful)
    
    Respond ONLY with a JSON object like this:
    {{
        "retrieval_accuracy_score": 5,
        "answer_relevance_score": 5,
        "hallucination_score": 5,
        "explanation": "Brief reasoning here"
    }}
    """
    
    try:
        response = eval_client.models.generate_content(
            model="gemini-flash-latest",
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.1)
        )
        
        # Clean the response to parse JSON
        raw_text = response.text.replace('```json', '').replace('```', '').strip()
        return json.loads(raw_text)
    except Exception as e:
        print(f"Error parsing evaluation: {e}")
        return {
            "retrieval_accuracy_score": 0,
            "answer_relevance_score": 0,
            "hallucination_score": 0,
            "explanation": "Evaluation failed."
        }

def run_evaluation():
    print("=" * 60)
    print("Starting RAG System Evaluation (Bonus 3)")
    print("=" * 60)
    
    total_latency = 0
    total_retrieval = 0
    total_relevance = 0
    total_hallucination = 0
    
    for i, question in enumerate(QUESTIONS):
        print(f"\n[Question {i+1}/5]: {question}")
        
        # 1. Measure Latency & Retrieval
        start_time = time.time()
        context_chunks = retrieve_context(question)
        
        if not context_chunks:
            print("[X] No context retrieved. Is the database empty? Please upload a document first.")
            return

        # 2. Get Answer
        messages = [{"role": "user", "content": question}]
        answer = ""
        for chunk in stream_rag_response(messages, context_chunks):
            answer += chunk
            
        latency = time.time() - start_time
        total_latency += latency
        print(f"Latency: {latency:.2f} seconds")
        print(f"Answer: {answer[:100]}...")
        
        # 3. Evaluate using LLM-as-a-judge
        eval_metrics = evaluate_response(question, answer, context_chunks)
        
        total_retrieval += eval_metrics["retrieval_accuracy_score"]
        total_relevance += eval_metrics["answer_relevance_score"]
        total_hallucination += eval_metrics["hallucination_score"]
        
        print(f"Scores -> Retrieval: {eval_metrics['retrieval_accuracy_score']}/5 | "
              f"Relevance: {eval_metrics['answer_relevance_score']}/5 | "
              f"Faithfulness (No Hallucination): {eval_metrics['hallucination_score']}/5")
        print(f"Reasoning: {eval_metrics['explanation']}")

    # Final Report
    print("\n" + "=" * 60)
    print("FINAL EVALUATION REPORT")
    print("=" * 60)
    print(f"Avg Latency:          {total_latency/5:.2f}s per query")
    print(f"Avg Retrieval Acc:    {total_retrieval/5:.1f}/5.0")
    print(f"Avg Answer Relevance: {total_relevance/5:.1f}/5.0")
    print(f"Avg Faithfulness:     {total_hallucination/5:.1f}/5.0")
    print("=" * 60)

if __name__ == "__main__":
    run_evaluation()
