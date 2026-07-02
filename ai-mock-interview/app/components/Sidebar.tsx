"use client";

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function Sidebar() {
  const router = useRouter();
  const path = usePathname();
  const [mounted, setMounted] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [initials, setInitials] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const email = session.user.email ?? '';
      setUserEmail(email);

      // Try to get display_name from profiles table first
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', session.user.id)
        .single();

      const name = profile?.display_name || email.split('@')[0] || 'User';
      setDisplayName(name);

      // Build initials from name
      const parts = name.trim().split(' ');
      const ini = parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase();
      setInitials(ini);

      setMounted(true);
    })();
  }, []);

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
      background: '#080f0d',
      borderRight: '1px solid #1a3a2e',
      display: 'flex', flexDirection: 'column',
      padding: '1.1rem 0.75rem',
      minHeight: '100vh',
    }}>

      {/* Logo */}
      <div className={mounted ? 'anim-fade-left d-0' : ''} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 6px 1.25rem', opacity: mounted ? undefined : 0 }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
          background: 'linear-gradient(135deg, #10b981, #059669)',
          backgroundSize: '200% 200%',
          animation: 'gradientShift 4s ease infinite',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, color: 'white', fontSize: '14px',
          boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
        }}>M</div>
        <span style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.2px' }}>Mockstar</span>
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {navItems.map(({ href, label, icon }, i) => {
          const active = path === href;
          const hovered = hoveredItem === href;
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              onMouseEnter={() => setHoveredItem(href)}
              onMouseLeave={() => setHoveredItem(null)}
              className={`nav-btn ${mounted ? `anim-fade-left d-${(i + 1) * 100}` : ''}`}
              style={{
                display: 'flex', alignItems: 'center', gap: '9px',
                padding: '8px 10px', borderRadius: '9px', border: 'none',
                background: active ? 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.1))' : hovered ? 'rgba(255,255,255,0.04)' : 'none',
                color: active ? '#60a5fa' : hovered ? '#cbd5e1' : '#64748b',
                fontWeight: active ? 600 : 400,
                fontSize: '13px', cursor: 'pointer', width: '100%', textAlign: 'left',
                borderLeft: active ? '2px solid #10b981' : '2px solid transparent',
                boxShadow: active ? '0 0 12px rgba(16,185,129,0.12)' : 'none',
                opacity: mounted ? undefined : 0,
              }}
            >
              <span style={{ fontSize: '14px', transition: 'transform 0.2s ease', transform: (active || hovered) ? 'scale(1.15)' : 'scale(1)' }}>{icon}</span>
              {label}
              {active && <span style={{ marginLeft: 'auto', width: '5px', height: '5px', borderRadius: '50%', background: '#10b981', animation: 'pulse-glow 2s ease infinite' }} />}
            </button>
          );
        })}

        <div style={{ margin: '12px 0', borderTop: '1px solid #1a3a2e' }} />

        <button
          onClick={() => router.push('/upload')}
          className={`btn-glow ${mounted ? 'anim-fade-left d-400' : ''}`}
          style={{
            display: 'flex', alignItems: 'center', gap: '9px',
            padding: '9px 10px', borderRadius: '9px', border: 'none',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            backgroundSize: '200% 200%',
            color: 'white', fontSize: '13px', fontWeight: 700,
            cursor: 'pointer', width: '100%', textAlign: 'left',
            boxShadow: '0 4px 15px rgba(16,185,129,0.3)',
            opacity: mounted ? undefined : 0,
          }}
        >
          <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span> New interview
        </button>
      </nav>

      {/* User row — real data from Supabase */}
      <div className={mounted ? 'anim-fade-up d-500' : ''} style={{
        marginTop: 'auto', paddingTop: '1rem',
        borderTop: '1px solid #1a3a2e',
        display: 'flex', alignItems: 'center', gap: '8px',
        opacity: mounted ? undefined : 0,
      }}>
        <div style={{
          width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #10b981, #059669)',
          backgroundSize: '200% 200%',
          animation: 'gradientShift 5s ease infinite',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', fontWeight: 700, color: 'white',
          boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
        }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</p>
          <button
            onClick={handleLogout}
            style={{ background: 'none', border: 'none', padding: 0, fontSize: '11px', color: '#475569', cursor: 'pointer', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
            onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
          >Sign out</button>
        </div>
      </div>
    </aside>
  );
}