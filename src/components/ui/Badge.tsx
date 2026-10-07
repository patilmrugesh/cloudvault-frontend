import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'purple';
  size?: 'sm' | 'md';
  className?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
  icon,
}) => {
  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1 font-medium',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
  }[size];

  const variantStyles = {
    neutral: 'bg-white/5 text-slate-300 border border-white/10',
    primary: 'bg-blue-500/10 text-blue-400 border border-blue-500/25',
    success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25',
    warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/25',
    danger: 'bg-rose-500/10 text-rose-400 border border-rose-500/25',
    purple: 'bg-purple-500/10 text-purple-300 border border-purple-500/25',
  }[variant];

  return (
    <span
      className={`inline-flex items-center rounded-md select-none ${sizeStyles} ${variantStyles} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
