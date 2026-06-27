"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

interface Session {
  id: number; role: string; date: string;
  overall: number; speech: number; eyeContact: number; posture: number;
}

const MOCK: Session[] = [
  { id: 1, role: 'ML Engineer',      date: 'Today',       overall: 78, speech: 82, eyeContact: 71, posture: 78 },
  { id: 2, role: 'Full Stack Dev',   date: '7 days ago',  overall: 65, speech: 68, eyeContact: 58, posture: 66 },
  { id: 3, role: 'Data Scientist',   date: '14 days ago', overall: 63, speech: 67, eyeContact: 60, posture: 63 },
];

function Ring({ score, color, size = 100, stroke = 8 }: { score: number; color: string; size?: number; stroke?: number }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#334155" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 100)}
          strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transformBox: 'fill-box', transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size / 5, fontWeight: 700, color: '#f8fafc', lineHeight: 1 }}>{score}%</span>
        <span style={{ fontSize: size / 10, color: '#64748b' }}>avg</span>
      </div>
    </div>
  );
}

const scoreColor = (v: number) => v >= 75 ? '#10b981' : v >= 50 ? '#f59e0b' : '#ef4444';
const scoreBg   = (v: number) => v >= 75 ? 'rgba(16,185,129,0.15)' : v >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)';

const card = { background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '1.25rem' };

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasResume, setHasResume] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }
      const { data } = await supabase.from('profiles').select('resume_url').eq('id', session.user.id).single();
      setHasResume(!!data?.resume_url);
      setLoading(false);
    })();
  }, [router]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid #334155', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const avg = (key: keyof Session) => Math.round(MOCK.reduce((s, x) => s + (x[key] as number), 0) / MOCK.length);
  const avgOverall = avg('overall'), avgSpeech = avg('speech'), avgEye = avg('eyeContact'), avgPosture = avg('posture');

  return (
    <div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 700, color: '#f8fafc' }}>Dashboard</h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{MOCK.length} sessions completed · improving each time</p>
        </div>
        <button onClick={() => router.push('/upload')} style={{ background: 'linear-gradient(135deg, #3b82f6, #10b981)', color: 'white', border: 'none', borderRadius: '10px', padding: '9px 18px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>
          + Start interview
        </button>
      </div>

      {!hasResume && (
        <div style={{ padding: '12px 16px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '10px', marginBottom: '16px', fontSize: '13px', color: '#fbbf24' }}>
          No resume uploaded yet.{' '}
          <button onClick={() => router.push('/upload')} style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: '13px', padding: 0, fontWeight: 600 }}>Upload one to start →</button>
        </div>
      )}

      {/* Top row: ring + stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '190px 1fr', gap: '16px', marginBottom: '16px' }}>
        <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '1.5rem 1rem' }}>
          <Ring score={avgOverall} color="#3b82f6" size={110} />
          <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#64748b' }}>Across {MOCK.length} sessions</p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#10b981' }}>↑ {MOCK[0].overall - MOCK[MOCK.length-1].overall} pts since first session</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '12px' }}>
          {[
            { label: 'Sessions completed', value: String(MOCK.length) },
            { label: 'Best score', value: `${Math.max(...MOCK.map(s => s.overall))}%` },
            { label: 'Avg speech', value: `${avgSpeech}%` },
            { label: 'Avg posture', value: `${avgPosture}%` },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '14px 16px' }}>
              <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#64748b' }}>{label}</p>
              <p style={{ margin: 0, fontSize: '26px', fontWeight: 700, color: '#f8fafc' }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom row: skills + recent */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={card}>
          <p style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>Skill breakdown</p>
          {[
            { label: 'Speech content', value: avgSpeech,  color: '#10b981' },
            { label: 'Eye contact',    value: avgEye,     color: '#f59e0b' },
            { label: 'Posture',        value: avgPosture, color: '#3b82f6' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>{label}</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}>{value}%</span>
              </div>
              <div style={{ background: '#0f172a', borderRadius: '3px', height: '6px' }}>
                <div style={{ width: `${value}%`, height: '6px', background: color, borderRadius: '3px', transition: 'width 0.7s ease' }} />
              </div>
            </div>
          ))}
          {avgEye < 70 && (
            <div style={{ padding: '10px 12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', fontSize: '12px', color: '#fbbf24' }}>
              Focus area: look at the camera lens, not your preview window.
            </div>
          )}
        </div>

        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>Recent sessions</p>
            <button onClick={() => router.push('/history')} style={{ fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer' }}>View all</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {MOCK.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#0f172a', borderRadius: '10px', border: '1px solid #334155' }}>
                <div>
                  <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>{s.role}</p>
                  <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>{s.date}</p>
                </div>
                <span style={{ fontSize: '15px', fontWeight: 700, color: scoreColor(s.overall), background: scoreBg(s.overall), padding: '4px 10px', borderRadius: '99px' }}>{s.overall}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
