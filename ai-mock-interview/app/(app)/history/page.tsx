"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

interface Question { text: string; score: number }
interface Session {
  id: number; role: string; date: string;
  overall: number; speech: number; eyeContact: number; posture: number;
  duration: string; feedback: string; questions: Question[];
}

const MOCK: Session[] = [
  {
    id: 1, role: 'ML Engineer', date: 'Jun 19, 2025', overall: 78,
    speech: 82, eyeContact: 71, posture: 78, duration: '14 min',
    feedback: 'Strong technical depth on FinBERT-LSTM integration. Eye contact dropped during longer answers — practice camera lock during pauses.',
    questions: [
      { text: 'Detail the integration strategy between FinBERT and your LSTM model in NeuroTrade.', score: 85 },
      { text: 'How did you handle data flow discrepancies between sentiment and time-series outputs?', score: 79 },
      { text: 'Walk me through your hyperparameter tuning approach for the LSTM component.', score: 81 },
      { text: 'What evaluation metrics did you choose and why over alternatives like MAE?', score: 75 },
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
    feedback: 'First session — some nervousness expected. Good domain knowledge but answers lacked structure. Try the STAR method next time.',
    questions: [
      { text: 'Explain your approach to feature engineering for financial time-series data.', score: 65 },
      { text: 'How do you handle class imbalance in sentiment classification tasks?', score: 63 },
      { text: 'Describe your experience with model interpretability techniques.', score: 58 },
      { text: 'How would you set up an A/B test for a new trading signal?', score: 60 },
      { text: 'Walk me through a project where your initial model approach failed.', score: 70 },
    ],
  },
];

const scoreColor = (v: number) => v >= 75 ? '#10b981' : v >= 50 ? '#f59e0b' : '#ef4444';
const scoreBg   = (v: number) => v >= 75 ? 'rgba(16,185,129,0.15)' : v >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)';
const card = { background: '#1e293b', border: '1px solid #334155', borderRadius: '16px' };

type Filter = 'all' | 'strong' | 'mixed' | 'weak';

export default function History() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<number | null>(1);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.push('/');
    })();
  }, [router]);

  const visible = MOCK.filter(s => {
    const ms = s.role.toLowerCase().includes(search.toLowerCase());
    const mf = filter === 'all' ? true : filter === 'strong' ? s.overall >= 75 : filter === 'mixed' ? s.overall >= 50 && s.overall < 75 : s.overall < 50;
    return ms && mf;
  });

  const filters: { key: Filter; label: string }[] = [
    { key: 'all',    label: `All (${MOCK.length})` },
    { key: 'strong', label: 'Strong ≥75%' },
    { key: 'mixed',  label: 'Mixed 50–74%' },
    { key: 'weak',   label: 'Needs work <50%' },
  ];

  return (
    <div>
      <style>{`@keyframes fadein{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}`}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.3rem' }}>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#f8fafc' }}>Interview history</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '6px 12px' }}>
          <span style={{ fontSize: '13px', color: '#64748b' }}>⌕</span>
          <input type="text" placeholder="Search by role..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', background: 'none', outline: 'none', fontSize: '12px', width: '140px', color: '#f8fafc' }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {filters.map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)} style={{
            fontSize: '12px', padding: '6px 12px', borderRadius: '99px', cursor: 'pointer', fontWeight: 500,
            background: filter === key ? 'linear-gradient(135deg, #3b82f6, #10b981)' : '#1e293b',
            color: filter === key ? 'white' : '#94a3b8',
            border: filter === key ? 'none' : '1px solid #334155',
            transition: 'all 0.12s',
          }}>{label}</button>
        ))}
      </div>

      {visible.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', fontSize: '14px' }}>No sessions match this filter.</div>
      )}

      {visible.map(s => {
        const open = expanded === s.id;
        return (
          <div key={s.id} style={{ ...card, marginBottom: '12px', overflow: 'hidden' }}>
            <div onClick={() => setExpanded(open ? null : s.id)} style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: s.overall >= 75 ? 'rgba(59,130,246,0.2)' : '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '18px' }}>
                {s.overall >= 75 ? '★' : '◈'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>{s.role}</p>
                  {s.id === 1 && <span style={{ fontSize: '10px', background: 'rgba(16,185,129,0.2)', color: '#10b981', padding: '2px 7px', borderRadius: '99px', fontWeight: 600 }}>Recent</span>}
                </div>
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748b' }}>{s.date} · {s.questions.length} questions · {s.duration}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: scoreColor(s.overall) }}>{s.overall}%</div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>overall</div>
                </div>
                <span style={{ color: '#64748b', display: 'inline-block', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
              </div>
            </div>

            {open && (
              <div style={{ padding: '0 16px 16px', animation: 'fadein 0.15s ease' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                  {[{ label: 'Speech', value: s.speech }, { label: 'Eye contact', value: s.eyeContact }, { label: 'Posture', value: s.posture }].map(({ label, value }) => (
                    <div key={label} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: scoreColor(value) }}>{value}%</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{label}</div>
                    </div>
                  ))}
                </div>
                <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Questions asked</p>
                {s.questions.map((q, i) => (
                  <div key={i} style={{ padding: '10px 0', borderBottom: i < s.questions.length - 1 ? '1px solid #1e293b' : 'none', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ fontSize: '11px', padding: '3px 7px', borderRadius: '99px', fontWeight: 600, background: scoreBg(q.score), color: scoreColor(q.score), flexShrink: 0, whiteSpace: 'nowrap' }}>{q.score}%</span>
                    <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1' }}>{q.text}</p>
                  </div>
                ))}
                <div style={{ marginTop: '12px', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '10px' }}>
                  <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}><strong style={{ color: '#f8fafc' }}>AI feedback:</strong> {s.feedback}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button onClick={() => router.push('/upload')} style={{ fontSize: '12px', background: 'linear-gradient(135deg, #3b82f6, #10b981)', color: 'white', border: 'none', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', fontWeight: 600 }}>Practice again</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
