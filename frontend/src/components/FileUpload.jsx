import { useRef, useState } from 'react';

export default function FileUpload({ accept, label, onFileSelected, disabled }) {
  const inputRef = useRef(null);
  const [fileName, setFileName] = useState('');

  function handleChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      onFileSelected(file);
    }
  }

  return (
    <div className="file-upload">
      <button type="button" disabled={disabled} onClick={() => inputRef.current?.click()}>
        {label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      {fileName && <span className="file-name">{fileName}</span>}
    </div>
  );
}
