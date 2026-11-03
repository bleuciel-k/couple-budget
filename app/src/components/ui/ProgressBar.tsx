interface ProgressBarProps {
  value: number; // 0-100
  color?: 'accent' | 'accent2' | 'green';
  height?: number;
  showOverflow?: boolean;
}

export function ProgressBar({ value, color = 'accent', height = 8, showOverflow = true }: ProgressBarProps) {
  const clamped = showOverflow ? Math.min(value, 100) : value;
  const isOver = value > 90;

  const barColor =
    isOver && showOverflow
      ? 'var(--color-grapefruit)'
      : color === 'accent2'
      ? 'var(--color-accent2)'
      : color === 'green'
      ? 'var(--color-positive)'
      : 'var(--color-accent)';

  return (
    <div
      className="w-full rounded-full overflow-hidden"
      style={{ height, background: 'var(--color-accent-soft)' }}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${clamped}%`, background: barColor }}
      />
    </div>
  );
}
