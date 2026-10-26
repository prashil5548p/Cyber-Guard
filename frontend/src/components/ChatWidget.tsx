import { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, Sparkles, ExternalLink } from 'lucide-react';
import { sendChatMessage } from '../api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  suggestions?: string[];
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: "👋 **Hello! I'm CyberGuard AI Assistant.**\nI can analyze active threat alerts, explain security incidents, summarize system posture, and guide you through PC, Apps, IP, File, and Website scanning.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestions: [
        'Give me a summary',
        'Show critical alerts',
        'How do I scan a file?',
        'Phishing tips',
      ],
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend ?? input).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
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
      const botMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'bot',
        text: res.data.reply || "I'm not sure how to answer that.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: res.data.suggestions,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Chat assistant error. Check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  const renderFormattedText = (raw: string) => {
    // Basic Markdown formatting helper for bold, lists, and headings
    const lines = raw.split('\n');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {lines.map((line, idx) => {
          if (!line.trim()) return <div key={idx} style={{ height: 4 }} />;

          // Process bold tags
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
              <div key={idx} style={{ display: 'flex', gap: 6, paddingLeft: 4 }}>
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
    <>
      {/* Floating launcher button */}
      {!isOpen && (
        <button
          className="chat-fab"
          onClick={() => setIsOpen(true)}
          aria-label="Open AI Security Chatbot"
          title="CyberGuard AI Copilot"
        >
          <div className="chat-fab-pulse" />
          <Bot size={24} color="#000" />
          <span className="chat-fab-tooltip">AI Copilot</span>
        </button>
      )}

      {/* Floating Drawer / Dialog */}
      {isOpen && (
        <div className="chat-drawer animate-fade">
          {/* Header */}
          <div className="chat-drawer-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="chat-avatar-bot">
                <Bot size={18} color="#000" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  CyberGuard AI Copilot
                  <span className="badge badge-low" style={{ fontSize: 10, padding: '2px 6px' }}>ONLINE</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Threat Intel & Security Agent</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                className="icon-btn"
                title="Open Dedicated Full Chat Page"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/chat');
                }}
              >
                <ExternalLink size={15} />
              </button>
              <button
                className="icon-btn"
                title="Close Chat"
                onClick={() => setIsOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages list */}
          <div className="chat-drawer-messages">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-bubble-container ${msg.sender === 'user' ? 'user-side' : 'bot-side'}`}
              >
                <div className={`chat-bubble ${msg.sender === 'user' ? 'user-bubble' : 'bot-bubble'}`}>
                  <div className="chat-bubble-content">
                    {renderFormattedText(msg.text)}
                  </div>
                  <span className="chat-timestamp">{msg.timestamp}</span>
                </div>

                {/* Suggestions pill list under bot message */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="chat-suggestions-wrap">
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
                <div className="chat-bubble bot-bubble" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px' }}>
                  <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>CyberGuard AI analyzing...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="chat-drawer-footer">
            <div className="chat-input-bar">
              <input
                type="text"
                className="chat-text-input"
                placeholder="Ask about threats, alerts, scanners, or summary..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSend();
                }}
                disabled={loading}
              />
              <button
                className="chat-send-btn"
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                title="Send"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
