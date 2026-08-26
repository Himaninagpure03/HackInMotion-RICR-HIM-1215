import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { renderMarkdown } from "../lib/markdown";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

const CHAT_STORAGE_KEY = "finhealth_chat_messages";
const CHAT_MAX_MESSAGES = 50;

const SUGGESTIONS = [
  "How am I doing financially?",
  "Where am I spending the most?",
  "Help me reduce my expenses",
  "Am I on track with my budgets?",
  "What can I do to save more?",
];

function loadMessages() {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMessages(msgs) {
  try {
    // Cap at max messages — drop oldest
    const trimmed = msgs.slice(-CHAT_MAX_MESSAGES);
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(trimmed));
  } catch { /* localStorage unavailable */ }
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`chat-msg ${isUser ? "chat-msg-user" : "chat-msg-bot"}`}>
      {!isUser && (
        <div className="chat-avatar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
            <path d="M18 21H6a2 2 0 0 1-2-2v-1a6 6 0 0 1 12 0v1a2 2 0 0 1-2 2z" />
          </svg>
        </div>
      )}
      <div
        className={`chat-bubble ${isUser ? "chat-bubble-user" : "chat-bubble-bot"}`}
        {...(!isUser && { dangerouslySetInnerHTML: { __html: renderMarkdown(msg.content) } })}
      >
        {isUser ? msg.content : null}
      </div>
    </div>
  );
}

export default function Chat() {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState(loadMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Persist messages whenever they change
  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  function handleNewChat() {
    setMessages([]);
    setInput("");
    localStorage.removeItem(CHAT_STORAGE_KEY);
    inputRef.current?.focus();
  }

  async function sendMessage(text) {
    const userMsg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const token = await getToken();
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) throw new Error(`API ${res.status}`);

      const data = await res.json();
      const reply = data.reply || "No response received. Please try again.";

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${err.message}. Make sure the LLM backend is running.`,
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    sendMessage(trimmed);
  }

  function handleSuggestion(text) {
    if (loading) return;
    sendMessage(text);
  }

  return (
    <main className="chat-page">
      <div className="chat-container">
        <div className="chat-header">
          <div>
            <h1>FinHealth AI</h1>
            <p>Ask anything about your finances</p>
          </div>
          {messages.length > 0 && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleNewChat}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              New chat
            </button>
          )}
        </div>

        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-empty">
              <div className="chat-empty-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <p>Start a conversation about your financial health.</p>
              <div className="chat-suggestions">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="chat-suggestion"
                    onClick={() => handleSuggestion(s)}
                    disabled={loading}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}

          {loading && messages.length > 0 && messages[messages.length - 1].role === "user" && (
            <div className="chat-msg chat-msg-bot">
              <div className="chat-avatar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
                  <path d="M18 21H6a2 2 0 0 1-2-2v-1a6 6 0 0 1 12 0v1a2 2 0 0 1-2 2z" />
                </svg>
              </div>
              <div className="chat-bubble chat-bubble-bot chat-typing">
                <span /><span /><span />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <form className="chat-input-bar" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className="input chat-input"
            placeholder="Ask about your finances..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            autoFocus
          />
          <button
            type="submit"
            className="btn btn-primary chat-send"
            disabled={loading || !input.trim()}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          </button>
        </form>
      </div>
    </main>
  );
}
