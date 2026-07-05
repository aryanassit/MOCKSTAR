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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.push('/login');
      else { setUser(session.user); setTimeout(() => setMounted(true), 50); }
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
      const { error: updateError } = await supabase.from('profiles').upsert({ id:user.id, resume_url:publicUrlData.publicUrl, email:user.email });
      if (updateError) throw updateError;
      setIsUploaded(true);
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally { setUploading(false); }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) uploadResume(e.target.files[0]); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files?.[0]) uploadResume(e.dataTransfer.files[0]); };

  if (!user) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f8fafc'}}>
      <div style={{width:32,height:32,border:'3px solid #dcfce7',borderTopColor:'#16a34a',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{minHeight:'100vh',background:'#f8fafc',fontFamily:'system-ui,-apple-system,sans-serif',display:'flex',flexDirection:'column'}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}} @keyframes popIn{0%{transform:scale(0.7);opacity:0}70%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}} @keyframes gradShift{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}} @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}} @keyframes borderPulse{0%,100%{border-color:#bbf7d0}50%{border-color:#22c55e}}`}</style>

      {/* Navbar */}
      <nav style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 32px',borderBottom:'1px solid #e2e8f0',background:'#fff',boxShadow:'0 1px 3px rgba(0,0,0,0.05)',animation:mounted?'fadeUp 0.4s ease both':undefined}}>
        <div style={{display:'flex',alignItems:'center',gap:9}}>
          <div style={{width:28,height:28,borderRadius:8,background:'linear-gradient(135deg,#16a34a,#22c55e)',backgroundSize:'200% 200%',animation:'gradShift 4s ease infinite',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,color:'white',fontSize:13,boxShadow:'0 2px 8px rgba(22,163,74,0.25)'}}>M</div>
          <span style={{fontWeight:700,fontSize:15,color:'#0f172a'}}>MockStar</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          {['dashboard','history'].map(p=>(
            <button key={p} onClick={()=>router.push(`/${p}`)} style={{fontSize:13,color:'#6b7280',background:'none',border:'none',cursor:'pointer',padding:'6px 12px',borderRadius:8,textTransform:'capitalize',transition:'color 0.15s,background 0.15s'}}
              onMouseEnter={e=>{e.currentTarget.style.color='#0f172a';e.currentTarget.style.background='#f1f5f9';}}
              onMouseLeave={e=>{e.currentTarget.style.color='#6b7280';e.currentTarget.style.background='none';}}>
              {p.charAt(0).toUpperCase()+p.slice(1)}
            </button>
          ))}
          <div style={{width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,#16a34a,#22c55e)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'white',marginLeft:4}}>
            {user.email?.[0]?.toUpperCase()}
          </div>
        </div>
      </nav>

      {/* Banner */}
      <div style={{background:'linear-gradient(135deg,#16a34a,#22c55e)',backgroundSize:'200% 200%',animation:'gradShift 6s ease infinite',padding:'32px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:14}}>
        <div>
          <h1 style={{margin:'0 0 5px',fontSize:24,fontWeight:800,color:'white',letterSpacing:'-0.3px'}}>Start your interview</h1>
          <p style={{margin:0,color:'rgba(255,255,255,0.8)',fontSize:13}}>Upload your resume — AI generates 5 questions tailored to your actual experience.</p>
        </div>
        <div style={{display:'flex',alignItems:'center'}}>
          {[{n:'1',label:'Upload',active:true},{n:'2',label:'AI reads',active:false},{n:'3',label:'Interview',active:false}].map(({n,label,active},i)=>(
            <div key={n} style={{display:'flex',alignItems:'center'}}>
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                <div style={{width:30,height:30,borderRadius:'50%',background:active?'white':'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:active?'#16a34a':'rgba(255,255,255,0.7)',boxShadow:active?'0 0 12px rgba(255,255,255,0.3)':'none'}}>{n}</div>
                <span style={{fontSize:10,color:active?'white':'rgba(255,255,255,0.6)',whiteSpace:'nowrap',fontWeight:active?700:400}}>{label}</span>
              </div>
              {i<2&&<div style={{width:36,height:1,background:'rgba(255,255,255,0.3)',margin:'0 5px 12px'}}/>}
            </div>
          ))}
        </div>
      </div>

      {/* Two-column */}
      <div style={{flex:1,display:'grid',gridTemplateColumns:'1fr 340px'}}>

        {/* Left — upload */}
        <div style={{padding:'32px',borderRight:'1px solid #e2e8f0',display:'flex',flexDirection:'column',animation:mounted?'fadeUp 0.5s 0.1s ease both':undefined,opacity:mounted?undefined:0}}>
          {!isUploaded ? (
            <>
              <h2 style={{margin:'0 0 5px',fontSize:17,fontWeight:700,color:'#0f172a'}}>Upload your resume</h2>
              <p style={{margin:'0 0 20px',fontSize:13,color:'#6b7280'}}>PDF only · Max 5 MB · Processed securely</p>

              <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={handleDrop}
                onClick={()=>!uploading&&fileInputRef.current?.click()}
                style={{flex:1,border:`2px dashed ${dragOver?'#16a34a':'#d1d5db'}`,borderRadius:16,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',padding:'40px 24px',minHeight:260,background:dragOver?'#f0fdf4':'#fff',cursor:uploading?'not-allowed':'pointer',transition:'all 0.2s',boxShadow:dragOver?'0 0 0 4px rgba(22,163,74,0.1)':'none',animation:dragOver?'':undefined}}>
                {uploading?(
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:14}}>
                    <div style={{position:'relative',width:52,height:52}}>
                      <div style={{position:'absolute',inset:0,border:'4px solid #dcfce7',borderTopColor:'#16a34a',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
                      <div style={{position:'absolute',inset:8,border:'4px solid #dcfce7',borderTopColor:'#22c55e',borderRadius:'50%',animation:'spin 1.2s linear infinite reverse'}}/>
                    </div>
                    <p style={{margin:0,fontSize:16,fontWeight:700,color:'#0f172a'}}>Uploading securely...</p>
                  </div>
                ):(
                  <>
                    <div style={{width:64,height:64,background:dragOver?'#dcfce7':'#f1f5f9',border:`1.5px solid ${dragOver?'#22c55e':'#e2e8f0'}`,borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:16,fontSize:28,transition:'all 0.2s',animation:'float 4s ease-in-out infinite'}}>📄</div>
                    <p style={{margin:'0 0 6px',fontSize:18,fontWeight:700,color:'#0f172a'}}>Drop your resume here</p>
                    <p style={{margin:'0 0 24px',fontSize:13,color:'#9ca3af'}}>or click to browse · PDF only · Max 5 MB</p>
                    <button className="btn-primary" style={{padding:'11px 28px',fontSize:14}}>Select PDF file</button>
                    <p style={{margin:'14px 0 0',fontSize:11,color:'#d1d5db'}}>Drag & drop also supported</p>
                  </>
                )}
                <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleFileInput} disabled={uploading} style={{display:'none'}}/>
              </div>

              {message&&message.includes('Error')&&(
                <div style={{marginTop:14,padding:'12px 14px',background:'#fee2e2',border:'1px solid #fecaca',borderLeft:'3px solid #ef4444',borderRadius:9,color:'#991b1b',fontSize:13,fontWeight:600}}>{message}</div>
              )}
            </>
          ):(
            <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',animation:'fadeUp 0.3s ease'}}>
              <div style={{width:72,height:72,background:'#dcfce7',border:'2px solid #86efac',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:20,fontSize:32,animation:'popIn 0.5s cubic-bezier(0.22,1,0.36,1)',boxShadow:'0 0 24px rgba(22,163,74,0.15)'}}>✅</div>
              <h2 style={{margin:'0 0 6px',fontSize:24,fontWeight:800,color:'#15803d'}}>Resume ready</h2>
              <p style={{margin:'0 0 3px',fontSize:13,color:'#9ca3af'}}>{fileName}</p>
              <p style={{margin:'0 0 28px',fontSize:14,color:'#6b7280',lineHeight:1.6,maxWidth:380}}>Processed successfully. AI is ready to generate your interview questions.</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,width:'100%',maxWidth:380,marginBottom:28}}>
                {[{label:'Questions',v:'5'},{label:'Est. time',v:'~15 min'},{label:'Skills scored',v:'3'}].map(({label,v},i)=>(
                  <div key={label} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:11,padding:'13px 8px',boxShadow:'0 1px 3px rgba(0,0,0,0.04)',animation:`popIn 0.4s ease ${i*70}ms both`}}>
                    <p style={{margin:'0 0 2px',fontSize:18,fontWeight:700,color:'#0f172a'}}>{v}</p>
                    <p style={{margin:0,fontSize:10,color:'#9ca3af'}}>{label}</p>
                  </div>
                ))}
              </div>
              <button onClick={()=>router.push('/interview')} className="btn-primary" style={{width:'100%',maxWidth:380,padding:16,fontSize:16}}>Start interview now →</button>
              <button onClick={()=>{setIsUploaded(false);setFileName('');setMessage('');}} style={{marginTop:10,background:'none',border:'none',color:'#9ca3af',fontSize:13,cursor:'pointer'}}>Use a different resume</button>
            </div>
          )}
        </div>

        {/* Right — info panel */}
        <div style={{padding:'32px 24px',background:'#fff',borderLeft:'1px solid #f1f5f9',display:'flex',flexDirection:'column',gap:20,animation:mounted?'fadeUp 0.5s 0.2s ease both':undefined,opacity:mounted?undefined:0}}>
          <div>
            <p style={{margin:'0 0 12px',fontSize:11,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.08em'}}>How it works</p>
            {[{icon:'🔍',title:'Resume analysis',desc:'AI reads your skills and projects'},{icon:'❓',title:'Custom questions',desc:'5 questions from your background'},{icon:'🎥',title:'Video recording',desc:'Silence detection auto-stops clips'},{icon:'📊',title:'Instant scoring',desc:'Speech, eye contact, and posture'}].map(({icon,title,desc})=>(
              <div key={title} style={{display:'flex',gap:10,marginBottom:12}}>
                <div style={{width:32,height:32,background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:14,transition:'transform 0.15s'}}
                  onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.1) rotate(-3deg)')}
                  onMouseLeave={e=>(e.currentTarget.style.transform='none')}>{icon}</div>
                <div>
                  <p style={{margin:'0 0 1px',fontSize:12,fontWeight:600,color:'#0f172a'}}>{title}</p>
                  <p style={{margin:0,fontSize:11,color:'#9ca3af',lineHeight:1.4}}>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{borderTop:'1px solid #f1f5f9',paddingTop:18}}>
            <p style={{margin:'0 0 10px',fontSize:11,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.08em'}}>Tips</p>
            {['Well-structured resume = better questions','Check camera and mic before starting','Quiet room, good lighting facing you'].map((tip,i)=>(
              <div key={i} style={{display:'flex',gap:7,alignItems:'flex-start',marginBottom:8}}>
                <span style={{fontSize:9,color:'#16a34a',marginTop:4,flexShrink:0}}>●</span>
                <p style={{margin:0,fontSize:12,color:'#6b7280',lineHeight:1.5}}>{tip}</p>
              </div>
            ))}
          </div>

          <div style={{marginTop:'auto',padding:13,background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:11}}>
            <p style={{margin:'0 0 3px',fontSize:12,fontWeight:600,color:'#0f172a'}}>🔒 Your data is safe</p>
            <p style={{margin:0,fontSize:11,color:'#6b7280',lineHeight:1.5}}>Processed securely. Never shared with third parties.</p>
          </div>
        </div>
      </div>
    </div>
  );
}