import { useState } from "react";
import LanguageSelect from "./components/LanguageSelect.jsx";
import Recorder from "./components/Recorder.jsx";
import ChatPanel from "./components/ChatPanel.jsx";
import FileUpload from "./components/FileUpload.jsx";
import ResultCard from "./components/ResultCard.jsx";
import FollowUpChat from "./components/FollowUpChat.jsx";
import { submitText, submitImage } from "./api.js";
import { convertPdfToPng } from "./pdfToImage.js";

const TABS = ["Chat", "Type", "Record", "Upload Image", "Upload PDF"];

export default function App() {
  const [tab, setTab] = useState("Type");
  const [text, setText] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("Spanish");
  const [recordingMode, setRecordingMode] = useState("automatic");
  const [recordedText, setRecordedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function run(promise) {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await promise;
      setResult(data);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleTypeSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    run(submitText({ text, targetLanguage, useMedicalGrounding: true }));
  }

  function handleTranscript(transcript) {
    if (recordingMode === "automatic") {
      run(
        submitText({
          text: transcript,
          targetLanguage,
          useMedicalGrounding: true,
        }),
      );
      return;
    }
    setRecordedText(transcript);
  }

  function handleRecordedTextSubmit(event) {
    event.preventDefault();
    if (!recordedText.trim()) return;
    run(
      submitText({
        text: recordedText,
        targetLanguage,
        useMedicalGrounding: true,
      }),
    );
  }

  function handleImage(file) {
    run(submitImage({ file, targetLanguage }));
  }

  function handlePdf(file) {
    run(
      convertPdfToPng(file).then((image) =>
        submitImage({ file: image, targetLanguage }),
      ),
    );
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
            className={t === tab ? "active" : ""}
            onClick={() => setTab(t)}
            type="button"
          >
            {t}
          </button>
        ))}
      </nav>

      <main>
        {tab === "Type" && (
          <form onSubmit={handleTypeSubmit} className="panel">
            <textarea
              rows={6}
              placeholder="Type or paste what the doctor said, or notes from your visit..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button type="submit" disabled={loading || !text.trim()}>
              {loading ? "Processing…" : "Explain & Translate"}
            </button>
          </form>
        )}

        {tab === "Record" && (
          <div className="panel">
            <p>
              Speak naturally. Your browser transcribes the speech, then we
              explain and translate the text.
            </p>
            <div className="mode-switch" aria-label="Transcript handling mode">
              <button
                type="button"
                className={recordingMode === "automatic" ? "active" : ""}
                aria-pressed={recordingMode === "automatic"}
                onClick={() => setRecordingMode("automatic")}
              >
                Send automatically
              </button>
              <button
                type="button"
                className={recordingMode === "edit" ? "active" : ""}
                aria-pressed={recordingMode === "edit"}
                onClick={() => setRecordingMode("edit")}
              >
                Edit before sending
              </button>
            </div>
            <Recorder onTranscriptReady={handleTranscript} disabled={loading} />
            {recordingMode === "edit" && recordedText && (
              <form
                onSubmit={handleRecordedTextSubmit}
                className="recorded-text-form"
              >
                <label htmlFor="recorded-text">
                  Review the recognized text
                </label>
                <textarea
                  id="recorded-text"
                  rows={5}
                  value={recordedText}
                  onChange={(event) => setRecordedText(event.target.value)}
                />
                <button
                  type="submit"
                  disabled={loading || !recordedText.trim()}
                >
                  Explain & Translate
                </button>
              </form>
            )}
          </div>
        )}

        {tab === "Chat" && <ChatPanel patientLanguage={targetLanguage} />}

        {tab === "Upload Image" && (
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

        {tab === "Upload PDF" && (
          <div className="panel">
            <p>
              Upload a PDF medical report. Its pages are converted to an image
              in your browser before analysis.
            </p>
            <FileUpload
              accept="application/pdf"
              label="📄 Choose PDF"
              onFileSelected={handlePdf}
              disabled={loading}
            />
          </div>
        )}

        {loading && (
          <p className="loading">Analyzing… this can take a few seconds.</p>
        )}
        {error && <p className="error">⚠️ {error}</p>}
        {tab !== "Chat" && <ResultCard result={result} />}
        {tab !== "Chat" && result && (
          <FollowUpChat context={result} targetLanguage={targetLanguage} />
        )}
      </main>

      <footer>
        <small>Not a substitute for professional medical advice.</small>
      </footer>
    </div>
  );
}
