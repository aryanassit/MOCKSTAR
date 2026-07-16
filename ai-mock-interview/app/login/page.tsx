"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    setMounted(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) router.push('/dashboard');
    });
    return () => subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const particles: { x:number; y:number; r:number; dx:number; dy:number; o:number }[] = [];
    for (let i = 0; i < 60; i++) {
      particles.push({ x:Math.random()*canvas.width, y:Math.random()*canvas.height, r:Math.random()*1.2+0.3, dx:(Math.random()-0.5)*0.3, dy:(Math.random()-0.5)*0.3, o:Math.random()*0.4+0.1 });
    }
    let raf: number;
    const animate = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      particles.forEach(p => {
        p.x+=p.dx; p.y+=p.dy;
        if(p.x<0)p.x=canvas.width; if(p.x>canvas.width)p.x=0;
        if(p.y<0)p.y=canvas.height; if(p.y>canvas.height)p.y=0;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(34,197,94,${p.o})`; ctx.fill();
      });
      raf = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(raf);
  }, [mounted]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` }
    });
    if (error) { setMessage(`Error: ${error.message}`); setLoading(false); }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) { setMessage(`Error: ${error.message}`); }
      else { setMessage('Check your email to verify your account.'); }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setMessage(`Error: ${error.message}`); }
      else { router.push('/dashboard'); }
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:'100vh', display:'grid', gridTemplateColumns:'1fr 1fr', background:'#F3E8DA', fontFamily:'system-ui,-apple-system,sans-serif', position:'relative', overflow:'hidden' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        @keyframes fadeLeft { from{opacity:0;transform:translateX(-16px)} to{opacity:1;transform:none} }
        @keyframes gradShift { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes pulseDot { 0%,100%{box-shadow:0 0 0 0 rgba(160,171,151,0.5)} 50%{box-shadow:0 0 0 8px rgba(160,171,151,0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .input-field { width:100%; padding:13px 16px; background:#EFE3D2; border:1px solid #D8C7B3; border-radius:10px; color:#2E2A25; font-size:14px; outline:none; transition:border-color 0.15s,box-shadow 0.15s; box-sizing:border-box; }
        .input-field:focus { border-color:#A0AB97; box-shadow:0 0 0 3px rgba(160,171,151,0.12); }
        .input-field::placeholder { color:#6F6A63; }
        .btn-primary { width:100%; padding:14px; background:linear-gradient(135deg,#A0AB97,#8F9B88); background-size:200% 200%; animation:gradShift 4s ease infinite; color:white; border:none; border-radius:10px; font-size:15px; font-weight:700; cursor:pointer; transition:transform 0.15s,box-shadow 0.15s; box-shadow:0 4px 18px rgba(160,171,151,0.35); }
        .btn-primary:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 8px 28px rgba(160,171,151,0.5); }
        .btn-primary:disabled { opacity:0.6; cursor:not-allowed; }
        .btn-google { width:100%; padding:13px; background:#EFE3D2; border:1px solid #D8C7B3; border-radius:10px; color:#2E2A25; font-size:14px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px; transition:border-color 0.15s,background 0.15s; }
        .btn-google:hover { border-color:#8F9B88; background:rgba(160,171,151,0.06); }
        .toggle-link { background:none; border:none; color:#8F9B88; cursor:pointer; font-size:14px; font-weight:600; padding:0; text-decoration:underline; text-underline-offset:3px; }
        .toggle-link:hover { color:#A0AB97; }
      `}</style>

      {/* Left panel — branding */}
      <div style={{ position:'relative', overflow:'hidden', display:'flex', flexDirection:'column', padding:'48px' }}>
        <canvas ref={canvasRef} style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.6 }} />
        <div style={{ position:'absolute', width:'400px', height:'400px', top:'-100px', left:'-80px', background:'radial-gradient(circle,rgba(160,171,151,0.12) 0%,transparent 70%)', borderRadius:'50%', pointerEvents:'none' }} />
        <div style={{ position:'absolute', width:'350px', height:'350px', bottom:'-80px', right:'-60px', background:'radial-gradient(circle,rgba(160,171,151,0.08) 0%,transparent 70%)', borderRadius:'50%', pointerEvents:'none' }} />

        {/* Logo */}
        <div className={mounted?'':'hidden'} style={{ display:'flex', alignItems:'center', gap:'10px', position:'relative', zIndex:1, animation:mounted?'fadeLeft 0.5s ease both':undefined }}>
          <div style={{ width:'32px', height:'32px', borderRadius:'9px', background:'linear-gradient(135deg,#A0AB97,#8F9B88)', backgroundSize:'200% 200%', animation:'gradShift 4s ease infinite', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, color:'#2E2A25', fontSize:'15px', boxShadow:'0 4px 14px rgba(160,171,151,0.4)' }}>M</div>
          <span style={{ fontSize:'18px', fontWeight:800, color:'#2E2A25', letterSpacing:'-0.3px' }}>MockStar</span>
        </div>

        {/* Middle content */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', position:'relative', zIndex:1 }}>
          <div style={{ animation:mounted?'fadeLeft 0.6s 0.1s ease both':undefined, opacity:mounted?undefined:0 }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:'7px', background:'rgba(160,171,151,0.1)', border:'1px solid rgba(160,171,151,0.25)', borderRadius:'20px', padding:'5px 12px', marginBottom:'20px' }}>
              <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#A0AB97', animation:'pulseDot 2s ease infinite' }} />
              <span style={{ fontSize:'11px', color:'#6F6A63' }}>AI-powered interview coach</span>
            </div>
            <h1 style={{ fontSize:'clamp(28px,4vw,44px)', fontWeight:800, color:'#2E2A25', letterSpacing:'-1.5px', lineHeight:1.1, margin:'0 0 16px' }}>
              Practice interviews.<br />
              <span style={{ background:'linear-gradient(135deg,#8F9B88,#A0AB97,#A0AB97)', backgroundSize:'200% 200%', animation:'gradShift 4s ease infinite', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
                Build real confidence.
              </span>
            </h1>
            <p style={{ fontSize:'15px', color:'rgba(46,42,37,0.45)', lineHeight:1.7, maxWidth:'380px', margin:'0 0 36px' }}>
              Upload your resume, answer 5 AI-generated questions on camera, and get scored on speech, eye contact, and posture — instantly.
            </p>
          </div>

          {/* Social proof cards */}
          <div style={{ display:'flex', flexDirection:'column', gap:'10px', animation:mounted?'fadeLeft 0.6s 0.2s ease both':undefined, opacity:mounted?undefined:0 }}>
            {[
              { score:'78%', label:'Overall score', delta:'+13 from last', icon:'📈' },
              { score:'3 skills', label:'Scored per session', delta:'Speech · Eye contact · Posture', icon:'🎯' },
              { score:'~15 min', label:'Average session', delta:'Resume to results', icon:'⚡' },
            ].map(({ score, label, delta, icon }) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 16px', background:'rgba(117,98,78,0.7)', border:'1px solid rgba(160,171,151,0.15)', borderRadius:'12px', backdropFilter:'blur(8px)' }}>
                <span style={{ fontSize:'20px', flexShrink:0 }}>{icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'baseline', gap:'6px' }}>
                    <span style={{ fontSize:'16px', fontWeight:800, color:'#8F9B88' }}>{score}</span>
                    <span style={{ fontSize:'11px', color:'#6F6A63' }}>{label}</span>
                  </div>
                  <div style={{ fontSize:'10px', color:'#6F6A63', marginTop:'1px' }}>{delta}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom — honest value props */}
        <div style={{ position:'relative', zIndex:1, borderTop:'1px solid rgba(160,171,151,0.1)', paddingTop:'20px', animation:mounted?'fadeLeft 0.6s 0.3s ease both':undefined, opacity:mounted?undefined:0 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {[
              { icon:'🎯', text:'Questions generated from your actual resume — not generic templates' },
              { icon:'📹', text:'Camera + silence detection — no manual stop/start needed' },
              { icon:'📊', text:'Scored on 3 dimensions: speech, eye contact, and posture' },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display:'flex', alignItems:'flex-start', gap:'8px' }}>
                <span style={{ fontSize:'13px', flexShrink:0 }}>{icon}</span>
                <span style={{ fontSize:'12px', color:'rgba(46,42,37,0.35)', lineHeight:1.5 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — auth form */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'48px', background:'rgba(117,98,78,0.4)', borderLeft:'1px solid rgba(160,171,151,0.08)' }}>
        <div style={{ width:'100%', maxWidth:'420px', animation:mounted?'fadeUp 0.5s 0.15s ease both':undefined, opacity:mounted?undefined:0 }}>

          <h2 style={{ fontSize:'24px', fontWeight:800, color:'#2E2A25', margin:'0 0 4px', letterSpacing:'-0.5px' }}>
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h2>
          <p style={{ fontSize:'13px', color:'#6F6A63', margin:'0 0 28px' }}>
            {isSignUp ? 'Start practicing in under 2 minutes.' : 'Sign in to continue your practice.'}
          </p>

          {/* Google */}
          <button className="btn-google" onClick={handleGoogleSignIn} disabled={loading} style={{ marginBottom:'20px' }}>
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'20px' }}>
            <div style={{ flex:1, height:'1px', background:'rgba(160,171,151,0.1)' }} />
            <span style={{ fontSize:'11px', color:'#6F6A63' }}>or continue with email</span>
            <div style={{ flex:1, height:'1px', background:'rgba(160,171,151,0.1)' }} />
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailAuth} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            <div>
              <label style={{ fontSize:'12px', fontWeight:600, color:'#6F6A63', display:'block', marginBottom:'6px' }}>Email address</label>
              <input className="input-field" type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} required />
            </div>
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                <label style={{ fontSize:'12px', fontWeight:600, color:'#6F6A63' }}>Password</label>
                {!isSignUp && <button type="button" style={{ background:'none', border:'none', fontSize:'11px', color:'#8F9B88', cursor:'pointer' }}>Forgot password?</button>}
              </div>
              <div style={{ position:'relative' }}>
                <input className="input-field" type={showPass?'text':'password'} placeholder={isSignUp?'Minimum 6 characters':'••••••••'} value={password} onChange={e=>setPassword(e.target.value)} required style={{ paddingRight:'44px' }} />
                <button type="button" onClick={()=>setShowPass(s=>!s)} style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#6F6A63', cursor:'pointer', fontSize:'14px' }}>
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {message && (
              <div style={{ padding:'12px 14px', background: message.includes('Error')?'rgba(239,68,68,0.08)':'rgba(160,171,151,0.08)', border:`1px solid ${message.includes('Error')?'rgba(239,68,68,0.3)':'rgba(160,171,151,0.3)'}`, borderLeft:`3px solid ${message.includes('Error')?'#ef4444':'#A0AB97'}`, borderRadius:'8px', fontSize:'13px', color: message.includes('Error')?'#fca5a5':'#A0AB97' }}>
                {message}
              </div>
            )}

            <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop:'4px' }}>
              {loading ? (
                <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
                  <span style={{ width:'16px', height:'16px', border:'2px solid rgba(46,42,37,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.8s linear infinite', display:'inline-block' }} />
                  {isSignUp ? 'Creating account...' : 'Signing in...'}
                </span>
              ) : (
                isSignUp ? 'Create account →' : 'Sign in →'
              )}
            </button>
          </form>

          {/* Toggle signup/login */}
          <div style={{ textAlign:'center', marginTop:'20px', fontSize:'13px', color:'#6F6A63' }}>
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <button className="toggle-link" onClick={()=>{ setIsSignUp(s=>!s); setMessage(''); }}>
              {isSignUp ? 'Sign in' : 'Sign up for free'}
            </button>
          </div>

          {/* Trust signals */}
          <div style={{ marginTop:'28px', paddingTop:'20px', borderTop:'1px solid rgba(160,171,151,0.08)', display:'flex', gap:'16px', justifyContent:'center' }}>
            {['🔒 Secure', '⚡ Free to start', '🚫 No credit card'].map(t => (
              <span key={t} style={{ fontSize:'11px', color:'#6F6A63' }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}