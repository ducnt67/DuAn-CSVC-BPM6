export function updateExternalWorkInList(works, id, updates) {
  return works.map((work) =>
    work.id === id ? { ...work, ...updates } : work
  );
}

export function addExternalWorkToList(works, work) {
  return [work, ...works];
}
