import Sidebar from '../components/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#050f05', fontFamily:'system-ui, -apple-system, sans-serif' }}>
      <Sidebar />
      <main style={{ flex:1, overflowY:'auto', padding:'1.5rem 2rem', minWidth:0 }}>
        {children}
      </main>
    </div>
  );
}