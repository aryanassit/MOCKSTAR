"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

interface Q { text:string; score:number }
interface Session { id:string; overall_score:number; speech_score:number; eye_contact_score:number; posture_score:number; feedback:string; questions:Q[]; created_at:string; }

const sColor=(v:number)=>v>=75?'#22c55e':v>=50?'#eab308':'#ef4444';
const sBg=(v:number)=>v>=75?'rgba(34,197,94,0.15)':v>=50?'rgba(234,179,8,0.15)':'rgba(239,68,68,0.15)';
const ago=(iso:string)=>{ const d=Math.floor((Date.now()-new Date(iso).getTime())/86400000); if(d===0)return'Today'; if(d===1)return'Yesterday'; if(d<7)return`${d} days ago`; return new Date(iso).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); };

type Filter='all'|'strong'|'mixed'|'weak';

export default function History() {
  const router=useRouter();
  const [sessions,setSessions]=useState<Session[]>([]);
  const [loading,setLoading]=useState(true);
  const [filter,setFilter]=useState<Filter>('all');
  const [search,setSearch]=useState('');
  const [expanded,setExpanded]=useState<string|null>(null);

  useEffect(()=>{
    (async()=>{
      const { data: { session } }=await supabase.auth.getSession();
      if(!session){ router.push('/'); return; }
      const { data }=await supabase.from('interview_sessions').select('*').eq('user_id',session.user.id).order('created_at',{ascending:false});
      setSessions(data??[]);
      if(data?.[0]) setExpanded(data[0].id);
      setLoading(false);
    })();
  },[router]);

  const visible=sessions.filter(s=>{
    const mf=filter==='all'?true:filter==='strong'?s.overall_score>=75:filter==='mixed'?s.overall_score>=50&&s.overall_score<75:s.overall_score<50;
    const ms=s.feedback?.toLowerCase().includes(search.toLowerCase())||search==='';
    return mf&&ms;
  });

  const filters:{key:Filter;label:string}[]=[
    {key:'all',label:`All (${sessions.length})`},
    {key:'strong',label:'Strong ≥75%'},
    {key:'mixed',label:'Mixed 50–74%'},
    {key:'weak',label:'Needs work <50%'},
  ];

  if(loading) return(
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'80vh' }}>
      <div style={{ width:36, height:36, border:'3px solid #1e3a1e', borderTopColor:'#16a34a', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const card={ background:'#0d1a0d', border:'1px solid #1e3a1e', borderRadius:14 };

  return (
    <div>
      <style>{`@keyframes fadein{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}`}</style>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem' }}>
        <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:'#f8fafc' }}>Interview history</h1>
        <div style={{ display:'flex', alignItems:'center', gap:8, background:'#0d1a0d', border:'1px solid #1e3a1e', borderRadius:10, padding:'6px 12px' }}>
          <span style={{ fontSize:13, color:'#4a6f4a' }}>⌕</span>
          <input type="text" placeholder="Search feedback..." value={search} onChange={e=>setSearch(e.target.value)}
            style={{ border:'none', background:'none', outline:'none', fontSize:12, width:140, color:'#f8fafc' }}/>
        </div>
      </div>

      <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
        {filters.map(({key,label})=>(
          <button key={key} onClick={()=>setFilter(key)} style={{ fontSize:12, padding:'5px 12px', borderRadius:99, cursor:'pointer', fontWeight:500, background:filter===key?'linear-gradient(135deg,#16a34a,#22c55e)':'#0d1a0d', color:filter===key?'white':'#6b8f6b', border:filter===key?'none':'1px solid #1e3a1e', transition:'all 0.15s' }}>
            {label}
          </button>
        ))}
      </div>

      {sessions.length===0?(
        <div style={{ textAlign:'center', padding:'4rem 2rem', ...card }}>
          <div style={{ fontSize:48, marginBottom:14 }}>📋</div>
          <h2 style={{ margin:'0 0 8px', fontSize:20, fontWeight:700, color:'#f8fafc' }}>No interviews yet</h2>
          <p style={{ margin:'0 0 20px', fontSize:14, color:'#6b8f6b' }}>Complete your first mock interview to see history here.</p>
          <button onClick={()=>router.push('/upload')} className="btn-green" style={{ padding:'10px 24px', fontSize:14 }}>Start an interview →</button>
        </div>
      ):visible.length===0?(
        <div style={{ textAlign:'center', padding:'3rem', color:'#6b8f6b', fontSize:14 }}>No sessions match this filter.</div>
      ):(
        visible.map((s,idx)=>{
          const open=expanded===s.id;
          const num=sessions.length-sessions.findIndex(x=>x.id===s.id);
          const qs:Q[]=Array.isArray(s.questions)?s.questions:[];
          return(
            <div key={s.id} style={{ ...card, marginBottom:10, overflow:'hidden', animation:`fadein 0.3s ease ${idx*50}ms both` }}>
              <div onClick={()=>setExpanded(open?null:s.id)}
                style={{ padding:'13px 15px', display:'flex', alignItems:'center', gap:11, cursor:'pointer', transition:'background 0.15s' }}
                onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.02)')}
                onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                <div style={{ width:34, height:34, borderRadius:9, background:s.overall_score>=75?'rgba(22,163,74,0.2)':'#050f05', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:16, border:'1px solid #1e3a1e' }}>
                  {s.overall_score>=75?'★':'◈'}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <p style={{ margin:0, fontSize:14, fontWeight:600, color:'#f8fafc' }}>Interview #{num}</p>
                    {idx===0&&<span style={{ fontSize:10, background:'rgba(22,163,74,0.2)', color:'#22c55e', padding:'2px 7px', borderRadius:99, fontWeight:600 }}>Latest</span>}
                  </div>
                  <p style={{ margin:'1px 0 0', fontSize:11, color:'#6b8f6b' }}>{ago(s.created_at)} · {qs.length} questions</p>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:9, flexShrink:0 }}>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:17, fontWeight:700, color:sColor(s.overall_score) }}>{s.overall_score}%</div>
                    <div style={{ fontSize:10, color:'#6b8f6b' }}>overall</div>
                  </div>
                  <span style={{ color:'#4a6f4a', display:'inline-block', transition:'transform 0.2s', transform:open?'rotate(180deg)':'none' }}>▾</span>
                </div>
              </div>

              {open&&(
                <div style={{ padding:'0 15px 14px', animation:'fadein 0.2s ease' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:12 }}>
                    {[{label:'Speech',v:s.speech_score},{label:'Eye contact',v:s.eye_contact_score},{label:'Posture',v:s.posture_score}].map(({label,v})=>(
                      <div key={label} style={{ background:'#050f05', border:'1px solid #1e3a1e', borderRadius:9, padding:'9px', textAlign:'center' }}>
                        <div style={{ fontSize:15, fontWeight:700, color:sColor(v) }}>{v}%</div>
                        <div style={{ fontSize:10, color:'#6b8f6b' }}>{label}</div>
                      </div>
                    ))}
                  </div>
                  {qs.length>0&&(
                    <>
                      <p style={{ margin:'0 0 7px', fontSize:11, fontWeight:600, color:'#4a6f4a', textTransform:'uppercase', letterSpacing:'0.06em' }}>Questions asked</p>
                      {qs.map((q,i)=>(
                        <div key={i} style={{ padding:'9px 0', borderBottom:i<qs.length-1?'1px solid #0d1a0d':'none', display:'flex', alignItems:'flex-start', gap:9 }}>
                          <span style={{ fontSize:11, padding:'2px 7px', borderRadius:99, fontWeight:600, background:sBg(q.score), color:sColor(q.score), flexShrink:0, whiteSpace:'nowrap' }}>{q.score}%</span>
                          <p style={{ margin:0, fontSize:13, color:'#d4ead4' }}>{q.text}</p>
                        </div>
                      ))}
                    </>
                  )}
                  {s.feedback&&(
                    <div style={{ marginTop:10, padding:'10px 12px', background:'#050f05', border:'1px solid #1e3a1e', borderLeft:'3px solid #16a34a', borderRadius:9 }}>
                      <p style={{ margin:0, fontSize:12, color:'#9ab89a' }}><strong style={{ color:'#f8fafc' }}>AI feedback:</strong> {s.feedback}</p>
                    </div>
                  )}
                  <button onClick={()=>router.push('/upload')} className="btn-green" style={{ marginTop:10, padding:'6px 14px', fontSize:12 }}>Practice again</button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}