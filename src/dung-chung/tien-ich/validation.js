export function validateRequired(value, fieldName) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return `${fieldName} là bắt buộc`;
  }
  return null;
}

export function validateMinLength(value, min, fieldName) {
  if (value && String(value).trim().length < min) {
    return `${fieldName} phải có ít nhất ${min} ký tự`;
  }
  return null;
}

export function validateForm(fields) {
  const errors = {};
  let hasError = false;
  for (const [key, rules] of Object.entries(fields)) {
    for (const rule of rules) {
      const error = rule();
      if (error) {
        errors[key] = error;
        hasError = true;
        break;
      }
    }
  }
  return { errors, isValid: !hasError };
}

