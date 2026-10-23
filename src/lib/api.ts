const API = 'http://localhost:3001/api';
const USER_KEY = 'tvc-user-id';

export function getUserId() { return localStorage.getItem(USER_KEY); }
export function setUserId(id: string) { localStorage.setItem(USER_KEY, id); }

async function req(path: string, opts: RequestInit = {}) {
  const id = getUserId();
  const res = await fetch(API + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'x-user-id': id || '', ...opts.headers }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const api = {
  createUser: (data: any) => req('/users', { method: 'POST', body: JSON.stringify(data) }),
  me: () => req('/me'),
  updateMe: (data: any) => req('/me', { method: 'PUT', body: JSON.stringify(data) }),
  scenarios: () => req('/scenarios'),
  createScenario: (data: any) => req('/scenarios', { method: 'POST', body: JSON.stringify(data) }),
  updateScenario: (id: string, data: any) => req(`/scenarios/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  publishScenario: (id: string) => req(`/scenarios/${id}/publish`, { method: 'POST' }),
  versions: (id: string) => req(`/scenarios/${id}/versions`),
  saveProgress: (data: any) => req('/progress', { method: 'POST', body: JSON.stringify(data) }),
  progress: () => req('/progress'),
  saveState: (state: any) => req('/state', { method: 'PUT', body: JSON.stringify(state) }),
  loadState: () => req('/state'),
};

export async function ensureUser(profile: any = {}) {
  let id = getUserId();
  if (!id) {
    const u = await api.createUser({ name: 'Student', role: 'student', ...profile });
    setUserId(u.id);
    id = u.id;
  }
  return id;
}
