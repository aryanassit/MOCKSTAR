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
            Act as an expert HR interviewer. Read the following candidate's resume text:
            ---
            {resume_text}
            ---
            Generate exactly 5 HR/behavioral interview questions based on their background.
            Focus on culture fit, communication, teamwork, leadership, conflict resolution, and career motivation.
            Avoid deep technical questions.
            Return ONLY the 5 questions separated by newlines, do not include numbers, bullet points, or introductory text.
            """
        else:
            prompt = f"""
            Act as an expert technical recruiter. Read the following candidate's resume text:
            ---
            {resume_text}
            ---
            Based ONLY on their specific skills and past projects, generate exactly 5 challenging technical interview questions.
            Return ONLY the 5 questions separated by newlines, do not include numbers, bullet points, or introductory text.
            """

        ai_response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        questions = [q.strip() for q in ai_response.text.strip().split('\n') if q.strip()]
        return {"questions": questions[:5]}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backend Error: {str(e)}")


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
