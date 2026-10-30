const ACCESS_TOKEN_KEY = 'due_fm_access_token';
const REFRESH_TOKEN_KEY = 'due_fm_refresh_token';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

function getTokenStorage() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY) !== null
    ? window.localStorage
    : window.sessionStorage;
}

function getAccessToken() {
  return (
    window.localStorage.getItem(ACCESS_TOKEN_KEY) ||
    window.sessionStorage.getItem(ACCESS_TOKEN_KEY)
  );
}

function getRefreshToken() {
  return (
    window.localStorage.getItem(REFRESH_TOKEN_KEY) ||
    window.sessionStorage.getItem(REFRESH_TOKEN_KEY)
  );
}

function clearTokens() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}

function saveTokens(tokens, rememberMe) {
  clearTokens();
  const storage = rememberMe ? window.localStorage : window.sessionStorage;
  storage.setItem(ACCESS_TOKEN_KEY, tokens.access);
  storage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
}

function getErrorMessage(data, fallback) {
  if (typeof data?.detail === 'string') return data.detail;
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object') {
    const messages = Object.entries(data).flatMap(([field, value]) => {
      const values = Array.isArray(value) ? value : [value];
      return values.map((message) =>
        typeof message === 'string' ? `${field}: ${message}` : `${field}: dữ liệu không hợp lệ`
      );
    });
    if (messages.length) return messages.join(' ');
  }
  return fallback;
}

async function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) return false;

  const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });
  if (!response.ok) {
    clearTokens();
    return false;
  }
  const tokens = await response.json();
  const storage = getTokenStorage();
  if (!storage) return false;
  storage.setItem(ACCESS_TOKEN_KEY, tokens.access);
  if (tokens.refresh) storage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
  return true;
}

export async function apiRequest(path, options = {}, canRefresh = true) {
  const url = path.startsWith('http')
    ? path
    : `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(options.headers || {});
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let body = options.body;
  if (body !== undefined && !(body instanceof FormData) && typeof body !== 'string') {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(body);
  }

  const response = await fetch(url, { ...options, headers, body });
  if (response.status === 401 && canRefresh && (await refreshAccessToken())) {
    return apiRequest(path, options, false);
  }

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text();
  if (!response.ok) {
    if (response.status === 401) clearTokens();
    throw new Error(getErrorMessage(data, `Máy chủ từ chối yêu cầu (${response.status}).`));
  }
  return data;
}

export async function signIn(username, password, rememberMe = true) {
  clearTokens();
  const tokens = await apiRequest(
    '/auth/token/',
    { method: 'POST', body: { username: username.trim(), password } },
    false
  );
  saveTokens(tokens, rememberMe);
  try {
    return await apiRequest('/auth/me/');
  } catch (error) {
    clearTokens();
    throw error;
  }
}

export function signOut() {
  clearTokens();
}

export function hasSession() {
  return Boolean(getAccessToken() && getRefreshToken());
}

export function getCurrentUser() {
  return hasSession() ? apiRequest('/auth/me/') : Promise.resolve(null);
}
