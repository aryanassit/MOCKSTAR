"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

function Toggle({ on, onToggle }:{ on:boolean; onToggle:()=>void }) {
  return (
    <div onClick={onToggle} role="switch" aria-checked={on} tabIndex={0} onKeyDown={e=>e.key==='Enter'&&onToggle()}
      style={{ width:36, height:20, background:on?'#A0AB97':'#D8C7B3', borderRadius:10, cursor:'pointer', position:'relative', transition:'background 0.2s', flexShrink:0 }}>
      <div style={{ position:'absolute', top:3, [on?'right':'left']:3, width:14, height:14, background:'white', borderRadius:'50%', transition:'left 0.2s,right 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.3)' }}/>
    </div>
  );
}

const sColor=(v:number)=>v>=75?'#8F9B88':v>=50?'#eab308':'#ef4444';

export default function Profile() {
  const router=useRouter();
  const [email,setEmail]=useState('');
  const [displayName,setDisplayName]=useState('');
  const [editingName,setEditingName]=useState(false);
  const [draftName,setDraftName]=useState('');
  const [resumeName,setResumeName]=useState<string|null>(null);
  const [reminders,setReminders]=useState(true);
  const [autoSave,setAutoSave]=useState(false);
  const [loading,setLoading]=useState(true);
  const [userId,setUserId]=useState('');
  const [sessionCount,setSessionCount]=useState(0);
  const [avgScores,setAvgScores]=useState({overall:0,speech:0,eye:0,posture:0});
  const [memberSince,setMemberSince]=useState('');
  const [weakArea,setWeakArea]=useState('');

  useEffect(()=>{
    (async()=>{
      const { data: { session } }=await supabase.auth.getSession();
      if(!session){ router.push('/'); return; }
      setEmail(session.user.email??'');
      setUserId(session.user.id);
      setMemberSince(new Date(session.user.created_at).toLocaleDateString('en-US',{month:'short',year:'numeric'}));
      const [{ data: profile },{ data: sessions }]=await Promise.all([
        supabase.from('profiles').select('resume_url,display_name').eq('id',session.user.id).single(),
        supabase.from('interview_sessions').select('*').eq('user_id',session.user.id),
      ]);
      const name=profile?.display_name||session.user.email?.split('@')[0]||'User';
      setDisplayName(name); setDraftName(name);
      if(profile?.resume_url){ const p=profile.resume_url.split('/'); setResumeName(decodeURIComponent(p[p.length-1])); }
      if(sessions&&sessions.length>0){
        const avg=(k:string)=>Math.round(sessions.reduce((s:number,x:any)=>s+x[k],0)/sessions.length);
        const sp=avg('speech_score'),eye=avg('eye_contact_score'),po=avg('posture_score'),ov=avg('overall_score');
        setSessionCount(sessions.length);
        setAvgScores({overall:ov,speech:sp,eye,posture:po});
        setWeakArea([{name:'Eye contact',val:eye},{name:'Posture',val:po},{name:'Speech',val:sp}].sort((a,b)=>a.val-b.val)[0].name);
      }
      setLoading(false);
    })();
  },[router]);

  const saveName=async()=>{
    await supabase.from('profiles').upsert({id:userId,display_name:draftName});
    setDisplayName(draftName); setEditingName(false);
  };

  const handleDelete=async()=>{
    if(!window.confirm('Delete your account? This is permanent.'))return;
    await supabase.auth.signOut(); router.push('/');
  };

  if(loading) return(
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'80vh' }}>
      <div style={{ width:36, height:36, border:'3px solid #D8C7B3', borderTopColor:'#A0AB97', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const initials=displayName.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)||'??';
  const card={ background:'#EFE3D2', border:'1px solid #D8C7B3', borderRadius:14, padding:'1.1rem 1.25rem' };

  return (
    <div>
      <h1 style={{ margin:'0 0 1.3rem', fontSize:22, fontWeight:700, color:'#2E2A25' }}>Profile</h1>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>

        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={card} className="card-hover">
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
              <div style={{ width:48, height:48, borderRadius:'50%', background:'linear-gradient(135deg,#A0AB97,#8F9B88)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, fontWeight:700, color:'#2E2A25', flexShrink:0, boxShadow:'0 2px 10px rgba(160,171,151,0.3)' }}>{initials}</div>
              <div>
                {editingName?(
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <input autoFocus value={draftName} onChange={e=>setDraftName(e.target.value)}
                      onKeyDown={e=>{ if(e.key==='Enter')saveName(); if(e.key==='Escape')setEditingName(false); }}
                      style={{ border:'none', borderBottom:'1.5px solid #A0AB97', background:'none', fontSize:15, fontWeight:600, outline:'none', color:'#2E2A25', padding:'1px 3px', width:140 }}/>
                    <button onClick={saveName} style={{ fontSize:12, background:'#A0AB97', color:'#2E2A25', border:'none', borderRadius:6, padding:'3px 8px', cursor:'pointer' }}>Save</button>
                    <button onClick={()=>setEditingName(false)} style={{ fontSize:12, background:'none', border:'none', color:'#6F6A63', cursor:'pointer' }}>✕</button>
                  </div>
                ):(
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ fontSize:15, fontWeight:600, color:'#2E2A25' }}>{displayName}</span>
                    <button onClick={()=>{ setEditingName(true); setDraftName(displayName); }} style={{ background:'none', border:'none', cursor:'pointer', color:'#6F6A63', fontSize:13, transition:'color 0.15s' }}
                      onMouseEnter={e=>(e.currentTarget.style.color='#8F9B88')}
                      onMouseLeave={e=>(e.currentTarget.style.color='#6F6A63')}>✎</button>
                  </div>
                )}
                <p style={{ margin:'2px 0 0', fontSize:12, color:'#6F6A63' }}>{email}</p>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1px', background:'#D8C7B3', borderRadius:9, overflow:'hidden' }}>
              {[{label:'Member since',value:memberSince||'—'},{label:'Plan',value:'Free'},{label:'Interviews',value:String(sessionCount)},{label:'Best skill',value:sessionCount>0?(avgScores.speech>=avgScores.eye&&avgScores.speech>=avgScores.posture?'Speech':avgScores.posture>=avgScores.eye?'Posture':'Eye contact'):'—'}].map(({label,value})=>(
                <div key={label} style={{ background:'#F3E8DA', padding:'9px 11px' }}>
                  <p style={{ margin:0, fontSize:10, color:'#6F6A63' }}>{label}</p>
                  <p style={{ margin:'2px 0 0', fontSize:13, fontWeight:600, color:'#2E2A25' }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={card}>
            <p style={{ margin:'0 0 10px', fontSize:14, fontWeight:600, color:'#2E2A25' }}>Resume on file</p>
            {resumeName?(
              <div style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 11px', background:'rgba(160,171,151,0.08)', border:'1px solid rgba(160,171,151,0.25)', borderRadius:9 }}>
                <span style={{ fontSize:16, flexShrink:0 }}>📄</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ margin:0, fontSize:12, fontWeight:600, color:'#8F9B88', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{resumeName}</p>
                </div>
                <button onClick={()=>router.push('/upload')} style={{ fontSize:11, background:'none', border:'1px solid #A0AB97', borderRadius:6, padding:'3px 8px', color:'#A0AB97', cursor:'pointer' }}>Update</button>
              </div>
            ):(
              <div style={{ textAlign:'center', padding:'1.25rem', border:'1px dashed #D8C7B3', borderRadius:9 }}>
                <p style={{ margin:'0 0 10px', fontSize:13, color:'#6F6A63' }}>No resume uploaded yet</p>
                <button onClick={()=>router.push('/upload')} className="btn-green" style={{ padding:'7px 14px', fontSize:13 }}>Upload resume</button>
              </div>
            )}
          </div>

          <div style={card}>
            <p style={{ margin:'0 0 12px', fontSize:14, fontWeight:600, color:'#2E2A25' }}>Preferences</p>
            {[{label:'Email reminders',sub:'Remind me every 2 days',on:reminders,toggle:()=>setReminders(r=>!r)},{label:'Auto-save recordings',sub:'Keep clips after sessions',on:autoSave,toggle:()=>setAutoSave(s=>!s)}].map(({label,sub,on,toggle})=>(
              <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <div>
                  <p style={{ margin:0, fontSize:13, color:'#2E2A25' }}>{label}</p>
                  <p style={{ margin:0, fontSize:11, color:'#6F6A63' }}>{sub}</p>
                </div>
                <Toggle on={on} onToggle={toggle}/>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={card} className="card-hover">
            <p style={{ margin:'0 0 12px', fontSize:14, fontWeight:600, color:'#2E2A25' }}>Performance summary</p>
            {sessionCount===0?(
              <p style={{ fontSize:13, color:'#6F6A63', textAlign:'center', padding:'1rem 0' }}>Complete an interview to see your stats.</p>
            ):(
              [{label:'Average score',value:avgScores.overall,color:'#A0AB97'},{label:'Avg speech',value:avgScores.speech,color:'#8F9B88'},{label:'Avg eye contact',value:avgScores.eye,color:'#A0AB97'},{label:'Avg posture',value:avgScores.posture,color:'#A0AB97'}].map(({label,value,color})=>(
                <div key={label} style={{ marginBottom:11 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:12, color:'#6F6A63' }}>{label}</span>
                    <span style={{ fontSize:12, fontWeight:600, color:sColor(value) }}>{value}%</span>
                  </div>
                  <div style={{ background:'#D8C7B3', borderRadius:3, height:5 }}>
                    <div style={{ width:`${value}%`, height:5, background:color, borderRadius:3 }}/>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={card}>
            <p style={{ margin:'0 0 10px', fontSize:14, fontWeight:600, color:'#2E2A25' }}>Improvement areas</p>
            {sessionCount===0?(
              <p style={{ fontSize:13, color:'#6F6A63' }}>No data yet — complete an interview first.</p>
            ):(
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                <div style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 11px', background:'rgba(234,179,8,0.08)', border:'1px solid rgba(234,179,8,0.2)', borderRadius:9 }}>
                  <span style={{ fontSize:16, flexShrink:0 }}>⚠️</span>
                  <div>
                    <p style={{ margin:0, fontSize:12, fontWeight:600, color:'#fbbf24' }}>{weakArea} needs the most work</p>
                    <p style={{ margin:0, fontSize:11, color:'#92400e' }}>{weakArea==='Eye contact'?'Look at the camera, not your preview':weakArea==='Posture'?'Sit upright and face the camera':'Use STAR method for every answer'}</p>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 11px', background:'#F3E8DA', border:'1px solid #D8C7B3', borderRadius:9 }}>
                  <span style={{ fontSize:16, flexShrink:0 }}>📋</span>
                  <div>
                    <p style={{ margin:0, fontSize:12, fontWeight:600, color:'#2E2A25' }}>Answer structure</p>
                    <p style={{ margin:0, fontSize:11, color:'#6F6A63' }}>Use STAR method for behavioral questions</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ ...card, borderLeft:'3px solid #ef4444' }}>
            <p style={{ margin:'0 0 8px', fontSize:14, fontWeight:600, color:'#2E2A25' }}>Danger zone</p>
            <p style={{ margin:'0 0 10px', fontSize:12, color:'#6F6A63' }}>Deletes all sessions, scores, and history permanently.</p>
            <button onClick={handleDelete} style={{ fontSize:13, background:'none', border:'1px solid #ef4444', color:'#ef4444', borderRadius:8, padding:'6px 12px', cursor:'pointer', transition:'background 0.15s' }}
              onMouseEnter={e=>(e.currentTarget.style.background='rgba(239,68,68,0.1)')}
              onMouseLeave={e=>(e.currentTarget.style.background='none')}>Delete my account</button>
          </div>
        </div>
      </div>
    </div>
  );
}