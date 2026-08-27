import { useRef, useState } from 'react';

export default function Recorder({ onRecordingReady, disabled }) {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      stream.getTracks().forEach((t) => t.stop());
      onRecordingReady(blob);
    };

    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
    setRecording(true);
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  return (
    <div className="recorder">
      {!recording ? (
        <button type="button" disabled={disabled} onClick={startRecording}>
          🎙️ Start recording
        </button>
      ) : (
        <button type="button" className="danger" onClick={stopRecording}>
          ⏹️ Stop recording
        </button>
      )}
      {recording && <span className="pulse">Recording…</span>}
    </div>
  );
}
