"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setMessage(`Error: ${error.message}`);
    else setMessage('Success! Check your email for verification.');
    router.push('/dashboard');
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage(`Error: ${error.message}`);
    else setMessage('Logged in successfully!');
    router.push('/dashboard');
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMessage('Logged out.');
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '400px', margin: '40px auto', color: '#333', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>AI Mock Interview System</h2>
      <hr style={{ marginBottom: '20px', border: '0', borderTop: '1px solid #eee' }} />

      {user ? (
        <div style={{ textAlign: 'center' }}>
          <p>Welcome, <strong>{user.email}</strong>!</p>
          <button onClick={handleLogout} style={{ padding: '10px 20px', cursor: 'pointer', background: '#ff4d4d', color: '#fff', border: 'none', borderRadius: '4px', width: '100%' }}>
            Log Out
          </button>
        </div>
      ) : (
        <form onSubmit={(e) => e.preventDefault()}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontWeight: 'bold' }}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '10px', marginTop: '5px', border: '1px solid #ccc', borderRadius: '4px' }}
              required
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontWeight: 'bold' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '10px', marginTop: '5px', border: '1px solid #ccc', borderRadius: '4px' }}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleLogin} disabled={loading} style={{ flex: 1, padding: '12px', cursor: 'pointer', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
              {loading ? 'Processing...' : 'Log In'}
            </button>
            <button onClick={handleSignUp} disabled={loading} style={{ flex: 1, padding: '12px', cursor: 'pointer', background: '#222', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
              Register
            </button>
          </div>
        </form>
      )}

      {message && <p style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f7f7f7', borderLeft: '4px solid #0070f3', borderRadius: '4px', fontSize: '14px' }}>{message}</p>}
    </div>
  );
}