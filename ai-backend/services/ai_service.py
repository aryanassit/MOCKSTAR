import os
import json
import time
import traceback
from google import genai
from google.genai import types

# Initialize Gemini client
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def generate_speech_feedback(temp_video_path: str, question: str) -> dict:
    """Uploads video to Gemini and generates speech feedback."""

    # Guard: reject suspiciously tiny recordings before ever calling Gemini.
    # A near-empty file almost always means the candidate never spoke and
    # the frontend's silence-timeout cut the recording almost immediately.
    try:
        file_size = os.path.getsize(temp_video_path)
    except OSError:
        file_size = 0

    MIN_VIDEO_BYTES = 30_000  # ~30KB; tune based on real short-answer clips
    if file_size < MIN_VIDEO_BYTES:
        print(f"⚠️ Video too small ({file_size} bytes) — treating as no answer given.")
        return {
            "content_score": 0,
            "speech_feedback": "No answer was detected in this recording. Make sure you speak clearly after the question is asked."
        }

    gemini_file_name = None
    try:
        print("👉 Uploading video to Gemini for Speech Analysis...")
        gemini_video = client.files.upload(file=temp_video_path)
        gemini_file_name = gemini_video.name

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
        - 10-39: Weak answer, barely on topic, very little substance.
        - 0-9: The candidate is silent, says nothing meaningful, or does not answer the question at all.

        If the candidate does not speak, mumbles inaudibly, or the video contains no real verbal answer,
        you MUST score content_score between 0 and 9. Do not be generous. A silent or empty answer is NOT
        a 40-69 "vague" answer — it is a 0-9 non-answer.

        Do NOT be overly polite. Be harsh but fair. Penalize short or silent answers heavily.
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

        if "content_score" not in speech_data:
            print(f"⚠️ Gemini response missing content_score. Raw response: {ai_response.text}")

        content_score = int(speech_data.get("content_score", 0))
        speech_feedback = speech_data.get("speech_feedback", "Could not generate detailed feedback for this answer.")

        return {
            "content_score": content_score,
            "speech_feedback": speech_feedback
        }

    except Exception as err:
        # Log the FULL error server-side so failures are visible, not hidden.
        print(f"🔥 Error during Gemini analysis: {err}")
        traceback.print_exc()
        return {
            "content_score": 0,
            "speech_feedback": "AI analysis could not be completed for this answer due to a technical error. This score does not reflect answer quality — check server logs."
        }
    finally:
        # Clean up the file from Google's servers automatically
        if gemini_file_name:
            try:
                client.files.delete(name=gemini_file_name)
                print("🧹 Cleaned cloud staging file.")
            except Exception:
                pass
