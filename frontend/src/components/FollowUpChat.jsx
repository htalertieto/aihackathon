import { useEffect, useState } from 'react';
import { submitFollowUp } from '../api.js';

// Simple, dependency-free string hash so we can key a conversation to its
// source document without needing any backend/database.
export function hashKey(value) {
  let hash = 0;
  const str = JSON.stringify(value);
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return `medtranslate-chat:${hash}`;
}

/**
 * Browser-only follow-up Q&A. Conversation history lives entirely in
 * sessionStorage (cleared when the tab closes) and is resent to the backend
 * on every question so the model has continuity — nothing is persisted
 * server-side or in any database.
 */
export default function FollowUpChat({ context, targetLanguage }) {
  const storageKey = hashKey({ sourceText: context?.sourceText, summary: context?.summary });
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      setMessages(saved ? JSON.parse(saved) : []);
    } catch {
      setMessages([]);
    }
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  function persist(next) {
    setMessages(next);
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // sessionStorage may be unavailable (private browsing quota); chat still
      // works for the current render, it just won't survive a refresh.
    }
  }

  async function handleAsk(e) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || asking) return;

    setAsking(true);
    setError('');
    const history = messages.map(({ role, text }) => ({ role, text }));
    try {
      const { answer, disclaimer } = await submitFollowUp({
        context,
        targetLanguage,
        history,
        question: trimmed,
      });
      persist([
        ...messages,
        { role: 'user', text: trimmed },
        { role: 'assistant', text: answer, disclaimer },
      ]);
      setQuestion('');
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setAsking(false);
    }
  }

  function handleClear() {
    persist([]);
  }

  if (!context) return null;

  return (
    <div className="followup-chat">
      <h3>Ask a follow-up question</h3>
      <p className="followup-hint">
        This conversation stays in your browser only — it's cleared when you close this tab.
      </p>

      {messages.length > 0 && (
        <ul className="chat-log">
          {messages.map((m, i) => (
            <li key={i} className={`chat-msg chat-msg--${m.role}`}>
              <strong>{m.role === 'user' ? 'You' : 'MedTranslate'}:</strong> {m.text}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAsk} className="followup-form">
        <input
          type="text"
          placeholder="e.g. Can I take this with food?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={asking}
        />
        <button type="submit" disabled={asking || !question.trim()}>
          {asking ? 'Asking…' : 'Ask'}
        </button>
      </form>

      {messages.length > 0 && (
        <button type="button" className="followup-clear" onClick={handleClear}>
          Clear conversation
        </button>
      )}

      {error && <p className="error">⚠️ {error}</p>}
    </div>
  );
}
