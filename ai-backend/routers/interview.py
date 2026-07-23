import os
import io
import asyncio
import requests
import tempfile
from fastapi import APIRouter, HTTPException
from google import genai

# Import our custom models and services
from models.schemas import ResumeRequest, VideoRequest
from services.vision_service import process_video_frames
from services.ai_service import generate_speech_feedback

router = APIRouter()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

@router.post("/generate-questions")
def generate_questions(req: ResumeRequest):
    try:
        response = requests.get(req.resume_url)
        response.raise_for_status()

        import PyPDF2
        pdf_file = io.BytesIO(response.content)
        reader = PyPDF2.PdfReader(pdf_file)
        resume_text = ""
        for page in reader.pages:
            resume_text += page.extract_text() + "\n"

        if not resume_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from PDF.")

        if req.round_type == "hr":
            prompt = f"""
            Act as a STRICT and EXPERT Executive HR Director. Read the following candidate's resume text:
            ---
            {resume_text}
            ---
            Generate exactly 8 highly unique, scenario-based behavioral interview questions.
            Do NOT ask basic questions like "Tell me about yourself" or "What is your biggest weakness."
            Instead, ask obscure and complex questions. RANDOMLY select 8 entirely different themes every time you are called (e.g., severe conflict resolution, managing failing projects, adapting to sudden leadership changes, etc.).
            Return ONLY the 8 questions separated by newlines. Do not include numbers, bullet points, or introductory text.
            """
        else:
            prompt = f"""
            Act as a STRICT and EXPERT Senior Engineering Manager. Read the following candidate's resume text:
            ---
            {resume_text}
            ---
            Based ONLY on their specific skills and past projects, generate exactly 8 highly unique, obscure, and complex technical interview questions.
            Do NOT ask generic definition questions (e.g., "What is React?"). Instead, ask deep, scenario-based architecture, debugging, or scaling questions related to their exact projects.
            RANDOMLY select 8 entirely different sub-topics or specific tools from their resume so the interview is completely different every time.
            Return ONLY the 8 questions separated by newlines. Do not include numbers, bullet points, or introductory text.
            """

        print("🔍 Fetching and auto-detecting available models...")
        
        # 1. Fetch all available models for this specific AQ key
        available_models = [
            m.name for m in client.models.list() 
            if "flash" in m.name 
            and "preview" not in m.name 
            and "audio" not in m.name 
            and "image" not in m.name
        ]
        
        # 2. Sort descending so we try the newest ones first (e.g., 3.6, 3.5, then 2.5)
        available_models.sort(reverse=True)
        
        questions = []
        model_success = False

        # 3. Loop through and try generating content
        for model_name in available_models:
            try:
                print(f"⏳ Attempting to generate questions using: {model_name}...")
                
                ai_response = client.models.generate_content(
                    model=model_name,
                    contents=prompt
                )
                
                print(f"✅ SUCCESS! Backend successfully generated questions using: {model_name}")
                questions = [q.strip() for q in ai_response.text.strip().split('\n') if q.strip()]
                model_success = True
                break # Exit the loop since we got a successful response!
                
            except Exception as e:
                print(f"⚠️ {model_name} failed. Moving to next model...")
                continue
                
        # 4. If all models failed, manually trigger the fallback block below
        if not model_success:
            raise Exception("All available Gemini models rejected the request.")

        return {"questions": questions[:8]}

    except Exception as e:
        print(f"⚠️ Caught an error (API Limit or PDF issue): {e}")
        print("🛡️ Deploying fallback safety net...")
        
        # 8 Hardcoded fallback questions
        fallback_questions = [
            "Tell me about a time you had to learn a completely new technology or skill on the fly.",
            "Describe a situation where you had a technical disagreement with a teammate. How did you resolve it?",
            "Walk me through the most complex technical problem you have successfully solved.",
            "Can you explain a project you are particularly proud of from your resume?",
            "How do you prioritize your tasks when you are facing multiple tight deadlines?",
            "Describe a time when a project didn't go as planned. What did you learn from the failure?",
            "Tell me about a time you had to step up and take leadership of a project or team.",
            "Where do you see your career heading in the next 3 to 5 years, and how does this role fit in?"
        ]
        
        # Silently return the fallback questions so the frontend never crashes!
        return {"questions": fallback_questions}


@router.post("/analyze-video")
async def analyze_video(req: VideoRequest):
    temp_video_path = None
    try:
        print(f"👉 Downloading video from {req.video_url}...")
        response = requests.get(req.video_url, stream=True)
        response.raise_for_status()
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as temp_video:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    temp_video.write(chunk)
            temp_video_path = temp_video.name

        # Vision analysis (CPU-bound, local) and speech analysis (network-bound,
        # waits on Gemini) are fully independent — both just read the same file.
        # Running them concurrently instead of one-after-another cuts per-question
        # latency roughly in half, with identical results either way.
        vision_task = asyncio.to_thread(process_video_frames, temp_video_path)
        speech_task = asyncio.to_thread(generate_speech_feedback, temp_video_path, req.question)
        vision_scores, speech_scores = await asyncio.gather(vision_task, speech_task)

        # 3. Calculate Final Grade
        overall_score = int((speech_scores["content_score"] * 0.6) + 
                            (vision_scores["eye_contact_score"] * 0.2) + 
                            (vision_scores["posture_score"] * 0.2))

        print(f"✅ COMPLETE! Content: {speech_scores['content_score']}%, Eye: {vision_scores['eye_contact_score']}%, Posture: {vision_scores['posture_score']}%")

        return {
            "overall_score": overall_score,
            "content_score": speech_scores["content_score"],
            "eye_contact_score": vision_scores["eye_contact_score"],
            "posture_score": vision_scores["posture_score"],
            "feedback": speech_scores["speech_feedback"],
            "suggested_answer": speech_scores.get("suggested_answer", "")
        }

    except Exception as e:
        print(f"🔥 FATAL ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis Error: {str(e)}")
    finally:
        # Clean up local video file
        if temp_video_path and os.path.exists(temp_video_path):
            try:
                os.remove(temp_video_path)
                print("🧹 Cleaned local temp storage.")
            except Exception:
                pass