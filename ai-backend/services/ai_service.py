import os
import json
import time
import traceback
from google import genai
from google.genai import types

# Initialize Gemini client
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def generate_speech_feedback(temp_video_path: str, question: str) -> dict:
    """Uploads video to Gemini and generates speech feedback using dynamic model selection."""

    # Guard: reject suspiciously tiny recordings before calling Gemini.
    try:
        file_size = os.path.getsize(temp_video_path)
    except OSError:
        file_size = 0

    MIN_VIDEO_BYTES = 30_000  # ~30KB
    if file_size < MIN_VIDEO_BYTES:
        print(f"⚠️ Video too small ({file_size} bytes) — treating as no answer given.")
        return {
            "content_score": 0,
            "speech_feedback": "No answer was detected in this recording. Make sure you speak clearly after the question is asked.",
            "suggested_answer": ""
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
        Act as a FAANG-level bar-raiser interviewer who has assessed thousands of candidates.
        You know the difference between someone who deeply understands a topic and someone who
        merely sounds confident. Watch this candidate answer: "{question}"

        STRICT GRADING RUBRIC. Most real candidates should land between 35 and 65. Reserve 85+ for
        genuinely exceptional answers only — do not treat that as the default or common outcome.
        - 95-100: Flawless. Complete, precisely structured (e.g. STAR method), deep technical accuracy,
          no wasted words. Would impress a senior technical leader.
        - 80-94: Very strong. Clear structure and solid depth, only minor gaps.
        - 60-79: Decent but incomplete. Right general direction, but missing specifics, concrete
          evidence, or technical precision. Rambling or unfocused sections count against this band.
        - 35-59: Weak. Mostly filler or vague generalities, little to no concrete evidence, avoids the
          hard part of the question.
        - 10-34: Very weak. Barely addresses the actual question, mostly off-topic or superficial.
        - 0-9: Silent, inaudible, or no real verbal answer at all.

        RULES YOU MUST FOLLOW, NO EXCEPTIONS:
        1. Do not round up to be encouraging. If an answer is genuinely a 52, score it 52 — not 65, not 70.
        2. Confidence and fluency are NOT content quality. Do not reward someone who sounds articulate
           but says nothing substantive.
        3. A generic, textbook-sounding answer with no specific example or evidence is capped at 65.
        4. If the candidate does not address the question, cap the score at 30.
        5. If the candidate is silent, score 0-9.

        Return your analysis inside a strict JSON layout containing exactly these three keys:
        "content_score", "speech_feedback", and "suggested_answer".
        """

        # ── DYNAMIC MODEL SELECTION LOOP ──
        available_models = [
            m.name for m in client.models.list() 
            if "flash" in m.name 
            and "preview" not in m.name 
            and "audio" not in m.name 
            and "image" not in m.name
        ]
        available_models.sort(reverse=True)

        speech_data = None
        for model_name in available_models:
            try:
                print(f"⏳ Grading video with model: {model_name}...")
                ai_response = client.models.generate_content(
                    model=model_name,
                    contents=[gemini_video, prompt],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                    ),
                )
                speech_data = json.loads(ai_response.text.strip())
                print(f"✅ Video successfully analyzed by {model_name}!")
                break
            except Exception as e:
                print(f"⚠️ {model_name} video grading failed. Trying next model...")
                continue

        if not speech_data:
            raise Exception("All Gemini models failed to analyze video.")

        content_score = int(speech_data.get("content_score", 0))
        speech_feedback = speech_data.get("speech_feedback", "Could not generate detailed feedback for this answer.")
        suggested_answer = speech_data.get("suggested_answer", "")

        return {
            "content_score": content_score,
            "speech_feedback": speech_feedback,
            "suggested_answer": suggested_answer
        }

    except Exception as err:
        print(f"🔥 Error during Gemini analysis: {err}")
        traceback.print_exc()
        return {
            "content_score": 0,
            "speech_feedback": "[System error] This answer could not be analyzed due to a technical failure.",
            "suggested_answer": ""
        }
    finally:
        if gemini_file_name:
            try:
                client.files.delete(name=gemini_file_name)
                print("🧹 Cleaned cloud staging file.")
            except Exception:
                pass