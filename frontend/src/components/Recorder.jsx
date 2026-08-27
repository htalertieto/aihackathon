import { useEffect, useRef, useState } from 'react';

export default function Recorder({ onTranscriptReady, disabled }) {
  const [recording, setRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  useEffect(() => () => recognitionRef.current?.abort(), []);

  function startRecording() {
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser. Try a Chromium-based browser.');
      return;
    }

    setError('');
    setInterimTranscript('');
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interim = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0].transcript;
        if (event.results[index].isFinal) {
          finalTranscript += transcript;
        } else {
          interim += transcript;
        }
      }

      setInterimTranscript(interim);
      if (finalTranscript.trim()) onTranscriptReady(finalTranscript.trim());
    };

    recognition.onerror = (event) => {
      if (event.error !== 'aborted') {
        setError(`Speech recognition failed: ${event.error}. Please try again.`);
      }
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setRecording(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setRecording(true);
  }

  function stopRecording() {
    recognitionRef.current?.stop();
  }

  return (
    <div className="recorder">
      {!recording ? (
        <button type="button" disabled={disabled} onClick={startRecording}>
          Start recording
        </button>
      ) : (
        <button type="button" className="danger" onClick={stopRecording}>
          Stop recording
        </button>
      )}
      {recording && <span className="pulse">Listening...</span>}
      {interimTranscript && <p className="transcript">{interimTranscript}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
