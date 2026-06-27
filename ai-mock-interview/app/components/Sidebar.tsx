"use client";

import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function Sidebar() {
  const router = useRouter();
  const path = usePathname();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '▣' },
    { href: '/history',   label: 'History',   icon: '◷' },
    { href: '/profile',   label: 'Profile',   icon: '◉' },
  ];

  return (
    <aside style={{
      width: '210px', flexShrink: 0,
      background: '#1e293b',
      borderRight: '1px solid #334155',
      display: 'flex', flexDirection: 'column',
      padding: '1.1rem 0.75rem',
      minHeight: '100vh',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 6px 1.1rem' }}>
        <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: 'linear-gradient(135deg, #3b82f6, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ color: 'white', fontSize: '13px', fontWeight: 700 }}>M</span>
        </div>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>Mockstar</span>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {navItems.map(({ href, label, icon }) => {
          const active = path === href;
          return (
            <button key={href} onClick={() => router.push(href)} style={{
              display: 'flex', alignItems: 'center', gap: '9px',
              padding: '8px 10px', borderRadius: '8px', border: 'none',
              background: active ? 'rgba(59,130,246,0.2)' : 'none',
              color: active ? '#60a5fa' : '#94a3b8',
              fontWeight: active ? 600 : 400,
              fontSize: '13px', cursor: 'pointer', width: '100%', textAlign: 'left',
              transition: 'all 0.12s',
              borderLeft: active ? '2px solid #3b82f6' : '2px solid transparent',
            }}>
              <span>{icon}</span> {label}
            </button>
          );
        })}

        <div style={{ margin: '10px 0', borderTop: '1px solid #334155' }} />

        <button onClick={() => router.push('/upload')} style={{
          display: 'flex', alignItems: 'center', gap: '9px',
          padding: '8px 10px', borderRadius: '8px', border: 'none',
          background: 'linear-gradient(135deg, #3b82f6, #10b981)',
          color: 'white', fontSize: '13px', fontWeight: 600,
          cursor: 'pointer', width: '100%', textAlign: 'left',
        }}>
          <span>+</span> New interview
        </button>
      </nav>

      <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'white', flexShrink: 0 }}>AA</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: 500, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Aryan Assit</p>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', padding: 0, fontSize: '11px', color: '#64748b', cursor: 'pointer' }}>Sign out</button>
        </div>
      </div>
    </aside>
  );
}
