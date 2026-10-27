export default function LoadingState({ message = 'Đang tải dữ liệu...' }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 24px',
        gap: 16,
        color: 'var(--color-text-secondary)',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          border: '3px solid var(--color-border)',
          borderTopColor: 'var(--color-blue)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <span style={{ fontSize: 'var(--font-size-sm)' }}>{message}</span>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

