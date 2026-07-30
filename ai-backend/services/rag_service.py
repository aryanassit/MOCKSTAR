import os
from supabase import create_client, Client
from google import genai

# Initialize Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Initialize Gemini
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def generate_embedding(text: str) -> list[float]:
    """Dynamically finds a working embedding model for this specific API key."""
    # 1. Get all available models and filter for embedding models
    available_models = [m.name for m in client.models.list() if "embed" in m.name.lower()]
    
    # 2. Try them one by one until one works!
    for model_name in available_models:
        try:
            print(f"⏳ Attempting to generate embeddings with: {model_name}...")
            response = client.models.embed_content(
                model=model_name,
                contents=text,
            )
            return response.embeddings[0].values
        except Exception as e:
            print(f"⚠️ {model_name} failed. Trying next...")
            continue
            
    raise Exception("No working embedding models available for this API key.")

def store_feedback_in_vector_db(session_id: str, feedback_text: str):
    """Chunks the feedback, embeds it, and saves it to Supabase."""
    vector = generate_embedding(feedback_text)
    
    data = {
        "session_id": session_id,
        "content": feedback_text,
        "embedding": vector
    }
    supabase.table("interview_embeddings").insert(data).execute()

def query_rag_chatbot(user_question: str, session_id: str) -> str:
    """The core RAG logic with dynamic model fallback."""
    
    # 1. Turn the user's chat question into a vector
    question_vector = generate_embedding(user_question)
    
    # 2. Call the Supabase SQL function
    search_results = supabase.rpc("match_documents", {
        "query_embedding": question_vector,
        "match_threshold": 0.5, 
        "match_count": 3      
    }).execute()
    
    # 🛑 THE "BEFORE INTERVIEW" GUARDRAIL
    if not search_results.data:
        return "I don't have any feedback data for you yet! Complete an interview session first so I can analyze your performance."
    
    # 3. Combine the retrieved chunks
    retrieved_context = "\n".join([item["content"] for item in search_results.data])
    
    # 4. Ask Gemini to answer the question USING ONLY the retrieved context
    prompt = f"""
    You are the MockStar AI Interview Coach. 
    Answer the user's question using ONLY the context provided below. 
    If the context doesn't contain the answer, say "I don't have enough data on that."
    
    Context from their interview:
    {retrieved_context}
    
    User Question: {user_question}
    """
    
    # 5. Dynamically find the text model (because gemini-flash might be blocked!)
    available_text_models = [
        m.name for m in client.models.list() 
        if "flash" in m.name and "preview" not in m.name and "audio" not in m.name and "image" not in m.name
    ]
    available_text_models.sort(reverse=True)

    for text_model in available_text_models:
        try:
            chat_response = client.models.generate_content(
                model=text_model,
                contents=prompt
            )
            return chat_response.text
        except Exception:
            continue
            
    return "Sorry, the AI model is currently unavailable."