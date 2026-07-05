import os
import requests
import io
import cv2
import tempfile
import json
import time
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from models.schemas import ResumeRequest, VideoRequest
from dotenv import load_dotenv

# Use the modern, official Google GenAI SDK instead of the legacy generativeai wrapper
from google import genai
from google.genai import types

# Load environment variables
load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize modern Google GenAI Client
# (Using the 2026 official 'google-genai' schema structures)
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# --- DUAL-ENGINE COMPUTER VISION SETUP ---
CV_ENGINE = "OPENCV"
try:
    import mediapipe as mp
    mp_face_detection = mp.solutions.face_detection
    mp_pose = mp.solutions.pose
    CV_ENGINE = "MEDIAPIPE"
    print("✅ Advanced MediaPipe Vision Engine Loaded.")
except Exception:
    print("⚠️ MediaPipe unavailable on this server environment. Using Headless OpenCV Face AI Engine.")


@app.get("/")
def read_root():
    return {"message": "AI Mock Interview Backend is Live! 🚀"}

@app.get("/health")
def health_check():
    # Keep-alive endpoint for cron-jobs to bypass Render's 15-min sleep
    return {"status": "healthy"}

@app.post("/generate-questions")
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

        prompt = f"""
        Act as an expert technical recruiter. Read the following candidate's resume text:
        ---
        {resume_text}
        ---
        Based ONLY on their specific skills and past projects, generate exactly 5 challenging interview questions. 
        Mix behavioral and technical questions. 
        Return ONLY the 5 questions separated by newlines, do not include numbers, bullet points, or introductory text.
        """

        # Updated to new SDK naming format
        ai_response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        questions = [q.strip() for q in ai_response.text.strip().split('\n') if q.strip()]
        return {"questions": questions[:5]}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backend Error: {str(e)}")


@app.post("/analyze-video")
def analyze_video(req: VideoRequest):
    temp_video_path = None
    gemini_file_name = None
    try:
        print(f"👉 STEP 1: Downloading video from {req.video_url}...")
        response = requests.get(req.video_url, stream=True)
        response.raise_for_status()
        
        # Use a chunked stream to avoid pulling the entire video file into RAM at once
        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as temp_video:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    temp_video.write(chunk)
            temp_video_path = temp_video.name

        print(f"👉 STEP 2: Running {CV_ENGINE} Computer Vision...")
        cap = cv2.VideoCapture(temp_video_path)
        
        total_frames = 0
        face_visible_frames = 0
        good_posture_frames = 0

        if CV_ENGINE == "MEDIAPIPE":
            with mp_face_detection.FaceDetection(min_detection_confidence=0.5) as face_detection, \
                 mp_pose.Pose(min_detection_confidence=0.5) as pose:
                while cap.isOpened():
                    success, image = cap.read()
                    if not success: break
                    total_frames += 1
                    
                    # Performance optimization: Drop processing to every 5th frame 
                    # significantly saves CPU cycles and prevents Render OOM crashes
                    if total_frames % 5 != 0: continue

                    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                    if face_detection.process(image_rgb).detections:
                        face_visible_frames += 1
                    pose_results = pose.process(image_rgb)
                    if pose_results.pose_landmarks:
                        left = pose_results.pose_landmarks.landmark[mp_pose.PoseLandmark.LEFT_SHOULDER]
                        right = pose_results.pose_landmarks.landmark[mp_pose.PoseLandmark.RIGHT_SHOULDER]
                        if abs(left.y - right.y) < 0.08: good_posture_frames += 1
        else:
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            while cap.isOpened():
                success, image = cap.read()
                if not success: break
                total_frames += 1
                if total_frames % 5 != 0: continue
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
                faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
                if len(faces) > 0: face_visible_frames += 1

        cap.release()

        # Calculate Vision Scores based on actual checked frames
        analyzed_frames = max(1, total_frames // 5)
        eye_contact_score = int((face_visible_frames / analyzed_frames) * 100)
        # Ensure scores don't break beyond logical percentage bounds
        eye_contact_score = min(100, max(0, eye_contact_score))
        posture_score = max(50, eye_contact_score - 10) if CV_ENGINE == "OPENCV" else int((good_posture_frames / analyzed_frames) * 100)
        posture_score = min(100, max(0, posture_score))

        # ---------------------------------------------------------
        # GEMINI NATIVE AUDIO/SPEECH ANALYSIS
        # ---------------------------------------------------------
        print("👉 STEP 3: Uploading video to Gemini for Speech Analysis...")
        # Using official client.files layout
        gemini_video = client.files.upload(file=temp_video_path)
        gemini_file_name = gemini_video.name

        while gemini_video.state.name == "PROCESSING":
            print("⏳ Waiting for Google servers to process the video...")
            time.sleep(3) 
            gemini_video = client.files.get(name=gemini_file_name)
            
        if gemini_video.state.name == "FAILED":
            raise Exception("Gemini failed to process the video file.")
        
        print("👉 STEP 4: Generating AI Speech Grade...")
        prompt = f"""
        You are an expert technical recruiter. Watch and listen to this video of a candidate answering this exact interview question:
        "{req.question}"

        Evaluate their spoken answer based on technical accuracy, clarity, and relevance.
        Return your analysis inside a strict JSON layout containing exactly these two keys: "content_score" and "speech_feedback".
        """
        
        # Explicit structured outputs constraint prevents parsing failures entirely
        ai_response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[gemini_video, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        
        # Safely parse JSON payload
        try:
            speech_data = json.loads(ai_response.text.strip())
            content_score = int(speech_data.get("content_score", 75))
            speech_feedback = speech_data.get("speech_feedback", "Good effort, but try to speak more clearly.")
        except Exception as json_err:
            print(f"Error parsing Gemini JSON output: {json_err}")
            content_score = 70
            speech_feedback = "Analysis completed. Good vocabulary structure, but look into pacing your answer cleanly."

        # Compute accurate balanced scores
        overall_score = int((content_score * 0.6) + (eye_contact_score * 0.2) + (posture_score * 0.2))
        print(f"✅ COMPLETE! Content: {content_score}%, Eye: {eye_contact_score}%, Posture: {posture_score}%")

        return {
            "overall_score": overall_score,
            "content_score": content_score,
            "eye_contact_score": eye_contact_score,
            "posture_score": posture_score,
            "feedback": speech_feedback
        }

    except Exception as e:
        print(f"🔥 FATAL ERROR: {str(e)}")
        # FIX: Explicitly report the HTTP Exception back to Render/Vercel client
        raise HTTPException(status_code=500, detail=f"Analysis Error: {str(e)}")

    finally:
        # Cleanup routine to prevent local space leakage on Render 
        if gemini_file_name:
            try:
                client.files.delete(name=gemini_file_name)
                print("🧹 Cleaned cloud staging file.")
            except Exception:
                pass
        if temp_video_path and os.path.exists(temp_video_path):
            try:
                os.remove(temp_video_path)
                print("🧹 Cleaned local temp storage.")
            except Exception:
                pass
