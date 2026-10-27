export function updateRequestInList(requests, id, updates) {
  return requests.map((request) =>
    request.id === id ? { ...request, ...updates } : request
  );
}

export function addRequestToList(requests, request) {
  return [request, ...requests];
}
