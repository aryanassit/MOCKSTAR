"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

interface Q { text:string; score:number }
interface Session { id:string; overall_score:number; speech_score:number; eye_contact_score:number; posture_score:number; feedback:string; questions:Q[]; created_at:string; }

const sColor = (v:number) => v>=75?'#15803d':v>=50?'#92400e':'#991b1b';
const sBg    = (v:number) => v>=75?'#dcfce7':v>=50?'#fef3c7':'#fee2e2';
const ago    = (iso:string) => { const d=Math.floor((Date.now()-new Date(iso).getTime())/86400000); if(d===0)return 'Today'; if(d===1)return 'Yesterday'; if(d<7)return `${d} days ago`; return new Date(iso).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); };

type Filter='all'|'strong'|'mixed'|'weak';

export default function History() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string|null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      const { data } = await supabase.from('interview_sessions').select('*').eq('user_id',session.user.id).order('created_at',{ascending:false});
      setSessions(data??[]);
      if(data?.[0]) setExpanded(data[0].id);
      setLoading(false);
    })();
  },[router]);

  const visible = sessions.filter(s=>{
    const mf=filter==='all'?true:filter==='strong'?s.overall_score>=75:filter==='mixed'?s.overall_score>=50&&s.overall_score<75:s.overall_score<50;
    const ms=s.feedback?.toLowerCase().includes(search.toLowerCase())||search==='';
    return mf&&ms;
  });

  const filters:{key:Filter;label:string}[]=[{key:'all',label:`All (${sessions.length})`},{key:'strong',label:'Strong ≥75%'},{key:'mixed',label:'Mixed 50–74%'},{key:'weak',label:'Needs work <50%'}];

  if(loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'80vh'}}>
      <div style={{width:32,height:32,border:'3px solid #dcfce7',borderTopColor:'#16a34a',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div>
      <style>{`@keyframes fadein{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}`}</style>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem'}}>
        <h1 style={{margin:0,fontSize:22,fontWeight:700,color:'#0f172a'}}>Interview history</h1>
        <div style={{display:'flex',alignItems:'center',gap:8,background:'#fff',border:'1px solid #e2e8f0',borderRadius:10,padding:'6px 12px',boxShadow:'0 1px 2px rgba(0,0,0,0.04)'}}>
          <span style={{fontSize:13,color:'#9ca3af'}}>⌕</span>
          <input type="text" placeholder="Search feedback..." value={search} onChange={e=>setSearch(e.target.value)}
            style={{border:'none',background:'none',outline:'none',fontSize:12,width:140,color:'#0f172a'}}/>
        </div>
      </div>

      <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
        {filters.map(({key,label})=>(
          <button key={key} onClick={()=>setFilter(key)} style={{fontSize:12,padding:'5px 12px',borderRadius:99,cursor:'pointer',fontWeight:500,background:filter===key?'#16a34a':'#fff',color:filter===key?'white':'#6b7280',border:filter===key?'none':'1px solid #e2e8f0',transition:'all 0.15s',boxShadow:'0 1px 2px rgba(0,0,0,0.04)'}}>
            {label}
          </button>
        ))}
      </div>

      {sessions.length===0?(
        <div style={{textAlign:'center',padding:'4rem 2rem',background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
          <div style={{fontSize:48,marginBottom:14}}>📋</div>
          <h2 style={{margin:'0 0 8px',fontSize:20,fontWeight:700,color:'#0f172a'}}>No interviews yet</h2>
          <p style={{margin:'0 0 20px',fontSize:14,color:'#6b7280'}}>Complete your first mock interview to see history here.</p>
          <button onClick={()=>router.push('/upload')} className="btn-primary" style={{padding:'10px 24px',fontSize:14}}>Start an interview →</button>
        </div>
      ):visible.length===0?(
        <div style={{textAlign:'center',padding:'3rem',color:'#9ca3af',fontSize:14}}>No sessions match this filter.</div>
      ):(
        visible.map((s,idx)=>{
          const open=expanded===s.id;
          const num=sessions.length-sessions.findIndex(x=>x.id===s.id);
          const qs:Q[]=Array.isArray(s.questions)?s.questions:[];
          return(
            <div key={s.id} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,marginBottom:10,overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.05)',animation:`fadein 0.3s ease ${idx*50}ms both`}}>
              <div onClick={()=>setExpanded(open?null:s.id)}
                style={{padding:'12px 14px',display:'flex',alignItems:'center',gap:11,cursor:'pointer',transition:'background 0.12s'}}
                onMouseEnter={e=>(e.currentTarget.style.background='#f8fafc')}
                onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                <div style={{width:34,height:34,borderRadius:9,background:s.overall_score>=75?'#dcfce7':'#f8fafc',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:16,border:'1px solid #e2e8f0'}}>
                  {s.overall_score>=75?'★':'◈'}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <p style={{margin:0,fontSize:14,fontWeight:600,color:'#0f172a'}}>Interview #{num}</p>
                    {idx===0&&<span style={{fontSize:10,background:'#dcfce7',color:'#15803d',padding:'2px 7px',borderRadius:99,fontWeight:600}}>Latest</span>}
                  </div>
                  <p style={{margin:'1px 0 0',fontSize:11,color:'#9ca3af'}}>{ago(s.created_at)} · {qs.length} questions</p>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:9,flexShrink:0}}>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:17,fontWeight:700,color:sColor(s.overall_score)}}>{s.overall_score}%</div>
                    <div style={{fontSize:10,color:'#9ca3af'}}>overall</div>
                  </div>
                  <span style={{color:'#d1d5db',display:'inline-block',transition:'transform 0.2s',transform:open?'rotate(180deg)':'none'}}>▾</span>
                </div>
              </div>

              {open&&(
                <div style={{padding:'0 14px 14px',animation:'fadein 0.18s ease'}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:12}}>
                    {[{label:'Speech',v:s.speech_score},{label:'Eye contact',v:s.eye_contact_score},{label:'Posture',v:s.posture_score}].map(({label,v})=>(
                      <div key={label} style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:9,padding:'9px',textAlign:'center'}}>
                        <div style={{fontSize:15,fontWeight:700,color:sColor(v)}}>{v}%</div>
                        <div style={{fontSize:10,color:'#9ca3af'}}>{label}</div>
                      </div>
                    ))}
                  </div>
                  {qs.length>0&&(
                    <>
                      <p style={{margin:'0 0 7px',fontSize:11,fontWeight:600,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.05em'}}>Questions asked</p>
                      {qs.map((q,i)=>(
                        <div key={i} style={{padding:'9px 0',borderBottom:i<qs.length-1?'1px solid #f1f5f9':'none',display:'flex',alignItems:'flex-start',gap:9}}>
                          <span style={{fontSize:11,padding:'2px 7px',borderRadius:99,fontWeight:600,background:sBg(q.score),color:sColor(q.score),flexShrink:0,whiteSpace:'nowrap'}}>{q.score}%</span>
                          <p style={{margin:0,fontSize:13,color:'#374151'}}>{q.text}</p>
                        </div>
                      ))}
                    </>
                  )}
                  {s.feedback&&(
                    <div style={{marginTop:10,padding:'10px 12px',background:'#f0fdf4',border:'1px solid #bbf7d0',borderLeft:'3px solid #16a34a',borderRadius:9}}>
                      <p style={{margin:0,fontSize:12,color:'#374151'}}><strong style={{color:'#0f172a'}}>AI feedback:</strong> {s.feedback}</p>
                    </div>
                  )}
                  <button onClick={()=>router.push('/upload')} className="btn-primary" style={{marginTop:10,padding:'7px 14px',fontSize:12}}>Practice again</button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}