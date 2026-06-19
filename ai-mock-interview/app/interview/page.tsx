"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function InterviewRoom() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoUrlsRef = useRef<string[]>([]); // Tracks uploaded videos
  
  const [userId, setUserId] = useState<string | null>(null);
  const [hasCameraAccess, setHasCameraAccess] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [aiQuestions, setAiQuestions] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const activeStreamRef = useRef<MediaStream | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false); 

  // Final Results State
  const [isInterviewComplete, setIsInterviewComplete] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [finalScores, setFinalScores] = useState<any>(null);

  useEffect(() => {
    const initializeInterview = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return router.push('/');
        setUserId(session.user.id);

        const { data: profileData } = await supabase.from('profiles').select('resume_url').eq('id', session.user.id).single();
        if (!profileData?.resume_url) {
          alert("Resume not found.");
          return router.push('/dashboard');
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/generate-questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resume_url: profileData.resume_url })
        });

        if (!response.ok) throw new Error("Failed to generate AI questions");
        const data = await response.json();
        setAiQuestions(data.questions);

        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        activeStreamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setHasCameraAccess(true);
        setupVAD(stream);

      } catch (err) {
        console.error(err);
        alert("Error setting up interview.");
      } finally {
        setIsInitializing(false);
      }
    };

    initializeInterview();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [router]);
  useEffect(() => {
    if (!isInitializing && videoRef.current && activeStreamRef.current) {
      videoRef.current.srcObject = activeStreamRef.current;
    }
  }, [isInitializing]);


  const setupVAD = (stream: MediaStream) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioContext;
  }
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);
    const scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);

    analyser.smoothingTimeConstant = 0.8;
    analyser.fftSize = 1024;
    microphone.connect(analyser);
    analyser.connect(scriptProcessor);
    scriptProcessor.connect(audioContext.destination);

    scriptProcessor.onaudioprocess = () => {
      const array = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(array);
      const volumeLevel = array.reduce((a, value) => a + value, 0) / array.length;

      const silenceThreshold = 18; 
      const isActuallyRecording = mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording';

      if (volumeLevel > silenceThreshold) {
        setIsSpeaking(true);
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      } else {
        setIsSpeaking(false);
        if (isActuallyRecording && !silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
              mediaRecorderRef.current.stop(); 
              setIsRecording(false);
            }
            silenceTimerRef.current = null;
          }, 3000); 
        }
      }
    };
  };

  const startRecordingAnswer = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        setIsProcessingVideo(true);
        const videoBlob = new Blob(chunksRef.current, { type: 'video/webm' });
        chunksRef.current = []; 

        const fileName = `${userId}-q${currentQuestionIndex + 1}-${Date.now()}.webm`;
        
        try {
          const { error } = await supabase.storage.from('video_chunks').upload(fileName, videoBlob);
          if (error) throw error;
          
          // Get the public URL and save it to our Ref
          const { data: publicUrlData } = supabase.storage.from('video_chunks').getPublicUrl(fileName);
          videoUrlsRef.current.push(publicUrlData.publicUrl);

        } catch (error) {
          console.error("Upload error:", error);
        } finally {
          setIsProcessingVideo(false);
          moveToNextQuestion();
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    }
  };

  const moveToNextQuestion = () => {
    if (currentQuestionIndex < aiQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setIsInterviewComplete(true);
      
      // THE BRUTAL CAMERA KILL SWITCH
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log("Killed track:", track.kind);
        });
      }
      
      analyzeFinalResults();
    }
  };

  const analyzeFinalResults = async () => {
    setIsAnalyzing(true);
    try {
      const lastVideoUrl = videoUrlsRef.current[videoUrlsRef.current.length - 1];
      const lastQuestion = aiQuestions[aiQuestions.length - 1]; // Grab the question!
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/analyze-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          video_url: lastVideoUrl,
          question: lastQuestion // Send it to Python!
        })
      });

      if (!response.ok) throw new Error("Failed to analyze video");
      const data = await response.json();
      setFinalScores(data);

    } catch (error) {
      console.error(error);
      alert("Failed to analyze interview.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- UI RENDERING ---

  // 1. Initial Loading State
  if (isInitializing) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', color: '#fff' }}>
        <div style={{ width: '50px', height: '50px', border: '4px solid #3b82f6', borderTop: '4px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '20px' }} />
        <h2 style={{ margin: 0 }}>AI is reading your resume...</h2>
        <p style={{ color: '#94a3b8' }}>Generating custom interview questions</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // 2. Final Results State (NEW)
  if (isInterviewComplete) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
        {isAnalyzing ? (
          <div style={{ textAlign: 'center' }}>
             <div style={{ width: '60px', height: '60px', border: '5px solid #10b981', borderTop: '5px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px auto' }} />
             <h2 style={{ color: '#f8fafc', fontSize: '24px' }}>AI is analyzing your body language...</h2>
             <p style={{ color: '#94a3b8' }}>Running Computer Vision models</p>
          </div>
        ) : (
          <div style={{ backgroundColor: '#1e293b', padding: '50px', borderRadius: '24px', maxWidth: '600px', width: '100%', textAlign: 'center', border: '1px solid #334155', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ backgroundColor: '#064e3b', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', fontSize: '36px' }}>🎉</div>
            <h2 style={{ margin: '0 0 10px 0', fontSize: '32px', color: '#f8fafc' }}>Interview Complete</h2>
            <p style={{ color: '#94a3b8', marginBottom: '40px' }}>Your Non-Verbal Communication Score</p>
            
            <h2 style={{ margin: '0 0 10px 0', fontSize: '32px', color: '#f8fafc' }}>Interview Complete</h2>
            <p style={{ color: '#94a3b8', marginBottom: '40px' }}>Your AI Performance Review</p>
            
            {/* NEW: Speech Content Score */}
            <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid #3b82f6', marginBottom: '20px' }}>
              <div style={{ fontSize: '14px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Answer Quality (Speech)</div>
              <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#3b82f6' }}>{finalScores?.content_score}%</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', marginBottom: '40px' }}>
              <div style={{ flex: 1, backgroundColor: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '14px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Eye Contact</div>
                <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#10b981' }}>{finalScores?.eye_contact_score}%</div>
              </div>
              <div style={{ flex: 1, backgroundColor: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '14px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Posture</div>
                <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#10b981' }}>{finalScores?.posture_score}%</div>
              </div>
            </div>

            <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #f59e0b', textAlign: 'left', marginBottom: '30px' }}>
              <h4 style={{ margin: '0 0 5px 0', color: '#f8fafc' }}>AI Feedback</h4>
              <p style={{ margin: 0, color: '#cbd5e1' }}>{finalScores?.feedback}</p>
            </div>

            <button onClick={() => router.push('/dashboard')} style={{ width: '100%', padding: '16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>
              Return to Dashboard
            </button>
          </div>
        )}
      </div>
    );
  }

  // 3. The Active Interview Room State
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#fff', padding: '40px 20px', fontFamily: 'system-ui, sans-serif' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '15px', marginBottom: '30px', maxWidth: '1200px', margin: '0 auto 30px auto' }}>
        <h2 style={{ margin: 0, color: '#f8fafc' }}>Technical Interview</h2>
        <div style={{ backgroundColor: '#1e293b', padding: '8px 16px', borderRadius: '20px', fontSize: '14px', border: '1px solid #334155' }}>
          Question {currentQuestionIndex + 1} of {aiQuestions.length}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '40px', maxWidth: '1200px', margin: '0 auto' }}>
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h3 style={{ color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '14px', fontWeight: 'bold' }}>Current AI Question:</h3>
          <p style={{ fontSize: '28px', lineHeight: '1.4', fontWeight: '600', color: '#f8fafc', minHeight: '120px' }}>
            "{aiQuestions[currentQuestionIndex]}"
          </p>
          
          <div style={{ marginTop: '30px', padding: '25px', backgroundColor: '#1e293b', borderRadius: '12px', borderLeft: isRecording ? (isSpeaking ? '5px solid #10b981' : '5px solid #f59e0b') : '5px solid #3b82f6', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}>
            
            {isProcessingVideo ? (
               <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                 <div style={{ width: '24px', height: '24px', border: '3px solid #10b981', borderTop: '3px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                 <h4 style={{ margin: 0, fontSize: '18px', color: '#10b981' }}>Securely saving video...</h4>
               </div>
            ) : !isRecording ? (
              <div>
                <h4 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>Ready for this question?</h4>
                <button onClick={startRecordingAnswer} style={{ padding: '12px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>
                  Start Recording Answer
                </button>
              </div>
            ) : (
              <div>
                <h4 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px' }}>
                  {isSpeaking ? (
                    <><span style={{ display: 'inline-block', width: '14px', height: '14px', backgroundColor: '#10b981', borderRadius: '50%' }}></span> AI is listening...</>
                  ) : (
                    <><span style={{ display: 'inline-block', width: '14px', height: '14px', backgroundColor: '#f59e0b', borderRadius: '50%' }}></span> Silence Detected (Saving in 3s)...</>
                  )}
                </h4>
                <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
                  (Stop talking when finished. The AI handles the rest.)
                </p>
              </div>
            )}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ backgroundColor: '#000', borderRadius: '16px', overflow: 'hidden', position: 'relative', border: '2px solid #334155', aspectRatio: '16/9', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
            {!hasCameraAccess && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                Activating secure camera feed...
              </div>
            )}
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
