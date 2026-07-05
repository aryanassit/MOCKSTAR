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

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return router.push('/login');
        setUserId(session.user.id);
        const { data: profile } = await supabase.from('profiles').select('resume_url').eq('id', session.user.id).single();
        if (!profile?.resume_url) { alert("Resume not found."); return router.push('/dashboard'); }
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/api/v1/generate-questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resume_url: profile.resume_url })
        });
        if (!response.ok) throw new Error("Failed to generate questions");
        const data = await response.json();
        setAiQuestions(data.questions);
        const stream = await navigator.mediaDevices.getUserMedia({video:true,audio:true});
        activeStreamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setHasCameraAccess(true);
        setupVAD(stream);
      } catch (err) { console.error(err); alert("Error setting up interview."); }
      finally { setIsInitializing(false); }
    };
    init();
    return () => {
      if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t=>t.stop());
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [router]);

  useEffect(() => {
    if (!isInitializing && videoRef.current && activeStreamRef.current)
      videoRef.current.srcObject = activeStreamRef.current;
  }, [isInitializing]);

  const setupVAD = (stream: MediaStream) => {
    const ac = new (window.AudioContext||(window as any).webkitAudioContext)();
    audioContextRef.current = ac;
    const analyser = ac.createAnalyser();
    const mic = ac.createMediaStreamSource(stream);
    const sp = ac.createScriptProcessor(2048,1,1);
    analyser.smoothingTimeConstant=0.8; analyser.fftSize=1024;
    mic.connect(analyser); analyser.connect(sp); sp.connect(ac.destination);
    sp.onaudioprocess = () => {
      const arr = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(arr);
      const vol = arr.reduce((a,v)=>a+v,0)/arr.length;
      setVolumeLevel(vol);
      const isRec = mediaRecorderRef.current?.state==='recording';
      if (vol>18) { setIsSpeaking(true); if(silenceTimerRef.current){clearTimeout(silenceTimerRef.current);silenceTimerRef.current=null;} }
      else { setIsSpeaking(false); if(isRec&&!silenceTimerRef.current){silenceTimerRef.current=setTimeout(()=>{if(mediaRecorderRef.current?.state!=='inactive'){mediaRecorderRef.current!.stop();setIsRecording(false);}silenceTimerRef.current=null;},3000);} }
    };
  };

  const startRecordingAnswer = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const mr = new MediaRecorder(stream,{mimeType:'video/webm'});
      mediaRecorderRef.current = mr;
      mr.ondataavailable = e => { if(e.data.size>0)chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        setIsProcessingVideo(true);
        const blob = new Blob(chunksRef.current,{type:'video/webm'});
        chunksRef.current=[];
        const fn=`${userId}-q${currentQuestionIndex+1}-${Date.now()}.webm`;
        try {
          const {error}=await supabase.storage.from('video_chunks').upload(fn,blob);
          if(error)throw error;
          const {data}=supabase.storage.from('video_chunks').getPublicUrl(fn);
          videoUrlsRef.current.push(data.publicUrl);
        } catch(e){console.error(e);}
        finally{setIsProcessingVideo(false);moveToNextQuestion();}
      };
      mr.start(); setIsRecording(true);
    }
  };

  const moveToNextQuestion = () => {
    if (currentQuestionIndex<aiQuestions.length-1) setCurrentQuestionIndex(p=>p+1);
    else { setIsInterviewComplete(true); activeStreamRef.current?.getTracks().forEach(t=>t.stop()); analyzeFinalResults(); }
  };

  const analyzeFinalResults = async () => {
    setIsAnalyzing(true);
    try {
      const lastUrl = videoUrlsRef.current[videoUrlsRef.current.length-1];
      const lastQ = aiQuestions[aiQuestions.length-1];
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/api/v1/analyze-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_url: lastUrl, question: lastQ })
      });
      if(!response.ok) throw new Error("Failed to analyze video");
      const data = await response.json();
      setFinalScores(data);
      const overall=Math.round((data.content_score??0)*0.6+(data.eye_contact_score??0)*0.2+(data.posture_score??0)*0.2);
      const {data:{session}}=await supabase.auth.getSession();
      if(session){
        await supabase.from('interview_sessions').insert({
          user_id:session.user.id,overall_score:overall,speech_score:data.content_score??0,
          eye_contact_score:data.eye_contact_score??0,posture_score:data.posture_score??0,
          feedback:data.feedback??'',questions:aiQuestions.map(q=>({text:q,score:Math.round(data.content_score??70)})),
        });
      }
    } catch(e){console.error(e);alert("Failed to analyze interview.");}
    finally{setIsAnalyzing(false);}
  };

  const S=<style>{`
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
    @keyframes fadeLeft{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:none}}
    @keyframes fadeRight{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:none}}
    @keyframes scaleIn{from{opacity:0;transform:scale(0.93)}to{opacity:1;transform:scale(1)}}
    @keyframes popIn{0%{transform:scale(0.6);opacity:0}70%{transform:scale(1.06)}100%{transform:scale(1);opacity:1}}
    @keyframes gradShift{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
    @keyframes pulseDot{0%,100%{opacity:1}50%{opacity:0.4}}
    @keyframes recPulse{0%,100%{box-shadow:0 0 0 0 rgba(22,163,74,0.4)}50%{box-shadow:0 0 0 8px rgba(22,163,74,0)}}
    .btn-h{transition:transform 0.15s,box-shadow 0.15s}
    .btn-h:hover{transform:translateY(-1px)}
  `}</style>;

  // Loading
  if(isInitializing) return(
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#f8fafc',color:'#0f172a'}}>
      {S}
      <div style={{position:'relative',width:56,height:56,marginBottom:20}}>
        <div style={{position:'absolute',inset:0,border:'4px solid #dcfce7',borderTopColor:'#16a34a',borderRadius:'50%',animation:'spin 0.9s linear infinite'}}/>
        <div style={{position:'absolute',inset:8,border:'4px solid #dcfce7',borderTopColor:'#22c55e',borderRadius:'50%',animation:'spin 1.3s linear infinite reverse'}}/>
      </div>
      <h2 style={{margin:'0 0 5px',fontSize:18,fontWeight:700,animation:'fadeUp 0.5s ease'}}>AI is reading your resume...</h2>
      <p style={{color:'#9ca3af',fontSize:13,animation:'fadeUp 0.5s 0.1s ease both'}}>Generating custom interview questions</p>
    </div>
  );

  // Results
  if(isInterviewComplete){
    const overall=finalScores?Math.round((finalScores.content_score??0)*0.6+(finalScores.eye_contact_score??0)*0.2+(finalScores.posture_score??0)*0.2):0;
    return(
      <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f8fafc',padding:24,fontFamily:'system-ui,-apple-system,sans-serif'}}>
        {S}
        {isAnalyzing?(
          <div style={{textAlign:'center'}}>
            <div style={{position:'relative',width:64,height:64,margin:'0 auto 20px'}}>
              <div style={{position:'absolute',inset:0,border:'5px solid #dcfce7',borderTopColor:'#16a34a',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
              <div style={{position:'absolute',inset:9,border:'5px solid #dcfce7',borderTopColor:'#22c55e',borderRadius:'50%',animation:'spin 1.4s linear infinite reverse'}}/>
            </div>
            <h2 style={{color:'#0f172a',fontSize:22,fontWeight:700,margin:'0 0 6px',animation:'fadeUp 0.5s ease'}}>Analyzing your performance...</h2>
            <p style={{color:'#9ca3af',animation:'fadeUp 0.5s 0.1s ease both'}}>Running Computer Vision models</p>
          </div>
        ):(
          <div style={{background:'#fff',padding:'40px 44px',borderRadius:24,maxWidth:580,width:'100%',textAlign:'center',border:'1px solid #e2e8f0',boxShadow:'0 20px 60px rgba(0,0,0,0.08)',animation:'scaleIn 0.4s cubic-bezier(0.22,1,0.36,1)'}}>
            <div style={{width:68,height:68,borderRadius:'50%',background:'#dcfce7',border:'2px solid #86efac',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 18px',fontSize:30,animation:'popIn 0.5s cubic-bezier(0.22,1,0.36,1)',boxShadow:'0 4px 20px rgba(22,163,74,0.15)'}}>🎉</div>
            <h2 style={{margin:'0 0 5px',fontSize:26,fontWeight:800,color:'#0f172a',animation:'fadeUp 0.5s ease'}}>Interview Complete</h2>
            <p style={{color:'#9ca3af',marginBottom:24,fontSize:13,animation:'fadeUp 0.5s 0.08s ease both'}}>Your AI performance review</p>

            <div style={{margin:'0 auto 22px',animation:'scaleIn 0.5s 0.12s ease both'}}>
              <svg width={120} height={120} viewBox="0 0 120 120">
                <circle cx={60} cy={60} r={50} fill="none" stroke="#f0fdf4" strokeWidth={9}/>
                <circle cx={60} cy={60} r={50} fill="none" stroke="#16a34a" strokeWidth={9} strokeLinecap="round"
                  strokeDasharray={2*Math.PI*50} strokeDashoffset={2*Math.PI*50*(1-overall/100)}
                  style={{transform:'rotate(-90deg)',transformOrigin:'60px 60px',transition:'stroke-dashoffset 1.3s cubic-bezier(0.22,1,0.36,1)'}}/>
                <text x={60} y={67} textAnchor="middle" fontSize={26} fontWeight={800} fill="#0f172a">{overall}%</text>
              </svg>
              <p style={{margin:'3px 0 0',fontSize:11,color:'#9ca3af'}}>Overall score</p>
            </div>

            <div style={{background:'#f0fdf4',padding:'15px 18px',borderRadius:13,border:'1px solid #bbf7d0',marginBottom:13,animation:'fadeUp 0.5s 0.2s ease both'}}>
              <div style={{fontSize:11,color:'#6b7280',textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>Answer Quality (Speech)</div>
              <div style={{fontSize:36,fontWeight:800,color:'#15803d'}}>{finalScores?.content_score}%</div>
            </div>

            <div style={{display:'flex',gap:12,marginBottom:20}}>
              {[{label:'Eye Contact',v:finalScores?.eye_contact_score,d:'0.28s'},{label:'Posture',v:finalScores?.posture_score,d:'0.32s'}].map(({label,v,d})=>(
                <div key={label} style={{flex:1,background:'#f8fafc',padding:'14px',borderRadius:12,border:'1px solid #e2e8f0',animation:`fadeUp 0.5s ${d} ease both`}}>
                  <div style={{fontSize:11,color:'#9ca3af',textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>{label}</div>
                  <div style={{fontSize:26,fontWeight:800,color:'#16a34a'}}>{v}%</div>
                </div>
              ))}
            </div>

            <div style={{background:'#fffbeb',padding:'14px 16px',borderRadius:12,borderLeft:'3px solid #f59e0b',textAlign:'left',marginBottom:22,animation:'fadeUp 0.5s 0.36s ease both'}}>
              <h4 style={{margin:'0 0 5px',color:'#0f172a',fontSize:13}}>AI Feedback</h4>
              <p style={{margin:0,color:'#374151',fontSize:12,lineHeight:1.6}}>{finalScores?.feedback}</p>
            </div>

            <button onClick={()=>router.push('/dashboard')} className="btn-h" style={{width:'100%',padding:15,background:'linear-gradient(135deg,#16a34a,#22c55e)',backgroundSize:'200% 200%',animation:'gradShift 4s ease infinite',color:'white',border:'none',borderRadius:12,fontSize:15,fontWeight:700,cursor:'pointer',boxShadow:'0 4px 16px rgba(22,163,74,0.25)'}}>
              Return to Dashboard
            </button>
          </div>
        )}
      </div>
    );
  }

  // Active interview
  const volBars=Math.min(5,Math.floor(volumeLevel/16));
  return(
    <div style={{minHeight:'100vh',background:'#f8fafc',color:'#0f172a',padding:'28px 24px',fontFamily:'system-ui,-apple-system,sans-serif'}}>
      {S}

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid #e2e8f0',paddingBottom:14,marginBottom:24,maxWidth:1200,margin:'0 auto 24px'}}>
        <div style={{display:'flex',alignItems:'center',gap:9}}>
          <div style={{width:8,height:8,borderRadius:'50%',background:'#16a34a',animation:'pulseDot 2s ease infinite'}}/>
          <h2 style={{margin:0,color:'#0f172a',fontSize:17,fontWeight:700}}>Technical Interview</h2>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:9}}>
          <div style={{display:'flex',gap:3}}>
            {aiQuestions.map((_,i)=>(
              <div key={i} style={{width:i===currentQuestionIndex?18:5,height:5,borderRadius:99,background:i<currentQuestionIndex?'#16a34a':i===currentQuestionIndex?'#22c55e':'#e2e8f0',transition:'all 0.3s cubic-bezier(0.22,1,0.36,1)'}}/>
            ))}
          </div>
          <div style={{background:'#fff',padding:'5px 12px',borderRadius:20,fontSize:12,border:'1px solid #e2e8f0',fontWeight:600,color:'#0f172a',boxShadow:'0 1px 2px rgba(0,0,0,0.04)'}}>
            {currentQuestionIndex+1} of {aiQuestions.length}
          </div>
        </div>
      </div>

      <div style={{display:'flex',gap:32,maxWidth:1200,margin:'0 auto',flexWrap:'wrap'}}>
        {/* Left */}
        <div style={{flex:1,minWidth:320,display:'flex',flexDirection:'column',justifyContent:'center',animation:'fadeLeft 0.5s 0.1s ease both'}}>
          <h3 style={{color:'#16a34a',textTransform:'uppercase',letterSpacing:'1.5px',fontSize:11,fontWeight:700,margin:'0 0 10px'}}>Current AI Question</h3>
          <p key={currentQuestionIndex} style={{fontSize:24,lineHeight:1.45,fontWeight:700,color:'#0f172a',minHeight:100,margin:0,animation:'fadeUp 0.35s ease'}}>
            "{aiQuestions[currentQuestionIndex]}"
          </p>

          <div style={{marginTop:22,padding:20,background:'#fff',borderRadius:14,borderTop:'1px solid #e2e8f0',borderRight:'1px solid #e2e8f0',borderBottom:'1px solid #e2e8f0',borderLeft:isRecording?(isSpeaking?'4px solid #16a34a':'4px solid #f59e0b'):'4px solid #e2e8f0',boxShadow:'0 2px 8px rgba(0,0,0,0.06)',transition:'border-left-color 0.3s ease'}}>
            {isProcessingVideo?(
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:22,height:22,border:'3px solid #dcfce7',borderTopColor:'#16a34a',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
                <h4 style={{margin:0,fontSize:15,color:'#15803d',fontWeight:600}}>Securely saving video...</h4>
              </div>
            ):!isRecording?(
              <div>
                <h4 style={{margin:'0 0 12px',fontSize:15,fontWeight:600,color:'#0f172a'}}>Ready for this question?</h4>
                <button onClick={startRecordingAnswer} className="btn-h" style={{padding:'11px 22px',background:'linear-gradient(135deg,#16a34a,#22c55e)',backgroundSize:'200% 200%',animation:'gradShift 4s ease infinite',color:'white',border:'none',borderRadius:9,cursor:'pointer',fontWeight:700,fontSize:14,display:'inline-flex',alignItems:'center',gap:7,boxShadow:'0 3px 12px rgba(22,163,74,0.25)'}}>
                  <span style={{width:8,height:8,borderRadius:'50%',background:'white'}}/>
                  Start Recording Answer
                </button>
              </div>
            ):(
              <div>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                  <div style={{width:12,height:12,borderRadius:'50%',background:isSpeaking?'#16a34a':'#f59e0b',animation:isSpeaking?'recPulse 1.5s ease infinite':'none'}}/>
                  <h4 style={{margin:0,fontSize:14,fontWeight:600,color:'#0f172a'}}>{isSpeaking?'AI is listening...':'Silence detected (saving in 3s)...'}</h4>
                </div>
                <div style={{display:'flex',gap:3,alignItems:'flex-end',height:16,marginBottom:8,marginLeft:22}}>
                  {[0,1,2,3,4].map(i=>(
                    <div key={i} style={{width:4,borderRadius:2,height:isSpeaking&&i<volBars?`${7+i*3}px`:'3px',background:isSpeaking&&i<volBars?'#16a34a':'#e2e8f0',transition:'height 0.1s,background 0.2s'}}/>
                  ))}
                </div>
                <p style={{color:'#9ca3af',fontSize:12,margin:0,marginLeft:22}}>Stop talking when finished.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right — camera */}
        <div style={{flex:1,minWidth:300,animation:'fadeRight 0.5s 0.2s ease both'}}>
          <div style={{background:'#000',borderRadius:18,overflow:'hidden',position:'relative',aspectRatio:'16/9',borderTop:isRecording?'2px solid #16a34a':'2px solid #e2e8f0',borderRight:isRecording?'2px solid #16a34a':'2px solid #e2e8f0',borderBottom:isRecording?'2px solid #16a34a':'2px solid #e2e8f0',borderLeft:isRecording?'2px solid #16a34a':'2px solid #e2e8f0',boxShadow:isRecording?'0 0 0 3px rgba(22,163,74,0.1),0 12px 30px rgba(0,0,0,0.12)':'0 12px 30px rgba(0,0,0,0.1)',transition:'box-shadow 0.3s'}}>
            {!hasCameraAccess&&(
              <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:'#6b7280',gap:8,fontSize:12}}>
                <div style={{width:24,height:24,border:'2px solid #dcfce7',borderTopColor:'#16a34a',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
                Activating camera...
              </div>
            )}
            {isRecording&&(
              <div style={{position:'absolute',top:12,left:12,display:'flex',alignItems:'center',gap:5,background:'rgba(0,0,0,0.55)',padding:'4px 9px',borderRadius:99,backdropFilter:'blur(4px)',zIndex:2}}>
                <span style={{width:7,height:7,borderRadius:'50%',background:'#22c55e',animation:'pulseDot 1.2s ease infinite'}}/>
                <span style={{fontSize:10,fontWeight:700,color:'#86efac'}}>REC</span>
              </div>
            )}
            <video ref={videoRef} autoPlay playsInline muted style={{width:'100%',height:'100%',objectFit:'cover',transform:'scaleX(-1)'}}/>
          </div>
        </div>
      </div>
    </div>
  );
}