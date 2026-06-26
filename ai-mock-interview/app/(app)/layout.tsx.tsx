import Sidebar from '../components/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f4f0' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', minWidth: 0 }}>
        {children}
      </main>
    </div>
  );
}
