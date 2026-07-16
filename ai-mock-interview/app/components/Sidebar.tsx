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
    <aside style={{ width:'210px', flexShrink:0, background:'#75624E', borderRight:'1px solid #75624E', display:'flex', flexDirection:'column', padding:'1rem 0.75rem', minHeight:'100vh' }}>

      <div className={mounted?'anim-fade-left d-0':''} style={{ display:'flex', alignItems:'center', gap:'9px', padding:'0 6px 1.25rem', opacity:mounted?undefined:0 }}>
        <div style={{ width:'28px', height:'28px', borderRadius:'8px', background:'linear-gradient(135deg,#A0AB97,#8F9B88)', backgroundSize:'200% 200%', animation:'gradShift 4s ease infinite', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, color:'#2E2A25', fontSize:'13px', boxShadow:'0 2px 10px rgba(160,171,151,0.4)', flexShrink:0 }}>M</div>
        <span style={{ fontSize:'14px', fontWeight:700, color:'#F3E8DA', letterSpacing:'-0.2px' }}>MockStar</span>
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
              style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 10px', borderRadius:'9px', border:'none', background:active?'rgba(160,171,151,0.25)':isHov?'rgba(243,232,218,0.08)':'none', color:active?'#F3E8DA':isHov?'#F3E8DA':'#D8C7B3', fontWeight:active?600:400, fontSize:'13px', cursor:'pointer', width:'100%', textAlign:'left', borderLeft:active?'2px solid #A0AB97':'2px solid transparent', opacity:mounted?undefined:0 }}>
              <span style={{ fontSize:'13px', transition:'transform 0.15s', transform:(active||isHov)?'scale(1.12)':'scale(1)' }}>{icon}</span>
              {label}
              {active && <span style={{ marginLeft:'auto', width:'5px', height:'5px', borderRadius:'50%', background:'#A0AB97', animation:'pulseDot 2s ease infinite' }} />}
            </button>
          );
        })}

        <div style={{ margin:'10px 0', borderTop:'1px solid rgba(243,232,218,0.15)' }} />

        <button onClick={() => router.push('/upload')}
          className={`btn-green ${mounted?'anim-fade-left d-400':''}`}
          style={{ display:'flex', alignItems:'center', gap:'8px', padding:'9px 10px', borderRadius:'9px', fontSize:'13px', fontWeight:700, width:'100%', textAlign:'left', opacity:mounted?undefined:0 }}>
          <span>+</span> New interview
        </button>
      </nav>

      <div className={mounted?'anim-fade-up d-500':''} style={{ marginTop:'auto', paddingTop:'1rem', borderTop:'1px solid rgba(243,232,218,0.15)', display:'flex', alignItems:'center', gap:'8px', opacity:mounted?undefined:0 }}>
        <div style={{ width:'30px', height:'30px', borderRadius:'50%', flexShrink:0, background:'linear-gradient(135deg,#A0AB97,#8F9B88)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700, color:'#2E2A25', boxShadow:'0 1px 6px rgba(160,171,151,0.35)' }}>{initials||'?'}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ margin:0, fontSize:'12px', fontWeight:600, color:'#F3E8DA', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{displayName}</p>
          <button onClick={handleLogout} style={{ background:'none', border:'none', padding:0, fontSize:'11px', color:'#D8C7B3', cursor:'pointer', transition:'color 0.15s' }}
            onMouseEnter={e=>(e.currentTarget.style.color='#ef4444')}
            onMouseLeave={e=>(e.currentTarget.style.color='#D8C7B3')}>Sign out</button>
        </div>
      </div>
    </aside>
  );
}