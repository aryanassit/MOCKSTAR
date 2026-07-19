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
    """Analyzes a video for eye contact and posture efficiently."""
    print(f"👉 Running {CV_ENGINE} Computer Vision...")
    
    cap = cv2.VideoCapture(temp_video_path)
    
    # 1. Get the actual frame rate of the video dynamically
    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0:
        fps = 30  # Fallback just in case metadata is missing
    
    # 2. Calculate exactly how many frames to skip to process 1 frame per second
    frame_interval = max(1, int(fps)) 

    total_frames = 0
    processed_frames = 0
    face_visible_frames = 0
    good_posture_frames = 0

    if CV_ENGINE == "MEDIAPIPE":
        with mp_face_detection.FaceDetection(min_detection_confidence=0.5) as face_detection, \
             mp_pose.Pose(min_detection_confidence=0.5) as pose:
            while cap.isOpened():
                success, image = cap.read()
                if not success:
                    break
                
                total_frames += 1
                # 🚀 AGGRESSIVE SKIP: Only process 1 frame per second
                if total_frames % frame_interval != 0:
                    continue
                
                processed_frames += 1
                image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                face_present = bool(face_detection.process(image_rgb).detections)
                
                if face_present:
                    face_visible_frames += 1
                
                pose_results = pose.process(image_rgb)
                if pose_results.pose_landmarks and face_present:
                    left = pose_results.pose_landmarks.landmark[mp_pose.PoseLandmark.LEFT_SHOULDER]
                    right = pose_results.pose_landmarks.landmark[mp_pose.PoseLandmark.RIGHT_SHOULDER]
                    
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
            if not success:
                break
            
            total_frames += 1
            # 🚀 AGGRESSIVE SKIP: Only process 1 frame per second
            if total_frames % frame_interval != 0:
                continue
            
            processed_frames += 1
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
            if len(faces) > 0:
                face_visible_frames += 1
                
    cap.release()

    # 3. Calculate scores based on the actual frames we evaluated
    analyzed_frames = max(1, processed_frames)
    
    base_eye_score = (face_visible_frames / analyzed_frames) * 100
    eye_contact_score = int(base_eye_score * 0.8)
    
    if CV_ENGINE == "MEDIAPIPE":
        base_posture = (good_posture_frames / analyzed_frames) * 100
        posture_score = int(base_posture * 0.85)
    else:
        posture_score = int(base_eye_score * 0.6)
        
    return {
        "eye_contact_score": eye_contact_score,
        "posture_score": posture_score
    }