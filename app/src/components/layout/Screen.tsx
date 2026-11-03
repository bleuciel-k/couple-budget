import type { ReactNode } from 'react';

interface ScreenProps {
  children: ReactNode;
  className?: string;
  scrollable?: boolean;
}

export function Screen({ children, className = '', scrollable = false }: ScreenProps) {
  return (
    <div
      className={`screen-transition flex flex-col flex-1 min-h-0 w-full ${scrollable ? 'overflow-y-auto' : 'overflow-hidden'} ${className}`}
      style={{ background: 'var(--color-paper)' }}
    >
      {children}
    </div>
  );
}
