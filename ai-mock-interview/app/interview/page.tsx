"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';

function ScoreBarChart({ speech, eye, posture }: { speech: number; eye: number; posture: number }) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setDrawn(true), 150); return () => clearTimeout(t); }, []);
  const bars = [
    { label: 'Speech Content', value: speech, color: '#A0AB97' },
    { label: 'Eye Contact', value: eye, color: '#8F9B88' },
    { label: 'Posture', value: posture, color: '#75624E' },
  ];
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px', width:'100%' }}>
      {bars.map((b, i) => (
        <div key={b.label} style={{ width:'100%' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
            <span style={{ fontSize:'13px', fontWeight:600, color:'#2E2A25' }}>{b.label}</span>
            <span style={{ fontSize:'13px', fontWeight:800, color:'#2E2A25' }}>{Math.round(b.value)}%</span>
          </div>
          <div style={{ width:'100%', height:'14px', background:'#D8C7B3', borderRadius:'99px', overflow:'hidden' }}>
            <div style={{ height:'100%', width:drawn ? `${Math.max(1.5, b.value)}%` : '0%', background:`linear-gradient(90deg, ${b.color}, ${b.color}cc)`, borderRadius:'99px', transition:`width 0.9s cubic-bezier(0.22,1,0.36,1) ${i * 0.12}s` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function InterviewRoomInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roundType = (searchParams.get('round') === 'hr') ? 'hr' : 'technical';
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoUrlsRef = useRef<string[]>([]);
  const activeStreamRef = useRef<MediaStream | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [hasCameraAccess, setHasCameraAccess] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [aiQuestions, setAiQuestions] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const [isInterviewComplete, setIsInterviewComplete] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [finalScores, setFinalScores] = useState<any>(null);
  const [questionResults, setQuestionResults] = useState<any[]>([]);
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0 });
  const [volumeLevel, setVolumeLevel] = useState(0);

  // ── Engagement state (loading messages, timers, toasts, celebration) ─
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [expandedQ, setExpandedQ] = useState<Record<number, boolean>>({ 0: true });
  const [animScores, setAnimScores] = useState({ overall: 0, content: 0, eye: 0, posture: 0 });
  const [confettiPieces, setConfettiPieces] = useState<any[]>([]);

  const loadingMessages = [
    "Scanning your resume...",
    "Understanding your experience...",
    "Identifying your key skills...",
    "Crafting challenging questions...",
    "Almost ready...",
  ];

  const toggleQ = (i: number) => setExpandedQ(prev => ({ ...prev, [i]: !prev[i] }));
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // ── Voice feature state ──────────────────────────────────────────
  const [muted, setMuted] = useState(false);
  const [isSpeakingQuestion, setIsSpeakingQuestion] = useState(false);

  // ── Speak a question using browser TTS ──────────────────────────
  const speakQuestion = (text: string) => {
    if (!window.speechSynthesis || muted) return;
    window.speechSynthesis.cancel();
    setIsSpeakingQuestion(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;
    utterance.pitch = 1;
    utterance.volume = 1;
    // Try to pick a natural voice
    const trySpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferred =
  voices.find(v => v.name.includes('Samantha')) ||        // macOS female
  voices.find(v => v.name.includes('Karen')) ||           // macOS female
  voices.find(v => v.name.includes('Zira')) ||            // Windows female
  voices.find(v => v.name.includes('Google UK English Female')) ||
  voices.find(v => v.name.includes('Google US English') && v.name.includes('Female')) ||
             // generic fallback
  voices.find(v => v.lang === 'en-US' && v.name.toLowerCase().includes('female')) ||
  voices.find(v => v.lang === 'en-GB');                   // British English tends to be female by default
      if (preferred) utterance.voice = preferred;
      utterance.onend = () => setIsSpeakingQuestion(false);
      utterance.onerror = () => setIsSpeakingQuestion(false);
      window.speechSynthesis.speak(utterance);
    };
    // Chrome loads voices async
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => { trySpeak(); window.speechSynthesis.onvoiceschanged = null; };
    } else {
      trySpeak();
    }
  };

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setIsSpeakingQuestion(false);
  };

  const toggleMute = () => {
    const newMuted = !muted;
    setMuted(newMuted);
    if (newMuted) stopSpeaking();
  };

  // ── Speak whenever question changes ─────────────────────────────
  useEffect(() => {
    if (aiQuestions.length > 0 && !isInitializing) {
      speakQuestion(aiQuestions[currentQuestionIndex]);
    }
  }, [currentQuestionIndex, aiQuestions, isInitializing]);

  // ── Don't forget to stop TTS when mute is toggled ───────────────
  useEffect(() => {
    if (muted) stopSpeaking();
  }, [muted]);

  // ── Cycle fun status messages while the resume is being read ────
  useEffect(() => {
    if (!isInitializing) return;
    const iv = setInterval(() => {
      setLoadingMsgIndex(i => (i + 1) % loadingMessages.length);
    }, 1700);
    return () => clearInterval(iv);
  }, [isInitializing]);

  // ── Live recording timer ─────────────────────────────────────────
  useEffect(() => {
    let iv: NodeJS.Timeout | undefined;
    if (isRecording) {
      setRecordingSeconds(0);
      iv = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => { if (iv) clearInterval(iv); };
  }, [isRecording]);

  // ── Count-up animation for final scores ──────────────────────────
  useEffect(() => {
    if (!finalScores) return;
    const targets = {
      overall: Math.round((finalScores.content_score ?? 0) * 0.6 + (finalScores.eye_contact_score ?? 0) * 0.2 + (finalScores.posture_score ?? 0) * 0.2),
      content: finalScores.content_score ?? 0,
      eye: finalScores.eye_contact_score ?? 0,
      posture: finalScores.posture_score ?? 0,
    };
    const duration = 1100;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimScores({
        overall: Math.round(targets.overall * eased),
        content: Math.round(targets.content * eased),
        eye: Math.round(targets.eye * eased),
        posture: Math.round(targets.posture * eased),
      });
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [finalScores]);

  // ── Celebration confetti for a solid overall score ───────────────
  useEffect(() => {
    if (!finalScores) return;
    const overall = Math.round((finalScores.content_score ?? 0) * 0.6 + (finalScores.eye_contact_score ?? 0) * 0.2 + (finalScores.posture_score ?? 0) * 0.2);
    if (overall < 60) return;
    const colors = ['#A0AB97', '#8F9B88', '#D8C7B3', '#75624E'];
    const pieces = Array.from({ length: 36 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.4,
      duration: 2.2 + Math.random() * 1.2,
      color: colors[i % colors.length],
      size: 6 + Math.random() * 6,
    }));
    setConfettiPieces(pieces);
    const t = setTimeout(() => setConfettiPieces([]), 4200);
    return () => clearTimeout(t);
  }, [finalScores]);

  // ── Main init ────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return router.push('/');
        setUserId(session.user.id);
        const { data: profile } = await supabase.from('profiles').select('resume_url').eq('id', session.user.id).single();
        if (!profile?.resume_url) { alert("Resume not found."); return router.push('/dashboard'); }

        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/generate-questions`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resume_url: profile.resume_url, round_type: roundType })
        });
        if (!response.ok) throw new Error("Failed to generate AI questions");
        const data = await response.json();
        setAiQuestions(data.questions);

        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        activeStreamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setHasCameraAccess(true);
        setupVAD(stream);
      } catch (err) { console.error(err); alert("Error setting up interview."); }
      finally { setIsInitializing(false); }
    };
    init();
    return () => {
      if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      if (audioContextRef.current) audioContextRef.current.close();
      stopSpeaking();
    };
  }, [router]);

  useEffect(() => {
    if (!isInitializing && videoRef.current && activeStreamRef.current)
      videoRef.current.srcObject = activeStreamRef.current;
  }, [isInitializing]);

  // ── VAD ──────────────────────────────────────────────────────────
  const setupVAD = (stream: MediaStream) => {
    const ac = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = ac;
    const analyser = ac.createAnalyser();
    const mic = ac.createMediaStreamSource(stream);
    const sp = ac.createScriptProcessor(2048, 1, 1);
    analyser.smoothingTimeConstant = 0.8; analyser.fftSize = 1024;
    mic.connect(analyser); analyser.connect(sp); sp.connect(ac.destination);
    sp.onaudioprocess = () => {
      const arr = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(arr);
      const vol = arr.reduce((a, v) => a + v, 0) / arr.length;
      setVolumeLevel(vol);
      const isRec = mediaRecorderRef.current?.state === 'recording';
      if (vol > 18) {
        setIsSpeaking(true);
        if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
      } else {
        setIsSpeaking(false);
        if (isRec && !silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            if (mediaRecorderRef.current?.state !== 'inactive') { mediaRecorderRef.current!.stop(); setIsRecording(false); }
            silenceTimerRef.current = null;
          }, 3000);
        }
      }
    };
  };

  // ── Recording ────────────────────────────────────────────────────
  const startRecordingAnswer = () => {
    stopSpeaking(); // stop TTS before recording starts
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const mr = new MediaRecorder(stream, { mimeType: 'video/webm' });
      mediaRecorderRef.current = mr;
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        setIsProcessingVideo(true);
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        chunksRef.current = [];
        const fn = `${userId}-q${currentQuestionIndex + 1}-${Date.now()}.webm`;
        try {
          const { error } = await supabase.storage.from('video_chunks').upload(fn, blob);
          if (error) throw error;
          const { data } = supabase.storage.from('video_chunks').getPublicUrl(fn);
          videoUrlsRef.current.push(data.publicUrl);
          setToast('✅ Answer saved!');
          setTimeout(() => setToast(null), 1800);
        } catch (e) { console.error(e); }
        finally { setIsProcessingVideo(false); moveToNextQuestion(); }
      };
      mr.start(); setIsRecording(true);
    }
  };

  const moveToNextQuestion = () => {
    if (currentQuestionIndex < aiQuestions.length - 1) {
      setCurrentQuestionIndex(p => p + 1);
    } else {
      setIsInterviewComplete(true);
      activeStreamRef.current?.getTracks().forEach(t => t.stop());
      stopSpeaking();
      analyzeFinalResults();
    }
  };

  // ── Analysis + save ──────────────────────────────────────────────
  const analyzeFinalResults = async () => {
    setIsAnalyzing(true);
    const results: any[] = [];
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const total = aiQuestions.length;
      setAnalysisProgress({ current: 0, total });

      // Analyze each question's video one at a time (sequential, not parallel —
      // avoids hammering the Gemini API and keeps upload order predictable).
      for (let i = 0; i < total; i++) {
        setAnalysisProgress({ current: i + 1, total });
        const videoUrl = videoUrlsRef.current[i];
        const question = aiQuestions[i];
        if (!videoUrl) {
          results.push({ question, content_score: 0, eye_contact_score: 0, posture_score: 0, feedback: 'No recording was saved for this question.', suggested_answer: '' });
          continue;
        }
        try {
          const response = await fetch(`${backendUrl}/analyze-video`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ video_url: videoUrl, question })
          });
          if (!response.ok) throw new Error(`Analysis failed for question ${i + 1}`);
          const data = await response.json();
          results.push({
            question,
            content_score: data.content_score ?? 0,
            eye_contact_score: data.eye_contact_score ?? 0,
            posture_score: data.posture_score ?? 0,
            feedback: data.feedback ?? '',
            suggested_answer: data.suggested_answer ?? '',
          });
        } catch (err) {
          console.error(`Question ${i + 1} analysis error:`, err);
          results.push({ question, content_score: 0, eye_contact_score: 0, posture_score: 0, feedback: 'This answer could not be analyzed due to a technical error.', suggested_answer: '' });
        }
      }

      setQuestionResults(results);

      // Overall scores are the real average across every question, not a
      // single question's result copy-pasted across the board.
      const avg = (key: string) => results.reduce((sum, r) => sum + (r[key] ?? 0), 0) / (results.length || 1);
      const avgContent = avg('content_score');
      const avgEye = avg('eye_contact_score');
      const avgPosture = avg('posture_score');
      const overall = Math.round(avgContent * 0.6 + avgEye * 0.2 + avgPosture * 0.2);

      const combinedFeedback = results.map((r, i) => `Q${i + 1}: ${r.feedback}`).join(' ');

      setFinalScores({
        content_score: Math.round(avgContent),
        eye_contact_score: Math.round(avgEye),
        posture_score: Math.round(avgPosture),
        feedback: combinedFeedback,
      });

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from('interview_sessions').insert({
          user_id: session.user.id, overall_score: overall,
          speech_score: Math.round(avgContent),
          eye_contact_score: Math.round(avgEye),
          posture_score: Math.round(avgPosture),
          feedback: combinedFeedback,
          questions: results.map(r => ({ text: r.question, score: Math.round(r.content_score), feedback: r.feedback, suggested_answer: r.suggested_answer })),
        });
      }
    } catch (e) { console.error(e); alert("Failed to analyze interview."); }
    finally { setIsAnalyzing(false); }
  };

  // ── Styles ───────────────────────────────────────────────────────
  const S = (
    <style>{`
      @keyframes spin { to{transform:rotate(360deg)} }
      @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
      @keyframes fadeLeft { from{opacity:0;transform:translateX(-16px)} to{opacity:1;transform:none} }
      @keyframes fadeRight { from{opacity:0;transform:translateX(16px)} to{opacity:1;transform:none} }
      @keyframes scaleIn { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }
      @keyframes popIn { 0%{transform:scale(0.6);opacity:0} 70%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
      @keyframes pulseDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.8)} }
      @keyframes recPulse { 0%,100%{box-shadow:0 0 0 0 rgba(160,171,151,0.5)} 50%{box-shadow:0 0 0 10px rgba(160,171,151,0)} }
      @keyframes gradShift { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
      @keyframes orb1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(30px,-20px)} }
      @keyframes soundWave { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(1.8)} }
      @keyframes confettiFall { 0%{transform:translateY(-20px) rotate(0deg); opacity:1;} 100%{transform:translateY(100vh) rotate(720deg); opacity:0;} }
      @keyframes toastIn { from{opacity:0;transform:translate(-50%,12px)} to{opacity:1;transform:translate(-50%,0)} }
      @keyframes loadBar { 0%{transform:translateX(-100%)} 50%{transform:translateX(150%)} 100%{transform:translateX(150%)} }
      .btn-h { transition:transform 0.15s,box-shadow 0.15s,filter 0.15s; }
      .btn-h:hover { transform:translateY(-2px); filter:brightness(1.08); }
      .mute-btn { background:none; border:1px solid #D8C7B3; border-radius:8px; padding:6px 12px; font-size:12px; cursor:pointer; transition:all 0.15s; display:flex; align-items:center; gap:6px; }
      .mute-btn:hover { border-color:#8F9B88; background:rgba(160,171,151,0.08); }
      .replay-btn { background:none; border:none; color:#8F9B88; font-size:12px; cursor:pointer; padding:4px 8px; border-radius:6px; transition:background 0.15s; }
      .replay-btn:hover { background:rgba(160,171,151,0.1); }
    `}</style>
  );

  // ── 1. Loading ───────────────────────────────────────────────────
  if (isInitializing) return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#F3E8DA 0%,#EFE3D2 100%)', color:'#2E2A25', position:'relative', overflow:'hidden' }}>
      {S}
      <div style={{ position:'absolute', width:'400px', height:'400px', top:'-100px', left:'-50px', background:'radial-gradient(circle,rgba(160,171,151,0.1) 0%,transparent 70%)', borderRadius:'50%', animation:'orb1 10s ease-in-out infinite', pointerEvents:'none' }} />
      <div style={{ position:'relative', width:'64px', height:'64px', marginBottom:'24px' }}>
        <div style={{ position:'absolute', inset:0, border:'4px solid #D8C7B3', borderTopColor:'#A0AB97', borderRadius:'50%', animation:'spin 0.9s linear infinite' }} />
        <div style={{ position:'absolute', inset:'8px', border:'4px solid #D8C7B3', borderTopColor:'#8F9B88', borderRadius:'50%', animation:'spin 1.3s linear infinite reverse' }} />
      </div>
      <h2 style={{ margin:'0 0 6px', fontSize:'20px', fontWeight:700, animation:'fadeUp 0.5s ease' }}>AI is reading your resume...</h2>
      <p key={loadingMsgIndex} style={{ color:'#6F6A63', fontSize:'14px', animation:'fadeUp 0.4s ease', minHeight:'20px' }}>{loadingMessages[loadingMsgIndex]}</p>
      <div style={{ width:'220px', height:'5px', background:'#D8C7B3', borderRadius:'99px', marginTop:'18px', overflow:'hidden' }}>
        <div style={{ width:'40%', height:'100%', background:'linear-gradient(90deg,#A0AB97,#8F9B88)', borderRadius:'99px', animation:'loadBar 1.4s ease-in-out infinite' }} />
      </div>
    </div>
  );

  // ── 2. Results ───────────────────────────────────────────────────
  if (isInterviewComplete) {
    const overall = finalScores ? Math.round((finalScores.content_score ?? 0) * 0.6 + (finalScores.eye_contact_score ?? 0) * 0.2 + (finalScores.posture_score ?? 0) * 0.2) : 0;
    const badges: { emoji: string; label: string }[] = [];
    if (finalScores) {
      if ((finalScores.content_score ?? 0) >= 75) badges.push({ emoji: '🗣️', label: 'Strong Communicator' });
      if ((finalScores.eye_contact_score ?? 0) >= 70) badges.push({ emoji: '👀', label: 'Great Eye Contact' });
      if ((finalScores.posture_score ?? 0) >= 70) badges.push({ emoji: '🧍', label: 'Confident Posture' });
      if (badges.length === 0) badges.push({ emoji: '🌱', label: 'Room to Grow' });
    }
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#F3E8DA 0%,#EFE3D2 100%)', color:'#2E2A25', padding:'24px', position:'relative', overflow:'hidden', fontFamily:'system-ui,-apple-system,sans-serif' }}>
        {S}
        <div style={{ position:'absolute', width:'450px', height:'450px', top:'-120px', right:'-100px', background:'radial-gradient(circle,rgba(160,171,151,0.1) 0%,transparent 70%)', borderRadius:'50%', animation:'orb1 11s ease-in-out infinite', pointerEvents:'none' }} />
        {confettiPieces.length > 0 && (
          <div style={{ position:'fixed', inset:0, pointerEvents:'none', overflow:'hidden', zIndex:5 }}>
            {confettiPieces.map(p => (
              <div key={p.id} style={{ position:'absolute', top:'-20px', left:`${p.left}%`, width:p.size, height:p.size * 0.4, background:p.color, borderRadius:'2px', animation:`confettiFall ${p.duration}s ease-in ${p.delay}s forwards` }} />
            ))}
          </div>
        )}
        {isAnalyzing ? (
          <div style={{ textAlign:'center', position:'relative', zIndex:1 }}>
            <div style={{ position:'relative', width:'76px', height:'76px', margin:'0 auto 24px' }}>
              <div style={{ position:'absolute', inset:0, border:'5px solid #D8C7B3', borderTopColor:'#A0AB97', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
              <div style={{ position:'absolute', inset:'10px', border:'5px solid #D8C7B3', borderTopColor:'#8F9B88', borderRadius:'50%', animation:'spin 1.4s linear infinite reverse' }} />
            </div>
            <h2 style={{ color:'#2E2A25', fontSize:'24px', fontWeight:700, margin:'0 0 8px', animation:'fadeUp 0.5s ease' }}>Analyzing your answers...</h2>
            <p style={{ color:'#6F6A63', animation:'fadeUp 0.5s 0.1s ease both' }}>{analysisProgress.total > 0 ? `Question ${analysisProgress.current} of ${analysisProgress.total}` : 'Running Computer Vision + Speech models'}</p>
          </div>
        ) : (
          <div style={{ background:'#EFE3D2', padding:'44px 48px', borderRadius:'28px', maxWidth:'900px', width:'100%', textAlign:'center', border:'1px solid #D8C7B3', boxShadow:'0 30px 70px -15px rgba(0,0,0,0.7)', position:'relative', zIndex:1, animation:'scaleIn 0.4s cubic-bezier(0.22,1,0.36,1)' }}>
            <div style={{ width:'76px', height:'76px', borderRadius:'50%', background:'rgba(160,171,151,0.15)', border:'2px solid rgba(160,171,151,0.5)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontSize:'34px', animation:'popIn 0.6s cubic-bezier(0.22,1,0.36,1)', boxShadow:'0 0 30px rgba(160,171,151,0.3)' }}>🎉</div>
            <h2 style={{ margin:'0 0 6px', fontSize:'28px', fontWeight:800, color:'#2E2A25', animation:'fadeUp 0.5s ease' }}>Interview Complete</h2>
            <p style={{ color:'#6F6A63', marginBottom:'18px', fontSize:'14px', animation:'fadeUp 0.5s 0.08s ease both' }}>Your AI performance review</p>
            {badges.length > 0 && (
              <div style={{ display:'flex', gap:'8px', justifyContent:'center', flexWrap:'wrap', marginBottom:'26px', animation:'fadeUp 0.5s 0.14s ease both' }}>
                {badges.map((b, i) => (
                  <span key={i} style={{ display:'inline-flex', alignItems:'center', gap:'6px', background:'rgba(160,171,151,0.15)', border:'1px solid rgba(160,171,151,0.4)', color:'#2E2A25', fontSize:'12px', fontWeight:700, padding:'6px 12px', borderRadius:'99px' }}>
                    <span>{b.emoji}</span>{b.label}
                  </span>
                ))}
              </div>
            )}

            <div style={{ display:'flex', alignItems:'center', gap:'40px', textAlign:'left', marginBottom:'28px', flexWrap:'wrap' }}>
              <div style={{ margin:'0 auto', animation:'scaleIn 0.5s 0.12s cubic-bezier(0.22,1,0.36,1) both', textAlign:'center', flexShrink:0 }}>
                <svg width="150" height="150" viewBox="0 0 130 130" style={{ filter:'drop-shadow(0 0 12px rgba(160,171,151,0.4))' }}>
                  <circle cx="65" cy="65" r="56" fill="none" stroke="#EFE3D2" strokeWidth="10" />
                  <circle cx="65" cy="65" r="56" fill="none" stroke="#A0AB97" strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 56} strokeDashoffset={2 * Math.PI * 56 * (1 - animScores.overall / 100)}
                    style={{ transform:'rotate(-90deg)', transformOrigin:'65px 65px', transition:'stroke-dashoffset 0.3s ease' }} />
                  <text x="65" y="72" textAnchor="middle" fontSize="30" fontWeight="800" fill="#2E2A25">{animScores.overall}%</text>
                </svg>
                <p style={{ margin:'4px 0 0', fontSize:'12px', color:'#6F6A63' }}>Overall score</p>
              </div>
              <div style={{ flex:'1 1 320px', background:'#F3E8DA', padding:'20px 24px', borderRadius:'18px', border:'1px solid #D8C7B3', animation:'fadeUp 0.5s 0.2s ease both' }}>
                <p style={{ margin:'0 0 14px', fontSize:'11px', color:'#6F6A63', textTransform:'uppercase', letterSpacing:'1px' }}>Score breakdown</p>
                <ScoreBarChart speech={animScores.content} eye={animScores.eye} posture={animScores.posture} />
              </div>
            </div>

            <div style={{ background:'#F3E8DA', padding:'18px', borderRadius:'14px', borderLeft:'4px solid #A0AB97', textAlign:'left', marginBottom:'26px', animation:'fadeUp 0.5s 0.36s ease both' }}>
              <h4 style={{ margin:'0 0 6px', color:'#2E2A25', fontSize:'14px' }}>AI Feedback</h4>
              <p style={{ margin:0, color:'#6F6A63', fontSize:'13px', lineHeight:1.6 }}>{finalScores?.feedback}</p>
            </div>

            {questionResults.length > 0 && (
              <div style={{ textAlign:'left', marginBottom:'26px', animation:'fadeUp 0.5s 0.4s ease both' }}>
                <h3 style={{ margin:'0 0 14px', fontSize:'16px', fontWeight:800, color:'#2E2A25' }}>Question-by-question breakdown</h3>
                <p style={{ margin:'0 0 14px', fontSize:'12px', color:'#6F6A63' }}>Tap a question to see detailed feedback and a suggested answer.</p>
                <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                  {questionResults.map((r, i) => {
                    const isOpen = !!expandedQ[i];
                    return (
                      <div key={i} onClick={() => toggleQ(i)} style={{ background:'#F3E8DA', borderRadius:'16px', border:'1px solid #D8C7B3', padding:'16px 20px', cursor:'pointer', transition:'border-color 0.2s ease' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'12px' }}>
                          <p style={{ margin:0, fontSize:'14px', fontWeight:700, color:'#2E2A25', lineHeight:1.4, flex:1 }}>Q{i + 1}. {r.question}</p>
                          <div style={{ display:'flex', alignItems:'center', gap:'10px', flexShrink:0 }}>
                            <span style={{ fontSize:'13px', fontWeight:800, color:'#2E2A25', background:'rgba(160,171,151,0.3)', padding:'3px 10px', borderRadius:'99px', whiteSpace:'nowrap' }}>{Math.round(r.content_score)}%</span>
                            <span style={{ display:'inline-block', color:'#8F9B88', fontSize:'13px', transition:'transform 0.25s ease', transform:isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
                          </div>
                        </div>
                        {isOpen && (
                          <div style={{ marginTop:'12px', animation:'fadeUp 0.3s ease' }}>
                            <p style={{ margin:'0 0 12px', fontSize:'13px', color:'#6F6A63', lineHeight:1.6 }}>{r.feedback}</p>
                            {r.suggested_answer && (
                              <div style={{ background:'#EFE3D2', borderRadius:'10px', borderLeft:'3px solid #8F9B88', padding:'12px 14px' }}>
                                <p style={{ margin:'0 0 4px', fontSize:'10px', fontWeight:700, color:'#8F9B88', textTransform:'uppercase', letterSpacing:'0.06em' }}>Suggested answer</p>
                                <p style={{ margin:0, fontSize:'12.5px', color:'#2E2A25', lineHeight:1.6 }}>{r.suggested_answer}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button onClick={() => router.push('/dashboard')} className="btn-h" style={{ width:'100%', padding:'16px', background:'linear-gradient(135deg, #A0AB97, #8F9B88)', backgroundSize:'200% 200%', animation:'gradShift 4s ease infinite', color:'#2E2A25', border:'none', borderRadius:'14px', fontSize:'16px', fontWeight:700, cursor:'pointer', boxShadow:'0 8px 24px rgba(160,171,151,0.3)' }}>
              Return to Dashboard
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── 3. Active interview ──────────────────────────────────────────
  const volBars = Math.min(5, Math.floor(volumeLevel / 16));

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#F3E8DA 0%,#EFE3D2 100%)', color:'#2E2A25', padding:'36px 24px', fontFamily:'system-ui,-apple-system,sans-serif', position:'relative', overflow:'hidden' }}>
      {S}
      <div style={{ position:'absolute', width:'500px', height:'500px', top:'-200px', left:'20%', background:'radial-gradient(circle,rgba(160,171,151,0.06) 0%,transparent 70%)', borderRadius:'50%', pointerEvents:'none' }} />

      {toast && (
        <div style={{ position:'fixed', bottom:'28px', left:'50%', transform:'translateX(-50%)', background:'#2E2A25', color:'#F3E8DA', padding:'10px 20px', borderRadius:'99px', fontSize:'13px', fontWeight:600, boxShadow:'0 8px 24px rgba(0,0,0,0.3)', zIndex:10, animation:'toastIn 0.3s ease' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #D8C7B3', paddingBottom:'16px', marginBottom:'28px', maxWidth:'1200px', margin:'0 auto 28px', position:'relative', zIndex:1, animation:'fadeUp 0.5s ease' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#A0AB97', animation:'pulseDot 2s ease infinite' }} />
          <h2 style={{ margin:0, color:'#2E2A25', fontSize:'18px', fontWeight:700 }}>{roundType === 'hr' ? 'HR Interview' : 'Technical Interview'}</h2>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          {/* Progress dots */}
          <div style={{ display:'flex', gap:'4px' }}>
            {aiQuestions.map((_, i) => (
              <div key={i} style={{ width:i === currentQuestionIndex ? '20px' : '6px', height:'6px', borderRadius:'99px', background:i < currentQuestionIndex ? '#A0AB97' : i === currentQuestionIndex ? '#8F9B88' : '#D8C7B3', transition:'all 0.3s cubic-bezier(0.22,1,0.36,1)' }} />
            ))}
          </div>
          <div style={{ background:'#EFE3D2', padding:'7px 14px', borderRadius:'20px', fontSize:'13px', border:'1px solid #D8C7B3', fontWeight:600 }}>
            {currentQuestionIndex + 1} of {aiQuestions.length}
          </div>

          {/* ── Mute / unmute button ── */}
          <button onClick={toggleMute} className="mute-btn"
            style={{ color: muted ? '#6F6A63' : '#8F9B88', borderColor: muted ? '#D8C7B3' : 'rgba(160,171,151,0.4)' }}
            title={muted ? 'Unmute AI voice' : 'Mute AI voice'}>
            {muted ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
                <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            )}
            {muted ? 'Muted' : 'Speaking'}
          </button>
        </div>
      </div>

      <div style={{ display:'flex', gap:'36px', maxWidth:'1200px', margin:'0 auto', flexWrap:'wrap', position:'relative', zIndex:1 }}>

        {/* Left: question + controls */}
        <div style={{ flex:1, minWidth:'320px', display:'flex', flexDirection:'column', justifyContent:'center', animation:'fadeLeft 0.5s 0.1s ease both' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px' }}>
            <h3 style={{ color:'#8F9B88', textTransform:'uppercase', letterSpacing:'1.5px', fontSize:'12px', fontWeight:700, margin:0 }}>Current AI Question</h3>

            {/* Speaking indicator */}
            {isSpeakingQuestion && !muted && (
              <div style={{ display:'flex', alignItems:'flex-end', gap:'2px', height:'14px' }}>
                {[0,1,2,3].map(i => (
                  <div key={i} style={{ width:'3px', background:'#8F9B88', borderRadius:'2px', height:'8px', animation:`soundWave 0.8s ease-in-out ${i * 0.12}s infinite` }} />
                ))}
              </div>
            )}

            {/* Replay button */}
            {!isSpeakingQuestion && !muted && (
              <button className="replay-btn" onClick={() => speakQuestion(aiQuestions[currentQuestionIndex])} title="Replay question">
                ↺ Replay
              </button>
            )}
          </div>

          <p key={currentQuestionIndex} style={{ fontSize:'26px', lineHeight:'1.45', fontWeight:700, color:'#2E2A25', minHeight:'110px', margin:0, animation:'fadeUp 0.4s ease' }}>
            "{aiQuestions[currentQuestionIndex]}"
          </p>

          <div style={{
            marginTop:'26px', padding:'24px', background:'#EFE3D2', borderRadius:'16px',
            borderTop:'1px solid #D8C7B3', borderRight:'1px solid #D8C7B3', borderBottom:'1px solid #D8C7B3',
            borderLeft:isRecording ? (isSpeaking ? '4px solid #8F9B88' : '4px solid #eab308') : '4px solid #A0AB97',
            transition:'border-left-color 0.3s ease',
          }}>
            {isProcessingVideo ? (
              <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
                <div style={{ width:'26px', height:'26px', border:'3px solid #D8C7B3', borderTopColor:'#8F9B88', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
                <h4 style={{ margin:0, fontSize:'16px', color:'#8F9B88', fontWeight:600 }}>Securely saving video...</h4>
              </div>
            ) : !isRecording ? (
              <div>
                <h4 style={{ margin:'0 0 14px', fontSize:'16px', fontWeight:600 }}>Ready for this question?</h4>
                <p style={{ margin:'0 0 14px', fontSize:'12px', color:'#6F6A63' }}>
                  {muted ? '🔇 AI voice is muted — click the Speaking button above to enable it' : '🔊 AI will read the question aloud — listen, then record your answer'}
                </p>
                <button onClick={startRecordingAnswer} className="btn-h"
                  style={{ padding:'13px 26px', background:'linear-gradient(135deg, #A0AB97, #8F9B88)', color:'#2E2A25', border:'none', borderRadius:'10px', cursor:'pointer', fontWeight:700, fontSize:'15px', display:'inline-flex', alignItems:'center', gap:'8px', boxShadow:'0 6px 18px rgba(160,171,151,0.3)' }}>
                  <span style={{ width:'10px', height:'10px', borderRadius:'50%', background:'white' }} />
                  Start Recording Answer
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'10px' }}>
                  <div style={{ width:'14px', height:'14px', borderRadius:'50%', background:isSpeaking ? '#8F9B88' : '#eab308', animation:isSpeaking ? 'recPulse 1.5s ease infinite' : 'none' }} />
                  <h4 style={{ margin:0, fontSize:'16px', fontWeight:600, flex:1 }}>{isSpeaking ? 'AI is listening...' : 'Silence detected (saving in 3s)...'}</h4>
                  <span style={{ fontSize:'13px', fontWeight:700, color:'#8F9B88', fontVariantNumeric:'tabular-nums' }}>{formatTime(recordingSeconds)}</span>
                </div>
                <div style={{ display:'flex', gap:'3px', alignItems:'flex-end', height:'20px', marginBottom:'10px', marginLeft:'26px' }}>
                  {[0, 1, 2, 3, 4].map(i => (
                    <div key={i} style={{ width:'4px', borderRadius:'2px', height:isSpeaking && i < volBars ? `${8 + i * 4}px` : '4px', background:isSpeaking && i < volBars ? '#8F9B88' : '#D8C7B3', transition:'height 0.1s ease, background 0.2s ease' }} />
                  ))}
                </div>
                <p style={{ color:'#6F6A63', fontSize:'13px', margin:0, marginLeft:'26px' }}>Stop talking when finished. The AI handles the rest.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: camera */}
        <div style={{ flex:1, minWidth:'320px', animation:'fadeRight 0.5s 0.2s ease both' }}>
          <div style={{
            background:'#2E2A25', borderRadius:'20px', overflow:'hidden', position:'relative',
            aspectRatio:'16/9',
            borderTop:isRecording ? '2px solid #8F9B88' : '2px solid #D8C7B3',
            borderRight:isRecording ? '2px solid #8F9B88' : '2px solid #D8C7B3',
            borderBottom:isRecording ? '2px solid #8F9B88' : '2px solid #D8C7B3',
            borderLeft:isRecording ? '2px solid #8F9B88' : '2px solid #D8C7B3',
            boxShadow:isRecording ? '0 0 0 4px rgba(160,171,151,0.12), 0 20px 40px -10px rgba(0,0,0,0.7)' : '0 20px 40px -10px rgba(0,0,0,0.7)',
            transition:'border-color 0.3s, box-shadow 0.3s',
          }}>
            {!hasCameraAccess && (
              <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'#6F6A63', gap:'10px' }}>
                <div style={{ width:'28px', height:'28px', border:'3px solid #D8C7B3', borderTopColor:'#A0AB97', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
                Activating secure camera feed...
              </div>
            )}
            {isRecording && (
              <div style={{ position:'absolute', top:'14px', left:'14px', display:'flex', alignItems:'center', gap:'6px', background:'rgba(0,0,0,0.65)', padding:'5px 10px', borderRadius:'99px', backdropFilter:'blur(4px)', zIndex:2 }}>
                <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#8F9B88', animation:'pulseDot 1.2s ease infinite' }} />
                <span style={{ fontSize:'11px', fontWeight:700, color:'#A0AB97' }}>REC</span>
              </div>
            )}
            {/* Speaking indicator on camera */}
            {isSpeakingQuestion && !muted && !isRecording && (
              <div style={{ position:'absolute', top:'14px', right:'14px', display:'flex', alignItems:'center', gap:'6px', background:'rgba(0,0,0,0.65)', padding:'5px 10px', borderRadius:'99px', backdropFilter:'blur(4px)', zIndex:2 }}>
                <div style={{ display:'flex', alignItems:'flex-end', gap:'2px', height:'12px' }}>
                  {[0,1,2,3].map(i => (
                    <div key={i} style={{ width:'3px', background:'#8F9B88', borderRadius:'2px', height:'7px', animation:`soundWave 0.8s ease-in-out ${i*0.12}s infinite` }} />
                  ))}
                </div>
                <span style={{ fontSize:'11px', fontWeight:700, color:'#A0AB97' }}>AI Speaking</span>
              </div>
            )}
            <video ref={videoRef} autoPlay playsInline muted style={{ width:'100%', height:'100%', objectFit:'cover', transform:'scaleX(-1)' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InterviewRoom() {
  return (
    <Suspense fallback={null}>
      <InterviewRoomInner />
    </Suspense>
  );
}
