import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string; // Required for accessibility!
  icon: ReactNode;
  variant?: 'ghost' | 'secondary' | 'outline' | 'destructive' | 'primary';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      variant = 'ghost',
      size = 'md',
      isLoading = false,
      className = '',
      disabled,
      title,
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-lg transition-colors select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0D13] disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform';

    const sizeStyles = {
      xs: 'w-7 h-7 text-xs',
      sm: 'w-8 h-8 text-sm',
      md: 'w-9 h-9 text-base',
      lg: 'w-10 h-10 text-lg',
    }[size];

    const variantStyles = {
      ghost: 'bg-transparent text-slate-400 hover:text-slate-100 hover:bg-white/5 focus-visible:ring-slate-400',
      secondary: 'bg-[#1C2230] text-slate-300 hover:text-white hover:bg-[#242C3E] border border-white/10 focus-visible:ring-slate-400',
      outline: 'bg-transparent text-slate-400 hover:text-slate-100 border border-white/15 hover:border-white/25 hover:bg-white/5 focus-visible:ring-slate-400',
      primary: 'bg-blue-600 text-white hover:bg-blue-500 shadow-sm border border-blue-500/30 focus-visible:ring-blue-500',
      destructive: 'bg-rose-500/10 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 border border-rose-500/20 focus-visible:ring-rose-500',
    }[variant];

    return (
      <button
        ref={ref}
        aria-label={ariaLabel}
        title={title || ariaLabel}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" aria-hidden="true" />
        ) : (
          icon
        )}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
