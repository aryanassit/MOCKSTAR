"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div onClick={onToggle} role="switch" aria-checked={on} tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onToggle()}
      style={{ width: '36px', height: '20px', background: on ? '#10b981' : '#1a3a2e', borderRadius: '10px', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: '3px', [on ? 'right' : 'left']: '3px', width: '14px', height: '14px', background: 'white', borderRadius: '50%', transition: 'left 0.2s, right 0.2s' }} />
    </div>
  );
}

const card = { background: '#0d1f1a', border: '1px solid #1a3a2e', borderRadius: '16px', padding: '1.25rem' };
const scoreColor = (v: number) => v >= 75 ? '#10b981' : v >= 50 ? '#f59e0b' : '#ef4444';

export default function Profile() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [resumeName, setResumeName] = useState<string | null>(null);
  const [reminders, setReminders] = useState(true);
  const [autoSave, setAutoSave] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');

  // Real stats from interview_sessions
  const [sessionCount, setSessionCount] = useState(0);
  const [avgScores, setAvgScores] = useState({ overall: 0, speech: 0, eye: 0, posture: 0 });
  const [memberSince, setMemberSince] = useState('');
  const [weakArea, setWeakArea] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }

      setEmail(session.user.email ?? '');
      setUserId(session.user.id);

      // Member since from user created_at
      const created = new Date(session.user.created_at);
      setMemberSince(created.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));

      const [{ data: profile }, { data: sessions }] = await Promise.all([
        supabase.from('profiles').select('resume_url, display_name').eq('id', session.user.id).single(),
        supabase.from('interview_sessions').select('*').eq('user_id', session.user.id),
      ]);

      const name = profile?.display_name || session.user.email?.split('@')[0] || 'User';
      setDisplayName(name);
      setDraftName(name);

      if (profile?.resume_url) {
        const parts = profile.resume_url.split('/');
        setResumeName(decodeURIComponent(parts[parts.length - 1]));
      }

      if (sessions && sessions.length > 0) {
        const avg = (key: string) => Math.round(sessions.reduce((s: number, x: any) => s + x[key], 0) / sessions.length);
        const avgSpeech = avg('speech_score');
        const avgEye    = avg('eye_contact_score');
        const avgPosture= avg('posture_score');
        const avgAll    = avg('overall_score');
        setSessionCount(sessions.length);
        setAvgScores({ overall: avgAll, speech: avgSpeech, eye: avgEye, posture: avgPosture });

        // Find weakest skill
        const skills = [
          { name: 'Eye contact', val: avgEye },
          { name: 'Posture',     val: avgPosture },
          { name: 'Speech',      val: avgSpeech },
        ];
        setWeakArea(skills.sort((a, b) => a.val - b.val)[0].name);
      }

      setLoading(false);
    })();
  }, [router]);

  const saveName = async () => {
    await supabase.from('profiles').upsert({ id: userId, display_name: draftName });
    setDisplayName(draftName);
    setEditingName(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete your account? This is permanent and cannot be undone.')) return;
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
      <div style={{ width: '36px', height: '36px', border: '3px solid #0d1f1a', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  const initials = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';

  const skillBars = [
    { label: 'Average score',    value: avgScores.overall, color: '#10b981' },
    { label: 'Avg speech',       value: avgScores.speech,  color: '#10b981' },
    { label: 'Avg eye contact',  value: avgScores.eye,     color: '#f59e0b' },
    { label: 'Avg posture',      value: avgScores.posture, color: '#10b981' },
  ];

  return (
    <div>
      <h1 style={{ margin: '0 0 1.3rem', fontSize: '22px', fontWeight: 700, color: '#f8fafc' }}>Profile</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Identity */}
          <div style={card} className="card-hover">
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', backgroundSize: '200% 200%', animation: 'gradientShift 5s ease infinite', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: 'white', flexShrink: 0, boxShadow: '0 4px 14px rgba(16,185,129,0.3)' }}>{initials}</div>
              <div>
                {editingName ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input autoFocus value={draftName} onChange={e => setDraftName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                      style={{ border: 'none', borderBottom: '1.5px solid #10b981', background: 'none', fontSize: '15px', fontWeight: 600, outline: 'none', color: '#f8fafc', padding: '1px 3px', width: '140px' }} />
                    <button onClick={saveName} style={{ fontSize: '12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer' }}>Save</button>
                    <button onClick={() => setEditingName(false)} style={{ fontSize: '12px', background: 'none', border: 'none', color: '#4b7a66', cursor: 'pointer' }}>✕</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 600, color: '#f8fafc' }}>{displayName}</span>
                    <button onClick={() => { setEditingName(true); setDraftName(displayName); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b7a66', padding: '2px', fontSize: '13px', transition: 'color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#34d399')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#4b7a66')}>✎</button>
                  </div>
                )}
                <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#4b7a66' }}>{email}</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: '#1a3a2e', borderRadius: '10px', overflow: 'hidden' }}>
              {[
                { label: 'Member since',  value: memberSince || '—' },
                { label: 'Plan',          value: 'Free' },
                { label: 'Interviews',    value: String(sessionCount) },
                { label: 'Best skill',    value: sessionCount > 0 ? (avgScores.speech >= avgScores.eye && avgScores.speech >= avgScores.posture ? 'Speech' : avgScores.posture >= avgScores.eye ? 'Posture' : 'Eye contact') : '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: '#080f0d', padding: '10px 12px' }}>
                  <p style={{ margin: 0, fontSize: '10px', color: '#4b7a66' }}>{label}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Resume */}
          <div style={card} className="card-hover">
            <p style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>Resume on file</p>
            {resumeName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '10px' }}>
                <span style={{ fontSize: '18px', flexShrink: 0 }}>📄</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#10b981', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{resumeName}</p>
                </div>
                <button onClick={() => router.push('/upload')} style={{ fontSize: '11px', background: 'none', border: '1px solid #10b981', borderRadius: '6px', padding: '3px 8px', color: '#10b981', cursor: 'pointer' }}>Update</button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1.5rem', border: '1px dashed #1a3a2e', borderRadius: '10px' }}>
                <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#4b7a66' }}>No resume uploaded yet</p>
                <button onClick={() => router.push('/upload')} className="btn-glow" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', backgroundSize: '200% 200%', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>Upload resume</button>
              </div>
            )}
          </div>

          {/* Preferences */}
          <div style={card}>
            <p style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>Preferences</p>
            {[
              { label: 'Email reminders',     sub: 'Remind me to practice every 2 days', on: reminders, toggle: () => setReminders(r => !r) },
              { label: 'Auto-save recordings', sub: 'Keep video clips after each session', on: autoSave,   toggle: () => setAutoSave(s => !s) },
            ].map(({ label, sub, on, toggle }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#f8fafc' }}>{label}</p>
                  <p style={{ margin: 0, fontSize: '11px', color: '#4b7a66' }}>{sub}</p>
                </div>
                <Toggle on={on} onToggle={toggle} />
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Performance */}
          <div style={card} className="card-hover">
            <p style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>Performance summary</p>
            {sessionCount === 0 ? (
              <p style={{ fontSize: '13px', color: '#4b7a66', textAlign: 'center', padding: '1rem 0' }}>Complete an interview to see your stats here.</p>
            ) : (
              skillBars.map(({ label, value, color }) => (
                <div key={label} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>{label}</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: scoreColor(value) }}>{value}%</span>
                  </div>
                  <div style={{ background: '#080f0d', borderRadius: '3px', height: '6px' }}>
                    <div style={{ width: `${value}%`, height: '6px', background: color, borderRadius: '3px', transition: 'width 1s ease', boxShadow: `0 0 6px ${color}55` }} />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Improvement areas */}
          <div style={card}>
            <p style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>Improvement areas</p>
            {sessionCount === 0 ? (
              <p style={{ fontSize: '13px', color: '#4b7a66' }}>No data yet — complete an interview first.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px' }}>
                  <span style={{ fontSize: '18px', flexShrink: 0 }}>👁</span>
                  <div>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#fbbf24' }}>
                      {weakArea} ({weakArea === 'Eye contact' ? avgScores.eye : weakArea === 'Posture' ? avgScores.posture : avgScores.speech}% avg)
                    </p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#92400e' }}>
                      {weakArea === 'Eye contact' ? 'Focus on the camera lens, not your preview' :
                       weakArea === 'Posture'     ? 'Sit upright and face the camera directly' :
                                                   'Structure answers using the STAR method'}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#080f0d', border: '1px solid #1a3a2e', borderRadius: '10px' }}>
                  <span style={{ fontSize: '18px', flexShrink: 0 }}>📋</span>
                  <div>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}>Answer structure</p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#4b7a66' }}>Use STAR method for behavioral questions</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Danger zone */}
          <div style={{ ...card, borderLeft: '3px solid #ef4444' }}>
            <p style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>Danger zone</p>
            <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#4b7a66' }}>Deleting your account removes all sessions, scores, and history permanently.</p>
            <button onClick={handleDelete} style={{ fontSize: '13px', background: 'none', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
              Delete my account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}