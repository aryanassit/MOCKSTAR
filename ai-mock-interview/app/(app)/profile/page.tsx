"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

const card = { background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '1.25rem' };

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div onClick={onToggle} role="switch" aria-checked={on} tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onToggle()}
      style={{ width: '36px', height: '20px', background: on ? '#3b82f6' : '#334155', borderRadius: '10px', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: '3px', [on ? 'right' : 'left']: '3px', width: '14px', height: '14px', background: 'white', borderRadius: '50%', transition: 'left 0.2s, right 0.2s' }} />
    </div>
  );
}

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

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }
      setEmail(session.user.email ?? '');
      const { data } = await supabase.from('profiles').select('resume_url, display_name').eq('id', session.user.id).single();
      const name = data?.display_name || session.user.email?.split('@')[0] || 'User';
      setDisplayName(name); setDraftName(name);
      if (data?.resume_url) {
        const parts = data.resume_url.split('/');
        setResumeName(decodeURIComponent(parts[parts.length - 1]));
      }
      setLoading(false);
    })();
  }, [router]);

  const saveName = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from('profiles').upsert({ id: session.user.id, display_name: draftName });
    setDisplayName(draftName); setEditingName(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete your account? This is permanent and cannot be undone.')) return;
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid #334155', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const initials = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <h1 style={{ margin: '0 0 1.3rem', fontSize: '22px', fontWeight: 700, color: '#f8fafc' }}>Profile</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Identity */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: 'white', flexShrink: 0 }}>{initials}</div>
              <div>
                {editingName ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input autoFocus value={draftName} onChange={e => setDraftName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                      style={{ border: 'none', borderBottom: '1.5px solid #3b82f6', background: 'none', fontSize: '15px', fontWeight: 600, outline: 'none', color: '#f8fafc', padding: '1px 3px', width: '140px' }} />
                    <button onClick={saveName} style={{ fontSize: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer' }}>Save</button>
                    <button onClick={() => setEditingName(false)} style={{ fontSize: '12px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>Cancel</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 600, color: '#f8fafc' }}>{displayName}</span>
                    <button onClick={() => { setEditingName(true); setDraftName(displayName); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '2px', fontSize: '13px' }} aria-label="Edit name">✎</button>
                  </div>
                )}
                <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748b' }}>{email}</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: '#334155', borderRadius: '10px', overflow: 'hidden' }}>
              {[{ label: 'Member since', value: 'Jun 2025' }, { label: 'Plan', value: 'Free' }, { label: 'Last active', value: 'Today' }, { label: 'Prep time', value: '41 min' }].map(({ label, value }) => (
                <div key={label} style={{ background: '#0f172a', padding: '10px 12px' }}>
                  <p style={{ margin: 0, fontSize: '10px', color: '#64748b' }}>{label}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Resume */}
          <div style={card}>
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
              <div style={{ textAlign: 'center', padding: '1.5rem', border: '1px dashed #334155', borderRadius: '10px' }}>
                <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#64748b' }}>No resume uploaded yet</p>
                <button onClick={() => router.push('/upload')} style={{ background: 'linear-gradient(135deg, #3b82f6, #10b981)', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>Upload resume</button>
              </div>
            )}
          </div>

          {/* Preferences */}
          <div style={card}>
            <p style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>Preferences</p>
            {[
              { label: 'Email reminders', sub: 'Remind me to practice every 2 days', on: reminders, toggle: () => setReminders(r => !r) },
              { label: 'Auto-save recordings', sub: 'Keep video clips after each session', on: autoSave, toggle: () => setAutoSave(s => !s) },
            ].map(({ label, sub, on, toggle }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#f8fafc' }}>{label}</p>
                  <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>{sub}</p>
                </div>
                <Toggle on={on} onToggle={toggle} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Stats */}
          <div style={card}>
            <p style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>Performance summary</p>
            {[
              { label: 'Average score',   value: 71, color: '#3b82f6' },
              { label: 'Avg speech',      value: 74, color: '#10b981' },
              { label: 'Avg eye contact', value: 64, color: '#f59e0b' },
              { label: 'Avg posture',     value: 71, color: '#3b82f6' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>{label}</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}>{value}%</span>
                </div>
                <div style={{ background: '#0f172a', borderRadius: '3px', height: '6px' }}>
                  <div style={{ width: `${value}%`, height: '6px', background: color, borderRadius: '3px' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Improvement areas */}
          <div style={card}>
            <p style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>Improvement areas</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px' }}>
                <span style={{ fontSize: '18px', flexShrink: 0 }}>👁</span>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#fbbf24' }}>Eye contact (64% avg)</p>
                  <p style={{ margin: 0, fontSize: '11px', color: '#92400e' }}>Focus on the camera lens, not your preview</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '10px' }}>
                <span style={{ fontSize: '18px', flexShrink: 0 }}>📋</span>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}>Answer structure</p>
                  <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>Use STAR method for behavioral questions</p>
                </div>
              </div>
            </div>
          </div>

          {/* Danger zone */}
          <div style={{ ...card, borderLeft: '3px solid #ef4444' }}>
            <p style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>Danger zone</p>
            <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#64748b' }}>Deleting your account removes all sessions, scores, and history permanently.</p>
            <button onClick={handleDelete} style={{ fontSize: '13px', background: 'none', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer' }}>
              Delete my account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
