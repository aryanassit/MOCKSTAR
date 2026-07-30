import Sidebar from '../components/Sidebar';
import ChatWidget from '../components/ChatWidget';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#F3E8DA' }}>
      <Sidebar />
      <main style={{ flex:1, overflowY:'auto', padding:'1.75rem 2rem', minWidth:0 }}>
        {children}
      </main>
      <ChatWidget sessionId="dummy-session-id-for-now" />
    </div>
  );
}