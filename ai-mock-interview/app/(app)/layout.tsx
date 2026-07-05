import Sidebar from '../components/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#f8fafc' }}>
      <Sidebar />
      <main style={{ flex:1, overflowY:'auto', padding:'1.75rem 2rem', minWidth:0 }}>
        {children}
      </main>
    </div>
  );
}