"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

interface Question { text: string; score: number }
interface Session {
  id: string;
  overall_score: number;
  speech_score: number;
  eye_contact_score: number;
  posture_score: number;
  feedback: string;
  questions: Question[];
  created_at: string;
}

const scoreColor = (v: number) => v >= 75 ? '#10b981' : v >= 50 ? '#f59e0b' : '#ef4444';
const scoreBg   = (v: number) => v >= 75 ? 'rgba(16,185,129,0.15)' : v >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)';
const timeAgo   = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

type Filter = 'all' | 'strong' | 'mixed' | 'weak';

export default function History() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }
      const { data } = await supabase
        .from('interview_sessions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      setSessions(data ?? []);
      if (data?.[0]) setExpanded(data[0].id);
      setLoading(false);
    })();
  }, [router]);

  const visible = sessions.filter(s => {
    const mf =
      filter === 'all'    ? true :
      filter === 'strong' ? s.overall_score >= 75 :
      filter === 'mixed'  ? s.overall_score >= 50 && s.overall_score < 75 :
                            s.overall_score < 50;
    return mf;
  });

  const filters: { key: Filter; label: string }[] = [
    { key: 'all',    label: `All (${sessions.length})` },
    { key: 'strong', label: 'Strong ≥75%' },
    { key: 'mixed',  label: 'Mixed 50–74%' },
    { key: 'weak',   label: 'Needs work <50%' },
  ];

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
      <div style={{ width: '36px', height: '36px', border: '3px solid #0d1f1a', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  return (
    <div>
      <style>{`@keyframes fadein{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}`}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#f8fafc' }}>Interview history</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0d1f1a', border: '1px solid #1a3a2e', borderRadius: '10px', padding: '6px 12px' }}>
          <span style={{ fontSize: '13px', color: '#4b7a66' }}>⌕</span>
          <input type="text" placeholder="Search feedback..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', background: 'none', outline: 'none', fontSize: '12px', width: '140px', color: '#f8fafc' }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {filters.map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)} style={{
            fontSize: '12px', padding: '6px 12px', borderRadius: '99px', cursor: 'pointer', fontWeight: 500,
            background: filter === key ? 'linear-gradient(135deg, #10b981, #059669)' : '#0d1f1a',
            color: filter === key ? 'white' : '#94a3b8',
            border: filter === key ? 'none' : '1px solid #1a3a2e',
            transition: 'all 0.15s',
          }}>{label}</button>
        ))}
      </div>

      {sessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#0d1f1a', border: '1px solid #1a3a2e', borderRadius: '20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>No interviews yet</h2>
          <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#4b7a66' }}>Complete your first mock interview to see your history here.</p>
          <button onClick={() => router.push('/upload')} className="btn-glow"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', backgroundSize: '200% 200%', color: 'white', border: 'none', borderRadius: '12px', padding: '11px 24px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
            Start an interview →
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#4b7a66', fontSize: '14px' }}>No sessions match this filter.</div>
      ) : (
        visible.map((s, idx) => {
          const open = expanded === s.id;
          const sessionNum = sessions.length - sessions.findIndex(x => x.id === s.id);
          const questions: Question[] = Array.isArray(s.questions) ? s.questions : [];
          return (
            <div key={s.id} style={{ background: '#0d1f1a', border: '1px solid #1a3a2e', borderRadius: '16px', marginBottom: '12px', overflow: 'hidden', animation: `fadein 0.3s ease ${idx * 60}ms both` }}>
              <div onClick={() => setExpanded(open ? null : s.id)}
                style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: s.overall_score >= 75 ? 'rgba(16,185,129,0.2)' : '#080f0d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '18px' }}>
                  {s.overall_score >= 75 ? '★' : '◈'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>Interview #{sessionNum}</p>
                    {idx === 0 && <span style={{ fontSize: '10px', background: 'rgba(16,185,129,0.2)', color: '#10b981', padding: '2px 7px', borderRadius: '99px', fontWeight: 600 }}>Latest</span>}
                  </div>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#4b7a66' }}>{timeAgo(s.created_at)} · {questions.length} questions</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: scoreColor(s.overall_score) }}>{s.overall_score}%</div>
                    <div style={{ fontSize: '10px', color: '#4b7a66' }}>overall</div>
                  </div>
                  <span style={{ color: '#4b7a66', display: 'inline-block', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
                </div>
              </div>

              {open && (
                <div style={{ padding: '0 16px 16px', animation: 'fadein 0.2s ease' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                    {[{ label: 'Speech', value: s.speech_score }, { label: 'Eye contact', value: s.eye_contact_score }, { label: 'Posture', value: s.posture_score }].map(({ label, value }) => (
                      <div key={label} style={{ background: '#080f0d', border: '1px solid #1a3a2e', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: scoreColor(value) }}>{value}%</div>
                        <div style={{ fontSize: '11px', color: '#4b7a66' }}>{label}</div>
                      </div>
                    ))}
                  </div>

                  {questions.length > 0 && (
                    <>
                      <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 600, color: '#4b7a66', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Questions asked</p>
                      {questions.map((q, i) => (
                        <div key={i} style={{ padding: '10px 0', borderBottom: i < questions.length - 1 ? '1px solid #080f0d' : 'none', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <span style={{ fontSize: '11px', padding: '3px 7px', borderRadius: '99px', fontWeight: 600, background: scoreBg(q.score), color: scoreColor(q.score), flexShrink: 0, whiteSpace: 'nowrap' }}>{q.score}%</span>
                          <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1' }}>{q.text}</p>
                        </div>
                      ))}
                    </>
                  )}

                  {s.feedback && (
                    <div style={{ marginTop: '12px', padding: '10px 12px', background: '#080f0d', border: '1px solid #1a3a2e', borderRadius: '10px' }}>
                      <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}><strong style={{ color: '#f8fafc' }}>AI feedback:</strong> {s.feedback}</p>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button onClick={() => router.push('/upload')} className="btn-glow"
                      style={{ fontSize: '12px', background: 'linear-gradient(135deg, #10b981, #059669)', backgroundSize: '200% 200%', color: 'white', border: 'none', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', fontWeight: 600 }}>
                      Practice again
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}