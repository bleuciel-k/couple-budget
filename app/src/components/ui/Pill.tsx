import type { ReactNode } from 'react';

interface PillProps {
  children: ReactNode;
  tone?: 'accent' | 'accent2' | 'neutral';
  className?: string;
}

export function Pill({ children, tone = 'neutral', className = '' }: PillProps) {
  const bg =
    tone === 'accent'
      ? 'var(--color-accent)'
      : tone === 'accent2'
      ? 'var(--color-accent2)'
      : 'transparent';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${className}`}
      style={{
        background: bg,
        border: '1px solid var(--color-line)',
        color: 'var(--color-ink)',
        boxShadow: tone === 'neutral' ? undefined : '0 6px 14px rgba(31,42,68,0.06)',
      }}
    >
      {children}
    </span>
  );
}
