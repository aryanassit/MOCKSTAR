"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

function Toggle({ on, onToggle }: { on:boolean; onToggle:()=>void }) {
  return (
    <div onClick={onToggle} role="switch" aria-checked={on} tabIndex={0}
      onKeyDown={e=>e.key==='Enter'&&onToggle()}
      style={{width:'36px',height:'20px',background:on?'#16a34a':'#1e3a1e',borderRadius:'10px',cursor:'pointer',position:'relative',transition:'background 0.2s',flexShrink:0}}>
      <div style={{position:'absolute',top:'3px',[on?'right':'left']:'3px',width:'14px',height:'14px',background:'white',borderRadius:'50%',transition:'left 0.2s, right 0.2s'}} />
    </div>
  );
}

const sColor = (v:number) => v>=75?'#22c55e':v>=50?'#eab308':'#ef4444';
const card = {background:'#0d1a0d',border:'1px solid #1e3a1e',borderRadius:'16px',padding:'1.25rem'};

export default function Profile() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [resumeName, setResumeName] = useState<string|null>(null);
  const [reminders, setReminders] = useState(true);
  const [autoSave, setAutoSave] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [sessionCount, setSessionCount] = useState(0);
  const [avgScores, setAvgScores] = useState({overall:0,speech:0,eye:0,posture:0});
  const [memberSince, setMemberSince] = useState('');
  const [weakArea, setWeakArea] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }
      setEmail(session.user.email ?? '');
      setUserId(session.user.id);
      setMemberSince(new Date(session.user.created_at).toLocaleDateString('en-US',{month:'short',year:'numeric'}));

      const [{ data: profile }, { data: sessions }] = await Promise.all([
        supabase.from('profiles').select('resume_url, display_name').eq('id', session.user.id).single(),
        supabase.from('interview_sessions').select('*').eq('user_id', session.user.id),
      ]);

      const name = profile?.display_name || session.user.email?.split('@')[0] || 'User';
      setDisplayName(name); setDraftName(name);
      if (profile?.resume_url) {
        const parts = profile.resume_url.split('/');
        setResumeName(decodeURIComponent(parts[parts.length-1]));
      }
      if (sessions && sessions.length > 0) {
        const avg = (key:string) => Math.round(sessions.reduce((s:number,x:any)=>s+x[key],0)/sessions.length);
        const sp=avg('speech_score'), eye=avg('eye_contact_score'), po=avg('posture_score'), ov=avg('overall_score');
        setSessionCount(sessions.length);
        setAvgScores({overall:ov,speech:sp,eye,posture:po});
        setWeakArea([{name:'Eye contact',val:eye},{name:'Posture',val:po},{name:'Speech',val:sp}].sort((a,b)=>a.val-b.val)[0].name);
      }
      setLoading(false);
    })();
  }, [router]);

  const saveName = async () => {
    await supabase.from('profiles').upsert({id:userId, display_name:draftName});
    setDisplayName(draftName); setEditingName(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete your account? This is permanent and cannot be undone.')) return;
    await supabase.auth.signOut(); router.push('/');
  };

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'80vh'}}>
      <div style={{width:'36px',height:'36px',border:'3px solid #1e3a1e',borderTopColor:'#16a34a',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const initials = displayName.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)||'??';

  return (
    <div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <h1 style={{margin:'0 0 1.3rem',fontSize:'22px',fontWeight:700,color:'#f8fafc'}}>Profile</h1>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>

        {/* Left */}
        <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>

          {/* Identity */}
          <div style={card} className="card-hover">
            <div style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:'16px'}}>
              <div style={{width:'52px',height:'52px',borderRadius:'50%',background:'linear-gradient(135deg,#16a34a,#22c55e)',backgroundSize:'200% 200%',animation:'gradientShift 5s ease infinite',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',fontWeight:700,color:'white',flexShrink:0,boxShadow:'0 4px 14px rgba(22,163,74,0.35)'}}>
                {initials}
              </div>
              <div>
                {editingName ? (
                  <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                    <input autoFocus value={draftName} onChange={e=>setDraftName(e.target.value)}
                      onKeyDown={e=>{if(e.key==='Enter')saveName();if(e.key==='Escape')setEditingName(false);}}
                      style={{border:'none',borderBottom:'1.5px solid #16a34a',background:'none',fontSize:'15px',fontWeight:600,outline:'none',color:'#f8fafc',padding:'1px 3px',width:'140px'}} />
                    <button onClick={saveName} style={{fontSize:'12px',background:'#16a34a',color:'white',border:'none',borderRadius:'6px',padding:'3px 8px',cursor:'pointer'}}>Save</button>
                    <button onClick={()=>setEditingName(false)} style={{fontSize:'12px',background:'none',border:'none',color:'#4a6f4a',cursor:'pointer'}}>✕</button>
                  </div>
                ) : (
                  <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                    <span style={{fontSize:'16px',fontWeight:600,color:'#f8fafc'}}>{displayName}</span>
                    <button onClick={()=>{setEditingName(true);setDraftName(displayName);}} style={{background:'none',border:'none',cursor:'pointer',color:'#4a6f4a',fontSize:'13px',transition:'color 0.15s'}}
                      onMouseEnter={e=>(e.currentTarget.style.color='#22c55e')}
                      onMouseLeave={e=>(e.currentTarget.style.color='#4a6f4a')}>✎</button>
                  </div>
                )}
                <p style={{margin:'3px 0 0',fontSize:'12px',color:'#6b8f6b'}}>{email}</p>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1px',background:'#1e3a1e',borderRadius:'10px',overflow:'hidden'}}>
              {[
                {label:'Member since',value:memberSince||'—'},
                {label:'Plan',value:'Free'},
                {label:'Interviews',value:String(sessionCount)},
                {label:'Best skill',value:sessionCount>0?(avgScores.speech>=avgScores.eye&&avgScores.speech>=avgScores.posture?'Speech':avgScores.posture>=avgScores.eye?'Posture':'Eye contact'):'—'},
              ].map(({label,value})=>(
                <div key={label} style={{background:'#050f05',padding:'10px 12px'}}>
                  <p style={{margin:0,fontSize:'10px',color:'#4a6f4a'}}>{label}</p>
                  <p style={{margin:'2px 0 0',fontSize:'13px',fontWeight:600,color:'#f8fafc'}}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Resume */}
          <div style={card} className="card-hover">
            <p style={{margin:'0 0 12px',fontSize:'14px',fontWeight:600,color:'#f8fafc'}}>Resume on file</p>
            {resumeName ? (
              <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',background:'rgba(22,163,74,0.08)',border:'1px solid rgba(22,163,74,0.25)',borderRadius:'10px'}}>
                <span style={{fontSize:'18px',flexShrink:0}}>📄</span>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{margin:0,fontSize:'12px',fontWeight:600,color:'#22c55e',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{resumeName}</p>
                </div>
                <button onClick={()=>router.push('/upload')} style={{fontSize:'11px',background:'none',border:'1px solid #16a34a',borderRadius:'6px',padding:'3px 8px',color:'#16a34a',cursor:'pointer'}}>Update</button>
              </div>
            ) : (
              <div style={{textAlign:'center',padding:'1.5rem',border:'1px dashed #1e3a1e',borderRadius:'10px'}}>
                <p style={{margin:'0 0 10px',fontSize:'13px',color:'#6b8f6b'}}>No resume uploaded yet</p>
                <button onClick={()=>router.push('/upload')} style={{background:'linear-gradient(135deg,#16a34a,#22c55e)',color:'white',border:'none',borderRadius:'8px',padding:'8px 16px',cursor:'pointer',fontWeight:600,fontSize:'13px'}}>Upload resume</button>
              </div>
            )}
          </div>

          {/* Preferences */}
          <div style={card}>
            <p style={{margin:'0 0 14px',fontSize:'14px',fontWeight:600,color:'#f8fafc'}}>Preferences</p>
            {[
              {label:'Email reminders',sub:'Remind me to practice every 2 days',on:reminders,toggle:()=>setReminders(r=>!r)},
              {label:'Auto-save recordings',sub:'Keep video clips after each session',on:autoSave,toggle:()=>setAutoSave(s=>!s)},
            ].map(({label,sub,on,toggle})=>(
              <div key={label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}}>
                <div>
                  <p style={{margin:0,fontSize:'13px',color:'#f8fafc'}}>{label}</p>
                  <p style={{margin:0,fontSize:'11px',color:'#6b8f6b'}}>{sub}</p>
                </div>
                <Toggle on={on} onToggle={toggle} />
              </div>
            ))}
          </div>
        </div>

        {/* Right */}
        <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>

          {/* Performance */}
          <div style={card} className="card-hover">
            <p style={{margin:'0 0 14px',fontSize:'14px',fontWeight:600,color:'#f8fafc'}}>Performance summary</p>
            {sessionCount===0 ? (
              <p style={{fontSize:'13px',color:'#6b8f6b',textAlign:'center',padding:'1rem 0'}}>Complete an interview to see your stats here.</p>
            ) : (
              [{label:'Average score',value:avgScores.overall,color:'#16a34a'},{label:'Avg speech',value:avgScores.speech,color:'#22c55e'},{label:'Avg eye contact',value:avgScores.eye,color:'#4ade80'},{label:'Avg posture',value:avgScores.posture,color:'#86efac'}].map(({label,value,color})=>(
                <div key={label} style={{marginBottom:'12px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'5px'}}>
                    <span style={{fontSize:'12px',color:'#9ab89a'}}>{label}</span>
                    <span style={{fontSize:'12px',fontWeight:600,color:sColor(value)}}>{value}%</span>
                  </div>
                  <div style={{background:'#050f05',borderRadius:'3px',height:'6px'}}>
                    <div style={{width:`${value}%`,height:'6px',background:color,borderRadius:'3px',boxShadow:`0 0 6px ${color}55`}} />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Improvement areas */}
          <div style={card}>
            <p style={{margin:'0 0 12px',fontSize:'14px',fontWeight:600,color:'#f8fafc'}}>Improvement areas</p>
            {sessionCount===0 ? (
              <p style={{fontSize:'13px',color:'#6b8f6b'}}>No data yet — complete an interview first.</p>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',background:'rgba(234,179,8,0.08)',border:'1px solid rgba(234,179,8,0.2)',borderRadius:'10px'}}>
                  <span style={{fontSize:'18px',flexShrink:0}}>⚠️</span>
                  <div>
                    <p style={{margin:0,fontSize:'12px',fontWeight:600,color:'#fbbf24'}}>{weakArea} is your weakest area</p>
                    <p style={{margin:0,fontSize:'11px',color:'#92400e'}}>
                      {weakArea==='Eye contact'?'Focus on the camera lens, not your preview':weakArea==='Posture'?'Sit upright and face the camera directly':'Structure answers using the STAR method'}
                    </p>
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',background:'#050f05',border:'1px solid #1e3a1e',borderRadius:'10px'}}>
                  <span style={{fontSize:'18px',flexShrink:0}}>📋</span>
                  <div>
                    <p style={{margin:0,fontSize:'12px',fontWeight:600,color:'#f8fafc'}}>Answer structure</p>
                    <p style={{margin:0,fontSize:'11px',color:'#6b8f6b'}}>Use STAR method for behavioral questions</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Danger zone */}
          <div style={{...card,borderLeft:'3px solid #ef4444'}}>
            <p style={{margin:'0 0 8px',fontSize:'14px',fontWeight:600,color:'#f8fafc'}}>Danger zone</p>
            <p style={{margin:'0 0 12px',fontSize:'12px',color:'#6b8f6b'}}>Deleting your account removes all sessions, scores, and history permanently.</p>
            <button onClick={handleDelete} style={{fontSize:'13px',background:'none',border:'1px solid #ef4444',color:'#ef4444',borderRadius:'8px',padding:'7px 14px',cursor:'pointer',transition:'background 0.15s'}}
              onMouseEnter={e=>(e.currentTarget.style.background='rgba(239,68,68,0.1)')}
              onMouseLeave={e=>(e.currentTarget.style.background='none')}>
              Delete my account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}