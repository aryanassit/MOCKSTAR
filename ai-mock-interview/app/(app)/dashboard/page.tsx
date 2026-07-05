"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

interface Session { id:string; overall_score:number; speech_score:number; eye_contact_score:number; posture_score:number; created_at:string; }

function useCounter(target:number, duration=1200, delay=0) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      const s = Date.now();
      const tick = () => { const p=Math.min((Date.now()-s)/duration,1); setV(Math.round((1-Math.pow(1-p,3))*target)); if(p<1)requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(t);
  }, [target, duration, delay]);
  return v;
}

function AnimRing({ score, delay=0 }: { score:number; delay?:number }) {
  const [filled, setFilled] = useState(false);
  useEffect(() => { const t=setTimeout(()=>setFilled(true),delay+100); return ()=>clearTimeout(t); },[delay]);
  const r=42, circ=2*Math.PI*r, d=useCounter(score,1200,delay);
  return (
    <div style={{ position:'relative', width:100, height:100 }}>
      <svg width={100} height={100} viewBox="0 0 100 100">
        <circle cx={50} cy={50} r={r} fill="none" stroke="#f0fdf4" strokeWidth={8}/>
        <circle cx={50} cy={50} r={r} fill="none" stroke="#16a34a" strokeWidth={8} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={filled?circ*(1-score/100):circ}
          style={{transform:'rotate(-90deg)',transformOrigin:'50% 50%',transformBox:'fill-box',transition:'stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)'}}/>
      </svg>
      <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
        <span style={{fontSize:20,fontWeight:700,color:'#0f172a',lineHeight:1}}>{d}%</span>
        <span style={{fontSize:10,color:'#9ca3af'}}>avg</span>
      </div>
    </div>
  );
}

function SkillBar({ label, value, color, delay=0 }:{ label:string; value:number; color:string; delay?:number }) {
  const [f,setF]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setF(true),delay+200);return()=>clearTimeout(t);},[delay]);
  const d=useCounter(value,1100,delay+200);
  return (
    <div style={{marginBottom:12}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
        <span style={{fontSize:12,color:'#6b7280'}}>{label}</span>
        <span style={{fontSize:12,fontWeight:600,color:'#0f172a'}}>{d}%</span>
      </div>
      <div style={{background:'#f0fdf4',borderRadius:4,height:6}}>
        <div style={{height:6,borderRadius:4,background:color,width:f?`${value}%`:'0%',transition:'width 1.1s cubic-bezier(0.22,1,0.36,1)'}}/>
      </div>
    </div>
  );
}

const sColor = (v:number) => v>=75?'#16a34a':v>=50?'#d97706':'#dc2626';
const sBg    = (v:number) => v>=75?'#dcfce7':v>=50?'#fef3c7':'#fee2e2';
const sText  = (v:number) => v>=75?'#15803d':v>=50?'#92400e':'#991b1b';
const ago    = (iso:string) => { const d=Math.floor((Date.now()-new Date(iso).getTime())/86400000); return d===0?'Today':d===1?'Yesterday':`${d}d ago`; };

export default function Dashboard() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasResume, setHasResume] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      const [{ data: profile }, { data: sd }] = await Promise.all([
        supabase.from('profiles').select('resume_url').eq('id', session.user.id).single(),
        supabase.from('interview_sessions').select('*').eq('user_id', session.user.id).order('created_at',{ascending:false}).limit(10),
      ]);
      setHasResume(!!profile?.resume_url);
      setSessions(sd ?? []);
      setLoading(false);
      setTimeout(() => setMounted(true), 50);
    })();
  }, [router]);

  const avg = (k:keyof Session) => sessions.length ? Math.round(sessions.reduce((s,x)=>s+(x[k] as number),0)/sessions.length) : 0;
  const avgO=avg('overall_score'), avgS=avg('speech_score'), avgE=avg('eye_contact_score'), avgP=avg('posture_score');
  const best = sessions.length ? Math.max(...sessions.map(s=>s.overall_score)) : 0;

  const cSess = useCounter(sessions.length, 700, 200);
  const cBest = useCounter(best, 900, 300);
  const cSp   = useCounter(avgS, 1100, 400);
  const cPo   = useCounter(avgP, 1100, 500);

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'80vh'}}>
      <div style={{width:32,height:32,border:'3px solid #dcfce7',borderTopColor:'#16a34a',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const stats = [{label:'Sessions',v:cSess,s:''},{label:'Best score',v:cBest,s:'%'},{label:'Avg speech',v:cSp,s:'%'},{label:'Avg posture',v:cPo,s:'%'}];

  return (
    <div>
      {/* Header */}
      <div className={mounted?'anim-fade-up d-0':''} style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.5rem',opacity:mounted?undefined:0}}>
        <div>
          <h1 style={{margin:'0 0 3px',fontSize:22,fontWeight:700,color:'#0f172a',letterSpacing:'-0.3px'}}>Dashboard</h1>
          <p style={{margin:0,fontSize:13,color:'#6b7280'}}>{sessions.length>0?`${sessions.length} session${sessions.length>1?'s':''} completed`:'No sessions yet'}</p>
        </div>
        <button onClick={()=>router.push('/upload')} className="btn-primary" style={{padding:'9px 18px',fontSize:13}}>+ Start interview</button>
      </div>

      {!hasResume && (
        <div className={mounted?'anim-fade-up d-100':''} style={{padding:'11px 14px',background:'#fef9c3',border:'1px solid #fde68a',borderRadius:10,marginBottom:14,fontSize:13,color:'#854d0e',opacity:mounted?undefined:0}}>
          No resume uploaded. <button onClick={()=>router.push('/upload')} style={{background:'none',border:'none',color:'#16a34a',cursor:'pointer',fontSize:13,padding:0,fontWeight:600}}>Upload one →</button>
        </div>
      )}

      {sessions.length === 0 ? (
        <div className={mounted?'anim-scale-in d-200':''} style={{textAlign:'center',padding:'4rem 2rem',background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,boxShadow:'0 1px 3px rgba(0,0,0,0.06)',opacity:mounted?undefined:0}}>
          <div style={{fontSize:48,marginBottom:16}}>🎯</div>
          <h2 style={{margin:'0 0 8px',fontSize:20,fontWeight:700,color:'#0f172a'}}>No interviews yet</h2>
          <p style={{margin:'0 0 24px',fontSize:14,color:'#6b7280',lineHeight:1.6}}>Complete your first mock interview to see scores here.</p>
          <button onClick={()=>router.push('/upload')} className="btn-primary" style={{padding:'12px 28px',fontSize:15}}>Start your first interview →</button>
        </div>
      ) : (
        <>
          {/* Ring + stats */}
          <div className={mounted?'anim-fade-up d-100':''} style={{display:'grid',gridTemplateColumns:'180px 1fr',gap:14,marginBottom:14,opacity:mounted?undefined:0}}>
            <div className="card card-hover" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',padding:'1.25rem 1rem'}}>
              <AnimRing score={avgO} delay={200}/>
              <p style={{margin:'8px 0 0',fontSize:11,color:'#9ca3af'}}>Across {sessions.length} sessions</p>
              {sessions.length>1&&<p style={{margin:'3px 0 0',fontSize:11,color:'#16a34a',fontWeight:600}}>↑ {sessions[0].overall_score-sessions[sessions.length-1].overall_score} pts since first</p>}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gridTemplateRows:'1fr 1fr',gap:10}}>
              {stats.map(({label,v,s})=>(
                <div key={label} className="card card-hover" style={{padding:'12px 14px'}}>
                  <p style={{margin:'0 0 3px',fontSize:11,color:'#9ca3af'}}>{label}</p>
                  <p style={{margin:0,fontSize:22,fontWeight:700,color:'#0f172a'}}>{v}{s}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Skills + Recent */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <div className={`card card-hover ${mounted?'anim-fade-up d-300':''}`} style={{padding:'1.1rem 1.25rem',opacity:mounted?undefined:0}}>
              <p style={{margin:'0 0 14px',fontSize:14,fontWeight:600,color:'#0f172a'}}>Skill breakdown</p>
              <SkillBar label="Speech content" value={avgS} color="#16a34a" delay={400}/>
              <SkillBar label="Eye contact"    value={avgE} color="#22c55e" delay={500}/>
              <SkillBar label="Posture"        value={avgP} color="#4ade80" delay={600}/>
              {avgE<70&&<div style={{marginTop:8,padding:'9px 11px',background:'#fef9c3',border:'1px solid #fde68a',borderRadius:8,fontSize:12,color:'#854d0e'}}>Focus: look at the camera, not your preview window.</div>}
            </div>

            <div className={`card card-hover ${mounted?'anim-fade-up d-400':''}`} style={{padding:'1.1rem 1.25rem',opacity:mounted?undefined:0}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                <p style={{margin:0,fontSize:14,fontWeight:600,color:'#0f172a'}}>Recent sessions</p>
                <button onClick={()=>router.push('/history')} style={{fontSize:12,color:'#16a34a',background:'none',border:'none',cursor:'pointer',fontWeight:500}}>View all</button>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {sessions.slice(0,3).map((s,i)=>(
                  <div key={s.id} className="card-hover" style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px',background:'#f8fafc',borderRadius:10,border:'1px solid #e2e8f0',cursor:'pointer',animation:mounted?`fadeInUp 0.4s ease ${500+i*70}ms both`:'none'}}>
                    <div>
                      <p style={{margin:'0 0 1px',fontSize:13,fontWeight:600,color:'#0f172a'}}>Interview #{sessions.length-i}</p>
                      <p style={{margin:0,fontSize:11,color:'#9ca3af'}}>{ago(s.created_at)}</p>
                    </div>
                    <span style={{fontSize:13,fontWeight:700,color:sColor(s.overall_score),background:sBg(s.overall_score),padding:'3px 10px',borderRadius:99}}>{s.overall_score}%</span>
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