import { useState } from 'react';
import { translateChatMessage } from '../api.js';

export default function ChatPanel({ patientLanguage }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [turn, setTurn] = useState('user');
  const [userLanguage, setUserLanguage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isUserTurn = turn === 'user';

  async function passTurn(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || loading || (!isUserTurn && !userLanguage)) return;

    setLoading(true);
    setError('');
    try {
      const targetLanguage = isUserTurn ? patientLanguage : userLanguage;
      const response = await translateChatMessage({
        text,
        targetLanguage,
        sourceLanguage: isUserTurn ? undefined : patientLanguage,
      });
      const detectedUserLanguage = isUserTurn ? response.sourceLanguage : userLanguage;

      if (isUserTurn) setUserLanguage(detectedUserLanguage);
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: crypto.randomUUID(),
          speaker: isUserTurn ? 'User' : 'Patient',
          originalText: text,
          originalLanguage: response.sourceLanguage,
          translatedText: response.translatedText,
          translatedLanguage: targetLanguage,
        },
      ]);
      setDraft('');
      setTurn(isUserTurn ? 'patient' : 'user');
    } catch (err) {
      setError(err.message || 'Could not translate this message.');
    } finally {
      setLoading(false);
    }
  }

  function startNewChat() {
    setMessages([]);
    setDraft('');
    setTurn('user');
    setUserLanguage('');
    setError('');
  }

  return (
    <section className="panel chat-panel" aria-label="Patient conversation">
      <div className="chat-header">
        <div>
          <h2>Patient chat</h2>
          <p>
            {userLanguage
              ? `User language: ${userLanguage}. Patient language: ${patientLanguage}.`
              : 'Write the first user message to detect the user language.'}
          </p>
        </div>
        {messages.length > 0 && (
          <button type="button" className="secondary" onClick={startNewChat} disabled={loading}>
            New chat
          </button>
        )}
      </div>

      <div className="chat-messages" aria-live="polite">
        {messages.length === 0 && <p className="chat-empty">The conversation will appear here.</p>}
        {messages.map((message) => (
          <article className={`chat-message ${message.speaker.toLowerCase()}`} key={message.id}>
            <strong>{message.speaker} · {message.originalLanguage}</strong>
            <p>{message.originalText}</p>
            <div className="chat-translation">
              <strong>Translation · {message.translatedLanguage}</strong>
              <p>{message.translatedText}</p>
            </div>
          </article>
        ))}
      </div>

      <form onSubmit={passTurn} className="chat-compose">
        <label htmlFor="chat-message">{isUserTurn ? 'User message' : 'Patient message'}</label>
        <textarea
          id="chat-message"
          rows={4}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={isUserTurn ? 'Write what you want to say to the patient...' : 'Write the patient response...'}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !draft.trim()}>
          {loading ? 'Translating...' : isUserTurn ? 'Pass turn to patient' : 'Pass turn to user'}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
    </section>
  );
}
