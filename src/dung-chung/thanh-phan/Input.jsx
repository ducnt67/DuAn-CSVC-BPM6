import './FormControls.css';

export default function Input({
  label,
  id,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  error,
  hint,
  disabled = false,
  iconLeft: IconLeft,
  iconRight: IconRight,
  className = '',
  ...props
}) {
  const inputId = id || name;

  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label htmlFor={inputId} className="form-label">
          {typeof label === 'string' && required ? label.replace(/\s*\*+$/, '') : label}
          {required && <span className="required-mark">*</span>}
        </label>
      )}
      <div className="input-wrapper">
        {IconLeft && (
          <span className="input-icon-left">
            <IconLeft size={18} />
          </span>
        )}
        <input
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`form-control ${error ? 'has-error' : ''} ${IconLeft ? 'has-icon-left' : ''} ${IconRight ? 'has-icon-right' : ''}`}
          {...props}
        />
        {IconRight && (
          <span className="input-icon-right">
            <IconRight size={18} />
          </span>
        )}
      </div>
      {error && <span className="form-error">{error}</span>}
      {hint && !error && <span className="form-hint">{hint}</span>}
    </div>
  );
}

