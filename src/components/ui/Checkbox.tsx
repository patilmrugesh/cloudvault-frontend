import { forwardRef, useEffect, useRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { Check, Minus } from 'lucide-react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  indeterminate?: boolean;
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ indeterminate = false, checked = false, onChange, label, className = '', id, disabled, ...props }, ref) => {
    const internalRef = useRef<HTMLInputElement>(null);

    // Synchronize HTML indeterminate property on DOM node
    useEffect(() => {
      const element = (ref && typeof ref !== 'function' ? ref.current : null) || internalRef.current;
      if (element) {
        element.indeterminate = Boolean(indeterminate);
      }
    }, [indeterminate, ref]);

    const setMergedRef = (el: HTMLInputElement | null) => {
      internalRef.current = el;
      if (typeof ref === 'function') {
        ref(el);
      } else if (ref) {
        ref.current = el;
      }
    };

    const isCheckedOrIndeterminate = checked || indeterminate;

    return (
      <label
        className={`inline-flex items-center gap-2 cursor-pointer select-none group ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <span className="relative flex items-center justify-center">
          <input
            type="checkbox"
            ref={setMergedRef}
            id={id}
            checked={checked}
            aria-checked={indeterminate ? 'mixed' : checked}
            disabled={disabled}
            onChange={onChange}
            className="peer sr-only"
            {...props}
          />
          <span
            className={`w-4 h-4 rounded-[4px] border transition-colors flex items-center justify-center ${
              isCheckedOrIndeterminate
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-[#141824] border-white/20 group-hover:border-white/30 text-transparent'
            } peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-[#0B0D13] ${className}`}
          >
            {indeterminate ? (
              <Minus className="w-3 h-3 stroke-[3]" aria-hidden="true" />
            ) : checked ? (
              <Check className="w-3 h-3 stroke-[3]" aria-hidden="true" />
            ) : null}
          </span>
        </span>
        {label && <span className="text-sm text-slate-200">{label}</span>}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
