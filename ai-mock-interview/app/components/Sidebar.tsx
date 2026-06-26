"use client";

import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

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
      background: '#ffffff', borderRight: '0.5px solid rgba(0,0,0,0.1)',
      display: 'flex', flexDirection: 'column', padding: '1.1rem 0.75rem',
      minHeight: '100vh',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 6px 1.1rem' }}>
        <div style={{
          width: '26px', height: '26px', borderRadius: '6px',
          background: '#7F77DD', display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0,
        }}>
          <span style={{ color: 'white', fontSize: '13px' }}>M</span>
        </div>
        <span style={{ fontSize: '14px', fontWeight: 500 }}>Mockstar</span>
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {navItems.map(({ href, label, icon }) => {
          const active = path === href;
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              style={{
                display: 'flex', alignItems: 'center', gap: '9px',
                padding: '7px 10px', borderRadius: '8px', border: 'none',
                background: active ? '#EEEDFE' : 'none',
                color: active ? '#534AB7' : '#6b7280',
                fontWeight: active ? 500 : 400,
                fontSize: '13px', cursor: 'pointer', width: '100%',
                textAlign: 'left', transition: 'background 0.12s, color 0.12s',
              }}
            >
              <span>{icon}</span> {label}
            </button>
          );
        })}

        <div style={{ margin: '10px 0', borderTop: '0.5px solid rgba(0,0,0,0.08)' }} />

        <button
          onClick={() => router.push('/upload')}
          style={{
            display: 'flex', alignItems: 'center', gap: '9px',
            padding: '7px 10px', borderRadius: '8px', border: 'none',
            background: 'none', color: '#6b7280', fontSize: '13px',
            cursor: 'pointer', width: '100%', textAlign: 'left',
          }}
        >
          <span>+</span> New interview
        </button>
      </nav>

      {/* Bottom user row */}
      <div style={{
        marginTop: 'auto', paddingTop: '1rem',
        borderTop: '0.5px solid rgba(0,0,0,0.08)',
        display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <div style={{
          width: '30px', height: '30px', borderRadius: '50%',
          background: '#EEEDFE', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '11px', fontWeight: 500,
          color: '#534AB7', flexShrink: 0,
        }}>AA</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Aryan Assit</p>
          <button
            onClick={handleLogout}
            style={{ background: 'none', border: 'none', padding: 0, fontSize: '11px', color: '#9ca3af', cursor: 'pointer' }}
          >
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
