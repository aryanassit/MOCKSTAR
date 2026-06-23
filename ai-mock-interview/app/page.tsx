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
    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage('Success! Check your email for verification.');
      router.push('/dashboard');
    }
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage('Logged in successfully!');
      router.push('/dashboard');
    }
    setLoading(false);
  };

  // ── NEW: Google sign-in ──────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    });
    if (error) {
      setMessage(`Error: ${error.message}`);
      setLoading(false);
    }
    // No router.push here — on success Google navigates the browser away by itself
  };
  // ────────────────────────────────────────────────────────────────

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

          {/* Email/password buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleLogin} disabled={loading} style={{ flex: 1, padding: '12px', cursor: 'pointer', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
              {loading ? 'Processing...' : 'Log In'}
            </button>
            <button onClick={handleSignUp} disabled={loading} style={{ flex: 1, padding: '12px', cursor: 'pointer', background: '#222', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
              Register
            </button>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0', gap: '10px' }}>
            <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #eee' }} />
            <span style={{ color: '#999', fontSize: '13px' }}>or</span>
            <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #eee' }} />
          </div>

          {/* ── NEW: Google button ── */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            style={{ width: '100%', padding: '12px', cursor: 'pointer', background: '#fff', color: '#333', border: '1px solid #ccc', borderRadius: '4px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Sign in with Google
          </button>
        </form>
      )}

      {message && <p style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f7f7f7', borderLeft: '4px solid #0070f3', borderRadius: '4px', fontSize: '14px' }}>{message}</p>}
    </div>
  );
}
