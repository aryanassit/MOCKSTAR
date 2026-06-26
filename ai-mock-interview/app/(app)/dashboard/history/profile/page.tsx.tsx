"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

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

      const { data: profile } = await supabase
        .from('profiles')
        .select('resume_url, display_name')
        .eq('id', session.user.id)
        .single();

      const name = profile?.display_name || session.user.email?.split('@')[0] || 'User';
      setDisplayName(name);
      setDraftName(name);

      if (profile?.resume_url) {
        const parts = profile.resume_url.split('/');
        setResumeName(decodeURIComponent(parts[parts.length - 1]));
      }

      setLoading(false);
    })();
  }, [router]);

  const saveName = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from('profiles').upsert({ id: session.user.id, display_name: draftName });
    setDisplayName(draftName);
    setEditingName(false);
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Delete your account? This removes all your sessions and history permanently and cannot be undone.')) return;
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid rgba(0,0,0,0.1)', borderTopColor: '#7F77DD', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const initials = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
    <div
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onToggle()}
      style={{ width: '34px', height: '19px', background: on ? '#7F77DD' : 'rgba(0,0,0,0.1)', borderRadius: '10px', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
    >
      <div style={{ position: 'absolute', top: '3px', [on ? 'right' : 'left']: '3px', width: '13px', height: '13px', background: 'white', borderRadius: '50%', transition: 'left 0.2s, right 0.2s' }} />
    </div>
  );

  return (
    <div>
      <h1 style={{ margin: '0 0 1.2rem', fontSize: '18px', fontWeight: 500 }}>Profile</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Identity card */}
          <div style={{ background: 'white', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: '12px', padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 500, color: '#534AB7', flexShrink: 0 }}>
                {initials}
              </div>
              <div style={{ flex: 1 }}>
                {editingName ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      autoFocus
                      value={draftName}
                      onChange={e => setDraftName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                      style={{ border: 'none', borderBottom: '1.5px solid #534AB7', background: 'none', fontSize: '15px', fontWeight: 500, outline: 'none', padding: '1px 3px', width: '140px' }}
                    />
                    <button onClick={saveName} style={{ fontSize: '12px', background: '#534AB7', color: 'white', border: 'none', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer' }}>Save</button>
                    <button onClick={() => setEditingName(false)} style={{ fontSize: '12px', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>Cancel</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 500 }}>{displayName}</span>
                    <button onClick={() => { setEditingName(true); setDraftName(displayName); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '2px' }} aria-label="Edit name">✎</button>
                  </div>
                )}
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>{email}</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'rgba(0,0,0,0.08)', borderRadius: '8px', overflow: 'hidden' }}>
              {[
                { label: 'Member since', value: 'Jun 2025' },
                { label: 'Plan',         value: 'Free' },
                { label: 'Last active',  value: 'Today' },
                { label: 'Prep time',    value: '41 min' },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'rgba(0,0,0,0.03)', padding: '9px 11px' }}>
                  <p style={{ margin: 0, fontSize: '10px', color: '#9ca3af' }}>{label}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', fontWeight: 500 }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Resume card */}
          <div style={{ background: 'white', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: '12px', padding: '1rem 1.25rem' }}>
            <p style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 500 }}>Resume on file</p>
            {resumeName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 11px', background: '#EAF3DE', borderRadius: '8px' }}>
                <span style={{ fontSize: '16px', color: '#3B6D11', flexShrink: 0 }}>📄</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: 500, color: '#27500A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{resumeName}</p>
                </div>
                <button onClick={() => router.push('/dashboard')} style={{ fontSize: '11px', background: 'none', border: '0.5px solid #3B6D11', borderRadius: '6px', padding: '3px 8px', color: '#3B6D11', cursor: 'pointer', whiteSpace: 'nowrap' }}>Update</button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1rem', border: '1px dashed rgba(0,0,0,0.15)', borderRadius: '8px' }}>
                <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#6b7280' }}>No resume uploaded yet</p>
                <button onClick={() => router.push('/dashboard')} style={{ fontSize: '12px', background: '#534AB7', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer' }}>Upload resume</button>
              </div>
            )}
          </div>

          {/* Preferences */}
          <div style={{ background: 'white', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: '12px', padding: '1rem 1.25rem' }}>
            <p style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 500 }}>Preferences</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <p style={{ margin: 0, fontSize: '12px' }}>Email reminders</p>
                <p style={{ margin: 0, fontSize: '10px', color: '#9ca3af' }}>Remind me to practice every 2 days</p>
              </div>
              <Toggle on={reminders} onToggle={() => setReminders(r => !r)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontSize: '12px' }}>Auto-save recordings</p>
                <p style={{ margin: 0, fontSize: '10px', color: '#9ca3af' }}>Keep video clips after each session</p>
              </div>
              <Toggle on={autoSave} onToggle={() => setAutoSave(s => !s)} />
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Performance summary */}
          <div style={{ background: 'white', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: '12px', padding: '1rem 1.25rem' }}>
            <p style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 500 }}>Performance summary</p>
            {[
              { label: 'Average score',    value: 71, color: '#7F77DD' },
              { label: 'Avg speech',       value: 74, color: '#639922' },
              { label: 'Avg eye contact',  value: 64, color: '#BA7517' },
              { label: 'Avg posture',      value: 71, color: '#7F77DD' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ marginBottom: '11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>{label}</span>
                  <span style={{ fontSize: '12px', fontWeight: 500 }}>{value}%</span>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.06)', borderRadius: '3px', height: '5px' }}>
                  <div style={{ width: `${value}%`, height: '5px', background: color, borderRadius: '3px' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Improvement areas */}
          <div style={{ background: 'white', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: '12px', padding: '1rem 1.25rem' }}>
            <p style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 500 }}>Improvement areas</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: '#FAEEDA', borderRadius: '8px' }}>
                <span style={{ fontSize: '14px', flexShrink: 0 }}>👁</span>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: 500, color: '#854F0B' }}>Eye contact (64% avg)</p>
                  <p style={{ margin: 0, fontSize: '11px', color: '#854F0B' }}>Focus on the camera lens, not your preview</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'rgba(0,0,0,0.03)', borderRadius: '8px' }}>
                <span style={{ fontSize: '14px', flexShrink: 0 }}>📋</span>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: 500 }}>Answer structure</p>
                  <p style={{ margin: 0, fontSize: '11px', color: '#6b7280' }}>Use STAR method for behavioral questions</p>
                </div>
              </div>
            </div>
          </div>

          {/* Danger zone */}
          <div style={{ background: 'white', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: '12px', padding: '1rem 1.25rem', borderLeft: '3px solid #E24B4A' }}>
            <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 500 }}>Danger zone</p>
            <p style={{ margin: '0 0 10px', fontSize: '11px', color: '#6b7280' }}>Deleting your account removes all sessions, scores, and history permanently.</p>
            <button
              onClick={handleDeleteAccount}
              style={{ fontSize: '12px', background: 'none', border: '0.5px solid #E24B4A', color: '#E24B4A', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer' }}
            >
              Delete my account
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
