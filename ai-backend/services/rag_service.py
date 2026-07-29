import os
from supabase import create_client, Client
from google import genai

# Initialize Supabase (Make sure these are in your .env file)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Initialize Gemini
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def generate_embedding(text: str) -> list[float]:
    """Converts a string of text into a 768-dimensional vector using Gemini."""
    response = client.models.embed_content(
        model="text-embedding-004",
        contents=text,
    )
    return response.embeddings[0].values

def store_feedback_in_vector_db(session_id: str, feedback_text: str):
    """Chunks the feedback, embeds it, and saves it to Supabase."""
    # Convert text to numbers
    vector = generate_embedding(feedback_text)
    
    # Save to our new Supabase table
    data = {
        "session_id": session_id,
        "content": feedback_text,
        "embedding": vector
    }
    supabase.table("interview_embeddings").insert(data).execute()

def query_rag_chatbot(user_question: str, session_id: str) -> str:
    """The core RAG logic: Embed question -> Search DB -> Generate Answer."""
    
    # 1. Turn the user's chat question into a vector
    question_vector = generate_embedding(user_question)
    
    # 2. Call the Supabase SQL function we just created to find matching context
    search_results = supabase.rpc("match_documents", {
        "query_embedding": question_vector,
        "match_threshold": 0.5, # 50% minimum similarity
        "match_count": 3       # Get the top 3 most relevant chunks
    }).execute()
    
    # 3. Combine the retrieved chunks into one big context string
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
    
    chat_response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )
    
    return chat_response.text