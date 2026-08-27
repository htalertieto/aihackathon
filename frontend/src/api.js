const API_BASE = '/api';

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

export function submitPdf(args) {
  return submitFile({ ...args, endpoint: 'pdf' });
}

export function submitAudio(args) {
  return submitFile({ ...args, endpoint: 'audio' });
}
