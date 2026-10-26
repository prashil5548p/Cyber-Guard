import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, Trash2, Terminal, ShieldCheck } from 'lucide-react';
import { sendChatMessage } from '../api';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  suggestions?: string[];
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      sender: 'bot',
      text: "🛡️ **Welcome to the CyberGuard AI Threat Intel Assistant.**\nI am your live security analyst copilot. Ask me to:\n- 📊 Provide a **security summary** of your system\n- 🚨 Inspect **critical or open threat alerts**\n- 🔍 Explain specific alerts (e.g., *'explain alert #1'*)\n- 🛡️ Guide you on using the **PC, App, IP, File, and Website Scanners**\n- 🔐 Provide remediation advice on ransomware, phishing, brute force, DDoS, or credentials.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestions: [
        'Give me a summary',
        'Show critical alerts',
        'Latest alerts',
        'How do I scan a file?',
        'How do I scan a website?',
        'Phishing tips',
        'What can you do?',
      ],
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (customText?: string) => {
    const text = (customText ?? input).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: String(Date.now()),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await sendChatMessage(text);
      const botMsg: Message = {
        id: String(Date.now() + 1),
        sender: 'bot',
        text: res.data.reply || "I'm not sure how to answer that.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: res.data.suggestions,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to communicate with AI Chatbot');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        id: String(Date.now()),
        sender: 'bot',
        text: "Conversation cleared. How can I assist you with your security investigations today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: ['Give me a summary', 'Show critical alerts', 'Phishing tips'],
      },
    ]);
  };

  const renderFormattedText = (raw: string) => {
    const lines = raw.split('\n');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {lines.map((line, idx) => {
          if (!line.trim()) return <div key={idx} style={{ height: 4 }} />;

          const parts = line.split(/(\*\*.*?\*\*)/g);
          const formatted = parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return part;
          });

          if (line.startsWith('- ') || line.startsWith('* ')) {
            return (
              <div key={idx} style={{ display: 'flex', gap: 8, paddingLeft: 6 }}>
                <span style={{ color: 'var(--cyan)' }}>•</span>
                <span>{formatted.slice(1)}</span>
              </div>
            );
          }

          return <div key={idx}>{formatted}</div>;
        })}
      </div>
    );
  };

  return (
    <div className="page-container" style={{ position: 'relative', zIndex: 1 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Security Assistant</h1>
          <p className="page-subtitle">Real-time threat intelligence, triage explanation, and scanning guidance</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleClear} title="Clear Chat History">
            <Trash2 size={15} /> Clear
          </button>
          <div style={{
            background: 'rgba(0, 212, 255, 0.08)',
            border: '1px solid rgba(0, 212, 255, 0.2)',
            borderRadius: 8,
            padding: '6px 14px',
            fontSize: 12,
            color: 'var(--cyan)',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <Bot size={15} /> CyberGuard Engine v1.0
          </div>
        </div>
      </div>

      <div className="chat-page-layout">
        {/* Main Conversation Window */}
        <div className="chat-window-card">
          <div className="chat-window-messages">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-bubble-container ${msg.sender === 'user' ? 'user-side' : 'bot-side'}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  {msg.sender === 'bot' ? (
                    <>
                      <div className="chat-avatar-bot" style={{ width: 22, height: 22 }}>
                        <Bot size={13} color="#000" />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--cyan)' }}>CyberGuard AI</span>
                    </>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>You</span>
                  )}
                  <span className="chat-timestamp" style={{ margin: 0 }}>{msg.timestamp}</span>
                </div>

                <div className={`chat-bubble ${msg.sender === 'user' ? 'user-bubble' : 'bot-bubble'}`}>
                  <div className="chat-bubble-content">
                    {renderFormattedText(msg.text)}
                  </div>
                </div>

                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="chat-suggestions-wrap" style={{ marginTop: 8 }}>
                    {msg.suggestions.map((sug, sIdx) => (
                      <button
                        key={sIdx}
                        className="chat-sug-chip"
                        onClick={() => handleSend(sug)}
                        disabled={loading}
                      >
                        <Sparkles size={11} color="var(--cyan)" />
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="chat-bubble-container bot-side">
                <div className="chat-bubble bot-bubble" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' }}>
                  <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>CyberGuard AI evaluating security context...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-window-input-area">
            <div className="chat-input-bar">
              <input
                type="text"
                className="chat-text-input"
                placeholder="Ask about live alerts, posture summary, scanners, or threat remediation..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSend();
                }}
                disabled={loading}
              />
              <button
                className="btn btn-primary"
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                style={{ padding: '8px 18px', gap: 8 }}
              >
                <span>Send</span>
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar with Security Quick Actions & Knowledge Cards */}
        <div className="chat-side-panel">
          <div className="chart-card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Terminal size={16} color="var(--cyan)" /> Common Commands
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { cmd: 'Give me a summary', desc: 'Real-time alert stats and posture level' },
                { cmd: 'Show critical alerts', desc: 'Highest severity unresolved alerts' },
                { cmd: 'Latest alerts', desc: 'Last 5 alerts recorded in the database' },
                { cmd: 'How do I scan a file?', desc: 'File scanner instructions & static analysis' },
                { cmd: 'How do I scan a website?', desc: 'SSL/TLS, security headers, phishing audit' },
                { cmd: 'Phishing tips', desc: 'Best practices for spotting fraudulent emails' },
              ].map(({ cmd, desc }) => (
                <button
                  key={cmd}
                  className="chat-command-item"
                  onClick={() => handleSend(cmd)}
                  disabled={loading}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{cmd}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="chart-card">
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={16} color="var(--low)" /> AI Security Capabilities
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              The CyberGuard Assistant inspects your local SQLite/MySQL security database directly to provide accurate, real-time context about detections, events, and active network telemetry.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
