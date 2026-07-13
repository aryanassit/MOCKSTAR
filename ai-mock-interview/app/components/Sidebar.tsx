"use client";

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function Sidebar() {
  const router = useRouter();
  const path = usePathname();
  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [initials, setInitials] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from('profiles').select('display_name').eq('id', session.user.id).single();
      const name = data?.display_name || session.user.email?.split('@')[0] || 'User';
      setDisplayName(name);
      const parts = name.trim().split(' ');
      setInitials(parts.length >= 2 ? (parts[0][0] + parts[parts.length-1][0]).toUpperCase() : name.slice(0,2).toUpperCase());
      setMounted(true);
    })();
  }, []);

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/'); };

  const navItems = [
    { href:'/dashboard', label:'Dashboard', icon:'▣' },
    { href:'/history',   label:'History',   icon:'◷' },
    { href:'/profile',   label:'Profile',   icon:'◉' },
  ];

  return (
    <aside style={{ width:'210px', flexShrink:0, background:'#050f05', borderRight:'1px solid #1e3a1e', display:'flex', flexDirection:'column', padding:'1rem 0.75rem', minHeight:'100vh' }}>

      <div className={mounted?'anim-fade-left d-0':''} style={{ display:'flex', alignItems:'center', gap:'9px', padding:'0 6px 1.25rem', opacity:mounted?undefined:0 }}>
        <div style={{ width:'28px', height:'28px', borderRadius:'8px', background:'linear-gradient(135deg,#16a34a,#22c55e)', backgroundSize:'200% 200%', animation:'gradShift 4s ease infinite', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, color:'white', fontSize:'13px', boxShadow:'0 2px 10px rgba(22,163,74,0.4)', flexShrink:0 }}>M</div>
        <span style={{ fontSize:'14px', fontWeight:700, color:'#f8fafc', letterSpacing:'-0.2px' }}>MockStar</span>
      </div>

      <nav style={{ display:'flex', flexDirection:'column', gap:'2px' }}>
        {navItems.map(({ href, label, icon }, i) => {
          const active = path === href;
          const isHov = hovered === href;
          return (
            <button key={href} onClick={() => router.push(href)}
              onMouseEnter={() => setHovered(href)}
              onMouseLeave={() => setHovered(null)}
              className={`nav-btn ${mounted?`anim-fade-left d-${(i+1)*100}`:''}`}
              style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 10px', borderRadius:'9px', border:'none', background:active?'rgba(22,163,74,0.18)':isHov?'rgba(255,255,255,0.03)':'none', color:active?'#22c55e':isHov?'#d4ead4':'#6b8f6b', fontWeight:active?600:400, fontSize:'13px', cursor:'pointer', width:'100%', textAlign:'left', borderLeft:active?'2px solid #16a34a':'2px solid transparent', opacity:mounted?undefined:0 }}>
              <span style={{ fontSize:'13px', transition:'transform 0.15s', transform:(active||isHov)?'scale(1.12)':'scale(1)' }}>{icon}</span>
              {label}
              {active && <span style={{ marginLeft:'auto', width:'5px', height:'5px', borderRadius:'50%', background:'#16a34a', animation:'pulseDot 2s ease infinite' }} />}
            </button>
          );
        })}

        <div style={{ margin:'10px 0', borderTop:'1px solid #1e3a1e' }} />

        <button onClick={() => router.push('/upload')}
          className={`btn-green ${mounted?'anim-fade-left d-400':''}`}
          style={{ display:'flex', alignItems:'center', gap:'8px', padding:'9px 10px', borderRadius:'9px', fontSize:'13px', fontWeight:700, width:'100%', textAlign:'left', opacity:mounted?undefined:0 }}>
          <span>+</span> New interview
        </button>
      </nav>

      <div className={mounted?'anim-fade-up d-500':''} style={{ marginTop:'auto', paddingTop:'1rem', borderTop:'1px solid #1e3a1e', display:'flex', alignItems:'center', gap:'8px', opacity:mounted?undefined:0 }}>
        <div style={{ width:'30px', height:'30px', borderRadius:'50%', flexShrink:0, background:'linear-gradient(135deg,#16a34a,#22c55e)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700, color:'white', boxShadow:'0 1px 6px rgba(22,163,74,0.35)' }}>{initials||'?'}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ margin:0, fontSize:'12px', fontWeight:600, color:'#f8fafc', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{displayName}</p>
          <button onClick={handleLogout} style={{ background:'none', border:'none', padding:0, fontSize:'11px', color:'#4a6f4a', cursor:'pointer', transition:'color 0.15s' }}
            onMouseEnter={e=>(e.currentTarget.style.color='#ef4444')}
            onMouseLeave={e=>(e.currentTarget.style.color='#4a6f4a')}>Sign out</button>
        </div>
      </div>
    </aside>
  );
}