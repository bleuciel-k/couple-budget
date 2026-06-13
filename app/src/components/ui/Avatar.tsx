import type { AvatarTone } from '../../types';

interface AvatarProps {
  letter: string;
  tone?: AvatarTone;
  size?: number;
  ghost?: boolean;
  className?: string;
}

export function Avatar({ letter, tone = 'accent', size = 32, ghost = false, className = '' }: AvatarProps) {
  const bg = ghost
    ? 'transparent'
    : tone === 'accent'
    ? 'var(--color-accent)'
    : 'var(--color-accent2)';

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full font-semibold flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: bg,
        border: '1px solid var(--color-line)',
        boxShadow: ghost ? 'none' : '0 8px 18px rgba(31,42,68,0.08)',
        fontSize: size * 0.45,
        color: 'var(--color-ink)',
      }}
    >
      {letter}
    </div>
  );
}
