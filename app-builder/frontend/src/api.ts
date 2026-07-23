// © 2025 Preston Willis. All rights reserved.
export function setToken(token: string) {
  localStorage.setItem('app_token', token);
}
export function getToken(): string | null {
  return localStorage.getItem('app_token');
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

function apiUrl(path: string) {
  if (!API_BASE_URL) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function appUserTokenKey(projectId: string) {
  return `apptura_app_user_token:${projectId}`;
}

export function getAppUserToken(projectId: string): string | null {
  return localStorage.getItem(appUserTokenKey(projectId));
}

export function setAppUserToken(projectId: string, token: string) {
  localStorage.setItem(appUserTokenKey(projectId), token);
}

export function clearAppUserToken(projectId: string) {
  localStorage.removeItem(appUserTokenKey(projectId));
}

async function request(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(apiUrl(path), { ...options, headers, credentials: 'same-origin' });
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

async function textRequest(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(apiUrl(path), { ...options, headers, credentials: 'same-origin' });
  if (!res.ok) {
    if (res.status === 401) {
      try { localStorage.removeItem('app_token'); } catch {}
    }
    const body = await res.json().catch(() => ({}));
    const err: any = new Error(body.error || res.statusText);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return res.text();
}

async function multipartRequest(path: string, formData: FormData) {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(apiUrl(path), {
    method: 'POST',
    headers,
    body: formData,
    credentials: 'same-origin',
  });
  if (!res.ok) {
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

async function runtimeRequest(projectId: string, path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  const token = getAppUserToken(projectId);
  if (token) headers['X-Apptura-App-User-Token'] = token;

  const res = await fetch(apiUrl(path), {
    ...options,
    headers,
    credentials: 'same-origin',
  });
  if (!res.ok) {
    if (res.status === 401 && token) clearAppUserToken(projectId);
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

export type UploadedImageAsset = {
  url: string;
  blobName: string;
  contentType: string;
  size: number;
  fileName?: string;
};

export function uploadProjectImage(projectId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return multipartRequest(`/projects/${projectId}/assets/images`, formData) as Promise<UploadedImageAsset>;
}

export type ProjectAppDataRecord = {
  id: string;
  collectionId: string;
  ownerAppUserId?: string;
  sourceBlockId?: string;
  sourcePageId?: string;
  data: Record<string, string | boolean | undefined>;
  createdAt: string;
  updatedAt: string;

  // Compatibility aliases for older callers and stored records.
  appUserId?: string;
  sourceId: string;
  blockId: string;
  formBlockId: string;
  pageId: string;
  submittedAt: string;
};

export type ProjectFormSubmission = ProjectAppDataRecord;

export type ProjectAppDataField = {
  blockId: string;
  type: string;
  key: string;
  label: string;
  required: boolean;
};

export type ProjectAppDataSource = {
  id: string;
  sourceId: string;
  blockId: string;
  type: 'collection' | 'button' | 'form' | 'contactForm';
  name: string;
  pageId: string;
  pageTitle: string;
  fields: ProjectAppDataField[];
  recordCount: number;
};

export type RuntimeAppUser = {
  id: string;
  projectId: string;
  displayName: string;
  email: string;
  createdAt?: string;
};

export type RuntimeAppUserAuthResult = {
  token: string;
  user: RuntimeAppUser;
};

export async function signupRuntimeAppUser(
  projectId: string,
  credentials: { displayName?: string; email: string; password: string },
) {
  const result = await runtimeRequest(projectId, `/public/projects/${projectId}/app-auth/signup`, {
    method: 'POST',
    body: JSON.stringify(credentials),
  }) as RuntimeAppUserAuthResult;
  setAppUserToken(projectId, result.token);
  return result;
}

export async function loginRuntimeAppUser(
  projectId: string,
  credentials: { email: string; password: string },
) {
  const result = await runtimeRequest(projectId, `/public/projects/${projectId}/app-auth/login`, {
    method: 'POST',
    body: JSON.stringify(credentials),
  }) as RuntimeAppUserAuthResult;
  setAppUserToken(projectId, result.token);
  return result;
}

export function getRuntimeAppUser(projectId: string) {
  return runtimeRequest(projectId, `/public/projects/${projectId}/app-auth/me`) as Promise<{
    user: RuntimeAppUser;
  }>;
}

export function logoutRuntimeAppUser(projectId: string) {
  clearAppUserToken(projectId);
}

export function submitPublicAppDataRecord(
  projectId: string,
  sourceId: string,
  data: Record<string, string | boolean | undefined>
) {
  return runtimeRequest(projectId, `/public/projects/${projectId}/app-data/sources/${sourceId}/records`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function submitPublicProjectForm(
  projectId: string,
  blockId: string,
  data: Record<string, string | boolean | undefined>
) {
  return submitPublicAppDataRecord(projectId, blockId, data);
}

export function listProjectAppDataSources(projectId: string) {
  return request(`/projects/${projectId}/app-data/sources`) as Promise<ProjectAppDataSource[]>;
}

export function listProjectAppDataRecords(projectId: string, sourceId: string) {
  return request(`/projects/${projectId}/app-data/sources/${sourceId}/records`) as Promise<ProjectAppDataRecord[]>;
}

export function updateProjectAppDataRecord(
  projectId: string,
  sourceId: string,
  recordId: string,
  data: Record<string, string | boolean | undefined>,
) {
  return request(`/projects/${projectId}/app-data/sources/${sourceId}/records/${recordId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }) as Promise<ProjectAppDataRecord>;
}

export function deleteProjectAppDataRecord(projectId: string, sourceId: string, recordId: string) {
  return request(`/projects/${projectId}/app-data/sources/${sourceId}/records/${recordId}`, {
    method: 'DELETE',
  }) as Promise<null>;
}

export function getLatestPublicCollectionRecord(projectId: string, collectionId: string) {
  return request(
    `/public/projects/${projectId}/app-data/collections/${collectionId}/records/latest`
  ) as Promise<ProjectAppDataRecord | null>;
}

export function getPublicCollectionRecord(projectId: string, collectionId: string, recordId: string) {
  return request(
    `/public/projects/${projectId}/app-data/collections/${collectionId}/records/${recordId}`
  ) as Promise<ProjectAppDataRecord>;
}

export function exportProjectAppDataCsv(projectId: string, sourceId: string) {
  return textRequest(`/projects/${projectId}/app-data/sources/${sourceId}/records.csv`);
}

export function listProjectFormSubmissions(projectId: string, blockId: string) {
  return listProjectAppDataRecords(projectId, blockId);
}
