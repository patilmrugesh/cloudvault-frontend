import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-150 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0D13] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98] transition-transform';

    const sizeStyles = {
      sm: 'text-xs px-2.5 py-1.5 gap-1.5 h-8',
      md: 'text-sm px-3.5 py-2 gap-2 h-9',
      lg: 'text-sm px-4.5 py-2.5 gap-2.5 h-11',
    }[size];

    const variantStyles = {
      primary:
        'bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-900/30 border border-blue-500/40 focus-visible:ring-blue-500',
      secondary:
        'bg-[#1E2433] hover:bg-[#252D3F] text-slate-200 border border-white/10 hover:border-white/15 focus-visible:ring-slate-400',
      destructive:
        'bg-rose-600/90 hover:bg-rose-600 text-white shadow-sm shadow-rose-950/40 border border-rose-500/40 focus-visible:ring-rose-500',
      outline:
        'bg-transparent hover:bg-white/5 text-slate-300 border border-white/15 hover:border-white/25 focus-visible:ring-slate-400',
      ghost:
        'bg-transparent hover:bg-white/5 text-slate-300 hover:text-white focus-visible:ring-slate-400',
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
