"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

interface Session { id:string; overall_score:number; speech_score:number; eye_contact_score:number; posture_score:number; created_at:string; }

function GrowthChart({ sessions }: { sessions: Session[] }) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setDrawn(true), 300); return () => clearTimeout(t); }, []);

  // sessions arrive newest-first; reverse for a left-to-right chronological read
  const chrono = [...sessions].reverse();
  const w = 560, h = 180, pad = { top: 16, right: 16, bottom: 24, left: 30 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;
  const n = chrono.length;
  const xFor = (i: number) => (n <= 1 ? pad.left + innerW / 2 : pad.left + (i / (n - 1)) * innerW);
  const yFor = (v: number) => pad.top + innerH - (v / 100) * innerH;

  const points = chrono.map((s, i) => ({ x: xFor(i), y: yFor(s.overall_score), score: s.overall_score }));
  const pathD = points.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' ');
  const areaD = points.length
    ? pathD + ` L ${points[points.length - 1].x.toFixed(1)} ${(pad.top + innerH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(pad.top + innerH).toFixed(1)} Z`
    : '';

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow:'visible', display:'block' }}>
      <defs>
        <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A0AB97" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#A0AB97" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 50, 100].map(v => (
        <g key={v}>
          <line x1={pad.left} x2={w - pad.right} y1={yFor(v)} y2={yFor(v)} stroke="#D8C7B3" strokeWidth={1} strokeDasharray="3,3" />
          <text x={pad.left - 8} y={yFor(v) + 3} fontSize={9} fill="#6F6A63" textAnchor="end">{v}</text>
        </g>
      ))}
      <path d={areaD} fill="url(#growthFill)" style={{ opacity:drawn?1:0, transition:'opacity 0.7s ease 0.5s' }} />
      <path d={pathD} fill="none" stroke="#8F9B88" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
        style={{ strokeDasharray:3000, strokeDashoffset:drawn?0:3000, transition:'stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)' }} />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#8F9B88" stroke="#F3E8DA" strokeWidth={1.5}
          style={{ opacity:drawn?1:0, transition:`opacity 0.3s ease ${0.5 + i * 0.06}s` }} />
      ))}
    </svg>
  );
}

function useCounter(target:number, duration=1200, delay=0) {
  const [v,setV]=useState(0);
  useEffect(()=>{
    const t=setTimeout(()=>{
      const s=Date.now();
      const tick=()=>{ const p=Math.min((Date.now()-s)/duration,1); setV(Math.round((1-Math.pow(1-p,3))*target)); if(p<1)requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    },delay);
    return ()=>clearTimeout(t);
  },[target,duration,delay]);
  return v;
}

function AnimRing({ score, delay=0 }:{ score:number; delay?:number }) {
  const [filled,setFilled]=useState(false);
  useEffect(()=>{ const t=setTimeout(()=>setFilled(true),delay+100); return()=>clearTimeout(t); },[delay]);
  const r=42, circ=2*Math.PI*r, d=useCounter(score,1200,delay);
  return (
    <div style={{ position:'relative', width:100, height:100 }}>
      <svg width={100} height={100} viewBox="0 0 100 100" style={{ filter:'drop-shadow(0 0 8px rgba(160,171,151,0.4))' }}>
        <circle cx={50} cy={50} r={r} fill="none" stroke="#EFE3D2" strokeWidth={8}/>
        <circle cx={50} cy={50} r={r} fill="none" stroke="#A0AB97" strokeWidth={8} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={filled?circ*(1-score/100):circ}
          style={{ transform:'rotate(-90deg)', transformOrigin:'50% 50%', transformBox:'fill-box', transition:'stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)' }}/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontSize:20, fontWeight:700, color:'#2E2A25', lineHeight:1 }}>{d}%</span>
        <span style={{ fontSize:10, color:'#6F6A63' }}>avg</span>
      </div>
    </div>
  );
}

function SkillBar({ label, value, color, delay=0 }:{ label:string; value:number; color:string; delay?:number }) {
  const [f,setF]=useState(false);
  useEffect(()=>{ const t=setTimeout(()=>setF(true),delay+200); return()=>clearTimeout(t); },[delay]);
  const d=useCounter(value,1100,delay+200);
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
        <span style={{ fontSize:12, color:'#6F6A63' }}>{label}</span>
        <span style={{ fontSize:12, fontWeight:600, color:'#2E2A25' }}>{d}%</span>
      </div>
      <div style={{ background:'#D8C7B3', borderRadius:4, height:6 }}>
        <div style={{ height:6, borderRadius:4, background:color, width:f?`${value}%`:'0%', transition:'width 1.1s cubic-bezier(0.22,1,0.36,1)', boxShadow:`0 0 8px ${color}66` }}/>
      </div>
    </div>
  );
}

const sColor=(v:number)=>v>=75?'#8F9B88':v>=50?'#eab308':'#ef4444';
const sBg=(v:number)=>v>=75?'rgba(160,171,151,0.15)':v>=50?'rgba(234,179,8,0.15)':'rgba(239,68,68,0.15)';
const ago=(iso:string)=>{ const d=Math.floor((Date.now()-new Date(iso).getTime())/86400000); return d===0?'Today':d===1?'Yesterday':`${d}d ago`; };

export default function Dashboard() {
  const router=useRouter();
  const [sessions,setSessions]=useState<Session[]>([]);
  const [loading,setLoading]=useState(true);
  const [hasResume,setHasResume]=useState(false);
  const [mounted,setMounted]=useState(false);

  useEffect(()=>{
    (async()=>{
      const { data: { session } }=await supabase.auth.getSession();
      if(!session){ router.push('/'); return; }
      const [{ data: profile },{ data: sd }]=await Promise.all([
        supabase.from('profiles').select('resume_url').eq('id',session.user.id).single(),
        supabase.from('interview_sessions').select('*').eq('user_id',session.user.id).order('created_at',{ascending:false}).limit(10),
      ]);
      setHasResume(!!profile?.resume_url);
      setSessions(sd??[]);
      setLoading(false);
      setTimeout(()=>setMounted(true),50);
    })();
  },[router]);

  const avg=(k:keyof Session)=>sessions.length?Math.round(sessions.reduce((s,x)=>s+(x[k] as number),0)/sessions.length):0;
  const avgO=avg('overall_score'),avgS=avg('speech_score'),avgE=avg('eye_contact_score'),avgP=avg('posture_score');
  const best=sessions.length?Math.max(...sessions.map(s=>s.overall_score)):0;

  const cSess=useCounter(sessions.length,700,200);
  const cBest=useCounter(best,900,300);
  const cSp=useCounter(avgS,1100,400);
  const cPo=useCounter(avgP,1100,500);

  if(loading) return(
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'80vh' }}>
      <div style={{ width:36, height:36, border:'3px solid #D8C7B3', borderTopColor:'#A0AB97', borderRadius:'50%', animation:'spin 0.8s linear infinite', boxShadow:'0 0 16px rgba(160,171,151,0.3)' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const stats=[{label:'Sessions',v:cSess,s:''},{label:'Best score',v:cBest,s:'%'},{label:'Avg speech',v:cSp,s:'%'},{label:'Avg posture',v:cPo,s:'%'}];
  const card={ background:'#EFE3D2', border:'1px solid #D8C7B3', borderRadius:14 };

  return (
    <div>
      <div className={mounted?'anim-fade-up d-0':''} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem', opacity:mounted?undefined:0 }}>
        <div>
          <h1 style={{ margin:'0 0 4px', fontSize:22, fontWeight:700, color:'#2E2A25', letterSpacing:'-0.3px' }}>Dashboard</h1>
          <p style={{ margin:0, fontSize:13, color:'#6F6A63' }}>{sessions.length>0?`${sessions.length} session${sessions.length>1?'s':''} completed`:'No sessions yet — start your first interview'}</p>
        </div>
        <button onClick={()=>router.push('/upload')} className="btn-green" style={{ padding:'9px 18px', fontSize:13 }}>+ Start interview</button>
      </div>

      {!hasResume&&(
        <div className={mounted?'anim-fade-up d-100':''} style={{ padding:'11px 14px', background:'rgba(234,179,8,0.08)', border:'1px solid rgba(234,179,8,0.25)', borderRadius:10, marginBottom:14, fontSize:13, color:'#fbbf24', opacity:mounted?undefined:0 }}>
          No resume uploaded. <button onClick={()=>router.push('/upload')} style={{ background:'none', border:'none', color:'#8F9B88', cursor:'pointer', fontSize:13, padding:0, fontWeight:600 }}>Upload one →</button>
        </div>
      )}

      {sessions.length===0?(
        <div className={mounted?'anim-scale-in d-200':''} style={{ textAlign:'center', padding:'4rem 2rem', ...card, opacity:mounted?undefined:0 }}>
          <div style={{ fontSize:48, marginBottom:16, animation:'float 4s ease-in-out infinite' }}>🎯</div>
          <h2 style={{ margin:'0 0 8px', fontSize:20, fontWeight:700, color:'#2E2A25' }}>No interviews yet</h2>
          <p style={{ margin:'0 0 24px', fontSize:14, color:'#6F6A63', lineHeight:1.6 }}>Complete your first mock interview to see scores here.</p>
          <button onClick={()=>router.push('/upload')} className="btn-green" style={{ padding:'12px 28px', fontSize:15 }}>Start your first interview →</button>
        </div>
      ):(
        <>
          <div className={mounted?'anim-fade-up d-100':''} style={{ display:'grid', gridTemplateColumns:'180px 1fr', gap:14, marginBottom:14, opacity:mounted?undefined:0 }}>
            <div className="card-hover" style={{ ...card, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'1.25rem 1rem' }}>
              <AnimRing score={avgO} delay={200}/>
              <p style={{ margin:'8px 0 0', fontSize:11, color:'#6F6A63' }}>Across {sessions.length} sessions</p>
              {sessions.length>1&&<p style={{ margin:'3px 0 0', fontSize:11, color:'#8F9B88', fontWeight:600 }}>↑ {sessions[0].overall_score-sessions[sessions.length-1].overall_score} pts since first</p>}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gridTemplateRows:'1fr 1fr', gap:10 }}>
              {stats.map(({label,v,s})=>(
                <div key={label} className="card-hover" style={{ background:'#F3E8DA', border:'1px solid #D8C7B3', borderRadius:12, padding:'14px 16px' }}>
                  <p style={{ margin:'0 0 4px', fontSize:11, color:'#6F6A63' }}>{label}</p>
                  <p style={{ margin:0, fontSize:24, fontWeight:700, color:'#2E2A25' }}>{v}{s}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div className={`card-hover ${mounted?'anim-fade-up d-300':''}`} style={{ ...card, padding:'1.1rem 1.25rem', opacity:mounted?undefined:0 }}>
              <p style={{ margin:'0 0 14px', fontSize:14, fontWeight:600, color:'#2E2A25' }}>Skill breakdown</p>
              <SkillBar label="Speech content" value={avgS} color="#8F9B88" delay={400}/>
              <SkillBar label="Eye contact"    value={avgE} color="#A0AB97" delay={500}/>
              <SkillBar label="Posture"        value={avgP} color="#A0AB97" delay={600}/>
              {avgE<70&&<div style={{ padding:'9px 11px', background:'rgba(234,179,8,0.08)', border:'1px solid rgba(234,179,8,0.2)', borderRadius:8, fontSize:12, color:'#996515', marginTop:4 }}>Focus: look at the camera lens, not your preview window.</div>}
            </div>

            <div className={`card-hover ${mounted?'anim-fade-up d-400':''}`} style={{ ...card, padding:'1.1rem 1.25rem', opacity:mounted?undefined:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <p style={{ margin:0, fontSize:14, fontWeight:600, color:'#2E2A25' }}>Recent sessions</p>
                <button onClick={()=>router.push('/history')} style={{ fontSize:12, color:'#8F9B88', background:'none', border:'none', cursor:'pointer' }}>View all</button>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                {sessions.slice(0,3).map((s,i)=>(
                  <div key={s.id} className="card-hover" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 13px', background:'#F3E8DA', borderRadius:10, border:'1px solid #D8C7B3', cursor:'pointer', animation:mounted?`fadeInUp 0.4s ease ${500+i*70}ms both`:'none' }}>
                    <div>
                      <p style={{ margin:'0 0 1px', fontSize:13, fontWeight:600, color:'#2E2A25' }}>Interview #{sessions.length-i}</p>
                      <p style={{ margin:0, fontSize:11, color:'#6F6A63' }}>{ago(s.created_at)}</p>
                    </div>
                    <span style={{ fontSize:13, fontWeight:700, color:sColor(s.overall_score), background:sBg(s.overall_score), padding:'3px 10px', borderRadius:99 }}>{s.overall_score}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {sessions.length >= 2 ? (
            <div className={`card-hover ${mounted?'anim-fade-up d-500':''}`} style={{ ...card, padding:'1.1rem 1.25rem', marginTop:14, opacity:mounted?undefined:0 }}>
              <p style={{ margin:'0 0 4px', fontSize:14, fontWeight:600, color:'#2E2A25' }}>Score growth</p>
              <p style={{ margin:'0 0 10px', fontSize:11, color:'#6F6A63' }}>Overall score across your last {sessions.length} sessions</p>
              <GrowthChart sessions={sessions} />
            </div>
          ) : (
            <div className={`card-hover ${mounted?'anim-fade-up d-500':''}`} style={{ ...card, padding:'1.1rem 1.25rem', marginTop:14, textAlign:'center', opacity:mounted?undefined:0 }}>
              <p style={{ margin:0, fontSize:12, color:'#6F6A63' }}>Complete one more interview to start tracking your growth over time.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
