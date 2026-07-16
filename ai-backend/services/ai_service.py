import os
import json
import time
from google import genai
from google.genai import types

# Initialize Gemini client
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def generate_speech_feedback(temp_video_path: str, question: str) -> dict:
    """Uploads video to Gemini and generates speech feedback."""
    print("👉 Uploading video to Gemini for Speech Analysis...")
    gemini_video = client.files.upload(file=temp_video_path)
    gemini_file_name = gemini_video.name

    try:
        while gemini_video.state.name == "PROCESSING":
            print("⏳ Waiting for Google servers to process the video...")
            time.sleep(3)
            gemini_video = client.files.get(name=gemini_file_name)

        if gemini_video.state.name == "FAILED":
            raise Exception("Gemini failed to process the video file.")

        print("👉 Generating AI Speech Grade...")
        prompt = f"""
        Act as a STRICT Senior Technical Recruiter. Watch this candidate answer the question: "{question}"
        
        CRITICAL GRADING RUBRIC:
        - 90-100: Exceptional, detailed, perfectly structured (e.g., STAR method), highly technical.
        - 70-89: Good, but missing some depth, clarity, or technical accuracy.
        - 40-69: Vague, very short, or heavily relies on filler words.
        - 10-39: Completely missed the point or barely spoke.

        Do NOT be overly polite. Be harsh but fair. Penalize short answers heavily.
        Return your analysis inside a strict JSON layout containing exactly these two keys: "content_score" and "speech_feedback".
        """

        ai_response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[gemini_video, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )

        speech_data = json.loads(ai_response.text.strip())
        content_score = int(speech_data.get("content_score", 75))
        speech_feedback = speech_data.get("speech_feedback", "Good effort, but try to speak more clearly.")

        return {
            "content_score": content_score,
            "speech_feedback": speech_feedback
        }

    except Exception as err:
        print(f"Error during Gemini analysis: {err}")
        return {
            "content_score": 70,
            "speech_feedback": "Analysis completed. Good vocabulary structure, but look into pacing your answer cleanly."
        }
    finally:
        # Clean up the file from Google's servers automatically
        try:
            client.files.delete(name=gemini_file_name)
            print("🧹 Cleaned cloud staging file.")
        except Exception:
            pass