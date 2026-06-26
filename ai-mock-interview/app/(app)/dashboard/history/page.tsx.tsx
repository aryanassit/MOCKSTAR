"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

interface Session {
  id: number;
  role: string;
  date: string;
  overall: number;
  speech: number;
  eyeContact: number;
  posture: number;
  duration: string;
  feedback: string;
  questions: { text: string; score: number }[];
}

const MOCK_SESSIONS: Session[] = [
  {
    id: 1, role: 'ML Engineer', date: 'Jun 19, 2025', overall: 78,
    speech: 82, eyeContact: 71, posture: 78, duration: '14 min',
    feedback: 'Strong technical depth on FinBERT-LSTM integration. Eye contact dropped during longer answers — practice camera lock during pauses.',
    questions: [
      { text: 'Detail the integration strategy between FinBERT and your LSTM model in NeuroTrade.', score: 85 },
      { text: 'How did you handle data flow discrepancies between sentiment scores and time-series outputs?', score: 79 },
      { text: 'Walk me through your hyperparameter tuning approach for the LSTM component.', score: 81 },
      { text: 'What evaluation metrics did you choose and why?', score: 75 },
      { text: 'How would you scale this to handle real-time market data at higher frequency?', score: 80 },
    ],
  },
  {
    id: 2, role: 'Full Stack Developer', date: 'Jun 12, 2025', overall: 65,
    speech: 68, eyeContact: 58, posture: 66, duration: '12 min',
    feedback: 'Answers were brief and missed depth on system design. Eye contact notably low — try closing the preview panel during recording.',
    questions: [
      { text: 'Describe your experience building REST APIs with FastAPI.', score: 70 },
      { text: 'How do you handle state management in complex React applications?', score: 68 },
      { text: 'Walk me through your database schema design for a trading platform.', score: 62 },
      { text: 'How would you approach load balancing for a high-traffic web service?', score: 60 },
      { text: 'Describe a challenging debugging session and how you resolved it.', score: 65 },
    ],
  },
  {
    id: 3, role: 'Data Scientist', date: 'Jun 5, 2025', overall: 63,
    speech: 67, eyeContact: 60, posture: 63, duration: '15 min',
    feedback: 'First session — some nervousness was expected. Good domain knowledge but answers lacked structure. Try the STAR method for behavioral questions.',
    questions: [
      { text: 'Explain your approach to feature engineering for financial time-series data.', score: 65 },
      { text: 'How do you handle class imbalance in sentiment classification tasks?', score: 63 },
      { text: 'Describe your experience with model interpretability techniques.', score: 58 },
      { text: 'How would you set up an A/B test for a new trading signal?', score: 60 },
      { text: 'Walk me through a project where your initial model approach failed.', score: 70 },
    ],
  },
];

function scoreColor(v: number) {
  return v >= 75 ? '#639922' : v >= 50 ? '#BA7517' : '#E24B4A';
}
function scoreBg(v: number) {
  return v >= 75 ? '#EAF3DE' : v >= 50 ? '#FAEEDA' : '#FCEBEB';
}

export default function History() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>(MOCK_SESSIONS);
  const [filter, setFilter] = useState<'all' | 'strong' | 'mixed' | 'weak'>('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<number | null>(1);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.push('/');
      // TODO: replace MOCK_SESSIONS with real query:
      // const { data } = await supabase.from('interview_sessions').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
      // if (data) setSessions(data);
    })();
  }, [router]);

  const visible = sessions.filter(s => {
    const matchSearch = s.role.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'all'    ? true :
      filter === 'strong' ? s.overall >= 75 :
      filter === 'mixed'  ? s.overall >= 50 && s.overall < 75 :
                            s.overall < 50;
    return matchSearch && matchFilter;
  });

  const filterBtns: { key: typeof filter; label: string }[] = [
    { key: 'all',    label: `All (${sessions.length})` },
    { key: 'strong', label: 'Strong ≥75%' },
    { key: 'mixed',  label: 'Mixed 50–74%' },
    { key: 'weak',   label: 'Needs work <50%' },
  ];

  return (
    <div>
      <style>{`@keyframes fadein{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}`}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 500 }}>Interview history</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'white', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '8px', padding: '5px 10px' }}>
          <span style={{ fontSize: '13px', color: '#9ca3af' }}>⌕</span>
          <input
            type="text"
            placeholder="Search by role..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', background: 'none', outline: 'none', fontSize: '12px', width: '140px', color: 'inherit' }}
            aria-label="Search sessions"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
        {filterBtns.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              fontSize: '12px', padding: '5px 11px', borderRadius: '99px', cursor: 'pointer', fontWeight: 500,
              background: filter === key ? '#EEEDFE' : 'rgba(0,0,0,0.04)',
              color: filter === key ? '#534AB7' : '#6b7280',
              border: filter === key ? 'none' : '0.5px solid rgba(0,0,0,0.1)',
              transition: 'all 0.12s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Session cards */}
      {visible.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af', fontSize: '13px' }}>
          No sessions match this filter.
        </div>
      )}

      {visible.map(s => {
        const open = expanded === s.id;
        return (
          <div key={s.id} style={{ background: 'white', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: '12px', marginBottom: '10px', overflow: 'hidden' }}>
            {/* Header */}
            <div
              onClick={() => setExpanded(open ? null : s.id)}
              style={{ padding: '13px 15px', display: 'flex', alignItems: 'center', gap: '11px', cursor: 'pointer', transition: 'background 0.12s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.02)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: s.overall >= 75 ? '#EEEDFE' : 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '16px' }}>
                {s.overall >= 75 ? '★' : '◈'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 500 }}>{s.role}</p>
                  {s.id === 1 && <span style={{ fontSize: '10px', background: '#EAF3DE', color: '#3B6D11', padding: '2px 6px', borderRadius: '99px', fontWeight: 500 }}>Recent</span>}
                </div>
                <p style={{ margin: '1px 0 0', fontSize: '11px', color: '#9ca3af' }}>{s.date} · {s.questions.length} questions · {s.duration}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: 500, color: scoreColor(s.overall) }}>{s.overall}%</div>
                  <div style={{ fontSize: '10px', color: '#9ca3af' }}>overall</div>
                </div>
                <span style={{ fontSize: '14px', color: '#9ca3af', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▾</span>
              </div>
            </div>

            {/* Expanded body */}
            {open && (
              <div style={{ padding: '0 15px 14px', animation: 'fadein 0.15s ease' }}>
                {/* Score breakdown */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                  {[{ label: 'Speech', value: s.speech }, { label: 'Eye contact', value: s.eyeContact }, { label: 'Posture', value: s.posture }].map(({ label, value }) => (
                    <div key={label} style={{ background: 'rgba(0,0,0,0.03)', borderRadius: '8px', padding: '9px', textAlign: 'center' }}>
                      <div style={{ fontSize: '15px', fontWeight: 500, color: scoreColor(value) }}>{value}%</div>
                      <div style={{ fontSize: '10px', color: '#9ca3af' }}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* Questions */}
                <p style={{ margin: '0 0 7px', fontSize: '11px', fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Questions asked</p>
                {s.questions.map((q, i) => (
                  <div key={i} style={{ padding: '9px 0', borderBottom: i < s.questions.length - 1 ? '0.5px solid rgba(0,0,0,0.08)' : 'none', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '99px', fontWeight: 500, background: scoreBg(q.score), color: scoreColor(q.score), flexShrink: 0, whiteSpace: 'nowrap' }}>{q.score}%</span>
                    <p style={{ margin: 0, fontSize: '12px' }}>{q.text}</p>
                  </div>
                ))}

                {/* Feedback */}
                <div style={{ marginTop: '11px', padding: '9px 11px', background: 'rgba(0,0,0,0.03)', borderRadius: '8px' }}>
                  <p style={{ margin: 0, fontSize: '11px', color: '#6b7280' }}><strong>AI feedback:</strong> {s.feedback}</p>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '7px', marginTop: '10px' }}>
                  <button onClick={() => router.push('/results')} style={{ fontSize: '12px', background: '#EEEDFE', color: '#534AB7', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer' }}>Full results</button>
                  <button onClick={() => router.push('/dashboard')} style={{ fontSize: '12px', background: 'rgba(0,0,0,0.04)', color: '#6b7280', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer' }}>Practice again ↗</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
