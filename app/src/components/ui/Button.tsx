import type { ReactNode, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'filled' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export function Button({
  children,
  variant = 'outline',
  size = 'md',
  fullWidth = false,
  className = '',
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50';

  const variants = {
    filled: 'text-white',
    outline: 'bg-white/70',
    ghost: 'border-0 bg-transparent',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-5 py-3 text-lg',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      style={{
        border: variant === 'ghost' ? 'none' : '1px solid var(--color-line)',
        background: variant === 'filled' ? 'var(--color-accent)' : undefined,
        color: variant === 'filled' ? '#fff' : 'var(--color-ink)',
        boxShadow: variant === 'filled' ? 'var(--shadow-button)' : variant === 'outline' ? 'var(--shadow-soft)' : undefined,
      }}
      {...props}
    >
      {children}
    </button>
  );
}
