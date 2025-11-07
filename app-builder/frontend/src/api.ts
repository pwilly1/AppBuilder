export function setToken(token: string) {
  localStorage.setItem('app_token', token);
}
export function getToken(): string | null {
  return localStorage.getItem('app_token');
}

async function request(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(path, { ...options, headers, credentials: 'same-origin' });
  if (!res.ok) {
    // If unauthorized, clear stored token so the app can fall back to login
    if (res.status === 401) {
      try { localStorage.removeItem('app_token'); } catch {}
    }
    const body = await res.json().catch(() => ({}));
    const err: any = new Error(body.error || res.statusText);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return res.json().catch(() => null);
}

export function signup(username: string, email: string, password: string) {
  return request('/auth/signup', { method: 'POST', body: JSON.stringify({ username, email, password }) });
}

export function login(username: string, password: string) {
  return request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
}

export function guest(){
  return request('/auth/createGuestSession')
}

export function getMe() {
  return request('/auth/me');
}

export function listProjects() {
  return request('/projects');
}

export function createProject(payload: string | any) {
  const body = typeof payload === 'string' ? { name: payload } : payload;
  return request('/projects', { method: 'POST', body: JSON.stringify(body) });
}

export function updateProject(id: string, updates: any) {
  return request(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteProject(id: string) {
  return request(`/projects/${id}`, { method: 'DELETE' });
}

export function getProject(id: string) {
  return request(`/projects/${id}`);
}
