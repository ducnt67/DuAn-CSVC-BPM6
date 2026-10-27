export function updateFacilityInList(facilities, id, updates) {
  return facilities.map((facility) =>
    facility.id === id ? { ...facility, ...updates } : facility
  );
}

export function addFacilityToList(facilities, facility) {
  return [facility, ...facilities];
}
