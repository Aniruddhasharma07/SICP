import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'tertiary' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg sicp-btn-interactive transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none active:scale-[0.98] select-none cursor-pointer';

    const variants = {
      primary: 'bg-blue-600 text-white hover:bg-blue-500 shadow-xs hover:shadow focus-visible:ring-blue-500 font-semibold',
      secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-700 font-semibold focus-visible:ring-slate-400',
      outline: 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold shadow-2xs focus-visible:ring-slate-400',
      ghost: 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold focus-visible:ring-slate-400',
      destructive: 'bg-rose-600 text-white hover:bg-rose-500 shadow-xs focus-visible:ring-rose-500 font-semibold',
      tertiary: 'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700/80 font-semibold focus-visible:ring-slate-500',
      success: 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-xs focus-visible:ring-emerald-500 font-semibold',
      warning: 'bg-amber-600 text-white hover:bg-amber-500 shadow-xs focus-visible:ring-amber-500 font-semibold',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs gap-1.5',
      md: 'h-10 px-4 text-sm gap-2',
      lg: 'h-12 px-6 text-base gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
