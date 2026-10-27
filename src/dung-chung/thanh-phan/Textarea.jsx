import './FormControls.css';

export default function Textarea({
  label,
  id,
  name,
  value,
  onChange,
  placeholder,
  rows = 3,
  required = false,
  error,
  hint,
  disabled = false,
  className = '',
  ...props
}) {
  const textareaId = id || name;

  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label htmlFor={textareaId} className="form-label">
          {label}
          {required && <span className="required-mark">*</span>}
        </label>
      )}
      <textarea
        id={textareaId}
        name={name}
        rows={rows}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`form-control ${error ? 'has-error' : ''}`}
        {...props}
      />
      {error && <span className="form-error">{error}</span>}
      {hint && !error && <span className="form-hint">{hint}</span>}
    </div>
  );
}

