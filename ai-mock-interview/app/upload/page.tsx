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
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.push('/');
      else setUser(session.user);
    };
    fetchUser();
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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #172554 100%)', fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadein { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>

      <div style={{ width: '100%', maxWidth: '520px', animation: 'fadein 0.3s ease' }}>

        {/* Top nav bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'linear-gradient(135deg, #3b82f6, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white', fontSize: '13px' }}>M</div>
            <span style={{ fontWeight: 600, fontSize: '15px', color: '#f8fafc' }}>Mockstar</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={() => router.push('/dashboard')} style={{ fontSize: '12px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>Dashboard</button>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'white' }}>
              {user.email?.[0]?.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Main card */}
        <div style={{ background: '#1e293b', borderRadius: '24px', border: '1px solid #334155', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>

          {/* Gradient header */}
          <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)', padding: '32px 36px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', backdropFilter: 'blur(4px)' }}>🎯</div>
              <div>
                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'white', letterSpacing: '-0.3px' }}>Start your interview</h1>
                <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.75)' }}>Signed in as {user.email}</p>
              </div>
            </div>
          </div>

          <div style={{ padding: '32px 36px' }}>
            {!isUploaded ? (
              <>
                {/* Steps indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '28px' }}>
                  {[
                    { n: '1', label: 'Upload resume', active: true },
                    { n: '2', label: 'AI reads it', active: false },
                    { n: '3', label: 'Start interview', active: false },
                  ].map(({ n, label, active }, i) => (
                    <div key={n} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: active ? 'linear-gradient(135deg, #3b82f6, #10b981)' : '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: active ? 'white' : '#64748b' }}>{n}</div>
                        <span style={{ fontSize: '10px', color: active ? '#94a3b8' : '#475569', whiteSpace: 'nowrap' }}>{label}</span>
                      </div>
                      {i < 2 && <div style={{ flex: 1, height: '1px', background: '#334155', margin: '0 6px 16px' }} />}
                    </div>
                  ))}
                </div>

                {/* Drop zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragOver ? '#3b82f6' : '#475569'}`,
                    borderRadius: '16px',
                    padding: '40px 24px',
                    textAlign: 'center',
                    background: dragOver ? 'rgba(59,130,246,0.05)' : '#0f172a',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    marginBottom: '20px',
                  }}
                >
                  {uploading ? (
                    <>
                      <div style={{ width: '44px', height: '44px', border: '4px solid #334155', borderTopColor: '#3b82f6', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
                      <p style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>Uploading securely...</p>
                      <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Please wait while we process your resume</p>
                    </>
                  ) : (
                    <>
                      <div style={{ width: '56px', height: '56px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '24px' }}>📄</div>
                      <p style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>Drop your resume here</p>
                      <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>or click to browse · PDF only · Max 5 MB</p>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #3b82f6, #10b981)', color: 'white', padding: '11px 24px', borderRadius: '10px', fontWeight: 700, fontSize: '14px' }}>
                        <span>Select PDF file</span>
                      </div>
                    </>
                  )}
                  <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleFileInput} disabled={uploading} style={{ display: 'none' }} />
                </div>

                {/* What happens next */}
                <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '16px' }}>
                  <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>What happens next</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { icon: '🔍', text: 'AI reads your resume and extracts key skills and projects' },
                      { icon: '❓', text: '5 tailored interview questions are generated just for you' },
                      { icon: '🎥', text: 'You answer on camera — we score speech, eye contact, and posture' },
                    ].map(({ icon, text }) => (
                      <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <span style={{ fontSize: '14px', flexShrink: 0 }}>{icon}</span>
                        <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>{text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              /* Success state */
              <div style={{ textAlign: 'center', padding: '16px 0', animation: 'fadein 0.3s ease' }}>
                <div style={{ width: '72px', height: '72px', background: 'rgba(16,185,129,0.15)', border: '2px solid rgba(16,185,129,0.4)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '32px' }}>✅</div>
                <h2 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: 800, color: '#34d399' }}>Resume ready</h2>
                <p style={{ margin: '0 0 6px', fontSize: '13px', color: '#94a3b8' }}>
                  <strong style={{ color: '#64748b' }}>{fileName}</strong>
                </p>
                <p style={{ margin: '0 0 28px', fontSize: '14px', color: '#94a3b8', lineHeight: 1.6 }}>
                  Your resume has been processed. The AI has your profile and is ready to generate questions.
                </p>

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '28px' }}>
                  {[
                    { label: 'Questions', value: '5' },
                    { label: 'Est. time', value: '~15 min' },
                    { label: 'Scored on', value: '3 skills' },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '12px 8px' }}>
                      <p style={{ margin: '0 0 2px', fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>{value}</p>
                      <p style={{ margin: 0, fontSize: '10px', color: '#64748b' }}>{label}</p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => router.push('/interview')}
                  style={{ width: '100%', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none', padding: '16px', borderRadius: '12px', fontSize: '16px', fontWeight: 800, cursor: 'pointer', letterSpacing: '-0.2px' }}
                >
                  Start interview now →
                </button>
                <button
                  onClick={() => { setIsUploaded(false); setFileName(''); setMessage(''); }}
                  style={{ marginTop: '10px', background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer' }}
                >
                  Upload a different resume
                </button>
              </div>
            )}

            {/* Error message */}
            {message && message.includes('Error') && (
              <div style={{ marginTop: '16px', padding: '14px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', borderLeft: '4px solid #ef4444', color: '#fca5a5', fontSize: '13px', fontWeight: 600 }}>
                {message}
              </div>
            )}
          </div>
        </div>

        {/* Footer note */}
        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '11px', color: '#475569' }}>
          Your resume is processed securely and never shared with third parties.
        </p>
      </div>
    </div>
  );
}
