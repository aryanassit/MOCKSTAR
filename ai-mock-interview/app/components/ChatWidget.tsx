"use client"; 

import { useState, useRef, useEffect } from 'react';

type Message = { role: 'user' | 'bot'; text: string };

export default function ChatWidget({ sessionId }: { sessionId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Ref for auto-scrolling to the bottom of the chat
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll effect
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const newMessages: Message[] = [...messages, { role: 'user', text: input }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const res = await fetch(`${backendUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, message: input })
      });
      
      const data = await res.json();
      
      if (data.error) {
        setMessages([...newMessages, { role: 'bot', text: `⚠️ Backend Error: ${data.error}` }]);
      } else if (data.reply) {
        setMessages([...newMessages, { role: 'bot', text: data.reply }]);
      } else {
        setMessages([...newMessages, { role: 'bot', text: "⚠️ Received an empty response from server." }]);
      }
    } catch (error: any) {
      setMessages([...newMessages, { role: 'bot', text: `🔌 Connection Error: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
      
      {/* --- THE CHAT WINDOW --- */}
      <div 
        className={`bg-[#F3E8DA] w-[340px] sm:w-[390px] h-[400px] rounded-2xl shadow-2xl flex flex-col mb-4 border border-[#D8C7B3] transition-all duration-300 origin-bottom-right overflow-hidden ${
          isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none absolute'
        }`}
      >
        {/* Header */}
        <div className="bg-[#75624E] px-5 py-4 flex items-center gap-3 shadow-md relative z-10">
          <div className="w-10 h-10 rounded-full bg-[#EFE3D2] flex items-center justify-center text-xl shadow-inner">
            🤖
          </div>
          <div>
            <h3 className="text-[#F3E8DA] font-bold text-sm leading-tight">MockStar AI Coach</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              <span className="text-[#D8C7B3] text-xs font-medium">Online</span>
            </div>
          </div>
        </div>
        
        {/* Message Area */}
        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4 bg-[#F3E8DA] scroll-smooth">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 opacity-70 mt-4">
              <div className="w-16 h-16 bg-[#D8C7B3] rounded-full flex items-center justify-center text-3xl mb-3">💬</div>
              <p className="text-sm text-[#75624E] font-medium">Interview complete!</p>
              <p className="text-xs text-[#2E2A25] mt-1">Ask me how to improve your specific answers, posture, or eye contact.</p>
            </div>
          )}
          
          {messages.map((msg, i) => (
            <div 
              key={i} 
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <span className="text-[10px] text-[#8F9B88] font-bold uppercase tracking-wider mb-1 px-1">
                {msg.role === 'user' ? 'You' : 'AI Coach'}
              </span>
              <div 
                className={`p-3 text-[14px] leading-relaxed shadow-sm max-w-[85%] ${
                  msg.role === 'user' 
                    ? 'bg-[#A0AB97] text-white rounded-2xl rounded-tr-sm' 
                    : 'bg-[#EFE3D2] text-[#2E2A25] rounded-2xl rounded-tl-sm border border-[#D8C7B3]'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {/* Animated Typing Indicator */}
          {isLoading && (
            <div className="flex flex-col items-start">
              <span className="text-[10px] text-[#8F9B88] font-bold uppercase tracking-wider mb-1 px-1">AI Coach</span>
              <div className="bg-[#EFE3D2] p-4 rounded-2xl rounded-tl-sm border border-[#D8C7B3] shadow-sm flex gap-1.5 items-center max-w-fit">
                <div className="w-2 h-2 bg-[#8F9B88] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-[#8F9B88] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-[#8F9B88] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-[#D8C7B3] flex items-center gap-2">
          <input 
            type="text" 
            className="flex-1 bg-[#F3E8DA] text-[#2E2A25] placeholder-[#8F9B88] rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#A0AB97] transition-all"
            placeholder="Ask about your feedback..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          />
          <button 
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-[#75624E] text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#A0AB97] hover:scale-105 transition-all shadow-md disabled:opacity-50 disabled:hover:scale-100 disabled:hover:bg-[#75624E]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>

      {/* --- THE FLOATING TOGGLE BUTTON --- */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-[#75624E] text-[#F3E8DA] w-14 h-14 rounded-full shadow-2xl border-2 border-[#EFE3D2] flex items-center justify-center hover:scale-110 hover:bg-[#A0AB97] transition-all duration-300 relative group"
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            {/* Notification Dot */}
            <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-[#75624E] rounded-full"></span>
          </>
        )}
      </button>

    </div>
  );
}