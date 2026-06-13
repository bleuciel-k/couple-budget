import type { ReactNode } from 'react';

interface ScreenProps {
  children: ReactNode;
  className?: string;
  scrollable?: boolean;
}

export function Screen({ children, className = '', scrollable = false }: ScreenProps) {
  return (
    <div
      className={`flex flex-col flex-1 ${scrollable ? 'overflow-y-auto' : 'overflow-hidden'} ${className}`}
      style={{ background: 'var(--color-paper)' }}
    >
      {children}
    </div>
  );
}
