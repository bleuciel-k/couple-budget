interface DividerProps {
  label?: string;
  className?: string;
}

export function Divider({ label, className = '' }: DividerProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1" style={{ borderTop: '1.4px dotted var(--color-muted)' }} />
      {label && (
        <span className="text-sm" style={{ color: 'var(--color-muted)' }}>
          {label}
        </span>
      )}
      <div className="flex-1" style={{ borderTop: '1.4px dotted var(--color-muted)' }} />
    </div>
  );
}
