"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'google' | 'email'>('google');
  const [authType, setAuthType] = useState<'login' | 'register'>('login');
  const [mounted, setMounted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setMounted(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) router.push('/dashboard');
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/dashboard');
    });
    return () => subscription.unsubscribe();
  }, [router]);

  // Particle canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;
    const onResize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    window.addEventListener('resize', onResize);
    const dots: { x: number; y: number; vx: number; vy: number; r: number; o: number }[] = [];
    for (let i = 0; i < 55; i++) dots.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, r: Math.random() * 1.5 + 0.5, o: Math.random() * 0.4 + 0.1 });
    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      dots.forEach(d => {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0) d.x = W; if (d.x > W) d.x = 0;
        if (d.y < 0) d.y = H; if (d.y > H) d.y = 0;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(175,169,236,${d.o})`; ctx.fill();
      });
      dots.forEach((a, i) => dots.slice(i + 1).forEach(b => {
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < 120) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.strokeStyle = `rgba(83,74,183,${0.12 * (1 - dist / 120)})`; ctx.stroke(); }
      }));
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, [mounted]);

  const handleGoogle = async () => {
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/dashboard` } });
    if (error) { setError(error.message); setLoading(false); }
  };

  const handleEmail = async () => {
    if (!email || !password) { setError('Enter email and password.'); return; }
    setLoading(true); setError('');
    if (authType === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); setLoading(false); }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) { setError(error.message); setLoading(false); }
      else { setError(''); setMode('google'); alert('Check your email to verify your account.'); }
    }
    setLoading(false);
  };

  const features = [
    { icon: '◆', title: 'Resume-aware questions', desc: 'AI reads your PDF and builds 5 questions from your actual experience.' },
    { icon: '◆', title: 'Live body language scoring', desc: 'Camera tracks eye contact and posture as you answer.' },
    { icon: '◆', title: 'Speech analysis', desc: 'Catches filler words, pacing, and clarity in real time.' },
    { icon: '◆', title: 'Full session history', desc: 'Every score saved. Watch yourself improve across sessions.' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#06060f', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#fff', overflow: 'hidden auto' }}>
      <style>{`
        @keyframes fadeup { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes glow { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        @keyframes slide-in { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        .fade1 { animation: fadeup 0.6s ease both; }
        .fade2 { animation: fadeup 0.6s 0.15s ease both; }
        .fade3 { animation: fadeup 0.6s 0.3s ease both; }
        .fade4 { animation: fadeup 0.6s 0.45s ease both; }
        .card-anim { animation: slide-in 0.4s ease both; }
        .btn-google { width:100%; display:flex; align-items:center; justify-content:center; gap:10px; padding:14px; background:#fff; border:none; border-radius:12px; font-size:14px; font-weight:500; color:#1a1a1a; cursor:pointer; transition:transform 0.15s, opacity 0.15s; }
        .btn-google:hover:not(:disabled) { transform: translateY(-1px); opacity: 0.93; }
        .btn-google:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-purple { width:100%; padding:14px; background:#534AB7; border:none; border-radius:12px; font-size:14px; font-weight:500; color:#fff; cursor:pointer; transition:transform 0.15s, opacity 0.15s; }
        .btn-purple:hover:not(:disabled) { transform: translateY(-1px); opacity: 0.88; }
        .btn-purple:disabled { opacity: 0.5; cursor: not-allowed; }
        .inp { width:100%; padding:12px 14px; background:rgba(255,255,255,0.05); border:0.5px solid rgba(255,255,255,0.12); border-radius:10px; color:#fff; font-size:14px; outline:none; transition:border-color 0.15s; box-sizing:border-box; }
        .inp:focus { border-color:rgba(83,74,183,0.7); }
        .inp::placeholder { color:rgba(255,255,255,0.25); }
        .feat-card { background:rgba(255,255,255,0.02); border:0.5px solid rgba(255,255,255,0.07); border-radius:14px; padding:20px; transition:border-color 0.2s, transform 0.2s; }
        .feat-card:hover { border-color:rgba(83,74,183,0.35); transform:translateY(-2px); }
        .tab { flex:1; padding:8px; border-radius:8px; border:none; font-size:13px; font-weight:500; cursor:pointer; transition:all 0.15s; }
        .stat-num { font-size:28px; font-weight:600; color:#fff; letter-spacing:-1px; }
        .link-btn { background:none; border:none; color:#AFA9EC; font-size:13px; cursor:pointer; text-decoration:underline; text-underline-offset:3px; }
      `}</style>

      {/* Particle canvas */}
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />

      {/* Purple glow blobs */}
      <div style={{ position: 'fixed', top: '-10%', right: '-5%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(83,74,183,0.15) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0, animation: 'glow 4s ease-in-out infinite' }} />
      <div style={{ position: 'fixed', bottom: '-10%', left: '-5%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(83,74,183,0.1) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0, animation: 'glow 5s 1s ease-in-out infinite' }} />

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 32px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', background: 'rgba(6,6,15,0.8)', backdropFilter: 'blur(16px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', background: '#534AB7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
          <span style={{ fontSize: '16px', fontWeight: '600', letterSpacing: '-0.4px' }}>MockStar</span>
        </div>
        <div style={{ display: 'flex', gap: '28px' }}>
          <span onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', cursor: 'pointer' }}>Features</span>
          <span onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', cursor: 'pointer' }}>How it works</span>
          <span onClick={() => document.getElementById('auth-card')?.scrollIntoView({ behavior: 'smooth' })} style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', cursor: 'pointer' }}>Sign in</span>
        </div>
        <button onClick={() => document.getElementById('auth-card')?.scrollIntoView({ behavior: 'smooth' })} style={{ background: '#534AB7', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 18px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
          Get started →
        </button>
      </nav>

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ── HERO ── */}
        <section style={{ maxWidth: '900px', margin: '0 auto', padding: '80px 32px 60px', textAlign: 'center' }}>
          <div className="fade1" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(83,74,183,0.12)', border: '0.5px solid rgba(83,74,183,0.3)', borderRadius: '20px', padding: '6px 16px', marginBottom: '32px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#534AB7', animation: 'glow 2s ease-in-out infinite' }} />
            <span style={{ fontSize: '12px', color: '#AFA9EC', letterSpacing: '0.3px' }}>AI-powered interview coach</span>
          </div>

          <h1 className="fade2" style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: '700', lineHeight: 1.1, letterSpacing: '-2px', margin: '0 0 20px', background: 'linear-gradient(135deg, #fff 60%, #AFA9EC 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Stop winging it.<br />Start acing it.
          </h1>

          <p className="fade3" style={{ fontSize: '17px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, maxWidth: '500px', margin: '0 auto 40px' }}>
            Upload your resume. Get 5 tailored questions. Answer on camera. Get scored on content, eye contact, and posture — instantly.
          </p>

          <div className="fade4" style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => document.getElementById('auth-card')?.scrollIntoView({ behavior: 'smooth' })} className="btn-purple" style={{ width: 'auto', padding: '13px 28px', fontSize: '15px' }}>
              Start for free →
            </button>
           
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how-it-works" style={{ maxWidth: '780px', margin: '0 auto', padding: '0 32px 80px' }}>
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div style={{ fontSize: '11px', color: '#534AB7', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '10px' }}>How it works</div>
            <h2 style={{ fontSize: '28px', fontWeight: '600', letterSpacing: '-0.8px', margin: 0 }}>Three steps to interview-ready.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
            {[
              { step: '01', title: 'Upload resume', desc: 'Drop your PDF. AI reads your skills, projects, and experience.' },
              { step: '02', title: 'Answer on camera', desc: 'Get 5 tailored questions. Record your answers in real time.' },
              { step: '03', title: 'Get scored', desc: 'Instant feedback on content, eye contact, posture, and speech.' },
            ].map((s, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '24px' }}>
                <div style={{ fontSize: '11px', color: '#534AB7', fontWeight: '600', letterSpacing: '1px', marginBottom: '12px' }}>{s.step}</div>
                <div style={{ fontSize: '15px', fontWeight: '500', color: '#fff', marginBottom: '8px' }}>{s.title}</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section id="features" style={{ maxWidth: '780px', margin: '0 auto', padding: '0 32px 80px' }}>
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div style={{ fontSize: '11px', color: '#534AB7', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '10px' }}>What makes it different</div>
            <h2 style={{ fontSize: '28px', fontWeight: '600', letterSpacing: '-0.8px', margin: 0 }}>Not just questions. A full coach.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {features.map((f, i) => (
              <div key={i} className="feat-card">
                <div style={{ fontSize: '10px', color: '#534AB7', marginBottom: '8px' }}>{f.icon}</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#fff', marginBottom: '6px' }}>{f.title}</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── AUTH CARD ── */}
        <section id="auth-card" style={{ maxWidth: '420px', margin: '0 auto', padding: '0 24px 100px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '22px', padding: '36px 32px' }} className="card-anim">
            <h2 style={{ fontSize: '20px', fontWeight: '600', letterSpacing: '-0.4px', marginBottom: '6px' }}>
              {mode === 'google' ? 'Get started free' : authType === 'login' ? 'Sign in' : 'Create account'}
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '24px', lineHeight: 1.6 }}>
              {mode === 'google' ? 'One click. Your sessions and history saved automatically.' : 'Use your email and password to continue.'}
            </p>

            {mode === 'google' ? (
              <>
                <button className="btn-google" onClick={handleGoogle} disabled={loading}>
                  {loading
                    ? <div style={{ width: '16px', height: '16px', border: '2px solid rgba(83,74,183,0.3)', borderTop: '2px solid #534AB7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    : <>
                        <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                        Continue with Google
                      </>
                  }
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '18px 0' }}>
                  <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.08)' }} />
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>or</span>
                  <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.08)' }} />
                </div>
                <button onClick={() => setMode('email')} style={{ width: '100%', padding: '13px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'rgba(255,255,255,0.6)', fontSize: '14px', cursor: 'pointer' }}>
                  Continue with email
                </button>
              </>
            ) : (
              <>
                {/* tabs */}
                <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '4px', marginBottom: '20px' }}>
                  {(['login', 'register'] as const).map(t => (
                    <button key={t} className="tab" onClick={() => setAuthType(t)} style={{ background: authType === t ? 'rgba(83,74,183,0.5)' : 'transparent', color: authType === t ? '#fff' : 'rgba(255,255,255,0.4)', border: 'none' }}>
                      {t === 'login' ? 'Sign in' : 'Register'}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                  <input className="inp" type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
                  <input className="inp" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleEmail()} />
                </div>
                <button className="btn-purple" onClick={handleEmail} disabled={loading}>
                  {loading ? 'Please wait...' : authType === 'login' ? 'Sign in' : 'Create account'}
                </button>
                <div style={{ textAlign: 'center', marginTop: '14px' }}>
                  <button className="link-btn" onClick={() => setMode('google')}>← Back to Google sign in</button>
                </div>
              </>
            )}

            {error && (
              <div style={{ marginTop: '14px', padding: '11px 14px', background: 'rgba(226,75,74,0.1)', border: '0.5px solid rgba(226,75,74,0.3)', borderRadius: '10px', fontSize: '13px', color: '#F09595' }}>
                {error}
              </div>
            )}

            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '0.5px solid rgba(255,255,255,0.07)' }}>
              {['Resume-aware AI questions', 'Live camera & speech scoring', 'Full session history'].map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#534AB7', flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
          <p style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.18)', marginTop: '16px' }}>
            By signing in you agree to our terms and privacy policy.
          </p>
        </section>
      </div>
    </div>
  );
}
