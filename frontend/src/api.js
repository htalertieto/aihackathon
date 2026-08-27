// In local dev, Vite proxies '/api' to the backend (see vite.config.js).
// In production, set VITE_API_BASE_URL (e.g. https://medtranslate-api.azurewebsites.net/api)
// as a build-time env var so the deployed frontend can reach the deployed backend.
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export async function submitText({ text, targetLanguage, useMedicalGrounding }) {
  const res = await fetch(`${API_BASE}/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, targetLanguage, useMedicalGrounding }),
  });
  return handleResponse(res);
}

export async function translateChatMessage({ text, targetLanguage, sourceLanguage }) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, targetLanguage, sourceLanguage }),
  });
  return handleResponse(res);
}

export async function submitFile({ endpoint, file, targetLanguage }) {
  const form = new FormData();
  form.append('file', file);
  form.append('targetLanguage', targetLanguage);
  const res = await fetch(`${API_BASE}/${endpoint}`, {
    method: 'POST',
    body: form,
  });
  return handleResponse(res);
}

export function submitImage(args) {
  return submitFile({ ...args, endpoint: 'image' });
}

export function submitAudio(args) {
  return submitFile({ ...args, endpoint: 'audio' });
}

export async function submitFollowUp({ context, targetLanguage, history, question }) {
  const res = await fetch(`${API_BASE}/followup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context, targetLanguage, history, question }),
  });
  return handleResponse(res);
}

// Fetches an openEHR-style COMPOSITION export for the given result (and
// optional follow-up history) and returns it as a Blob for download.
export async function exportOpenEhr({ result, targetLanguage, history, patient }) {
  const res = await fetch(`${API_BASE}/export/openehr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ result, targetLanguage, history, patient, download: true }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return res.blob();
}
