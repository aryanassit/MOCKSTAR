"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

// ── Animated counter hook ────────────────────────────────────────
function useCounter(target: number, duration = 1400, delay = 0) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      const start = Date.now();
      const tick = () => {
        const p = Math.min((Date.now() - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setValue(Math.round(eased * target));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(t);
  }, [target, duration, delay]);
  return value;
}

// ── Animated ring ────────────────────────────────────────────────
function AnimRing({ score, color, size = 110, stroke = 9, delay = 0 }: {
  score: number; color: string; size?: number; stroke?: number; delay?: number;
}) {
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFilled(true), delay + 100);
    return () => clearTimeout(t);
  }, [delay]);
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = filled ? circ * (1 - score / 100) : circ;
  const displayed = useCounter(score, 1400, delay);
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="ring-glow" style={{ filter: `drop-shadow(0 0 10px ${color}55)` }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transformBox: 'fill-box', transition: 'stroke-dashoffset 1.5s cubic-bezier(0.22,1,0.36,1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span className="stat-num" style={{ fontSize: size / 5, fontWeight: 700, color: '#f8fafc', lineHeight: 1 }}>{displayed}%</span>
        <span style={{ fontSize: size / 10, color: '#64748b' }}>avg</span>
      </div>
    </div>
  );
}

// ── Animated skill bar ───────────────────────────────────────────
function SkillBar({ label, value, color, delay = 0 }: { label: string; value: number; color: string; delay?: number }) {
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFilled(true), delay + 300);
    return () => clearTimeout(t);
  }, [delay]);
  const displayed = useCounter(value, 1200, delay + 300);
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{label}</span>
        <span className="stat-num" style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}>{displayed}%</span>
      </div>
      <div style={{ background: '#1e293b', borderRadius: '4px', height: '7px', overflow: 'hidden' }}>
        <div style={{
          height: '7px', borderRadius: '4px', background: color,
          width: filled ? `${value}%` : '0%',
          transition: 'width 1.2s cubic-bezier(0.22,1,0.36,1)',
          boxShadow: `0 0 8px ${color}66`,
        }} />
      </div>
    </div>
  );
}

const scoreColor = (v: number) => v >= 75 ? '#10b981' : v >= 50 ? '#f59e0b' : '#ef4444';
const scoreBg   = (v: number) => v >= 75 ? 'rgba(16,185,129,0.15)' : v >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)';

const MOCK = [
  { id: 1, role: 'ML Engineer',    date: 'Today',       overall: 78, speech: 82, eyeContact: 71, posture: 78 },
  { id: 2, role: 'Full Stack Dev', date: '7 days ago',  overall: 65, speech: 68, eyeContact: 58, posture: 66 },
  { id: 3, role: 'Data Scientist', date: '14 days ago', overall: 63, speech: 67, eyeContact: 60, posture: 63 },
];

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasResume, setHasResume] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }
      const { data } = await supabase.from('profiles').select('resume_url').eq('id', session.user.id).single();
      setHasResume(!!data?.resume_url);
      setLoading(false);
      setTimeout(() => setMounted(true), 50);
    })();
  }, [router]);

  const sessions = useCounter(3, 800, 200);
  const bestScore = useCounter(78, 1000, 300);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
      <div style={{ width: '36px', height: '36px', border: '3px solid #1e293b', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', boxShadow: '0 0 16px rgba(59,130,246,0.4)' }} />
    </div>
  );

  const avg = (key: string) => Math.round(MOCK.reduce((s, x: any) => s + x[key], 0) / MOCK.length);
  const avgOverall = avg('overall'), avgSpeech = avg('speech'), avgEye = avg('eyeContact'), avgPosture = avg('posture');

  return (
    <div>
      {/* Header */}
      <div className={mounted ? 'anim-fade-up d-0' : ''} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', opacity: mounted ? undefined : 0 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.3px' }}>Dashboard</h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>3 sessions completed · improving each time</p>
        </div>
        <button
          onClick={() => router.push('/upload')}
          className="btn-glow"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #10b981)', backgroundSize: '200% 200%', color: 'white', border: 'none', borderRadius: '10px', padding: '9px 18px', fontSize: '13px', cursor: 'pointer', fontWeight: 700, boxShadow: '0 4px 16px rgba(59,130,246,0.35)' }}
        >+ Start interview</button>
      </div>

      {!hasResume && (
        <div className={mounted ? 'anim-fade-up d-100' : ''} style={{ padding: '12px 16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '10px', marginBottom: '16px', fontSize: '13px', color: '#fbbf24', opacity: mounted ? undefined : 0 }}>
          No resume uploaded yet.{' '}
          <button onClick={() => router.push('/upload')} style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: '13px', padding: 0, fontWeight: 600, transition: 'color 0.15s' }}>Upload one to start →</button>
        </div>
      )}

      {/* Ring + stats */}
      <div className={mounted ? 'anim-fade-up d-100' : ''} style={{ display: 'grid', gridTemplateColumns: '190px 1fr', gap: '14px', marginBottom: '14px', opacity: mounted ? undefined : 0 }}>
        <div className="card-hover" style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <AnimRing score={avgOverall} color="#3b82f6" size={110} delay={200} />
          <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#64748b' }}>Across 3 sessions</p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#10b981', fontWeight: 600 }}>↑ {MOCK[0].overall - MOCK[MOCK.length - 1].overall} pts since first session</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '10px' }}>
          {[
            { label: 'Sessions', value: sessions, suffix: '' },
            { label: 'Best score', value: bestScore, suffix: '%' },
            { label: 'Avg speech', value: useCounter(avgSpeech, 1200, 400), suffix: '%' },
            { label: 'Avg posture', value: useCounter(avgPosture, 1200, 500), suffix: '%' },
          ].map(({ label, value, suffix }, i) => (
            <div key={label} className="card-hover" style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '14px 16px' }}>
              <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#64748b' }}>{label}</p>
              <p className="stat-num" style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#f8fafc' }}>{value}{suffix}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Skills + Recent */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div className={`card-hover ${mounted ? 'anim-fade-up d-300' : ''}`} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '1.25rem', opacity: mounted ? undefined : 0 }}>
          <p style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>Skill breakdown</p>
          <SkillBar label="Speech content" value={avgSpeech}  color="#10b981" delay={400} />
          <SkillBar label="Eye contact"    value={avgEye}     color="#f59e0b" delay={500} />
          <SkillBar label="Posture"        value={avgPosture} color="#3b82f6" delay={600} />
          {avgEye < 70 && (
            <div style={{ padding: '10px 12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', fontSize: '12px', color: '#fbbf24', marginTop: '4px', animation: 'pulse-glow 3s ease infinite' }}>
              Focus: look at the camera lens, not your preview window.
            </div>
          )}
        </div>

        <div className={`card-hover ${mounted ? 'anim-fade-up d-400' : ''}`} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '1.25rem', opacity: mounted ? undefined : 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>Recent sessions</p>
            <button onClick={() => router.push('/history')} style={{ fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.15s' }}>View all</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {MOCK.map((s, i) => (
              <div key={s.id} className="card-hover" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', background: '#0f172a', borderRadius: '10px',
                border: '1px solid #1e293b', cursor: 'pointer',
                animation: mounted ? `fadeInUp 0.4s cubic-bezier(0.22,1,0.36,1) ${500 + i * 80}ms both` : 'none',
              }}>
                <div>
                  <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>{s.role}</p>
                  <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>{s.date}</p>
                </div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: scoreColor(s.overall), background: scoreBg(s.overall), padding: '4px 10px', borderRadius: '99px', transition: 'transform 0.2s ease' }}>
                  {s.overall}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}