"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

interface Session { id:string; overall_score:number; speech_score:number; eye_contact_score:number; posture_score:number; created_at:string; }

function useCounter(target:number, duration=1400, delay=0) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      const start = Date.now();
      const tick = () => { const p=Math.min((Date.now()-start)/duration,1); setValue(Math.round((1-Math.pow(1-p,3))*target)); if(p<1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(t);
  }, [target, duration, delay]);
  return value;
}

function AnimRing({ score, size=110, delay=0 }: { score:number; size?:number; delay?:number }) {
  const [filled, setFilled] = useState(false);
  useEffect(() => { const t=setTimeout(()=>setFilled(true),delay+100); return ()=>clearTimeout(t); }, [delay]);
  const r=(size-10)/2, circ=2*Math.PI*r, displayed=useCounter(score,1400,delay);
  return (
    <div style={{ position:'relative', width:size, height:size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ filter:'drop-shadow(0 0 10px rgba(22,163,74,0.4))' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#0d1a0d" strokeWidth={9} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#16a34a" strokeWidth={9} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={filled ? circ*(1-score/100) : circ}
          style={{ transform:'rotate(-90deg)', transformOrigin:'50% 50%', transformBox:'fill-box', transition:'stroke-dashoffset 1.5s cubic-bezier(0.22,1,0.36,1)' }} />
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontSize:size/5, fontWeight:700, color:'#f8fafc', lineHeight:1 }}>{displayed}%</span>
        <span style={{ fontSize:size/10, color:'#6b8f6b' }}>avg</span>
      </div>
    </div>
  );
}

function SkillBar({ label, value, color, delay=0 }: { label:string; value:number; color:string; delay?:number }) {
  const [filled, setFilled] = useState(false);
  useEffect(() => { const t=setTimeout(()=>setFilled(true),delay+300); return ()=>clearTimeout(t); }, [delay]);
  const d = useCounter(value, 1200, delay+300);
  return (
    <div style={{ marginBottom:'14px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
        <span style={{ fontSize:'12px', color:'#9ab89a' }}>{label}</span>
        <span style={{ fontSize:'12px', fontWeight:600, color:'#f8fafc' }}>{d}%</span>
      </div>
      <div style={{ background:'#0d1a0d', borderRadius:'4px', height:'7px', overflow:'hidden' }}>
        <div style={{ height:'7px', borderRadius:'4px', background:color, width:filled?`${value}%`:'0%', transition:'width 1.2s cubic-bezier(0.22,1,0.36,1)', boxShadow:`0 0 8px ${color}66` }} />
      </div>
    </div>
  );
}

const sColor = (v:number) => v>=75?'#22c55e':v>=50?'#eab308':'#ef4444';
const sBg    = (v:number) => v>=75?'rgba(34,197,94,0.15)':v>=50?'rgba(234,179,8,0.15)':'rgba(239,68,68,0.15)';
const timeAgo = (iso:string) => { const d=Math.floor((Date.now()-new Date(iso).getTime())/86400000); return d===0?'Today':d===1?'Yesterday':`${d} days ago`; };

export default function Dashboard() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasResume, setHasResume] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }
      const [{ data: profile }, { data: sd }] = await Promise.all([
        supabase.from('profiles').select('resume_url').eq('id', session.user.id).single(),
        supabase.from('interview_sessions').select('*').eq('user_id', session.user.id).order('created_at', { ascending:false }).limit(10),
      ]);
      setHasResume(!!profile?.resume_url);
      setSessions(sd ?? []);
      setLoading(false);
      setTimeout(() => setMounted(true), 50);
    })();
  }, [router]);

  const avg = (key:keyof Session) => sessions.length ? Math.round(sessions.reduce((s,x)=>s+(x[key] as number),0)/sessions.length) : 0;
  const avgOverall=avg('overall_score'), avgSpeech=avg('speech_score'), avgEye=avg('eye_contact_score'), avgPosture=avg('posture_score');
  const bestScore = sessions.length ? Math.max(...sessions.map(s=>s.overall_score)) : 0;

  const cSessions = useCounter(sessions.length, 800, 200);
  const cBest     = useCounter(bestScore, 1000, 300);
  const cSpeech   = useCounter(avgSpeech, 1200, 400);
  const cPosture  = useCounter(avgPosture, 1200, 500);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'80vh' }}>
      <div style={{ width:'36px', height:'36px', border:'3px solid #1e3a1e', borderTopColor:'#16a34a', borderRadius:'50%', animation:'spin 0.8s linear infinite', boxShadow:'0 0 16px rgba(22,163,74,0.4)' }} />
    </div>
  );

  const stats = [
    { label:'Sessions', value:cSessions, suffix:'' },
    { label:'Best score', value:cBest, suffix:'%' },
    { label:'Avg speech', value:cSpeech, suffix:'%' },
    { label:'Avg posture', value:cPosture, suffix:'%' },
  ];

  const card = { background:'#0d1a0d', border:'1px solid #1e3a1e', borderRadius:'16px', padding:'1.25rem' };

  return (
    <div>
      <div className={mounted?'anim-fade-up d-0':''} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem', opacity:mounted?undefined:0 }}>
        <div>
          <h1 style={{ margin:'0 0 4px', fontSize:'22px', fontWeight:700, color:'#f8fafc', letterSpacing:'-0.3px' }}>Dashboard</h1>
          <p style={{ margin:0, fontSize:'13px', color:'#6b8f6b' }}>{sessions.length>0?`${sessions.length} session${sessions.length>1?'s':''} completed`:'No sessions yet — start your first interview'}</p>
        </div>
        <button onClick={()=>router.push('/upload')} className="btn-glow"
          style={{ background:'linear-gradient(135deg, #16a34a, #22c55e)', backgroundSize:'200% 200%', color:'white', border:'none', borderRadius:'10px', padding:'9px 18px', fontSize:'13px', cursor:'pointer', fontWeight:700, boxShadow:'0 4px 16px rgba(22,163,74,0.35)' }}>
          + Start interview
        </button>
      </div>

      {!hasResume && (
        <div className={mounted?'anim-fade-up d-100':''} style={{ padding:'12px 16px', background:'rgba(234,179,8,0.08)', border:'1px solid rgba(234,179,8,0.25)', borderRadius:'10px', marginBottom:'16px', fontSize:'13px', color:'#fbbf24', opacity:mounted?undefined:0 }}>
          No resume uploaded yet.{' '}
          <button onClick={()=>router.push('/upload')} style={{ background:'none', border:'none', color:'#22c55e', cursor:'pointer', fontSize:'13px', padding:0, fontWeight:600 }}>Upload one to start →</button>
        </div>
      )}

      {sessions.length === 0 ? (
        <div className={mounted?'anim-scale-in d-200':''} style={{ textAlign:'center', ...card, padding:'4rem 2rem', opacity:mounted?undefined:0 }}>
          <div style={{ fontSize:'48px', marginBottom:'16px', animation:'float 4s ease-in-out infinite' }}>🎯</div>
          <h2 style={{ margin:'0 0 8px', fontSize:'20px', fontWeight:700, color:'#f8fafc' }}>No interviews yet</h2>
          <p style={{ margin:'0 0 24px', fontSize:'14px', color:'#6b8f6b', lineHeight:1.6 }}>Complete your first mock interview to see scores and history here.</p>
          <button onClick={()=>router.push('/upload')} className="btn-glow"
            style={{ background:'linear-gradient(135deg, #16a34a, #22c55e)', backgroundSize:'200% 200%', color:'white', border:'none', borderRadius:'12px', padding:'12px 28px', fontSize:'15px', fontWeight:700, cursor:'pointer', boxShadow:'0 6px 20px rgba(22,163,74,0.35)' }}>
            Start your first interview →
          </button>
        </div>
      ) : (
        <>
          <div className={mounted?'anim-fade-up d-100':''} style={{ display:'grid', gridTemplateColumns:'190px 1fr', gap:'14px', marginBottom:'14px', opacity:mounted?undefined:0 }}>
            <div className="card-hover" style={{ ...card, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'1.5rem 1rem' }}>
              <AnimRing score={avgOverall} size={110} delay={200} />
              <p style={{ margin:'10px 0 0', fontSize:'12px', color:'#6b8f6b' }}>Across {sessions.length} sessions</p>
              {sessions.length>1&&<p style={{ margin:'4px 0 0', fontSize:'12px', color:'#22c55e', fontWeight:600 }}>↑ {sessions[0].overall_score-sessions[sessions.length-1].overall_score} pts since first</p>}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gridTemplateRows:'1fr 1fr', gap:'10px' }}>
              {stats.map(({ label, value, suffix })=>(
                <div key={label} className="card-hover" style={{ background:'#050f05', border:'1px solid #1e3a1e', borderRadius:'12px', padding:'14px 16px' }}>
                  <p style={{ margin:'0 0 4px', fontSize:'11px', color:'#6b8f6b' }}>{label}</p>
                  <p style={{ margin:0, fontSize:'24px', fontWeight:700, color:'#f8fafc' }}>{value}{suffix}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
            <div className={`card-hover ${mounted?'anim-fade-up d-300':''}`} style={{ ...card, opacity:mounted?undefined:0 }}>
              <p style={{ margin:'0 0 16px', fontSize:'14px', fontWeight:600, color:'#f8fafc' }}>Skill breakdown</p>
              <SkillBar label="Speech content" value={avgSpeech}  color="#22c55e" delay={400} />
              <SkillBar label="Eye contact"    value={avgEye}     color="#16a34a" delay={500} />
              <SkillBar label="Posture"        value={avgPosture} color="#4ade80" delay={600} />
              {avgEye<70&&<div style={{ padding:'10px 12px', background:'rgba(234,179,8,0.08)', border:'1px solid rgba(234,179,8,0.2)', borderRadius:'8px', fontSize:'12px', color:'#fbbf24', marginTop:'4px' }}>Focus: look at the camera lens, not your preview window.</div>}
            </div>

            <div className={`card-hover ${mounted?'anim-fade-up d-400':''}`} style={{ ...card, opacity:mounted?undefined:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
                <p style={{ margin:0, fontSize:'14px', fontWeight:600, color:'#f8fafc' }}>Recent sessions</p>
                <button onClick={()=>router.push('/history')} style={{ fontSize:'12px', color:'#22c55e', background:'none', border:'none', cursor:'pointer' }}>View all</button>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {sessions.slice(0,3).map((s,i)=>(
                  <div key={s.id} className="card-hover" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', background:'#050f05', borderRadius:'10px', border:'1px solid #1e3a1e', cursor:'pointer', animation:mounted?`fadeInUp 0.4s cubic-bezier(0.22,1,0.36,1) ${500+i*80}ms both`:'none' }}>
                    <div>
                      <p style={{ margin:'0 0 2px', fontSize:'13px', fontWeight:600, color:'#f8fafc' }}>Interview #{sessions.length-i}</p>
                      <p style={{ margin:0, fontSize:'11px', color:'#6b8f6b' }}>{timeAgo(s.created_at)}</p>
                    </div>
                    <span style={{ fontSize:'14px', fontWeight:700, color:sColor(s.overall_score), background:sBg(s.overall_score), padding:'4px 10px', borderRadius:'99px' }}>{s.overall_score}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}