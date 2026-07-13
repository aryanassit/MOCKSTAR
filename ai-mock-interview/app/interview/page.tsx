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
  const [volumeLevel, setVolumeLevel] = useState(0);

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
      const preferred = voices.find(v =>
        v.name.includes('Google') ||
        v.name.includes('Samantha') ||
        v.name.includes('Daniel') ||
        v.name.includes('Karen') ||
        (v.lang === 'en-US' && v.localService)
      );
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
          body: JSON.stringify({ resume_url: profile.resume_url })
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
    try {
      const lastUrl = videoUrlsRef.current[videoUrlsRef.current.length - 1];
      const lastQ = aiQuestions[aiQuestions.length - 1];
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/analyze-video`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_url: lastUrl, question: lastQ })
      });
      if (!response.ok) throw new Error("Failed to analyze video");
      const data = await response.json();
      setFinalScores(data);
      const overall = Math.round((data.content_score ?? 0) * 0.6 + (data.eye_contact_score ?? 0) * 0.2 + (data.posture_score ?? 0) * 0.2);
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from('interview_sessions').insert({
          user_id: session.user.id, overall_score: overall,
          speech_score: data.content_score ?? 0,
          eye_contact_score: data.eye_contact_score ?? 0,
          posture_score: data.posture_score ?? 0,
          feedback: data.feedback ?? '',
          questions: aiQuestions.map(q => ({ text: q, score: Math.round(data.content_score ?? 70) })),
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
      @keyframes recPulse { 0%,100%{box-shadow:0 0 0 0 rgba(22,163,74,0.5)} 50%{box-shadow:0 0 0 10px rgba(22,163,74,0)} }
      @keyframes gradShift { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
      @keyframes orb1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(30px,-20px)} }
      @keyframes soundWave { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(1.8)} }
      .btn-h { transition:transform 0.15s,box-shadow 0.15s,filter 0.15s; }
      .btn-h:hover { transform:translateY(-2px); filter:brightness(1.08); }
      .mute-btn { background:none; border:1px solid #1e3a1e; border-radius:8px; padding:6px 12px; font-size:12px; cursor:pointer; transition:all 0.15s; display:flex; align-items:center; gap:6px; }
      .mute-btn:hover { border-color:#22c55e; background:rgba(22,163,74,0.08); }
      .replay-btn { background:none; border:none; color:#22c55e; font-size:12px; cursor:pointer; padding:4px 8px; border-radius:6px; transition:background 0.15s; }
      .replay-btn:hover { background:rgba(22,163,74,0.1); }
    `}</style>
  );

  // ── 1. Loading ───────────────────────────────────────────────────
  if (isInitializing) return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#050f05 0%,#0a1f0a 100%)', color:'#fff', position:'relative', overflow:'hidden' }}>
      {S}
      <div style={{ position:'absolute', width:'400px', height:'400px', top:'-100px', left:'-50px', background:'radial-gradient(circle,rgba(22,163,74,0.1) 0%,transparent 70%)', borderRadius:'50%', animation:'orb1 10s ease-in-out infinite', pointerEvents:'none' }} />
      <div style={{ position:'relative', width:'64px', height:'64px', marginBottom:'24px' }}>
        <div style={{ position:'absolute', inset:0, border:'4px solid #1e3a1e', borderTopColor:'#16a34a', borderRadius:'50%', animation:'spin 0.9s linear infinite' }} />
        <div style={{ position:'absolute', inset:'8px', border:'4px solid #1e3a1e', borderTopColor:'#22c55e', borderRadius:'50%', animation:'spin 1.3s linear infinite reverse' }} />
      </div>
      <h2 style={{ margin:'0 0 6px', fontSize:'20px', fontWeight:700, animation:'fadeUp 0.5s ease' }}>AI is reading your resume...</h2>
      <p style={{ color:'#6b8f6b', fontSize:'14px', animation:'fadeUp 0.5s 0.1s ease both' }}>Generating custom interview questions</p>
    </div>
  );

  // ── 2. Results ───────────────────────────────────────────────────
  if (isInterviewComplete) {
    const overall = finalScores ? Math.round((finalScores.content_score ?? 0) * 0.6 + (finalScores.eye_contact_score ?? 0) * 0.2 + (finalScores.posture_score ?? 0) * 0.2) : 0;
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#050f05 0%,#0a1f0a 100%)', color:'#fff', padding:'24px', position:'relative', overflow:'hidden', fontFamily:'system-ui,-apple-system,sans-serif' }}>
        {S}
        <div style={{ position:'absolute', width:'450px', height:'450px', top:'-120px', right:'-100px', background:'radial-gradient(circle,rgba(22,163,74,0.1) 0%,transparent 70%)', borderRadius:'50%', animation:'orb1 11s ease-in-out infinite', pointerEvents:'none' }} />
        {isAnalyzing ? (
          <div style={{ textAlign:'center', position:'relative', zIndex:1 }}>
            <div style={{ position:'relative', width:'76px', height:'76px', margin:'0 auto 24px' }}>
              <div style={{ position:'absolute', inset:0, border:'5px solid #1e3a1e', borderTopColor:'#16a34a', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
              <div style={{ position:'absolute', inset:'10px', border:'5px solid #1e3a1e', borderTopColor:'#22c55e', borderRadius:'50%', animation:'spin 1.4s linear infinite reverse' }} />
            </div>
            <h2 style={{ color:'#f8fafc', fontSize:'24px', fontWeight:700, margin:'0 0 8px', animation:'fadeUp 0.5s ease' }}>Analyzing your body language...</h2>
            <p style={{ color:'#6b8f6b', animation:'fadeUp 0.5s 0.1s ease both' }}>Running Computer Vision models</p>
          </div>
        ) : (
          <div style={{ background:'#0d1a0d', padding:'44px 48px', borderRadius:'28px', maxWidth:'620px', width:'100%', textAlign:'center', border:'1px solid #1e3a1e', boxShadow:'0 30px 70px -15px rgba(0,0,0,0.7)', position:'relative', zIndex:1, animation:'scaleIn 0.4s cubic-bezier(0.22,1,0.36,1)' }}>
            <div style={{ width:'76px', height:'76px', borderRadius:'50%', background:'rgba(22,163,74,0.15)', border:'2px solid rgba(34,197,94,0.5)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontSize:'34px', animation:'popIn 0.6s cubic-bezier(0.22,1,0.36,1)', boxShadow:'0 0 30px rgba(22,163,74,0.3)' }}>🎉</div>
            <h2 style={{ margin:'0 0 6px', fontSize:'28px', fontWeight:800, color:'#f8fafc', animation:'fadeUp 0.5s ease' }}>Interview Complete</h2>
            <p style={{ color:'#6b8f6b', marginBottom:'28px', fontSize:'14px', animation:'fadeUp 0.5s 0.08s ease both' }}>Your AI performance review</p>
            <div style={{ margin:'0 auto 24px', animation:'scaleIn 0.5s 0.12s cubic-bezier(0.22,1,0.36,1) both' }}>
              <svg width="130" height="130" viewBox="0 0 130 130" style={{ filter:'drop-shadow(0 0 12px rgba(22,163,74,0.4))' }}>
                <circle cx="65" cy="65" r="56" fill="none" stroke="#0d1a0d" strokeWidth="10" />
                <circle cx="65" cy="65" r="56" fill="none" stroke="#16a34a" strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 56} strokeDashoffset={2 * Math.PI * 56 * (1 - overall / 100)}
                  style={{ transform:'rotate(-90deg)', transformOrigin:'65px 65px', transition:'stroke-dashoffset 1.4s cubic-bezier(0.22,1,0.36,1)' }} />
                <text x="65" y="72" textAnchor="middle" fontSize="30" fontWeight="800" fill="#f8fafc">{overall}%</text>
              </svg>
              <p style={{ margin:'4px 0 0', fontSize:'12px', color:'#6b8f6b' }}>Overall score</p>
            </div>
            <div style={{ background:'#050f05', padding:'18px 20px', borderRadius:'16px', border:'1px solid #22c55e', marginBottom:'16px', animation:'fadeUp 0.5s 0.2s ease both' }}>
              <div style={{ fontSize:'12px', color:'#6b8f6b', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'8px' }}>Answer Quality (Speech)</div>
              <div style={{ fontSize:'40px', fontWeight:800, color:'#22c55e' }}>{finalScores?.content_score}%</div>
            </div>
            <div style={{ display:'flex', gap:'14px', marginBottom:'24px' }}>
              {[{ label:'Eye Contact', value:finalScores?.eye_contact_score, delay:'0.28s' }, { label:'Posture', value:finalScores?.posture_score, delay:'0.32s' }].map(({ label, value, delay }) => (
                <div key={label} style={{ flex:1, background:'#050f05', padding:'16px', borderRadius:'14px', border:'1px solid #1e3a1e', animation:`fadeUp 0.5s ${delay} ease both` }}>
                  <div style={{ fontSize:'11px', color:'#6b8f6b', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'8px' }}>{label}</div>
                  <div style={{ fontSize:'30px', fontWeight:800, color:'#22c55e' }}>{value}%</div>
                </div>
              ))}
            </div>
            <div style={{ background:'#050f05', padding:'18px', borderRadius:'14px', borderLeft:'4px solid #16a34a', textAlign:'left', marginBottom:'26px', animation:'fadeUp 0.5s 0.36s ease both' }}>
              <h4 style={{ margin:'0 0 6px', color:'#f8fafc', fontSize:'14px' }}>AI Feedback</h4>
              <p style={{ margin:0, color:'#9ab89a', fontSize:'13px', lineHeight:1.6 }}>{finalScores?.feedback}</p>
            </div>
            <button onClick={() => router.push('/dashboard')} className="btn-h" style={{ width:'100%', padding:'16px', background:'linear-gradient(135deg, #16a34a, #22c55e)', backgroundSize:'200% 200%', animation:'gradShift 4s ease infinite', color:'white', border:'none', borderRadius:'14px', fontSize:'16px', fontWeight:700, cursor:'pointer', boxShadow:'0 8px 24px rgba(22,163,74,0.3)' }}>
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
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#050f05 0%,#0a1f0a 100%)', color:'#fff', padding:'36px 24px', fontFamily:'system-ui,-apple-system,sans-serif', position:'relative', overflow:'hidden' }}>
      {S}
      <div style={{ position:'absolute', width:'500px', height:'500px', top:'-200px', left:'20%', background:'radial-gradient(circle,rgba(22,163,74,0.06) 0%,transparent 70%)', borderRadius:'50%', pointerEvents:'none' }} />

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #1e3a1e', paddingBottom:'16px', marginBottom:'28px', maxWidth:'1200px', margin:'0 auto 28px', position:'relative', zIndex:1, animation:'fadeUp 0.5s ease' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#16a34a', animation:'pulseDot 2s ease infinite' }} />
          <h2 style={{ margin:0, color:'#f8fafc', fontSize:'18px', fontWeight:700 }}>Technical Interview</h2>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          {/* Progress dots */}
          <div style={{ display:'flex', gap:'4px' }}>
            {aiQuestions.map((_, i) => (
              <div key={i} style={{ width:i === currentQuestionIndex ? '20px' : '6px', height:'6px', borderRadius:'99px', background:i < currentQuestionIndex ? '#16a34a' : i === currentQuestionIndex ? '#22c55e' : '#1e3a1e', transition:'all 0.3s cubic-bezier(0.22,1,0.36,1)' }} />
            ))}
          </div>
          <div style={{ background:'#0d1a0d', padding:'7px 14px', borderRadius:'20px', fontSize:'13px', border:'1px solid #1e3a1e', fontWeight:600 }}>
            {currentQuestionIndex + 1} of {aiQuestions.length}
          </div>

          {/* ── Mute / unmute button ── */}
          <button onClick={toggleMute} className="mute-btn"
            style={{ color: muted ? '#6b8f6b' : '#22c55e', borderColor: muted ? '#1e3a1e' : 'rgba(34,197,94,0.4)' }}
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
            <h3 style={{ color:'#22c55e', textTransform:'uppercase', letterSpacing:'1.5px', fontSize:'12px', fontWeight:700, margin:0 }}>Current AI Question</h3>

            {/* Speaking indicator */}
            {isSpeakingQuestion && !muted && (
              <div style={{ display:'flex', alignItems:'flex-end', gap:'2px', height:'14px' }}>
                {[0,1,2,3].map(i => (
                  <div key={i} style={{ width:'3px', background:'#22c55e', borderRadius:'2px', height:'8px', animation:`soundWave 0.8s ease-in-out ${i * 0.12}s infinite` }} />
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

          <p key={currentQuestionIndex} style={{ fontSize:'26px', lineHeight:'1.45', fontWeight:700, color:'#f8fafc', minHeight:'110px', margin:0, animation:'fadeUp 0.4s ease' }}>
            "{aiQuestions[currentQuestionIndex]}"
          </p>

          <div style={{
            marginTop:'26px', padding:'24px', background:'#0d1a0d', borderRadius:'16px',
            borderTop:'1px solid #1e3a1e', borderRight:'1px solid #1e3a1e', borderBottom:'1px solid #1e3a1e',
            borderLeft:isRecording ? (isSpeaking ? '4px solid #22c55e' : '4px solid #eab308') : '4px solid #16a34a',
            transition:'border-left-color 0.3s ease',
          }}>
            {isProcessingVideo ? (
              <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
                <div style={{ width:'26px', height:'26px', border:'3px solid #1e3a1e', borderTopColor:'#22c55e', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
                <h4 style={{ margin:0, fontSize:'16px', color:'#22c55e', fontWeight:600 }}>Securely saving video...</h4>
              </div>
            ) : !isRecording ? (
              <div>
                <h4 style={{ margin:'0 0 14px', fontSize:'16px', fontWeight:600 }}>Ready for this question?</h4>
                <p style={{ margin:'0 0 14px', fontSize:'12px', color:'#6b8f6b' }}>
                  {muted ? '🔇 AI voice is muted — click the Speaking button above to enable it' : '🔊 AI will read the question aloud — listen, then record your answer'}
                </p>
                <button onClick={startRecordingAnswer} className="btn-h"
                  style={{ padding:'13px 26px', background:'linear-gradient(135deg, #16a34a, #22c55e)', color:'white', border:'none', borderRadius:'10px', cursor:'pointer', fontWeight:700, fontSize:'15px', display:'inline-flex', alignItems:'center', gap:'8px', boxShadow:'0 6px 18px rgba(22,163,74,0.3)' }}>
                  <span style={{ width:'10px', height:'10px', borderRadius:'50%', background:'white' }} />
                  Start Recording Answer
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'10px' }}>
                  <div style={{ width:'14px', height:'14px', borderRadius:'50%', background:isSpeaking ? '#22c55e' : '#eab308', animation:isSpeaking ? 'recPulse 1.5s ease infinite' : 'none' }} />
                  <h4 style={{ margin:0, fontSize:'16px', fontWeight:600 }}>{isSpeaking ? 'AI is listening...' : 'Silence detected (saving in 3s)...'}</h4>
                </div>
                <div style={{ display:'flex', gap:'3px', alignItems:'flex-end', height:'20px', marginBottom:'10px', marginLeft:'26px' }}>
                  {[0, 1, 2, 3, 4].map(i => (
                    <div key={i} style={{ width:'4px', borderRadius:'2px', height:isSpeaking && i < volBars ? `${8 + i * 4}px` : '4px', background:isSpeaking && i < volBars ? '#22c55e' : '#1e3a1e', transition:'height 0.1s ease, background 0.2s ease' }} />
                  ))}
                </div>
                <p style={{ color:'#6b8f6b', fontSize:'13px', margin:0, marginLeft:'26px' }}>Stop talking when finished. The AI handles the rest.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: camera */}
        <div style={{ flex:1, minWidth:'320px', animation:'fadeRight 0.5s 0.2s ease both' }}>
          <div style={{
            background:'#000', borderRadius:'20px', overflow:'hidden', position:'relative',
            aspectRatio:'16/9',
            borderTop:isRecording ? '2px solid #22c55e' : '2px solid #1e3a1e',
            borderRight:isRecording ? '2px solid #22c55e' : '2px solid #1e3a1e',
            borderBottom:isRecording ? '2px solid #22c55e' : '2px solid #1e3a1e',
            borderLeft:isRecording ? '2px solid #22c55e' : '2px solid #1e3a1e',
            boxShadow:isRecording ? '0 0 0 4px rgba(22,163,74,0.12), 0 20px 40px -10px rgba(0,0,0,0.7)' : '0 20px 40px -10px rgba(0,0,0,0.7)',
            transition:'border-color 0.3s, box-shadow 0.3s',
          }}>
            {!hasCameraAccess && (
              <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'#6b8f6b', gap:'10px' }}>
                <div style={{ width:'28px', height:'28px', border:'3px solid #1e3a1e', borderTopColor:'#16a34a', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
                Activating secure camera feed...
              </div>
            )}
            {isRecording && (
              <div style={{ position:'absolute', top:'14px', left:'14px', display:'flex', alignItems:'center', gap:'6px', background:'rgba(0,0,0,0.65)', padding:'5px 10px', borderRadius:'99px', backdropFilter:'blur(4px)', zIndex:2 }}>
                <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#22c55e', animation:'pulseDot 1.2s ease infinite' }} />
                <span style={{ fontSize:'11px', fontWeight:700, color:'#86efac' }}>REC</span>
              </div>
            )}
            {/* Speaking indicator on camera */}
            {isSpeakingQuestion && !muted && !isRecording && (
              <div style={{ position:'absolute', top:'14px', right:'14px', display:'flex', alignItems:'center', gap:'6px', background:'rgba(0,0,0,0.65)', padding:'5px 10px', borderRadius:'99px', backdropFilter:'blur(4px)', zIndex:2 }}>
                <div style={{ display:'flex', alignItems:'flex-end', gap:'2px', height:'12px' }}>
                  {[0,1,2,3].map(i => (
                    <div key={i} style={{ width:'3px', background:'#22c55e', borderRadius:'2px', height:'7px', animation:`soundWave 0.8s ease-in-out ${i*0.12}s infinite` }} />
                  ))}
                </div>
                <span style={{ fontSize:'11px', fontWeight:700, color:'#86efac' }}>AI Speaking</span>
              </div>
            )}
            <video ref={videoRef} autoPlay playsInline muted style={{ width:'100%', height:'100%', objectFit:'cover', transform:'scaleX(-1)' }} />
          </div>
        </div>
      </div>

    {/* --- AI LOADING OVERLAY --- */}
      {isAnalyzing && (
        <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 backdrop-blur-sm">
          <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-blue-500 mb-6"></div>
          <h2 className="text-3xl font-bold text-white mb-3 animate-pulse">
            Analyzing Your Interview...
          </h2>
          <p className="text-gray-300 text-lg">
            Gemini is evaluating your eye contact, posture, and speech clarity.
          </p>
        </div>
      )}

    </div>
  );
}