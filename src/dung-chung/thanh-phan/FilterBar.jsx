export default function FilterBar({ children, className = '', onReset, hasActiveFilters }) {
  return (
    <div
      className={`filter-bar ${className}`}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 12,
        padding: '14px 18px',
        backgroundColor: 'var(--color-white)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        marginBottom: 16,
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, flex: 1 }}>
        {children}
      </div>

      {hasActiveFilters && onReset && (
        <button
          type="button"
          onClick={onReset}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-blue)',
            fontSize: 'var(--font-size-sm)',
            cursor: 'pointer',
            padding: '4px 8px',
            textDecoration: 'underline',
          }}
        >
          Xóa bộ lọc
        </button>
      )}
    </div>
  );
}

