"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

// ── Types ────────────────────────────────────────────────────────
interface Session {
  id: string;
  overall_score: number;
  speech_score: number;
  eye_contact_score: number;
  posture_score: number;
  created_at: string;
}

// ── Hooks ────────────────────────────────────────────────────────
function useCounter(target: number, duration = 1400, delay = 0) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      const start = Date.now();
      const tick = () => {
        const p = Math.min((Date.now() - start) / duration, 1);
        setValue(Math.round((1 - Math.pow(1 - p, 3)) * target));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(t);
  }, [target, duration, delay]);
  return value;
}

// ── Sub-components ───────────────────────────────────────────────
function AnimRing({ score, color, size = 110, stroke = 9, delay = 0 }: {
  score: number; color: string; size?: number; stroke?: number; delay?: number;
}) {
  const [filled, setFilled] = useState(false);
  useEffect(() => { const t = setTimeout(() => setFilled(true), delay + 100); return () => clearTimeout(t); }, [delay]);
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const displayed = useCounter(score, 1400, delay);
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ filter: `drop-shadow(0 0 10px ${color}55)` }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1a3a2e" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={filled ? circ * (1 - score / 100) : circ}
          strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transformBox: 'fill-box', transition: 'stroke-dashoffset 1.5s cubic-bezier(0.22,1,0.36,1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size / 5, fontWeight: 700, color: '#f8fafc', lineHeight: 1 }}>{displayed}%</span>
        <span style={{ fontSize: size / 10, color: '#64748b' }}>avg</span>
      </div>
    </div>
  );
}

function SkillBar({ label, value, color, delay = 0 }: { label: string; value: number; color: string; delay?: number }) {
  const [filled, setFilled] = useState(false);
  useEffect(() => { const t = setTimeout(() => setFilled(true), delay + 300); return () => clearTimeout(t); }, [delay]);
  const displayed = useCounter(value, 1200, delay + 300);
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{label}</span>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}>{displayed}%</span>
      </div>
      <div style={{ background: '#0d1f1a', borderRadius: '4px', height: '7px', overflow: 'hidden' }}>
        <div style={{ height: '7px', borderRadius: '4px', background: color, width: filled ? `${value}%` : '0%', transition: 'width 1.2s cubic-bezier(0.22,1,0.36,1)', boxShadow: `0 0 8px ${color}66` }} />
      </div>
    </div>
  );
}

const scoreColor = (v: number) => v >= 75 ? '#10b981' : v >= 50 ? '#f59e0b' : '#ef4444';
const scoreBg   = (v: number) => v >= 75 ? 'rgba(16,185,129,0.15)' : v >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)';
const timeAgo   = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
};

// ── Page ─────────────────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasResume, setHasResume] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }

      const [{ data: profile }, { data: sessionData }] = await Promise.all([
        supabase.from('profiles').select('resume_url').eq('id', session.user.id).single(),
        supabase.from('interview_sessions').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(10),
      ]);

      setHasResume(!!profile?.resume_url);
      setSessions(sessionData ?? []);
      setLoading(false);
      setTimeout(() => setMounted(true), 50);
    })();
  }, [router]);

  const avg = (key: keyof Session) =>
    sessions.length ? Math.round(sessions.reduce((s, x) => s + (x[key] as number), 0) / sessions.length) : 0;

  const avgOverall  = avg('overall_score');
  const avgSpeech   = avg('speech_score');
  const avgEye      = avg('eye_contact_score');
  const avgPosture  = avg('posture_score');
  const bestScore   = sessions.length ? Math.max(...sessions.map(s => s.overall_score)) : 0;

  const cSessions = useCounter(sessions.length, 800,  200);
  const cBest     = useCounter(bestScore,       1000, 300);
  const cSpeech   = useCounter(avgSpeech,       1200, 400);
  const cPosture  = useCounter(avgPosture,      1200, 500);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
      <div style={{ width: '36px', height: '36px', border: '3px solid #1e293b', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 0.8s linear infinite', boxShadow: '0 0 16px rgba(16,185,129,0.4)' }} />
    </div>
  );

  const stats = [
    { label: 'Sessions',    value: cSessions, suffix: '' },
    { label: 'Best score',  value: cBest,     suffix: '%' },
    { label: 'Avg speech',  value: cSpeech,   suffix: '%' },
    { label: 'Avg posture', value: cPosture,  suffix: '%' },
  ];

  return (
    <div>
      {/* Header */}
      <div className={mounted ? 'anim-fade-up d-0' : ''} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', opacity: mounted ? undefined : 0 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.3px' }}>Dashboard</h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            {sessions.length > 0
              ? `${sessions.length} session${sessions.length > 1 ? 's' : ''} completed${sessions.length > 1 ? ` · up ${sessions[0].overall_score - sessions[sessions.length - 1].overall_score} pts since first interview` : ''}`
              : 'No sessions yet — upload a resume to get started'}
          </p>
        </div>
        <button onClick={() => router.push('/upload')} className="btn-glow"
          style={{ background: 'linear-gradient(135deg, #10b981, #059669)', backgroundSize: '200% 200%', color: 'white', border: 'none', borderRadius: '10px', padding: '9px 18px', fontSize: '13px', cursor: 'pointer', fontWeight: 700, boxShadow: '0 4px 16px rgba(16,185,129,0.35)' }}>
          + Start interview
        </button>
      </div>

      {!hasResume && (
        <div className={mounted ? 'anim-fade-up d-100' : ''} style={{ padding: '12px 16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '10px', marginBottom: '16px', fontSize: '13px', color: '#fbbf24', opacity: mounted ? undefined : 0 }}>
          No resume uploaded yet.{' '}
          <button onClick={() => router.push('/upload')} style={{ background: 'none', border: 'none', color: '#34d399', cursor: 'pointer', fontSize: '13px', padding: 0, fontWeight: 600 }}>Upload one to start →</button>
        </div>
      )}

      {sessions.length === 0 ? (
        /* Empty state */
        <div className={mounted ? 'anim-scale-in d-200' : ''} style={{ textAlign: 'center', padding: '4rem 2rem', background: '#0d1f1a', border: '1px solid #1a3a2e', borderRadius: '20px', opacity: mounted ? undefined : 0 }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'float 4s ease-in-out infinite' }}>🎯</div>
          <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>No interviews yet</h2>
          <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#64748b', lineHeight: 1.6 }}>Upload your resume and complete your first mock interview.<br/>Your scores and history will appear here.</p>
          <button onClick={() => router.push('/upload')} className="btn-glow"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', backgroundSize: '200% 200%', color: 'white', border: 'none', borderRadius: '12px', padding: '12px 28px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 6px 20px rgba(16,185,129,0.35)' }}>
            Start your first interview →
          </button>
        </div>
      ) : (
        <>
          {/* Ring + stats */}
          <div className={mounted ? 'anim-fade-up d-100' : ''} style={{ display: 'grid', gridTemplateColumns: '190px 1fr', gap: '14px', marginBottom: '14px', opacity: mounted ? undefined : 0 }}>
            <div className="card-hover" style={{ background: '#0d1f1a', border: '1px solid #1a3a2e', borderRadius: '16px', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <AnimRing score={avgOverall} color="#10b981" size={110} delay={200} />
              <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#64748b' }}>Across {sessions.length} session{sessions.length > 1 ? 's' : ''}</p>
              {sessions.length > 1 && (
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
                  ↑ {sessions[0].overall_score - sessions[sessions.length - 1].overall_score} pts since first
                </p>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '10px' }}>
              {stats.map(({ label, value, suffix }) => (
                <div key={label} className="card-hover" style={{ background: '#080f0d', border: '1px solid #1a3a2e', borderRadius: '12px', padding: '14px 16px' }}>
                  <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#64748b' }}>{label}</p>
                  <p style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#f8fafc', fontVariantNumeric: 'tabular-nums' }}>{value}{suffix}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Skills + Recent */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className={`card-hover ${mounted ? 'anim-fade-up d-300' : ''}`} style={{ background: '#0d1f1a', border: '1px solid #1a3a2e', borderRadius: '16px', padding: '1.25rem', opacity: mounted ? undefined : 0 }}>
              <p style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>Skill breakdown</p>
              <SkillBar label="Speech content" value={avgSpeech}  color="#10b981" delay={400} />
              <SkillBar label="Eye contact"    value={avgEye}     color="#f59e0b" delay={500} />
              <SkillBar label="Posture"        value={avgPosture} color="#10b981" delay={600} />
              {avgEye < 70 && (
                <div style={{ padding: '10px 12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', fontSize: '12px', color: '#fbbf24', marginTop: '4px' }}>
                  Focus: look at the camera lens, not your preview window.
                </div>
              )}
            </div>

            <div className={`card-hover ${mounted ? 'anim-fade-up d-400' : ''}`} style={{ background: '#0d1f1a', border: '1px solid #1a3a2e', borderRadius: '16px', padding: '1.25rem', opacity: mounted ? undefined : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>Recent sessions</p>
                <button onClick={() => router.push('/history')} style={{ fontSize: '12px', color: '#34d399', background: 'none', border: 'none', cursor: 'pointer' }}>View all</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {sessions.slice(0, 3).map((s, i) => (
                  <div key={s.id} className="card-hover" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#080f0d', borderRadius: '10px', border: '1px solid #1a3a2e', cursor: 'pointer', animation: mounted ? `fadeInUp 0.4s cubic-bezier(0.22,1,0.36,1) ${500 + i * 80}ms both` : 'none' }}>
                    <div>
                      <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>Interview #{sessions.length - i}</p>
                      <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>{timeAgo(s.created_at)}</p>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: scoreColor(s.overall_score), background: scoreBg(s.overall_score), padding: '4px 10px', borderRadius: '99px' }}>
                      {s.overall_score}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}