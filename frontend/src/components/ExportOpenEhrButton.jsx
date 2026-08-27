import { useState } from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { exportOpenEhr } from '../api.js';
import { hashKey } from './FollowUpChat.jsx';

// Reads the browser-only follow-up history (if any) for this result so the
// export can optionally include it, matching the storage key FollowUpChat
// uses. Nothing is sent to/stored on the server other than this one-off
// export request.
function readFollowUpHistory(result) {
  try {
    const key = hashKey({ sourceText: result?.sourceText, summary: result?.summary });
    const saved = sessionStorage.getItem(key);
    if (!saved) return [];
    return JSON.parse(saved).map(({ role, text }) => ({ role, text }));
  } catch {
    return [];
  }
}

/**
 * Button to download the current analysis (and any follow-up conversation)
 * as an openEHR-style COMPOSITION JSON file, via the backend-only
 * POST /api/export/openehr endpoint.
 */
export default function ExportOpenEhrButton({ result, targetLanguage }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  async function handleExport() {
    setDownloading(true);
    setError('');
    try {
      const history = readFollowUpHistory(result);
      const blob = await exportOpenEhr({ result, targetLanguage, history });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'openehr-composition.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'Export failed');
    } finally {
      setDownloading(false);
    }
  }

  if (!result) return null;

  return (
    <div className="export-openehr">
      <button
        type="button"
        className="export-openehr-btn"
        onClick={handleExport}
        disabled={downloading}
      >
        <ArrowDownTrayIcon aria-hidden="true" />
        {downloading ? 'Preparing export…' : 'Export as openEHR data'}
      </button>
      {error && <p className="error">⚠️ {error}</p>}
    </div>
  );
}
