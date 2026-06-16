import os
import requests
import io
import cv2
import tempfile
import json
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv


# Load environment variables
load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Gemini AI
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-2.5-flash')

# --- DUAL-ENGINE COMPUTER VISION SETUP ---
CV_ENGINE = "OPENCV"
try:
    import mediapipe as mp
    # If this fails on your Mac, it safely jumps to the except block!
    mp_face_detection = mp.solutions.face_detection
    mp_pose = mp.solutions.pose
    CV_ENGINE = "MEDIAPIPE"
    print("✅ Advanced MediaPipe Vision Engine Loaded.")
except Exception:
    print("⚠️ MediaPipe unavailable on this Mac architecture. Using REAL OpenCV Face AI Engine.")

class ResumeRequest(BaseModel):
    resume_url: str

class VideoRequest(BaseModel):
    video_url: str

@app.get("/")
def read_root():
    return {"message": "AI Mock Interview Backend is Live! 🚀"}

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

        ai_response = model.generate_content(prompt)
        questions = [q.strip() for q in ai_response.text.strip().split('\n') if q.strip()]
        return {"questions": questions[:5]}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backend Error: {str(e)}")

# Update the Expected Request Data to include the question
class VideoRequest(BaseModel):
    video_url: str
    question: str

@app.post("/analyze-video")
def analyze_video(req: VideoRequest):
    try:
        print(f"👉 STEP 1: Downloading video from {req.video_url}...")
        response = requests.get(req.video_url, stream=True)
        response.raise_for_status()
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as temp_video:
            for chunk in response.iter_content(chunk_size=8192):
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
                    if total_frames % 3 != 0: continue

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
                if total_frames % 3 != 0: continue
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
                faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
                if len(faces) > 0: face_visible_frames += 1

        cap.release()

        # Calculate Vision Scores
        analyzed_frames = max(1, total_frames // 3)
        eye_contact_score = int((face_visible_frames / analyzed_frames) * 100)
        posture_score = max(50, eye_contact_score - 10) if CV_ENGINE == "OPENCV" else int((good_posture_frames / analyzed_frames) * 100)

        # ---------------------------------------------------------
        # NEW: GEMINI NATIVE AUDIO/SPEECH ANALYSIS
        # ---------------------------------------------------------
        print("👉 STEP 3: Uploading video to Gemini for Speech Analysis...")
        gemini_video = genai.upload_file(temp_video_path)

        import time
        while gemini_video.state.name == "PROCESSING":
            print("⏳ Waiting for Google servers to process the video...")
            time.sleep(2) # Wait 2 seconds before checking again
            # We must fetch the updated file status from the server
            gemini_video = genai.get_file(gemini_video.name)
            
        if gemini_video.state.name == "FAILED":
            raise Exception("Gemini failed to process the video file.")
        
        print("👉 STEP 4: Generating AI Speech Grade...")
        prompt = f"""
        You are an expert technical recruiter. Watch and listen to this video of a candidate answering this exact interview question:
        "{req.question}"

        Evaluate their spoken answer based on technical accuracy, clarity, and relevance. 
        Return ONLY a valid JSON object with no markdown formatting. It must contain exactly these two keys:
        {{
            "content_score": <number between 0 and 100 grading their speech>,
            "speech_feedback": "<a short 2-sentence constructive feedback on their answer>"
        }}
        """
        
        print("👉 STEP 4: Generating AI Speech Grade...")
        ai_response = model.generate_content([prompt, gemini_video])
        
        # Clean up the video from Google's servers & your local temp folder
        genai.delete_file(gemini_video.name)
        os.remove(temp_video_path)

        # Safely parse the JSON response
        try:
            raw_text = ai_response.text.replace("```json", "").replace("```", "").strip()
            speech_data = json.loads(raw_text)
            content_score = int(speech_data.get("content_score", 75))
            speech_feedback = speech_data.get("speech_feedback", "Good effort, but try to speak more clearly.")
        except Exception as e:
            print(f"Error parsing Gemini JSON: {e}")
            content_score = 70
            speech_feedback = "The AI could not perfectly transcribe your audio. Please ensure your microphone is loud and clear."

        # The Overall Score is now a true representation of the interview!
        # 60% what you say, 20% eye contact, 20% posture
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
        raise HTTPException(status_code=500, detail=f"Analysis Error: {str(e)}")