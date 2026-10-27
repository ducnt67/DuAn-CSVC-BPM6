import { Search, X } from 'lucide-react';
import './FormControls.css';

export default function SearchInput({
  value = '',
  onChange,
  placeholder = 'Tìm kiếm...',
  onClear,
  className = '',
  style = {},
}) {
  return (
    <div
      className={`input-wrapper search-input-wrapper ${className}`}
      style={{ maxWidth: 320, ...style }}
    >
      <span className="input-icon-left">
        <Search size={18} />
      </span>
      <input
        type="text"
        className="form-control has-icon-left has-icon-right"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('');
            if (onClear) onClear();
          }}
          className="input-icon-right"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          aria-label="Xóa tìm kiếm"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

