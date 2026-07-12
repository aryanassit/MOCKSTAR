"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles: { x:number; y:number; r:number; dx:number; dy:number; o:number }[] = [];
    for (let i = 0; i < 80; i++) {
      particles.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, r: Math.random()*1.5+0.3, dx: (Math.random()-0.5)*0.3, dy: (Math.random()-0.5)*0.3, o: Math.random()*0.5+0.15 });
    }
    let raf: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fillStyle = `rgba(34,197,94,${p.o})`; ctx.fill();
      });
      raf = requestAnimationFrame(animate);
    };
    animate();
    const onResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, []);

  return (
    <div style={{ background:'#050f05', color:'#f8fafc', fontFamily:'system-ui,-apple-system,sans-serif', minHeight:'100vh', position:'relative', overflowX:'hidden' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        @keyframes fadeLeft { from{opacity:0;transform:translateX(-20px)} to{opacity:1;transform:none} }
        @keyframes fadeRight { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:none} }
        @keyframes gradShift { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes pulseDot { 0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(22,163,74,0.5)} 50%{opacity:0.7;box-shadow:0 0 0 6px rgba(22,163,74,0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .anim-1 { animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.1s both; }
        .anim-2 { animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.2s both; }
        .anim-3 { animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.3s both; }
        .anim-4 { animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.4s both; }
        .anim-left { animation: fadeLeft 0.7s cubic-bezier(0.22,1,0.36,1) 0.15s both; }
        .anim-right { animation: fadeRight 0.7s cubic-bezier(0.22,1,0.36,1) 0.3s both; }
        .nav-link { color:rgba(248,250,252,0.6); background:none; border:none; font-size:14px; cursor:pointer; padding:6px 12px; border-radius:8px; transition:color 0.15s,background 0.15s; text-decoration:none; }
        .nav-link:hover { color:#f8fafc; background:rgba(22,163,74,0.08); }
        .btn-primary { background:linear-gradient(135deg,#16a34a,#22c55e); background-size:200% 200%; animation:gradShift 4s ease infinite; color:white; border:none; border-radius:12px; padding:14px 28px; font-size:15px; font-weight:700; cursor:pointer; transition:transform 0.15s,box-shadow 0.15s; box-shadow:0 4px 20px rgba(22,163,74,0.35); }
        .btn-primary:hover { transform:translateY(-2px); box-shadow:0 8px 30px rgba(22,163,74,0.5); }
        .btn-outline { background:transparent; color:#22c55e; border:1.5px solid #16a34a; border-radius:12px; padding:13px 28px; font-size:15px; font-weight:700; cursor:pointer; transition:all 0.15s; }
        .btn-outline:hover { background:rgba(22,163,74,0.08); border-color:#22c55e; }
        .feature-pill { display:inline-flex; align-items:center; gap:7px; background:rgba(22,163,74,0.08); border:1px solid rgba(22,163,74,0.2); border-radius:99px; padding:8px 16px; font-size:13px; color:#9ab89a; }
        .card-g { background:#0d1a0d; border:1px solid #1e3a1e; border-radius:16px; transition:transform 0.2s,border-color 0.2s,box-shadow 0.2s; }
        .card-g:hover { transform:translateY(-4px); border-color:#2d5a2d; box-shadow:0 16px 40px rgba(22,163,74,0.12); }
        .step-num { width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg,#16a34a,#22c55e); display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:800; color:white; flex-shrink:0; box-shadow:0 4px 12px rgba(22,163,74,0.35); }
        .score-ring { filter:drop-shadow(0 0 10px rgba(22,163,74,0.4)); }
        .visual-card { background:#0d1a0d; border:1px solid #1e3a1e; border-radius:20px; padding:20px; box-shadow:0 24px 60px rgba(0,0,0,0.6); animation:float 5s ease-in-out infinite; }
        .section-label { font-size:11px; font-weight:700; color:#16a34a; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:10px; }
        .gradient-text { background:linear-gradient(135deg,#22c55e,#4ade80,#86efac); background-size:200% 200%; -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; animation:gradShift 4s ease infinite; }
      `}</style>

      {/* Particle canvas */}
      <canvas ref={canvasRef} style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, opacity:0.5 }} />

      {/* Ambient orbs */}
      <div style={{ position:'fixed', width:'600px', height:'600px', top:'-200px', left:'-100px', background:'radial-gradient(circle,rgba(22,163,74,0.08) 0%,transparent 70%)', borderRadius:'50%', pointerEvents:'none', zIndex:0 }} />
      <div style={{ position:'fixed', width:'500px', height:'500px', bottom:'-100px', right:'-100px', background:'radial-gradient(circle,rgba(34,197,94,0.06) 0%,transparent 70%)', borderRadius:'50%', pointerEvents:'none', zIndex:0 }} />

      {/* Navbar */}
      <nav style={{ position:'sticky', top:0, zIndex:50, backdropFilter:'blur(16px)', background:'rgba(5,15,5,0.85)', borderBottom:'1px solid rgba(22,163,74,0.1)', padding:'0 48px', display:'flex', alignItems:'center', justifyContent:'space-between', height:'64px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'32px', height:'32px', borderRadius:'9px', background:'linear-gradient(135deg,#16a34a,#22c55e)', backgroundSize:'200% 200%', animation:'gradShift 4s ease infinite', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, color:'white', fontSize:'15px', boxShadow:'0 4px 12px rgba(22,163,74,0.4)' }}>M</div>
          <span style={{ fontSize:'17px', fontWeight:800, color:'#f8fafc', letterSpacing:'-0.3px' }}>MockStar</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
          <a href="#features" className="nav-link">Features</a>
          <a href="#how-it-works" className="nav-link">How it works</a>
          <a href="#who-it's-for" className="nav-link">Who it's for</a>
         
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <button className="nav-link" onClick={() => router.push('/login')}>Sign in</button>
          <button className="btn-primary" style={{ padding:'9px 20px', fontSize:'14px' }} onClick={() => router.push('/login')}>Get started →</button>
        </div>
      </nav>

      {/* HERO — two column */}
      <section style={{ maxWidth:'1200px', margin:'0 auto', padding:'80px 48px 60px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'60px', alignItems:'center', position:'relative', zIndex:1 }}>

        {/* Left */}
        <div className={mounted ? 'anim-left' : ''} style={{ opacity: mounted ? undefined : 0 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:'7px', background:'rgba(22,163,74,0.1)', border:'1px solid rgba(22,163,74,0.3)', borderRadius:'20px', padding:'6px 14px', marginBottom:'24px' }}>
            <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#16a34a', animation:'pulseDot 2s ease infinite' }} />
            <span style={{ fontSize:'12px', color:'#9ab89a', letterSpacing:'0.3px' }}>AI-powered interview coach</span>
          </div>

          <h1 style={{ fontSize:'clamp(36px,5vw,60px)', fontWeight:800, lineHeight:1.08, letterSpacing:'-2px', margin:'0 0 20px', color:'#f8fafc' }}>
            AI mock interview practice that builds real{' '}
            <span className="gradient-text">confidence.</span>
          </h1>

          <p style={{ fontSize:'17px', color:'rgba(248,250,252,0.5)', lineHeight:1.7, margin:'0 0 32px', maxWidth:'480px' }}>
            Upload your resume. Get 5 tailored questions generated from your actual experience. Answer on camera and get scored on speech content, eye contact, and posture — instantly.
          </p>

          <div style={{ display:'flex', gap:'8px', marginBottom:'36px', flexWrap:'wrap' }}>
            {['Structure & Clarity', 'Eye Contact', 'Posture & Presence', 'Speech Quality'].map(p => (
              <span key={p} className="feature-pill">
                <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#16a34a', flexShrink:0 }} />
                {p}
              </span>
            ))}
          </div>

          <div style={{ display:'flex', gap:'12px', alignItems:'center', marginBottom:'40px' }}>
            <button className="btn-primary" onClick={() => router.push('/login')}>Start for free →</button>
            <button className="btn-outline" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior:'smooth' })}>See how it works</button>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:'10px', paddingTop:'16px', borderTop:'1px solid rgba(22,163,74,0.1)' }}>
            <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#16a34a', flexShrink:0 }} />
            <div style={{ fontSize:'12px', color:'#6b8f6b' }}>Free to start · No credit card required · Works on any resume</div>
          </div>
        </div>

        {/* Right — visual mockup */}
        <div className={mounted ? 'anim-right' : ''} style={{ opacity: mounted ? undefined : 0, position:'relative' }}>
          <div style={{ position:'absolute', top:'-40px', right:'-40px', width:'300px', height:'300px', background:'radial-gradient(circle,rgba(22,163,74,0.15) 0%,transparent 70%)', borderRadius:'50%', pointerEvents:'none' }} />

          <div className="visual-card">
            {/* Browser chrome */}
            <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'14px' }}>
              <div style={{ width:'9px', height:'9px', borderRadius:'50%', background:'#ef4444' }} />
              <div style={{ width:'9px', height:'9px', borderRadius:'50%', background:'#f59e0b' }} />
              <div style={{ width:'9px', height:'9px', borderRadius:'50%', background:'#22c55e' }} />
              <div style={{ flex:1, background:'rgba(255,255,255,0.04)', borderRadius:'5px', padding:'4px 10px', fontSize:'10px', color:'rgba(255,255,255,0.25)', marginLeft:'6px' }}>mockstar.app/interview</div>
            </div>

            {/* Question */}
            <div style={{ marginBottom:'16px' }}>
              <div style={{ fontSize:'10px', color:'#22c55e', textTransform:'uppercase', letterSpacing:'1px', fontWeight:700, marginBottom:'7px' }}>Question 2 of 5</div>
              <div style={{ fontSize:'14px', color:'#f8fafc', lineHeight:1.55, fontWeight:600 }}>"Walk me through a project where you had to balance technical debt against delivery speed."</div>
            </div>

            {/* Progress dots */}
            <div style={{ display:'flex', gap:'4px', marginBottom:'14px' }}>
              {[1,2,3,4,5].map(i => (
                <div key={i} style={{ height:'4px', borderRadius:'99px', background: i<=2?'#16a34a':'#1e3a1e', flex: i===2?2:1, transition:'all 0.3s' }} />
              ))}
            </div>

            {/* Score breakdown */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', marginBottom:'14px' }}>
              {[{label:'Speech',v:82,c:'#22c55e'},{label:'Eye contact',v:71,c:'#4ade80'},{label:'Posture',v:78,c:'#86efac'}].map(({label,v,c})=>(
                <div key={label} style={{ background:'#050f05', border:'1px solid #1e3a1e', borderRadius:'10px', padding:'10px 8px', textAlign:'center' }}>
                  <div style={{ fontSize:'16px', fontWeight:800, color:c }}>{v}%</div>
                  <div style={{ fontSize:'9px', color:'#6b8f6b', marginTop:'2px' }}>{label}</div>
                  <div style={{ height:'3px', background:'#1e3a1e', borderRadius:'2px', marginTop:'6px', overflow:'hidden' }}>
                    <div style={{ height:'3px', width:`${v}%`, background:c, borderRadius:'2px' }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Recording button */}
            <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'12px 14px', background:'rgba(22,163,74,0.08)', border:'1px solid rgba(22,163,74,0.2)', borderRadius:'12px' }}>
              <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:'linear-gradient(135deg,#16a34a,#22c55e)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'15px', boxShadow:'0 0 0 4px rgba(22,163,74,0.2)', animation:'pulseDot 2s ease infinite', flexShrink:0 }}>🎙️</div>
              <div>
                <div style={{ fontSize:'12px', fontWeight:600, color:'#f8fafc' }}>AI is listening...</div>
                <div style={{ fontSize:'10px', color:'#6b8f6b' }}>Stop talking when finished</div>
              </div>
              <div style={{ marginLeft:'auto', display:'flex', gap:'2px', alignItems:'flex-end', height:'16px' }}>
                {[4,7,10,7,4,6,9,6,4].map((h,i)=>(
                  <div key={i} style={{ width:'3px', height:`${h}px`, background:'#22c55e', borderRadius:'2px', opacity:0.7 }} />
                ))}
              </div>
            </div>
          </div>

          {/* Floating score card */}
          <div style={{ position:'absolute', top:'-20px', right:'-20px', background:'#0d1a0d', border:'1px solid rgba(22,163,74,0.3)', borderRadius:'12px', padding:'12px 16px', boxShadow:'0 8px 24px rgba(0,0,0,0.5)', animation:'float 4s 1s ease-in-out infinite' }}>
            <div style={{ fontSize:'10px', color:'#6b8f6b', marginBottom:'4px' }}>Overall score</div>
            <div style={{ fontSize:'24px', fontWeight:800, color:'#22c55e' }}>78%</div>
            <div style={{ fontSize:'10px', color:'#16a34a', fontWeight:600 }}>↑ +13 from last session</div>
          </div>

          {/* Floating feedback card */}
          <div style={{ position:'absolute', bottom:'-16px', left:'-24px', background:'#0d1a0d', border:'1px solid rgba(22,163,74,0.2)', borderRadius:'12px', padding:'10px 14px', maxWidth:'200px', boxShadow:'0 8px 24px rgba(0,0,0,0.5)', animation:'float 5s 0.5s ease-in-out infinite' }}>
            <div style={{ fontSize:'10px', color:'#6b8f6b', marginBottom:'4px' }}>AI Feedback</div>
            <div style={{ fontSize:'11px', color:'#d4ead4', lineHeight:1.5 }}>Strong technical depth. Work on maintaining eye contact.</div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <div style={{ borderTop:'1px solid rgba(22,163,74,0.08)', borderBottom:'1px solid rgba(22,163,74,0.08)', background:'rgba(13,26,13,0.5)', backdropFilter:'blur(8px)', position:'relative', zIndex:1 }}>
        <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'28px 48px', display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'24px' }}>
          {[{val:'5',label:'Questions per session',icon:'❓'},{val:'3',label:'Skills scored per session',icon:'📊'},{val:'~15 min',label:'Average session time',icon:'⏱'},{val:'Instant',label:'AI feedback turnaround',icon:'⚡'}].map(({val,label,icon})=>(
            <div key={label} style={{ textAlign:'center' }}>
              <div style={{ fontSize:'20px', marginBottom:'6px' }}>{icon}</div>
              <div style={{ fontSize:'22px', fontWeight:800, color:'#22c55e', marginBottom:'3px' }}>{val}</div>
              <div style={{ fontSize:'11px', color:'#6b8f6b' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features section */}
      <section id="features" style={{ maxWidth:'1200px', margin:'0 auto', padding:'80px 48px', position:'relative', zIndex:1 }}>
        <div style={{ textAlign:'center', marginBottom:'56px' }}>
          <div className="section-label">What we score</div>
          <h2 style={{ fontSize:'clamp(28px,4vw,44px)', fontWeight:800, color:'#f8fafc', letterSpacing:'-1.5px', margin:'0 0 14px' }}>Three dimensions.<br />One complete picture.</h2>
          <p style={{ color:'rgba(248,250,252,0.45)', fontSize:'16px', maxWidth:'500px', margin:'0 auto', lineHeight:1.7 }}>Most tools only score what you say. We score how you say it and how you present it.</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'20px' }}>
          {[
            { icon:'💬', title:'Speech content', sub:'Answer quality', desc:'Gemini reads your video and evaluates how well your answer covers the question — depth, structure, technical accuracy, and relevance to your actual experience.', color:'#22c55e' },
            { icon:'👁', title:'Eye contact', sub:'Presence & focus', desc:'Computer Vision tracks whether you are looking at the camera during key moments. Real interviewers notice when you are staring at your own preview instead of them.', color:'#4ade80' },
            { icon:'🧍', title:'Posture', sub:'Non-verbal confidence', desc:'OpenCV detects whether you are sitting upright, leaning, or collapsing — signals that interviewers read as confidence or nervousness before you say a word.', color:'#86efac' },
          ].map(({ icon, title, sub, desc, color }) => (
            <div key={title} className="card-g" style={{ padding:'28px' }}>
              <div style={{ width:'52px', height:'52px', borderRadius:'14px', background:'rgba(22,163,74,0.1)', border:'1px solid rgba(22,163,74,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px', marginBottom:'18px' }}>{icon}</div>
              <div style={{ fontSize:'11px', color, textTransform:'uppercase', letterSpacing:'1px', fontWeight:700, marginBottom:'6px' }}>{sub}</div>
              <div style={{ fontSize:'18px', fontWeight:700, color:'#f8fafc', marginBottom:'12px' }}>{title}</div>
              <div style={{ fontSize:'13px', color:'rgba(248,250,252,0.45)', lineHeight:1.7 }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" style={{ background:'rgba(13,26,13,0.4)', borderTop:'1px solid rgba(22,163,74,0.08)', borderBottom:'1px solid rgba(22,163,74,0.08)', position:'relative', zIndex:1 }}>
        <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'80px 48px' }}>
          <div style={{ textAlign:'center', marginBottom:'56px' }}>
            <div className="section-label">How it works</div>
            <h2 style={{ fontSize:'clamp(28px,4vw,44px)', fontWeight:800, color:'#f8fafc', letterSpacing:'-1.5px', margin:0 }}>From resume to feedback in 15 minutes.</h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'20px', position:'relative' }}>
            <div style={{ position:'absolute', top:'18px', left:'12.5%', right:'12.5%', height:'1px', background:'linear-gradient(90deg,rgba(22,163,74,0.3),rgba(34,197,94,0.6),rgba(22,163,74,0.3))', pointerEvents:'none' }} />
            {[
              { n:'1', icon:'📄', title:'Upload resume', desc:'We extract your skills, projects, and experience — no manual input needed.' },
              { n:'2', icon:'❓', title:'Get 5 questions', desc:'Gemini generates questions tailored to what is actually on your resume.' },
              { n:'3', icon:'🎥', title:'Answer on camera', desc:'Silence detection auto-stops recording. No button pressing needed.' },
              { n:'4', icon:'📊', title:'Get your scores', desc:'Speech content, eye contact, and posture — with written AI feedback.' },
            ].map(({ n, icon, title, desc }) => (
              <div key={n} style={{ textAlign:'center', padding:'24px 16px', position:'relative' }}>
                <div style={{ display:'flex', justifyContent:'center', marginBottom:'16px' }}>
                  <div className="step-num">{n}</div>
                </div>
                <div style={{ fontSize:'28px', marginBottom:'12px' }}>{icon}</div>
                <div style={{ fontSize:'15px', fontWeight:700, color:'#f8fafc', marginBottom:'8px' }}>{title}</div>
                <div style={{ fontSize:'12px', color:'rgba(248,250,252,0.45)', lineHeight:1.7 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section style={{ maxWidth:'1200px', margin:'0 auto', padding:'80px 48px', position:'relative', zIndex:1 }}>
        <div style={{ textAlign:'center', marginBottom:'48px' }}>
          <div className="section-label">Who it's for</div>
          <h2 style={{ fontSize:'clamp(28px,4vw,40px)', fontWeight:800, color:'#f8fafc', letterSpacing:'-1.5px', margin:0 }}>Built for the moments that matter most.</h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'16px' }}>
          {[
            { emoji:'🎓', title:'Final year students', desc:'Practice technical and HR rounds before campus placements. Your resume is fresh — your interview skills should be too.' },
            { emoji:'💼', title:'Job switchers', desc:'Returning to interviews after years in a role? Get sharp fast without paying for a human coach.' },
            { emoji:'🚀', title:'Active applicants', desc:'Practicing for 3 interviews this week? Run a session each evening and track your improvement between rounds.' },
          ].map(({ emoji, title, desc }) => (
            <div key={title} className="card-g" style={{ padding:'24px' }}>
              <div style={{ fontSize:'32px', marginBottom:'14px' }}>{emoji}</div>
              <div style={{ fontSize:'16px', fontWeight:700, color:'#f8fafc', marginBottom:'8px' }}>{title}</div>
              <div style={{ fontSize:'13px', color:'rgba(248,250,252,0.45)', lineHeight:1.7 }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ position:'relative', zIndex:1, overflow:'hidden' }}>
        <div style={{ maxWidth:'800px', margin:'0 auto', padding:'80px 48px', textAlign:'center' }}>
          <div style={{ background:'rgba(13,26,13,0.8)', border:'1px solid rgba(22,163,74,0.2)', borderRadius:'24px', padding:'60px 48px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', inset:0, background:'radial-gradient(circle at 50% 0%,rgba(22,163,74,0.12),transparent 70%)', pointerEvents:'none' }} />
            <div style={{ position:'relative' }}>
              <div style={{ fontSize:'36px', marginBottom:'16px' }}>🎯</div>
              <h2 style={{ fontSize:'clamp(24px,4vw,38px)', fontWeight:800, color:'#f8fafc', letterSpacing:'-1.2px', margin:'0 0 14px' }}>Your next interview is closer<br />than you think.</h2>
              <p style={{ color:'rgba(248,250,252,0.45)', fontSize:'16px', margin:'0 0 32px', lineHeight:1.7 }}>No credit card. No onboarding call. Just upload your resume and start in under 2 minutes.</p>
              <button className="btn-primary" style={{ padding:'16px 36px', fontSize:'16px' }} onClick={() => router.push('/login')}>Get started for free →</button>
              <div style={{ marginTop:'16px', fontSize:'12px', color:'#4a6f4a' }}>Free plan · No credit card required</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop:'1px solid rgba(22,163,74,0.08)', position:'relative', zIndex:1 }}>
        <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'28px 48px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <div style={{ width:'22px', height:'22px', borderRadius:'6px', background:'linear-gradient(135deg,#16a34a,#22c55e)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, color:'white', fontSize:'11px' }}>M</div>
            <span style={{ fontSize:'13px', fontWeight:700, color:'#f8fafc' }}>MockStar</span>
          </div>
          <div style={{ fontSize:'12px', color:'#4a6f4a' }}>© 2025 MockStar · AI-powered interview practice</div>
          <div style={{ display:'flex', gap:'16px' }}>
            <a href="#" style={{ fontSize:'12px', color:'#4a6f4a', textDecoration:'none' }}>Privacy</a>
            <a href="#" style={{ fontSize:'12px', color:'#4a6f4a', textDecoration:'none' }}>Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}