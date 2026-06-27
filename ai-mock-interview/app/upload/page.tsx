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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.push('/');
      else setUser(session.user);
    })();
  }, [router]);

  const uploadResume = async (file: File) => {
    try {
      setUploading(true);
      setMessage('');
      if (file.type !== 'application/pdf') throw new Error('Please upload a valid PDF document.');
      if (file.size > 5 * 1024 * 1024) throw new Error('File too large. Max size is 5 MB.');
      setFileName(file.name);
      const fileExt = file.name.split('.').pop();
      const storageFileName = `${user.id}-${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('resumes').upload(storageFileName, file);
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from('resumes').getPublicUrl(storageFileName);
      const { error: updateProfileError } = await supabase.from('profiles').upsert({
        id: user.id, resume_url: publicUrlData.publicUrl, email: user.email
      });
      if (updateProfileError) throw updateProfileError;
      setMessage('Resume uploaded securely!');
      setIsUploaded(true);
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) uploadResume(e.target.files[0]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.[0]) uploadResume(e.dataTransfer.files[0]);
  };

  if (!user) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid #334155', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #172554 100%)', fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadein { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
      `}</style>

      {/* Top navbar — full width */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', borderBottom: '1px solid #1e293b', background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'linear-gradient(135deg, #3b82f6, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'white', fontSize: '14px' }}>M</div>
          <span style={{ fontWeight: 700, fontSize: '16px', color: '#f8fafc' }}>Mockstar</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ fontSize: '13px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: '8px' }}>Dashboard</button>
          <button onClick={() => router.push('/history')} style={{ fontSize: '13px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: '8px' }}>History</button>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: 'white', marginLeft: '4px' }}>
            {user.email?.[0]?.toUpperCase()}
          </div>
        </div>
      </nav>

      {/* Full-width gradient banner */}
      <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)', padding: '40px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: '0 0 6px', fontSize: '28px', fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>Start your interview</h1>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>Upload your resume and our AI generates 5 personalized questions just for you.</p>
        </div>
        {/* Step indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
          {[
            { n: '1', label: 'Upload resume', done: true },
            { n: '2', label: 'AI reads it', done: false },
            { n: '3', label: 'Interview', done: false },
          ].map(({ n, label, done }, i) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: done ? 'white' : 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: done ? '#3b82f6' : 'rgba(255,255,255,0.7)', border: done ? 'none' : '1.5px solid rgba(255,255,255,0.4)' }}>{n}</div>
                <span style={{ fontSize: '10px', color: done ? 'white' : 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap', fontWeight: done ? 600 : 400 }}>{label}</span>
              </div>
              {i < 2 && <div style={{ width: '48px', height: '1px', background: 'rgba(255,255,255,0.3)', margin: '0 4px 16px' }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Main content — two columns, full width */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 380px', gap: '0', minHeight: 0 }}>

        {/* Left: upload zone */}
        <div style={{ padding: '36px 32px', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column' }}>
          {!isUploaded ? (
            <>
              <h2 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>Upload your resume</h2>
              <p style={{ margin: '0 0 24px', fontSize: '13px', color: '#64748b' }}>PDF format only. Your file is processed securely and never shared.</p>

              {/* Drop zone — takes remaining height */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => !uploading && fileInputRef.current?.click()}
                style={{
                  flex: 1,
                  border: `2px dashed ${dragOver ? '#3b82f6' : '#334155'}`,
                  borderRadius: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  padding: '48px 32px',
                  background: dragOver ? 'rgba(59,130,246,0.05)' : '#0f172a',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  minHeight: '300px',
                }}
              >
                {uploading ? (
                  <>
                    <div style={{ width: '52px', height: '52px', border: '4px solid #334155', borderTopColor: '#3b82f6', borderRadius: '50%', marginBottom: '20px', animation: 'spin 0.8s linear infinite' }} />
                    <p style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>Uploading securely...</p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Please wait while we process your resume</p>
                  </>
                ) : (
                  <>
                    <div style={{ width: '72px', height: '72px', background: dragOver ? 'rgba(59,130,246,0.15)' : '#1e293b', border: `1px solid ${dragOver ? 'rgba(59,130,246,0.5)' : '#334155'}`, borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', fontSize: '32px', transition: 'all 0.2s' }}>📄</div>
                    <p style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>Drop your resume here</p>
                    <p style={{ margin: '0 0 28px', fontSize: '14px', color: '#64748b' }}>or click to browse · PDF only · Max 5 MB</p>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #3b82f6, #10b981)', color: 'white', padding: '13px 32px', borderRadius: '12px', fontWeight: 700, fontSize: '15px' }}>
                      Select PDF file
                    </div>
                    <p style={{ margin: '20px 0 0', fontSize: '12px', color: '#475569' }}>Drag &amp; drop supported</p>
                  </>
                )}
                <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleFileInput} disabled={uploading} style={{ display: 'none' }} />
              </div>

              {message && message.includes('Error') && (
                <div style={{ marginTop: '16px', padding: '14px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', borderLeft: '4px solid #ef4444', color: '#fca5a5', fontSize: '13px', fontWeight: 600 }}>
                  {message}
                </div>
              )}
            </>
          ) : (
            /* Success state */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', animation: 'fadein 0.3s ease' }}>
              <div style={{ width: '80px', height: '80px', background: 'rgba(16,185,129,0.15)', border: '2px solid rgba(16,185,129,0.4)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', fontSize: '36px' }}>✅</div>
              <h2 style={{ margin: '0 0 8px', fontSize: '26px', fontWeight: 800, color: '#34d399' }}>Resume ready</h2>
              <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#64748b' }}>{fileName}</p>
              <p style={{ margin: '0 0 36px', fontSize: '14px', color: '#94a3b8', lineHeight: 1.6, maxWidth: '400px' }}>
                Your resume has been processed. The AI has your profile and is ready to generate interview questions.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', width: '100%', maxWidth: '400px', marginBottom: '36px' }}>
                {[{ label: 'Questions', value: '5' }, { label: 'Est. time', value: '~15 min' }, { label: 'Skills scored', value: '3' }].map(({ label, value }) => (
                  <div key={label} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '16px 10px' }}>
                    <p style={{ margin: '0 0 3px', fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>{value}</p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>{label}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => router.push('/interview')} style={{ width: '100%', maxWidth: '400px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none', padding: '18px', borderRadius: '14px', fontSize: '17px', fontWeight: 800, cursor: 'pointer' }}>
                Start interview now →
              </button>
              <button onClick={() => { setIsUploaded(false); setFileName(''); setMessage(''); }} style={{ marginTop: '12px', background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer' }}>
                Upload a different resume
              </button>
            </div>
          )}
        </div>

        {/* Right: info panel */}
        <div style={{ padding: '36px 28px', background: '#0a1628', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <p style={{ margin: '0 0 14px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>How it works</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { icon: '🔍', title: 'Resume analysis', desc: 'AI extracts your skills, projects, and experience from your PDF' },
                { icon: '❓', title: 'Custom questions', desc: '5 interview questions generated specifically from your background' },
                { icon: '🎥', title: 'Video recording', desc: 'Answer on camera — silence detection auto-stops each recording' },
                { icon: '📊', title: 'Instant scoring', desc: 'Get scored on speech content, eye contact, and posture' },
              ].map(({ icon, title, desc }) => (
                <div key={title} style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', background: '#1e293b', border: '1px solid #334155', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '16px' }}>{icon}</div>
                  <div>
                    <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>{title}</p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid #1e293b', paddingTop: '20px' }}>
            <p style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tips</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                'Use a well-structured resume with clear project descriptions',
                'Make sure your camera and microphone are working before starting',
                'Find a quiet spot with good lighting facing you',
              ].map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '10px', color: '#3b82f6', marginTop: '3px', flexShrink: 0 }}>●</span>
                  <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>{tip}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 'auto', padding: '14px', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155' }}>
            <p style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}>🔒 Your data is safe</p>
            <p style={{ margin: 0, fontSize: '11px', color: '#64748b', lineHeight: 1.5 }}>Your resume is processed securely. We never share your data with third parties.</p>
          </div>
        </div>
      </div>
    </div>
  );
}