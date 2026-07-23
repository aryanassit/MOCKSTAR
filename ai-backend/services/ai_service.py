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
        1. Do not round up to be encouraging. If an answer is genuinely a 52, score it 52 — not 65,
           not 70.
        2. Confidence and fluency are NOT content quality. Do not reward someone who sounds articulate
           but says nothing substantive.
        3. A generic, textbook-sounding answer with no specific example or evidence is capped at 65,
           even if delivered smoothly.
        4. If the candidate does not actually address the question asked, cap the score at 30
           regardless of how well they speak.
        5. If the candidate is silent, mumbles inaudibly, or gives no real verbal answer, you MUST
           score 0-9. This is non-negotiable, even if the video shows them appearing to think or
           gesture.

        Also write a strong, concise MODEL ANSWER to this same question — a 3-5 sentence example of
        how a top candidate would answer it well. Write this regardless of how the candidate actually
        answered, so they have something concrete to learn from.

        Return your analysis inside a strict JSON layout containing exactly these three keys:
        "content_score", "speech_feedback", and "suggested_answer". The speech_feedback must reference
        what the candidate specifically said — not generic advice that could apply to any answer.
        """

        ai_response = client.models.generate_content(
            model='gemini-flash',
            contents=[gemini_video, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )

        # 1. Get the raw text from Gemini
        raw_text = ai_response.text.strip()
        
        # 2. Strip markdown backticks if Gemini included them
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        elif raw_text.startswith("```"):
            raw_text = raw_text[3:]
            
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
            
        # 3. Clean up any remaining whitespace
        cleaned_text = raw_text.strip()
        
        # 4. Safely parse the JSON
        speech_data = json.loads(cleaned_text)

        if "content_score" not in speech_data:
            print(f"⚠️ Gemini response missing content_score. Raw response: {ai_response.text}")

        content_score = int(speech_data.get("content_score", 0))
        speech_feedback = speech_data.get("speech_feedback", "Could not generate detailed feedback for this answer.")
        suggested_answer = speech_data.get("suggested_answer", "")

        return {
            "content_score": content_score,
            "speech_feedback": speech_feedback,
            "suggested_answer": suggested_answer
        }

    except Exception as err:
        # Log the FULL error server-side so failures are visible, not hidden.
        print(f"🔥 Error during Gemini analysis: {err}")
        traceback.print_exc()
        return {
            "content_score": 0,
            "speech_feedback": "[System error] This answer could not be analyzed due to a technical failure on our end — not a reflection of your answer. Check server logs for the underlying error.",
            "suggested_answer": ""
        }
    finally:
        # Clean up the file from Google's servers automatically
        if gemini_file_name:
            try:
                client.files.delete(name=gemini_file_name)
                print("🧹 Cleaned cloud staging file.")
            except Exception:
                pass
