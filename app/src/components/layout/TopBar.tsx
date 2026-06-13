import type { ReactNode } from 'react';

interface TopBarProps {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
}

export function TopBar({ title, subtitle, left, right }: TopBarProps) {
  return (
    <div
      className="flex items-center gap-2 px-4 pt-12 pb-3 bg-[var(--color-paper)]"
      style={{ boxShadow: '0 10px 24px rgba(31,42,68,0.04)', zIndex: 1 }}
    >
      <div className="w-14 flex items-center gap-2">{left}</div>
      <div className="flex-1 text-center">
        <div className="text-xl font-semibold" style={{ color: 'var(--color-ink)' }}>
          {title}
        </div>
        {subtitle && (
          <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
            {subtitle}
          </div>
        )}
      </div>
      <div className="w-14 flex justify-end items-center gap-2">{right}</div>
    </div>
  );
}
