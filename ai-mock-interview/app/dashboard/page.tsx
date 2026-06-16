"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [isUploaded, setIsUploaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.push('/');
      else setUser(session.user);
    };
    fetchUser();
  }, [router]);

  const uploadResume = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      setMessage('');
      if (!event.target.files || event.target.files.length === 0) throw new Error('You must select a PDF file to upload.');
      
      const file = event.target.files[0];
      if (file.type !== 'application/pdf') throw new Error('Please upload a valid PDF document.');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('resumes').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('resumes').getPublicUrl(fileName);

      const { error: updateProfileError } = await supabase.from('profiles').upsert({ 
          id: user.id, resume_url: publicUrlData.publicUrl, email: user.email 
      });
      if (updateProfileError) throw updateProfileError;

      setMessage('🚀 Resume uploaded securely!');
      setIsUploaded(true); 

    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  if (!user) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#fff' }}>Loading...</div>;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #172554 100%)', padding: '40px 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      <div style={{ maxWidth: '650px', margin: '40px auto', backgroundColor: '#1e293b', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', overflow: 'hidden', border: '1px solid #334155' }}>
        
        {/* Vibrant Blue/Green Header */}
        <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)', padding: '35px', color: '#ffffff', textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 10px 0', fontSize: '30px', fontWeight: '800', letterSpacing: '-0.5px' }}>Candidate Dashboard</h2>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '15px' }}>Logged in as: <strong>{user.email}</strong></p>
        </div>

        <div style={{ padding: '40px' }}>
          
          {!isUploaded ? (
            // Dark Upload Zone
            <div style={{ padding: '40px 20px', border: '2px dashed #475569', borderRadius: '16px', textAlign: 'center', backgroundColor: '#0f172a', transition: 'all 0.3s ease' }}>
              <div style={{ backgroundColor: '#1e293b', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', fontSize: '28px', boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)' }}>📄</div>
              <h3 style={{ marginTop: '0', color: '#f8fafc', fontSize: '22px', fontWeight: '700' }}>Upload Your Resume</h3>
              <p style={{ color: '#94a3b8', fontSize: '15px', marginBottom: '30px', maxWidth: '400px', margin: '0 auto 30px auto', lineHeight: '1.6' }}>
                Our AI will analyze your unique experience to generate 5 highly tailored interview questions. (PDF only)
              </p>
              
              <label style={{ display: 'inline-block', backgroundColor: '#3b82f6', color: '#ffffff', padding: '14px 32px', borderRadius: '10px', cursor: uploading ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '16px', transition: 'background-color 0.2s' }}>
                {uploading ? 'Processing securely...' : 'Select PDF File'}
                <input type="file" accept="application/pdf" onChange={uploadResume} disabled={uploading} style={{ display: 'none' }} />
              </label>
            </div>
          ) : (
            // Dark Success State
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ backgroundColor: '#064e3b', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', fontSize: '36px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}>✅</div>
              <h3 style={{ color: '#34d399', fontSize: '26px', marginBottom: '10px', fontWeight: '800' }}>Ready to Begin</h3>
              <p style={{ color: '#94a3b8', fontSize: '16px', marginBottom: '35px' }}>Your resume has been processed. The AI has prepared your custom questions.</p>
              
              <button 
                onClick={() => router.push('/interview')} 
                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none', padding: '18px 36px', borderRadius: '12px', fontSize: '18px', fontWeight: '800', cursor: 'pointer', width: '100%', maxWidth: '320px' }}
              >
                Start Interview Now ➔
              </button>
            </div>
          )}

          {message && (
            <div style={{ 
              marginTop: '30px', padding: '16px 20px', 
              backgroundColor: message.includes('Error') ? '#450a0a' : '#064e3b', 
              borderRadius: '10px', 
              borderLeft: message.includes('Error') ? '6px solid #ef4444' : '6px solid #10b981',
              color: message.includes('Error') ? '#fca5a5' : '#6ee7b7', 
              fontWeight: '700', fontSize: '15px'
            }}>
              {message}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}