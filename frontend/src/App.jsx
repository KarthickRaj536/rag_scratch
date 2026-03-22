import { useState, useRef, useEffect } from 'react';
import './index.css';

function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMessage })
      });

      if (!response.ok) throw new Error('Network Error');
      
      const data = await response.json();
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.answer,
        tools: data.tools_used 
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error connecting to the server. Ensure the FastAPI backend is running on port 8000.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-container fade-in">
      <header className="chat-header">
        <div className="header-titles">
          <h2>Oracle</h2>
        </div>
      </header>

      <div className="messages-area">
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="bot-avatar large glowing">✦</div>
            <h2>How can Oracle assist you?</h2>
            <p>Access live financial markets, internal knowledge bases, and real-time intelligence.</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`message-wrapper ${msg.role}`}>
            {msg.role === 'assistant' && <div className="bot-avatar glowing">✦</div>}
            <div className="message-content">
              {msg.tools && msg.tools.length > 0 && (
                <div className="tools-used">
                  ⚡ Utilized: {msg.tools.join(', ')}
                </div>
              )}
              <div className="bubble">
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message-wrapper assistant">
            <div className="bot-avatar glowing">✦</div>
            <div className="message-content">
              <div className="bubble loading">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-wrapper">
        <form onSubmit={handleSubmit} className="input-area">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Oracle anything..."
            disabled={isLoading}
            autoFocus
          />
          <button type="submit" disabled={!input.trim() || isLoading}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

function LandingPage({ onStart }) {
  return (
    <div className="landing-container fade-in">
      <div className="hero-content">
        <div className="hero-badge">Agentic AI Platform</div>
        <h1 className="hero-title">
          Meet <span className="text-gradient">Oracle</span>
        </h1>
        <p className="hero-subtitle">
          Your intelligent corporate co-pilot. Seamlessly combine real-time market data with deep internal knowledge base retrieval to make informed decisions faster.
        </p>
        
        <div className="features-grid">
          <div className="feature-card">
            <h3>📈 Live Trading Data</h3>
            <p>Direct integration with financial markets.</p>
          </div>
          <div className="feature-card">
            <h3>🔐 Internal RAG</h3>
            <p>Securely index and query internal valuations.</p>
          </div>
          <div className="feature-card">
            <h3>🌐 Web Intelligence</h3>
            <p>Real-time internet and Wikipedia lookups.</p>
          </div>
        </div>

        <button className="start-btn pulse" onClick={onStart}>
          Initialize Oracle Interface
        </button>
      </div>
    </div>
  );
}

function App() {
  const [currentView, setCurrentView] = useState(() => window.location.hash === '#chat' ? 'chat' : 'landing');

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentView(window.location.hash === '#chat' ? 'chat' : 'landing');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <div className="app-container">
      {/* Background ambient glowing orbs */}
      <div className="ambient-orb orb-1"></div>
      <div className="ambient-orb orb-2"></div>
      
      {currentView === 'landing' ? (
        <LandingPage onStart={() => window.location.hash = '#chat'} />
      ) : (
        <ChatInterface />
      )}
    </div>
  );
}

export default App;
