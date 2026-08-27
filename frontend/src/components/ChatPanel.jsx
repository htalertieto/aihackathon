import { useEffect, useState } from "react";
import {
  LockClosedIcon,
  PaperAirplaneIcon,
  ShieldCheckIcon,
  SpeakerWaveIcon,
} from "@heroicons/react/24/outline";
import { translateChatMessage } from "../api.js";

const LANGUAGE_LOCALES = {
  Arabic: "ar-SA",
  English: "en-US",
  French: "fr-FR",
  German: "de-DE",
  Hindi: "hi-IN",
  Italian: "it-IT",
  Korean: "ko-KR",
  "Mandarin Chinese": "zh-CN",
  Polish: "pl-PL",
  Portuguese: "pt-PT",
  Russian: "ru-RU",
  Spanish: "es-ES",
  Tagalog: "fil-PH",
  Ukrainian: "uk-UA",
  Vietnamese: "vi-VN",
};

export default function ChatPanel({ patientLanguage }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [turn, setTurn] = useState("user");
  const [userLanguage, setUserLanguage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isUserTurn = turn === "user";

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  function speak(text, language) {
    if (!("speechSynthesis" in window)) {
      setError("Text-to-speech is not supported in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANGUAGE_LOCALES[language] || language;
    window.speechSynthesis.speak(utterance);
  }

  async function passTurn(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || loading || (!isUserTurn && !userLanguage)) return;

    setLoading(true);
    setError("");
    try {
      const targetLanguage = isUserTurn ? patientLanguage : userLanguage;
      const response = await translateChatMessage({
        text,
        targetLanguage,
        sourceLanguage: isUserTurn ? undefined : patientLanguage,
      });
      const detectedUserLanguage = isUserTurn
        ? response.sourceLanguage
        : userLanguage;
      if (isUserTurn) setUserLanguage(detectedUserLanguage);
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: crypto.randomUUID(),
          speaker: isUserTurn ? "User" : "Patient",
          originalText: text,
          originalLanguage: response.sourceLanguage,
          translatedText: response.translatedText,
          translatedLanguage: targetLanguage,
        },
      ]);
      setDraft("");
      setTurn(isUserTurn ? "patient" : "user");
    } catch (err) {
      setError(err.message || "Could not translate this message.");
    } finally {
      setLoading(false);
    }
  }

  function startNewChat() {
    setMessages([]);
    setDraft("");
    setTurn("user");
    setUserLanguage("");
    setError("");
    window.speechSynthesis?.cancel();
  }

  function SpeakButton({ text, language, label }) {
    return (
      <button
        type="button"
        className="speak-button"
        onClick={() => speak(text, language)}
        aria-label={label}
        title="Listen"
      >
        <SpeakerWaveIcon aria-hidden="true" />
      </button>
    );
  }

  return (
    <section
      className="panel chat-panel"
      aria-label="Doctor-patient communication"
    >
      <div className="chat-header">
        <div className="chat-title">
          <span className="icon-disc">
            <PaperAirplaneIcon aria-hidden="true" />
          </span>
          <div>
            <h2>Doctor-Patient Communication</h2>
            <p>
              <LockClosedIcon aria-hidden="true" /> Secure conversation
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            className="secondary"
            onClick={startNewChat}
            disabled={loading}
          >
            New chat
          </button>
        )}
      </div>

      <div className="chat-messages" aria-live="polite">
        {messages.length === 0 && (
          <p className="chat-empty">
            Write the first doctor message to detect its language.
          </p>
        )}
        {messages.map((message) => (
          <article
            className={`chat-message ${message.speaker.toLowerCase()}`}
            key={message.id}
          >
            <strong>
              {message.speaker} - {message.originalLanguage}
            </strong>
            <div className="message-text-row">
              <p>{message.originalText}</p>
              <SpeakButton
                text={message.originalText}
                language={message.originalLanguage}
                label={`Listen to ${message.speaker} message in ${message.originalLanguage}`}
              />
            </div>
            <div className="chat-translation">
              <strong>Translation - {message.translatedLanguage}</strong>
              <div className="message-text-row">
                <p>{message.translatedText}</p>
                <SpeakButton
                  text={message.translatedText}
                  language={message.translatedLanguage}
                  label={`Listen to translation in ${message.translatedLanguage}`}
                />
              </div>
            </div>
          </article>
        ))}
      </div>

      <form onSubmit={passTurn} className="chat-compose">
        <label htmlFor="chat-message">
          {isUserTurn ? "Doctor message" : "Patient message"}
        </label>
        <textarea
          id="chat-message"
          rows={4}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={
            isUserTurn
              ? "Write what you want to say to the patient..."
              : "Write the patient response..."
          }
          disabled={loading}
        />
        <button type="submit" disabled={loading || !draft.trim()}>
          <PaperAirplaneIcon aria-hidden="true" />
          {loading
            ? "Translating..."
            : isUserTurn
              ? "Pass turn to patient"
              : "Pass turn to doctor"}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      <p className="chat-security">
        <ShieldCheckIcon aria-hidden="true" /> Your conversation is private and
        secure.
      </p>
    </section>
  );
}
