function isStorageAvailable() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

export function readStorage(key, defaultValue) {
  if (!isStorageAvailable()) return defaultValue;

  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function writeStorage(key, value) {
  if (!isStorageAvailable()) return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('Error saving data to localStorage:', error);
  }
}

export function removeStorage(key) {
  if (!isStorageAvailable()) return;
  window.localStorage.removeItem(key);
}

export function hasStorageKey(key) {
  return isStorageAvailable() && Boolean(window.localStorage.getItem(key));
}
