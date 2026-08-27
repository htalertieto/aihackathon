import { useState } from "react";
import {
  DocumentTextIcon,
  LanguageIcon,
  MicrophoneIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import logo from "./components/assets/logo.png";
import LanguageSelect from "./components/LanguageSelect.jsx";
import Recorder from "./components/Recorder.jsx";
import ChatPanel from "./components/ChatPanel.jsx";
import FileUpload from "./components/FileUpload.jsx";
import ResultCard from "./components/ResultCard.jsx";
import FollowUpChat from "./components/FollowUpChat.jsx";
import ExportOpenEhrButton from "./components/ExportOpenEhrButton.jsx";
import { submitText, submitImage } from "./api.js";
import { convertPdfToPng } from "./pdfToImage.js";

const TOOLS = ["Type", "Record", "Upload Image", "Upload PDF"];

export default function App() {
  const [tool, setTool] = useState("Type");
  const [text, setText] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("English");
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
      setResult(await promise);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleTypeSubmit(event) {
    event.preventDefault();
    if (text.trim())
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
    } else {
      setRecordedText(transcript);
    }
  }

  function handleRecordedTextSubmit(event) {
    event.preventDefault();
    if (recordedText.trim()) {
      run(
        submitText({
          text: recordedText,
          targetLanguage,
          useMedicalGrounding: true,
        }),
      );
    }
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
      <header className="app-header">
        <div className="brand-lockup">
          <img src={logo} alt="ClariCare logo" />
          <div>
            <h1>ClariCare</h1>
            <p>Present medical information without language barrier</p>
          </div>
        </div>
      </header>

      <div className="controls-bar">
        <LanguageIcon aria-hidden="true" />
        <LanguageSelect value={targetLanguage} onChange={setTargetLanguage} />
      </div>

      <main className="workspace">
        <ChatPanel patientLanguage={targetLanguage} />

        <section
          className="panel tools-panel"
          aria-label="Medical explanation tools"
        >
          <div className="tools-header">
            <span className="icon-disc">
              <DocumentTextIcon aria-hidden="true" />
            </span>
            <div>
              <h2>Explain medical information</h2>
              <p>Patient-friendly instructions and translations</p>
            </div>
          </div>

          <nav className="tool-tabs" aria-label="Medical explanation tools">
            {TOOLS.map((item) => (
              <button
                key={item}
                type="button"
                className={item === tool ? "active" : ""}
                onClick={() => setTool(item)}
              >
                {item}
              </button>
            ))}
          </nav>

          {tool === "Type" && (
            <form onSubmit={handleTypeSubmit} className="tool-content">
              <textarea
                rows={7}
                placeholder="Type or paste what the doctor said, or notes from the visit..."
                value={text}
                onChange={(event) => setText(event.target.value)}
              />
              <button type="submit" disabled={loading || !text.trim()}>
                Translate and explain
              </button>
            </form>
          )}

          {tool === "Record" && (
            <div className="tool-content">
              <div className="tool-intro">
                <MicrophoneIcon aria-hidden="true" /> Speak naturally to
                transcribe and explain.
              </div>
              <div
                className="mode-switch"
                aria-label="Transcript handling mode"
              >
                <button
                  type="button"
                  className={recordingMode === "automatic" ? "active" : ""}
                  onClick={() => setRecordingMode("automatic")}
                >
                  Send automatically
                </button>
                <button
                  type="button"
                  className={recordingMode === "edit" ? "active" : ""}
                  onClick={() => setRecordingMode("edit")}
                >
                  Edit before sending
                </button>
              </div>
              <Recorder
                onTranscriptReady={handleTranscript}
                disabled={loading}
              />
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
                    Translate and explain
                  </button>
                </form>
              )}
            </div>
          )}

          {tool === "Upload Image" && (
            <div className="tool-content">
              <div className="tool-intro">
                <PhotoIcon aria-hidden="true" /> Upload a prescription, report,
                or discharge notes.
              </div>
              <FileUpload
                accept="image/*"
                label="Choose image"
                onFileSelected={handleImage}
                disabled={loading}
              />
            </div>
          )}

          {tool === "Upload PDF" && (
            <div className="tool-content">
              <div className="tool-intro">
                <DocumentTextIcon aria-hidden="true" /> PDF pages are converted
                to an image in your browser before analysis.
              </div>
              <FileUpload
                accept="application/pdf"
                label="Choose PDF"
                onFileSelected={handlePdf}
                disabled={loading}
              />
            </div>
          )}

          {loading && (
            <p className="loading">Analyzing… this can take a few seconds.</p>
          )}
          {error && <p className="error">{error}</p>}
          <ResultCard result={result} />
          {result && (
            <ExportOpenEhrButton
              result={result}
              targetLanguage={targetLanguage}
            />
          )}
          {result && (
            <FollowUpChat context={result} targetLanguage={targetLanguage} />
          )}
        </section>
      </main>

      <footer>
        <small>Not a substitute for professional medical advice.</small>
      </footer>
    </div>
  );
}
