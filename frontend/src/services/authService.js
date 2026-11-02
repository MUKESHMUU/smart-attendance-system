import { api, setToken } from './api.js';

export async function login(identifier, password) {
  const data = await api.post('/auth/login', { identifier, password });
  setToken(data.token);
  return data.user;
}
export async function logout() {
  try { await api.post('/auth/logout'); } catch { /* token may already be invalid */ }
  setToken(null);
}
export const fetchMe = () => api.get('/auth/me');
