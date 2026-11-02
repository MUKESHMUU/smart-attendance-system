// The ONLY place the frontend talks to the backend.
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const KEY = 'sa_token'; // sessionStorage: cleared when the tab closes. Real data lives on the server.

export const getToken = () => sessionStorage.getItem(KEY);
export const setToken = (t) => (t ? sessionStorage.setItem(KEY, t) : sessionStorage.removeItem(KEY));

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

async function request(method, path, body, { raw = false } = {}) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. Is the backend running?');
  }
  if (res.status === 401 && getToken()) onUnauthorized();
  if (!res.ok) {
    let msg = 'Something went wrong.';
    try { msg = (await res.json()).message || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return raw ? res.blob() : res.json();
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b),
  put: (p, b) => request('PUT', p, b),
  del: (p) => request('DELETE', p),
  blob: (p) => request('GET', p, null, { raw: true }),
};

export const qs = (obj) => {
  const p = new URLSearchParams(Object.entries(obj).filter(([, v]) => v));
  const s = p.toString();
  return s ? `?${s}` : '';
};
