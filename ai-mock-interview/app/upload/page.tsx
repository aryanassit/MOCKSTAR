"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function UploadPage() {
  const [user, setUser] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [isUploaded, setIsUploaded] = useState(false);
  const [fileName, setFileName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // NEW STATE: To hold the saved resume URL if it exists
  const [savedResumeUrl, setSavedResumeUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [roundType, setRoundType] = useState<'technical'|'hr'>('technical');

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
      } else { 
        setUser(session.user); 
        
        // NEW LOGIC: Check if they already have a resume saved in their profile
        const { data: profile } = await supabase.from('profiles').select('resume_url').eq('id', session.user.id).single();
        if (profile?.resume_url) {
          setSavedResumeUrl(profile.resume_url);
        }
        
        setTimeout(() => setMounted(true), 50); 
      }
    })();
  }, [router]);

  const uploadResume = async (file: File) => {
    try {
      setUploading(true); setMessage('');
      if (file.type !== 'application/pdf') throw new Error('Please upload a valid PDF document.');
      if (file.size > 5*1024*1024) throw new Error('File too large. Max size is 5 MB.');
      setFileName(file.name);
      const storageFileName = `${user.id}-${Math.random()}.pdf`;
      const { error: uploadError } = await supabase.storage.from('resumes').upload(storageFileName, file);
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from('resumes').getPublicUrl(storageFileName);
      const { error: updateError } = await supabase.from('profiles').upsert({ id: user.id, resume_url: publicUrlData.publicUrl, email: user.email });
      if (updateError) throw updateError;
      
      // Update our local state so the banner knows we have a fresh resume
      setSavedResumeUrl(publicUrlData.publicUrl);
      setIsUploaded(true);
    } catch (error: any) { setMessage(`Error: ${error.message}`); }
    finally { setUploading(false); }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) uploadResume(e.target.files[0]); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files?.[0]) uploadResume(e.dataTransfer.files[0]); };

  const useExistingResume = () => {
    setFileName("Saved_Profile_Resume.pdf");
    setIsUploaded(true);
  };

  if (!user) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F3E8DA' }}>
      <div style={{ width:36, height:36, border:'3px solid #D8C7B3', borderTopColor:'#A0AB97', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#F3E8DA 0%,#EFE3D2 100%)', fontFamily:'system-ui,-apple-system,sans-serif', display:'flex', flexDirection:'column', position:'relative', overflow:'hidden' }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        @keyframes fadeLeft{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:none}}
        @keyframes fadeRight{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:none}}
        @keyframes gradShift{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes popIn{0%{transform:scale(0.6);opacity:0}70%{transform:scale(1.06)}100%{transform:scale(1);opacity:1}}
        @keyframes borderGlow{0%,100%{border-color:#D8C7B3}50%{border-color:#8F9B88}}
        @keyframes orb1{0%,100%{transform:translate(0,0)}50%{transform:translate(30px,-20px)}}
        @keyframes orb2{0%,100%{transform:translate(0,0)}50%{transform:translate(-24px,20px)}}
      `}</style>

      {/* Orbs */}
      <div style={{ position:'absolute', width:'500px', height:'500px', top:'-150px', left:'-100px', background:'radial-gradient(circle,rgba(160,171,151,0.1) 0%,transparent 70%)', borderRadius:'50%', animation:'orb1 12s ease-in-out infinite', pointerEvents:'none', zIndex:0 }}/>
      <div style={{ position:'absolute', width:'400px', height:'400px', bottom:'-100px', right:'-80px', background:'radial-gradient(circle,rgba(160,171,151,0.08) 0%,transparent 70%)', borderRadius:'50%', animation:'orb2 15s ease-in-out infinite', pointerEvents:'none', zIndex:0 }}/>

      {/* Navbar */}
      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 32px', borderBottom:'1px solid rgba(160,171,151,0.1)', backdropFilter:'blur(12px)', background:'rgba(46,42,37,0.8)', position:'relative', zIndex:10, animation:mounted?'fadeUp 0.4s ease both':undefined }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:30, height:30, borderRadius:8, background:'linear-gradient(135deg,#A0AB97,#8F9B88)', backgroundSize:'200% 200%', animation:'gradShift 4s ease infinite', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, color:'#2E2A25', fontSize:14, boxShadow:'0 4px 12px rgba(160,171,151,0.3)' }}>M</div>
            <span style={{ fontWeight:700, fontSize:16, color:'#F3E8DA' }}>MockStar</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          {['dashboard','history'].map(p=>(
            <button key={p} onClick={()=>router.push(`/${p}`)} style={{ fontSize:13, color:'#D8C7B3', background:'none', border:'none', cursor:'pointer', padding:'6px 12px', borderRadius:8, textTransform:'capitalize', transition:'color 0.15s,background 0.15s' }}
              onMouseEnter={e=>{e.currentTarget.style.color='#F3E8DA';e.currentTarget.style.background='rgba(160,171,151,0.15);'}}
              onMouseLeave={e=>{e.currentTarget.style.color='#D8C7B3';e.currentTarget.style.background='none';}}>
              {p.charAt(0).toUpperCase()+p.slice(1)}
            </button>
          ))}
          <div style={{ width:30, height:30, borderRadius:'50%', background:'linear-gradient(135deg,#A0AB97,#8F9B88)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#2E2A25', marginLeft:4 }}>
            {user.email?.[0]?.toUpperCase()}
          </div>
        </div>
      </nav>

      {/* Banner */}
      <div style={{ background:'linear-gradient(135deg,rgba(160,171,151,0.85),rgba(160,171,151,0.85))', backdropFilter:'blur(8px)', padding:'32px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:14, position:'relative', zIndex:1, animation:mounted?'fadeUp 0.5s 0.1s ease both':undefined, opacity:mounted?undefined:0 }}>
        <div>
          <h1 style={{ margin:'0 0 5px', fontSize:24, fontWeight:800, color:'#2E2A25', letterSpacing:'-0.3px' }}>Start your interview</h1>
          <p style={{ margin:0, color:'rgba(46,42,37,0.8)', fontSize:13 }}>Upload your resume — AI generates 5 questions from your actual experience.</p>
        </div>
        <div style={{ display:'flex', alignItems:'center' }}>
          {[{n:'1',label:'Upload',active:true},{n:'2',label:'AI reads',active:false},{n:'3',label:'Interview',active:false}].map(({n,label,active},i)=>(
            <div key={n} style={{ display:'flex', alignItems:'center' }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                <div style={{ width:30, height:30, borderRadius:'50%', background:active?'white':'rgba(46,42,37,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:active?'#A0AB97':'rgba(46,42,37,0.7)', boxShadow:active?'0 0 12px rgba(46,42,37,0.3)':'none' }}>{n}</div>
                <span style={{ fontSize:10, color:active?'#2E2A25':'rgba(46,42,37,0.6)', whiteSpace:'nowrap', fontWeight:active?700:400 }}>{label}</span>
              </div>
              {i<2&&<div style={{ width:36, height:1, background:'rgba(46,42,37,0.3)', margin:'0 5px 12px' }}/>}
            </div>
          ))}
        </div>
      </div>

      {/* Two-column */}
      <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 360px', position:'relative', zIndex:1 }}>

        {/* Left */}
        <div style={{ padding:'32px', borderRight:'1px solid rgba(160,171,151,0.08)', display:'flex', flexDirection:'column', animation:mounted?'fadeLeft 0.5s 0.2s ease both':undefined, opacity:mounted?undefined:0 }}>
          {!isUploaded ? (
            <>
              {/* NEW: Saved Resume Banner */}
              {savedResumeUrl && (
                <div style={{ padding:'18px 20px', marginBottom:'24px', background:'rgba(160,171,151,0.15)', border:'1px solid #8F9B88', borderRadius:'16px', display:'flex', alignItems:'center', justifyContent:'space-between', animation:'fadeUp 0.4s ease' }}>
                  <div>
                    <p style={{ margin:'0 0 4px', fontSize:15, fontWeight:700, color:'#2E2A25' }}>Saved Resume Found</p>
                    <p style={{ margin:0, fontSize:13, color:'#6F6A63' }}>Use the resume from your last interview to start instantly.</p>
                  </div>
                  <button onClick={useExistingResume} className="btn-green" style={{ padding:'10px 18px', fontSize:14, whiteSpace:'nowrap', background:'#8F9B88', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:600, transition:'background 0.2s' }}>
                    Use saved resume →
                  </button>
                </div>
              )}

              <h2 style={{ margin:'0 0 5px', fontSize:17, fontWeight:700, color:'#2E2A25' }}>{savedResumeUrl ? "Or upload a new resume" : "Upload your resume"}</h2>
              <p style={{ margin:'0 0 20px', fontSize:13, color:'#6F6A63' }}>PDF only · Max 5 MB · Processed securely</p>

              <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={handleDrop}
                onClick={()=>!uploading&&fileInputRef.current?.click()}
                style={{ flex:1, border:`2px dashed ${dragOver?'#8F9B88':'#D8C7B3'}`, borderRadius:20, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'40px 24px', minHeight:260, background:dragOver?'rgba(160,171,151,0.05)':'rgba(46,42,37,0.5)', cursor:uploading?'not-allowed':'pointer', backdropFilter:'blur(4px)', transition:'all 0.2s', boxShadow:dragOver?'0 0 40px rgba(160,171,151,0.15)':'none', animation:dragOver?'':undefined }}>
                {uploading ? (
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
                    <div style={{ position:'relative', width:52, height:52 }}>
                      <div style={{ position:'absolute', inset:0, border:'4px solid #D8C7B3', borderTopColor:'#A0AB97', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
                      <div style={{ position:'absolute', inset:8, border:'4px solid #D8C7B3', borderTopColor:'#8F9B88', borderRadius:'50%', animation:'spin 1.2s linear infinite reverse' }}/>
                    </div>
                    <p style={{ margin:0, fontSize:17, fontWeight:700, color:'#2E2A25' }}>Uploading securely...</p>
                  </div>
                ) : (
                  <>
                    <div style={{ width:64, height:64, background:dragOver?'rgba(160,171,151,0.15)':'rgba(160,171,151,0.06)', border:`1.5px solid ${dragOver?'rgba(160,171,151,0.6)':'#D8C7B3'}`, borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16, fontSize:28, transition:'all 0.2s', animation:'float 4s ease-in-out infinite' }}>📄</div>
                    <p style={{ margin:'0 0 8px', fontSize:19, fontWeight:700, color:'#2E2A25' }}>Drop your resume here</p>
                    <p style={{ margin:'0 0 24px', fontSize:13, color:'#6F6A63' }}>or click to browse · PDF only · Max 5 MB</p>
                    <button className="btn-green" style={{ padding:'12px 28px', fontSize:14, background:'linear-gradient(135deg,#A0AB97,#8F9B88)', color:'white', border:'none', borderRadius:'10px', cursor:'pointer' }}>Select PDF file</button>
                    <p style={{ margin:'14px 0 0', fontSize:11, color:'#6F6A63' }}>Drag & drop also supported</p>
                  </>
                )}
                <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleFileInput} disabled={uploading} style={{ display:'none' }}/>
              </div>

              {message&&message.includes('Error')&&(
                <div style={{ marginTop:14, padding:'12px 14px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderLeft:'3px solid #ef4444', borderRadius:9, color:'#fca5a5', fontSize:13, fontWeight:600 }}>{message}</div>
              )}
            </>
          ) : (
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', animation:'fadeUp 0.3s ease' }}>
              <div style={{ width:72, height:72, background:'rgba(160,171,151,0.15)', border:'2px solid rgba(160,171,151,0.5)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20, fontSize:32, animation:'popIn 0.5s cubic-bezier(0.22,1,0.36,1)', boxShadow:'0 0 30px rgba(160,171,151,0.25)' }}>✅</div>
              <h2 style={{ margin:'0 0 6px', fontSize:24, fontWeight:800, color:'#8F9B88' }}>Resume ready</h2>
              <p style={{ margin:'0 0 3px', fontSize:13, color:'#6F6A63' }}>{fileName}</p>
              <p style={{ margin:'0 0 28px', fontSize:14, color:'#6F6A63', lineHeight:1.6, maxWidth:380 }}>Processed. The AI is ready to generate your interview questions.</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, width:'100%', maxWidth:380, marginBottom:28 }}>
                {[{label:'Questions',v:'5'},{label:'Est. time',v:'~15 min'},{label:'Skills scored',v:'3'}].map(({label,v},i)=>(
                  <div key={label} style={{ background:'#EFE3D2', border:'1px solid #D8C7B3', borderRadius:11, padding:'13px 8px', animation:`popIn 0.4s ease ${i*70}ms both` }}>
                    <p style={{ margin:'0 0 2px', fontSize:18, fontWeight:700, color:'#2E2A25' }}>{v}</p>
                    <p style={{ margin:0, fontSize:10, color:'#6F6A63' }}>{label}</p>
                  </div>
                ))}
              </div>
              <p style={{ margin:'0 0 10px', fontSize:12, fontWeight:700, color:'#6F6A63', textTransform:'uppercase', letterSpacing:'0.06em', width:'100%', maxWidth:380, textAlign:'left' }}>Choose round type</p> 
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, width:'100%', maxWidth:380, marginBottom:20 }}>   
                {[
                  { key:'technical', icon:'💻', title:'Technical', desc:'Skills, projects, problem-solving' },     
                  { key:'hr', icon:'🤝', title:'HR round', desc:'Behavioral, culture-fit, communication' },   
                ].map(({key,icon,title,desc})=>{     
                  const active = roundType===key;     
                  return (       
                    <button key={key} onClick={()=>setRoundType(key as 'technical'|'hr')}         
                      style={{ textAlign:'left', cursor:'pointer', padding:'14px 14px', borderRadius:14, border:`1.5px solid ${active?'#8F9B88':'#D8C7B3'}`, background:active?'rgba(160,171,151,0.15)':'#EFE3D2', boxShadow:active?'0 0 0 3px rgba(160,171,151,0.15)':'none', transition:'all 0.15s' }}>         
                      <div style={{ fontSize:20, marginBottom:6 }}>{icon}</div>         
                      <p style={{ margin:'0 0 2px', fontSize:14, fontWeight:700, color:'#2E2A25' }}>{title}</p>         
                      <p style={{ margin:0, fontSize:11, color:'#6F6A63', lineHeight:1.4 }}>{desc}</p>       
                    </button>     
                  );   
                })} 
              </div> 
              <button onClick={()=>router.push(`/interview?round=${roundType}`)} className="btn-green" style={{ width:'100%', maxWidth:380, padding:16, fontSize:16, background:'linear-gradient(135deg,#A0AB97,#8F9B88)', color:'white', border:'none', borderRadius:'12px', cursor:'pointer', fontWeight:700 }}>Start {roundType==='technical'?'technical':'HR'} interview →</button>
              
              <button onClick={()=>{setIsUploaded(false);setFileName('');setMessage('');}} style={{ marginTop:14, background:'none', border:'none', color:'#6F6A63', fontSize:13, cursor:'pointer', fontWeight:600 }}>Use a different resume</button>
            </div>
          )}
        </div>

        {/* Right info panel */}
        <div style={{ padding:'32px 24px', background:'rgba(46,42,37,0.5)', backdropFilter:'blur(8px)', display:'flex', flexDirection:'column', gap:20, animation:mounted?'fadeRight 0.5s 0.3s ease both':undefined, opacity:mounted?undefined:0 }}>
          <div>
            <p style={{ margin:'0 0 12px', fontSize:11, fontWeight:700, color:'#F3E8DA', textTransform:'uppercase', letterSpacing:'0.08em' }}>How it works</p>
            {[{icon:'🔍',title:'Resume analysis',desc:'AI reads your skills and projects'},{icon:'❓',title:'Custom questions',desc:'5 questions from your background'},{icon:'🎥',title:'Video recording',desc:'Silence detection auto-stops clips'},{icon:'📊',title:'Instant scoring',desc:'Speech, eye contact, and posture'}].map(({icon,title,desc})=>(
              <div key={title} style={{ display:'flex', gap:10, marginBottom:12 }}>
                <div style={{ width:32, height:32, background:'rgba(160,171,151,0.15)', border:'1px solid #D8C7B3', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:14, transition:'transform 0.15s' }}
                  onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.1) rotate(-3deg)')}
                  onMouseLeave={e=>(e.currentTarget.style.transform='none')}>{icon}</div>
                <div>
                  <p style={{ margin:'0 0 1px', fontSize:12, fontWeight:600, color:'#F3E8DA' }}>{title}</p>
                  <p style={{ margin:0, fontSize:11, color:'#D8C7B3', lineHeight:1.4 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop:'1px solid rgba(160,171,151,0.2)', paddingTop:18 }}>
            <p style={{ margin:'0 0 10px', fontSize:11, fontWeight:700, color:'#F3E8DA', textTransform:'uppercase', letterSpacing:'0.08em' }}>Tips</p>
            {['Well-structured resume = better questions','Check camera and mic before starting','Quiet room, good lighting facing you'].map((tip,i)=>(
              <div key={i} style={{ display:'flex', gap:7, alignItems:'flex-start', marginBottom:8 }}>
                <span style={{ fontSize:9, color:'#A0AB97', marginTop:4, flexShrink:0 }}>●</span>
                <p style={{ margin:0, fontSize:12, color:'#D8C7B3', lineHeight:1.5 }}>{tip}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop:'auto', padding:13, background:'rgba(160,171,151,0.1)', border:'1px solid rgba(160,171,151,0.2)', borderRadius:11 }}>
            <p style={{ margin:'0 0 3px', fontSize:12, fontWeight:600, color:'#F3E8DA' }}>🔒 Your data is safe</p>
            <p style={{ margin:0, fontSize:11, color:'#D8C7B3', lineHeight:1.5 }}>Processed securely. Never shared with third parties.</p>
          </div>
        </div>
      </div>
    </div>
  );
}