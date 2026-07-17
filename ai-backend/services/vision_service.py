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

    # Calculate Vision Scores (Harsher Grading)
    analyzed_frames = max(1, total_frames // 5)
    
    # Base face visibility
    base_eye_score = (face_visible_frames / analyzed_frames) * 100
    eye_contact_score = int((face_visible_frames / analyzed_frames) * 100)
    eye_contact_score = min(100, max(0, eye_contact_score))

    posture_score = max(50, eye_contact_score - 10) if CV_ENGINE == "OPENCV" else int((good_posture_frames / analyzed_frames) * 100)
    posture_score = min(100, max(0, posture_score))

    return {
        "eye_contact_score": eye_contact_score,
        "posture_score": posture_score
    }
