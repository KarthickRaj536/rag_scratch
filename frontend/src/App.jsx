import { useState, useRef, useEffect, useCallback } from 'react';
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
        <div className="header-actions">
          <button className="icon-btn" onClick={() => window.location.hash = '#upload'} title="Upload Knowledge">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15M17 8L12 3M12 3L7 8M12 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Upload
          </button>
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

function UploadPage({ onComplete, onSkip }) {
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  
  const MAX_SIZE = 15 * 1024 * 1024; // 15 MB

  const handleFiles = (newFiles) => {
    const fileArray = Array.from(newFiles);
    const validFiles = fileArray.filter(f => f.name.endsWith('.pdf') || f.name.endsWith('.txt'));
    
    if (validFiles.length !== fileArray.length) {
      setError("Only .pdf and .txt files are supported.");
    }

    setFiles(prev => {
      const updated = [...prev, ...validFiles];
      const totalSize = updated.reduce((acc, f) => acc + f.size, 0);
      if (totalSize > MAX_SIZE) {
        setError(`Total size exceeds 15MB limit. Currently: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
      } else {
        setError(null);
      }
      return updated;
    });
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, []);

  const onFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (idx) => {
    setFiles(prev => {
      const newFiles = [...prev];
      newFiles.splice(idx, 1);
      const totalSize = newFiles.reduce((acc, f) => acc + f.size, 0);
      if (totalSize <= MAX_SIZE) setError(null);
      return newFiles;
    });
  };

  const handleUpload = async () => {
    const totalSize = files.reduce((acc, f) => acc + f.size, 0);
    if (totalSize > MAX_SIZE) {
      setError("Cannot upload. Size exceeds 15MB limit.");
      return;
    }
    
    setIsUploading(true);
    setError(null);
    
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Upload failed');
      }

      onComplete();
    } catch (err) {
      setError(err.message);
      setIsUploading(false);
    }
  };

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);
  const isValid = files.length > 0 && totalSize <= MAX_SIZE;

  const getFileIconClass = (filename) => {
    if (filename.toLowerCase().endsWith('.pdf')) return 'icon-pdf';
    if (filename.toLowerCase().endsWith('.txt')) return 'icon-txt';
    return 'icon-doc';
  };
  
  const getFileExtName = (filename) => {
    if (filename.toLowerCase().endsWith('.pdf')) return 'PDF';
    if (filename.toLowerCase().endsWith('.txt')) return 'TXT';
    return 'DOC';
  };

  return (
    <div className="upload-container fade-in">
      <div className="upload-card">
        <div className="upload-card-header">
          <h2>Knowledge Base Initialization</h2>
          <p>Securely index internal documents to enhance Oracle's deep insights. Files are processed locally and confined to your environment.</p>
        </div>
        
        <div 
          className={`drop-zone ${isDragActive ? 'drag-active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragActive(false); }}
          onDrop={onDrop}
          onClick={() => document.getElementById('file-input').click()}
        >
          <input 
            type="file" 
            id="file-input" 
            multiple 
            accept=".pdf,.txt" 
            style={{ display: 'none' }}
            onChange={onFileChange}
          />
          <div className="upload-icon-wrapper">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ color: '#a5b4fc', strokeWidth: '2' }}>
              <path d="M7 16A4 4 0 0116.48 14.46A5 5 0 1118.5 4.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 12V21M12 12L8 16M12 12L16 16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="drop-zone-text">Click or drag files to upload</div>
          <div className="drop-zone-subtext">PDF and TXT supported (Max 15MB total)</div>
        </div>

        {error && (
          <div className="upload-error-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {files.length > 0 && (
          <div className="file-list-container">
            <div className="file-list-header">
              <span className="file-list-title">Selected Documents ({files.length})</span>
              <span className="file-list-stats" style={{ color: totalSize > MAX_SIZE ? '#ef4444' : '#94a3b8' }}>
                {(totalSize / 1024 / 1024).toFixed(2)} MB / 15.00 MB
              </span>
            </div>
            <div className="file-list">
              {files.map((file, idx) => (
                <div key={idx} className="file-item">
                  <div className="file-info">
                    <div className={`file-icon ${getFileIconClass(file.name)}`}>
                      {getFileExtName(file.name)}
                    </div>
                    <div className="file-details">
                      <span className="file-name" title={file.name}>{file.name}</span>
                      <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                  <div className="file-actions">
                    <button className="remove-btn" onClick={(e) => { e.stopPropagation(); removeFile(idx); }} title="Remove file">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="upload-actions">
          <button className="skip-btn" onClick={onSkip} disabled={isUploading}>
            {window.location.hash === '#upload' && files.length === 0 ? 'Skip indexing for now' : 'Cancel'}
          </button>
          <button 
            className="upload-btn" 
            onClick={handleUpload} 
            disabled={!isValid || isUploading}
          >
            {isUploading ? (
              <>
                <div className="uploading-spinner"></div>
                Processing...
              </>
            ) : (
              <>
                Initialize Vectors
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const getHash = () => {
    const hash = window.location.hash.replace('#', '');
    return ['landing', 'upload', 'chat'].includes(hash) ? hash : 'landing';
  };
  
  const [currentView, setCurrentView] = useState(getHash());

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentView(getHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <div className="app-container">
      {/* Background ambient glowing orbs */}
      <div className="ambient-orb orb-1"></div>
      <div className="ambient-orb orb-2"></div>
      
      {currentView === 'landing' && <LandingPage onStart={() => window.location.hash = '#upload'} />}
      {currentView === 'upload' && (
        <UploadPage 
          onComplete={() => window.location.hash = '#chat'} 
          onSkip={() => window.location.hash = '#chat'} 
        />
      )}
      {currentView === 'chat' && <ChatInterface />}
    </div>
  );
}

export default App;
