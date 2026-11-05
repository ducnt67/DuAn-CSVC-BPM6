import { apiRequest } from './apiClient';

const kindPath = (kind) => kind.toLowerCase().replace(/_/g, '-');

export function getAiStatus() {
  return apiRequest('/ai/status/');
}

export function getRequestAiState(requestId) {
  return apiRequest(`/requests/${requestId}/ai/`);
}

export function runRequestAi(requestId, kind) {
  return apiRequest(`/requests/${requestId}/ai/${kindPath(kind)}/`, { method: 'POST' });
}

export function dismissSuggestion(suggestionId, note = '') {
  return apiRequest(`/ai/suggestions/${suggestionId}/dismiss/`, { method: 'POST', body: { note } });
}

export function applyTriage(requestId, { priority, issueCategory, note }) {
  return apiRequest(`/requests/${requestId}/triage/`, {
    method: 'POST',
    body: { priority, issueCategory, note },
  });
}

export function assignInspector(requestId, staffId, note = '') {
  return apiRequest(`/requests/${requestId}/assign-inspector/`, {
    method: 'POST',
    body: { staffId, note },
  });
}

export function previewTriage(draft) {
  return apiRequest('/ai/triage-preview/', { method: 'POST', body: draft });
}

export function askAssistant(message, history = []) {
  return apiRequest('/ai/chat/', { method: 'POST', body: { message, history } });
}

export function listSuggestions(params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  ).toString();
  return apiRequest(`/ai/suggestions/${query ? `?${query}` : ''}`);
}

export function getAiStats() {
  return apiRequest('/ai/stats/');
}
