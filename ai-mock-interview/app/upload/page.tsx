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
      if (!session) router.push('/');
      else { setUser(session.user); setTimeout(() => setMounted(true), 50); }
    })();
  }, [router]);

  const uploadResume = async (file: File) => {
    try {
      setUploading(true); setMessage('');
      if (file.type !== 'application/pdf') throw new Error('Please upload a valid PDF document.');
      if (file.size > 5 * 1024 * 1024) throw new Error('File too large. Max size is 5 MB.');
      setFileName(file.name);
      const storageFileName = `${user.id}-${Math.random()}.pdf`;
      const { error: uploadError } = await supabase.storage.from('resumes').upload(storageFileName, file);
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from('resumes').getPublicUrl(storageFileName);
      const { error: updateProfileError } = await supabase.from('profiles').upsert({ id: user.id, resume_url: publicUrlData.publicUrl, email: user.email });
      if (updateProfileError) throw updateProfileError;
      setIsUploaded(true);
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) uploadResume(e.target.files[0]); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files?.[0]) uploadResume(e.dataTransfer.files[0]); };

  if (!user) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080f0d' }}>
      <div style={{ width: '36px', height: '36px', border: '3px solid #0d1f1a', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 0.8s linear infinite', boxShadow: '0 0 16px rgba(16,185,129,0.35)' }} />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #080f0d 0%, #0a1f18 100%)', fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>

      {/* Floating orb background */}
      <div className="orb orb-1" style={{ width: '500px', height: '500px', top: '-150px', left: '-100px', background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)' }} />
      <div className="orb orb-2" style={{ width: '400px', height: '400px', bottom: '-100px', right: '-80px', background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)' }} />
      <div className="orb orb-3" style={{ width: '300px', height: '300px', top: '40%', left: '40%', background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)' }} />

      {/* Navbar */}
      <nav className={mounted ? 'anim-fade-up d-0' : ''} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', borderBottom: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', background: 'rgba(8,15,13,0.7)', position: 'relative', zIndex: 10, opacity: mounted ? undefined : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'linear-gradient(135deg, #10b981, #059669)', backgroundSize: '200% 200%', animation: 'gradientShift 4s ease infinite', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'white', fontSize: '14px', boxShadow: '0 4px 12px rgba(16,185,129,0.25)' }}>M</div>
          <span style={{ fontWeight: 700, fontSize: '16px', color: '#f8fafc' }}>Mockstar</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {['dashboard', 'history'].map(p => (
            <button key={p} onClick={() => router.push(`/${p}`)} style={{ fontSize: '13px', color: '#4b7a66', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: '8px', textTransform: 'capitalize', transition: 'color 0.15s, background 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#f8fafc'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#4b7a66'; e.currentTarget.style.background = 'none'; }}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
          <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'white', marginLeft: '4px' }}>
            {user.email?.[0]?.toUpperCase()}
          </div>
        </div>
      </nav>

      {/* Gradient banner */}
      <div className={mounted ? 'anim-fade-up d-100' : ''} style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.9) 0%, rgba(16,185,129,0.9) 100%)', backdropFilter: 'blur(8px)', padding: '36px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', position: 'relative', zIndex: 1, opacity: mounted ? undefined : 0 }}>
        <div>
          <h1 style={{ margin: '0 0 6px', fontSize: '26px', fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>Start your interview</h1>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>Upload your resume and our AI generates 5 personalized questions just for you.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {[{ n: '1', label: 'Upload resume', active: true }, { n: '2', label: 'AI reads it', active: false }, { n: '3', label: 'Interview', active: false }].map(({ n, label, active }, i) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: active ? 'white' : 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: active ? '#10b981' : 'rgba(255,255,255,0.7)', border: active ? 'none' : '1.5px solid rgba(255,255,255,0.4)', transition: 'all 0.3s ease', boxShadow: active ? '0 0 16px rgba(255,255,255,0.3)' : 'none' }}>{n}</div>
                <span style={{ fontSize: '10px', color: active ? 'white' : 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap', fontWeight: active ? 700 : 400 }}>{label}</span>
              </div>
              {i < 2 && <div style={{ width: '44px', height: '1px', background: 'rgba(255,255,255,0.3)', margin: '0 6px 14px' }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Two-column content */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 360px', position: 'relative', zIndex: 1 }}>

        {/* Left: upload */}
        <div className={mounted ? 'anim-fade-left d-200' : ''} style={{ padding: '36px 32px', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', opacity: mounted ? undefined : 0 }}>
          {!isUploaded ? (
            <>
              <h2 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>Upload your resume</h2>
              <p style={{ margin: '0 0 24px', fontSize: '13px', color: '#4b7a66' }}>PDF only · Max 5 MB · Processed securely</p>

              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => !uploading && fileInputRef.current?.click()}
                className={dragOver ? '' : 'drop-idle'}
                style={{
                  flex: 1, border: `2px dashed ${dragOver ? '#10b981' : '#1a3a2e'}`,
                  borderRadius: '20px', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                  padding: '48px 32px', minHeight: '280px',
                  background: dragOver ? 'rgba(16,185,129,0.07)' : 'rgba(8,15,13,0.5)',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  backdropFilter: 'blur(4px)',
                  transition: 'all 0.25s cubic-bezier(0.22,1,0.36,1)',
                  boxShadow: dragOver ? '0 0 40px rgba(16,185,129,0.2), inset 0 0 40px rgba(16,185,129,0.05)' : 'none',
                }}
              >
                {uploading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <div style={{ position: 'relative', width: '64px', height: '64px' }}>
                      <div style={{ position: 'absolute', inset: 0, border: '4px solid #0d1f1a', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      <div style={{ position: 'absolute', inset: '6px', border: '4px solid #0d1f1a', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 1.2s linear infinite reverse' }} />
                    </div>
                    <p style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#f8fafc' }}>Uploading securely...</p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#4b7a66' }}>Processing your resume</p>
                  </div>
                ) : (
                  <>
                    <div style={{
                      width: '72px', height: '72px',
                      background: dragOver ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)',
                      border: `1.5px solid ${dragOver ? 'rgba(16,185,129,0.6)' : '#1a3a2e'}`,
                      borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: '20px', fontSize: '30px',
                      transition: 'all 0.25s ease',
                      animation: 'float 4s ease-in-out infinite',
                      boxShadow: dragOver ? '0 0 24px rgba(16,185,129,0.25)' : 'none',
                    }}>📄</div>
                    <p style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>Drop your resume here</p>
                    <p style={{ margin: '0 0 28px', fontSize: '14px', color: '#4b7a66' }}>or click to browse · PDF only · Max 5 MB</p>
                    <button className="btn-glow" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', backgroundSize: '200% 200%', color: 'white', border: 'none', padding: '13px 32px', borderRadius: '12px', fontWeight: 700, fontSize: '15px', cursor: 'pointer', boxShadow: '0 6px 20px rgba(16,185,129,0.3)' }}>
                      Select PDF file
                    </button>
                    <p style={{ margin: '18px 0 0', fontSize: '12px', color: '#3d6b59' }}>Drag &amp; drop also supported</p>
                  </>
                )}
                <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleFileInput} disabled={uploading} style={{ display: 'none' }} />
              </div>

              {message && message.includes('Error') && (
                <div className="anim-fade-up" style={{ marginTop: '16px', padding: '14px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderLeft: '4px solid #ef4444', borderRadius: '10px', color: '#fca5a5', fontSize: '13px', fontWeight: 600 }}>{message}</div>
              )}
            </>
          ) : (
            <div className="anim-scale-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <div style={{ width: '80px', height: '80px', background: 'rgba(16,185,129,0.15)', border: '2px solid rgba(16,185,129,0.5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', fontSize: '36px', animation: 'popIn 0.6s cubic-bezier(0.22,1,0.36,1)', boxShadow: '0 0 30px rgba(16,185,129,0.25)' }}>✅</div>
              <h2 className="gradient-text" style={{ margin: '0 0 8px', fontSize: '28px', fontWeight: 800 }}>Resume ready</h2>
              <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#4b7a66' }}>{fileName}</p>
              <p style={{ margin: '0 0 36px', fontSize: '14px', color: '#94a3b8', lineHeight: 1.6, maxWidth: '380px' }}>Your resume has been processed. The AI is ready to generate your questions.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', width: '100%', maxWidth: '380px', marginBottom: '32px' }}>
                {[{ label: 'Questions', value: '5' }, { label: 'Est. time', value: '~15 min' }, { label: 'Skills scored', value: '3' }].map(({ label, value }, i) => (
                  <div key={label} className="card-hover anim-pop-in" style={{ background: '#0d1f1a', border: '1px solid #1a3a2e', borderRadius: '12px', padding: '16px 10px', animationDelay: `${i * 80}ms` }}>
                    <p style={{ margin: '0 0 3px', fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>{value}</p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#4b7a66' }}>{label}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => router.push('/interview')} className="btn-glow" style={{ width: '100%', maxWidth: '380px', background: 'linear-gradient(135deg, #10b981, #059669)', backgroundSize: '200% 200%', color: 'white', border: 'none', padding: '18px', borderRadius: '14px', fontSize: '17px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 24px rgba(16,185,129,0.35)' }}>
                Start interview now →
              </button>
              <button onClick={() => { setIsUploaded(false); setFileName(''); setMessage(''); }} style={{ marginTop: '12px', background: 'none', border: 'none', color: '#4b7a66', fontSize: '13px', cursor: 'pointer', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
                onMouseLeave={e => (e.currentTarget.style.color = '#4b7a66')}>
                Upload a different resume
              </button>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className={mounted ? 'anim-fade-right d-300' : ''} style={{ padding: '36px 28px', background: 'rgba(5,15,12,0.6)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', gap: '24px', opacity: mounted ? undefined : 0 }}>
          <div>
            <p style={{ margin: '0 0 14px', fontSize: '11px', fontWeight: 700, color: '#4b7a66', textTransform: 'uppercase', letterSpacing: '0.08em' }}>How it works</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { icon: '🔍', title: 'Resume analysis', desc: 'AI extracts your skills, projects, and experience from your PDF', delay: 400 },
                { icon: '❓', title: 'Custom questions', desc: '5 interview questions generated specifically from your background', delay: 480 },
                { icon: '🎥', title: 'Video recording', desc: 'Answer on camera — silence detection auto-stops each recording', delay: 560 },
                { icon: '📊', title: 'Instant scoring', desc: 'Get scored on speech content, eye contact, and posture', delay: 640 },
              ].map(({ icon, title, desc, delay }) => (
                <div key={title} className={mounted ? 'anim-fade-up' : ''} style={{ display: 'flex', gap: '12px', animationDelay: `${delay}ms`, animationFillMode: 'both', opacity: mounted ? undefined : 0 }}>
                  <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.04)', border: '1px solid #1a3a2e', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '16px', transition: 'transform 0.2s ease, border-color 0.2s ease' }}
                    onMouseEnter={e => { const el = e.currentTarget; el.style.transform = 'scale(1.1) rotate(-4deg)'; el.style.borderColor = '#10b981'; }}
                    onMouseLeave={e => { const el = e.currentTarget; el.style.transform = 'none'; el.style.borderColor = '#1a3a2e'; }}>
                    {icon}
                  </div>
                  <div>
                    <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>{title}</p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#4b7a66', lineHeight: 1.5 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
            <p style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 700, color: '#4b7a66', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tips</p>
            {['Use a well-structured resume with clear project descriptions', 'Make sure your camera and microphone work before starting', 'Find a quiet spot with good lighting facing you'].map((tip, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '10px' }}>
                <span style={{ fontSize: '10px', color: '#10b981', marginTop: '4px', flexShrink: 0, animation: 'pulse-glow 2s ease infinite', animationDelay: `${i * 300}ms` }}>●</span>
                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>{tip}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 'auto', padding: '14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)', borderRadius: '12px' }}>
            <p style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}>🔒 Your data is safe</p>
            <p style={{ margin: 0, fontSize: '11px', color: '#4b7a66', lineHeight: 1.5 }}>Your resume is processed securely and never shared with third parties.</p>
          </div>
        </div>
      </div>
    </div>
  );
}