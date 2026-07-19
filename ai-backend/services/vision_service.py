import cv2

# --- DUAL-ENGINE COMPUTER VISION SETUP ---
CV_ENGINE = "OPENCV"
try:
    import mediapipe as mp
    mp_face_detection = mp.solutions.face_detection
    mp_pose = mp.solutions.pose
    CV_ENGINE = "MEDIAPIPE"
    print("✅ Advanced MediaPipe Vision Engine Loaded.")
except Exception:
    print("⚠️ MediaPipe unavailable. Using Headless OpenCV Face AI Engine.")

def process_video_frames(temp_video_path: str) -> dict:
    """Analyzes a video for eye contact and posture."""
    print(f"👉 Running {CV_ENGINE} Computer Vision...")
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
                
                # Process every 5th frame for speed
                if total_frames % 5 != 0: continue

                image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                face_present = bool(face_detection.process(image_rgb).detections)
                if face_present:
                    face_visible_frames += 1
                
                pose_results = pose.process(image_rgb)
                if pose_results.pose_landmarks and face_present:
                    left = pose_results.pose_landmarks.landmark[mp_pose.PoseLandmark.LEFT_SHOULDER]
                    right = pose_results.pose_landmarks.landmark[mp_pose.PoseLandmark.RIGHT_SHOULDER]
                    # Require the model to actually be confident these shoulder points are real,
                    # not just guessed from a partially-visible or absent person.
                    landmarks_confident = (
                        getattr(left, "visibility", 1.0) > 0.75 and
                        getattr(right, "visibility", 1.0) > 0.75
                    )
                    if landmarks_confident and abs(left.y - right.y) < 0.05:
                        good_posture_frames += 1
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

    # Calculate Vision Scores (Harsher Grading)
    analyzed_frames = max(1, total_frames // 5)
    
    # Base face visibility
    base_eye_score = (face_visible_frames / analyzed_frames) * 100
    # Penalty: true sustained eye contact is rarely perfect, and brief glances off-camera
    # (reading, blinking, thinking) shouldn't be scored as if they didn't happen.
    eye_contact_score = int(base_eye_score * 0.8)
    
    if CV_ENGINE == "MEDIAPIPE":
        base_posture = (good_posture_frames / analyzed_frames) * 100
        posture_score = int(base_posture * 0.85)  # penalty for micro-movements and drift
    else:
        # No real posture estimation is possible with plain OpenCV (no pose landmarks
        # without MediaPipe). Rather than inventing a number, we honestly report posture
        # as directly tied to whether a face was detected at all — no randomness, no
        # pretending we measured something we didn't. Scaled down further since this is
        # a weak proxy, not a real posture measurement.
        posture_score = int(base_eye_score * 0.6)

    return {
        "eye_contact_score": eye_contact_score,
        "posture_score": posture_score
    }
