export default function PageHeader({
  title,
  description,
  badge,
  actions,
  className = '',
}) {
  return (
    <div
      className={`page-header ${className}`}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 24,
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)' }}>
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p
            style={{
              margin: '4px 0 0 0',
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
            }}
          >
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {actions}
        </div>
      )}
    </div>
  );
}

