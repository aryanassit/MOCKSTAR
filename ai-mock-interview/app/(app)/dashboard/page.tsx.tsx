"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Session {
  id: number;
  role: string;
  date: string;
  overall: number;
  speech: number;
  eyeContact: number;
  posture: number;
  questions: number;
  duration: string;
}

// ─── Mock sessions — replace with real Supabase query once you have an
//     interview_sessions table (see TODO below)
const MOCK_SESSIONS: Session[] = [
  { id: 1, role: 'ML Engineer',        date: 'Today',       overall: 78, speech: 82, eyeContact: 71, posture: 78, questions: 5, duration: '14 min' },
  { id: 2, role: 'Full Stack Dev',     date: '7 days ago',  overall: 65, speech: 68, eyeContact: 58, posture: 66, questions: 5, duration: '12 min' },
  { id: 3, role: 'Data Scientist',     date: '14 days ago', overall: 63, speech: 67, eyeContact: 60, posture: 63, questions: 5, duration: '15 min' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
function ScoreRing({ score, size = 100, color = '#7F77DD', strokeWidth = 8 }: {
  score: number; size?: number; color?: string; strokeWidth?: number;
}) {
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const cx = size / 2;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Score: ${score}%`}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={strokeWidth} />
        <circle
          cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transformBox: 'fill-box', transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size / 5, fontWeight: 500, lineHeight: 1 }}>{score}%</span>
        <span style={{ fontSize: size / 10, color: '#9ca3af' }}>avg</span>
      </div>
    </div>
  );
}

function SkillBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
        <span style={{ fontSize: '12px', color: '#6b7280' }}>{label}</span>
        <span style={{ fontSize: '12px', fontWeight: 500 }}>{value}%</span>
      </div>
      <div style={{ background: 'rgba(0,0,0,0.07)', borderRadius: '3px', height: '6px' }}>
        <div style={{ width: `${value}%`, height: '6px', background: color, borderRadius: '3px', transition: 'width 0.7s ease' }} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'rgba(0,0,0,0.04)', borderRadius: '8px', padding: '12px 14px' }}>
      <p style={{ margin: '0 0 3px', fontSize: '11px', color: '#6b7280' }}>{label}</p>
      <p style={{ margin: 0, fontSize: '22px', fontWeight: 500 }}>{value}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter();
  const [sessions] = useState<Session[]>(MOCK_SESSIONS);
  const [hasResume, setHasResume] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }

      // TODO: fetch real sessions once you have an interview_sessions table:
      // const { data } = await supabase
      //   .from('interview_sessions')
      //   .select('*')
      //   .eq('user_id', session.user.id)
      //   .order('created_at', { ascending: false });
      // if (data) setSessions(data);

      const { data: profile } = await supabase
        .from('profiles')
        .select('resume_url')
        .eq('id', session.user.id)
        .single();

      setHasResume(!!profile?.resume_url);
      setLoading(false);
    })();
  }, [router]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid rgba(0,0,0,0.1)', borderTopColor: '#7F77DD', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const avgOverall   = Math.round(sessions.reduce((s, x) => s + x.overall,    0) / sessions.length);
  const avgSpeech    = Math.round(sessions.reduce((s, x) => s + x.speech,     0) / sessions.length);
  const avgEye       = Math.round(sessions.reduce((s, x) => s + x.eyeContact, 0) / sessions.length);
  const avgPosture   = Math.round(sessions.reduce((s, x) => s + x.posture,    0) / sessions.length);
  const bestScore    = Math.max(...sessions.map(s => s.overall));

  const scoreColor = (v: number) => v >= 75 ? '#639922' : v >= 50 ? '#BA7517' : '#E24B4A';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.3rem' }}>
        <div>
          <h1 style={{ margin: '0 0 2px', fontSize: '18px', fontWeight: 500 }}>Dashboard</h1>
          <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
            {sessions.length} session{sessions.length !== 1 ? 's' : ''} completed
            {sessions.length > 1 ? ` · up ${sessions[0].overall - sessions[sessions.length - 1].overall} pts since your first interview` : ''}
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          style={{ background: '#534AB7', color: 'white', border: 'none', borderRadius: '8px', padding: '7px 14px', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}
        >
          + Start interview
        </button>
      </div>

      {!hasResume && (
        <div style={{ padding: '11px 14px', background: '#FAEEDA', borderRadius: '8px', marginBottom: '14px', fontSize: '12px', color: '#854F0B' }}>
          No resume uploaded yet. <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: '#534AB7', cursor: 'pointer', fontSize: '12px', padding: 0, fontWeight: 500 }}>Upload one to start your first interview →</button>
        </div>
      )}

      {/* Score ring + stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '14px', marginBottom: '14px' }}>
        <div style={{ background: 'white', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <ScoreRing score={avgOverall} size={100} />
          <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#6b7280' }}>Across {sessions.length} sessions</p>
          {sessions.length > 1 && (
            <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#3B6D11' }}>
              ↑ {sessions[0].overall - sessions[sessions.length - 1].overall} pts from first session
            </p>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '10px' }}>
          <StatCard label="Sessions" value={String(sessions.length)} />
          <StatCard label="Best score" value={`${bestScore}%`} />
          <StatCard label="Avg speech" value={`${avgSpeech}%`} />
          <StatCard label="Avg posture" value={`${avgPosture}%`} />
        </div>
      </div>

      {/* Skill breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
        <div style={{ background: 'white', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: '12px', padding: '1rem 1.25rem' }}>
          <p style={{ margin: '0 0 13px', fontSize: '13px', fontWeight: 500 }}>Skill breakdown</p>
          <SkillBar label="Speech content"  value={avgSpeech}  color="#639922" />
          <SkillBar label="Eye contact"     value={avgEye}     color="#BA7517" />
          <SkillBar label="Posture"         value={avgPosture} color="#7F77DD" />
          {avgEye < 70 && (
            <div style={{ marginTop: '12px', padding: '9px 11px', background: '#FAEEDA', borderRadius: '8px', fontSize: '11px', color: '#854F0B' }}>
              Focus area: eye contact is your weakest skill. Look at the camera lens, not your preview window.
            </div>
          )}
        </div>

        {/* Recent sessions */}
        <div style={{ background: 'white', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: '12px', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '11px' }}>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 500 }}>Recent sessions</p>
            <button onClick={() => router.push('/history')} style={{ fontSize: '12px', color: '#534AB7', background: 'none', border: 'none', cursor: 'pointer' }}>View all</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sessions.slice(0, 3).map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 11px', background: 'rgba(0,0,0,0.03)', borderRadius: '8px' }}>
                <div>
                  <p style={{ margin: '0 0 1px', fontSize: '12px', fontWeight: 500 }}>{s.role}</p>
                  <p style={{ margin: 0, fontSize: '10px', color: '#9ca3af' }}>{s.date} · {s.questions} questions</p>
                </div>
                <span style={{ fontSize: '14px', fontWeight: 500, color: scoreColor(s.overall) }}>{s.overall}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
