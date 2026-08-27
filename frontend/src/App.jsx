import { useState } from 'react';
import LanguageSelect from './components/LanguageSelect.jsx';
import Recorder from './components/Recorder.jsx';
import FileUpload from './components/FileUpload.jsx';
import ResultCard from './components/ResultCard.jsx';
import { submitText, submitImage, submitPdf, submitAudio } from './api.js';

const TABS = ['Type', 'Record', 'Upload Image', 'Upload PDF'];

export default function App() {
  const [tab, setTab] = useState('Type');
  const [text, setText] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('Spanish');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  async function run(promise) {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await promise;
      setResult(data);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function handleTypeSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    run(submitText({ text, targetLanguage, useMedicalGrounding: true }));
  }

  function handleRecording(blob) {
    const file = new File([blob], 'recording.webm', { type: blob.type });
    run(submitAudio({ file, targetLanguage }));
  }

  function handleImage(file) {
    run(submitImage({ file, targetLanguage }));
  }

  function handlePdf(file) {
    run(submitPdf({ file, targetLanguage }));
  }

  return (
    <div className="app">
      <header>
        <h1>🩺 MedTranslate</h1>
        <p>Understand your diagnosis, in your language.</p>
      </header>

      <div className="controls-bar">
        <LanguageSelect value={targetLanguage} onChange={setTargetLanguage} />
      </div>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t}
            className={t === tab ? 'active' : ''}
            onClick={() => setTab(t)}
            type="button"
          >
            {t}
          </button>
        ))}
      </nav>

      <main>
        {tab === 'Type' && (
          <form onSubmit={handleTypeSubmit} className="panel">
            <textarea
              rows={6}
              placeholder="Type or paste what the doctor said, or notes from your visit..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button type="submit" disabled={loading || !text.trim()}>
              {loading ? 'Processing…' : 'Explain & Translate'}
            </button>
          </form>
        )}

        {tab === 'Record' && (
          <div className="panel">
            <p>Record the doctor speaking, then we'll transcribe, explain, and translate it.</p>
            <Recorder onRecordingReady={handleRecording} disabled={loading} />
          </div>
        )}

        {tab === 'Upload Image' && (
          <div className="panel">
            <p>Upload a photo of a prescription, report, or discharge notes.</p>
            <FileUpload
              accept="image/*"
              label="📷 Choose image"
              onFileSelected={handleImage}
              disabled={loading}
            />
          </div>
        )}

        {tab === 'Upload PDF' && (
          <div className="panel">
            <p>Upload a PDF medical report.</p>
            <FileUpload
              accept="application/pdf"
              label="📄 Choose PDF"
              onFileSelected={handlePdf}
              disabled={loading}
            />
          </div>
        )}

        {loading && <p className="loading">Analyzing… this can take a few seconds.</p>}
        {error && <p className="error">⚠️ {error}</p>}
        <ResultCard result={result} />
      </main>

      <footer>
        <small>Not a substitute for professional medical advice.</small>
      </footer>
    </div>
  );
}
