import { forwardRef, InputHTMLAttributes } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, className = '', id, ...props }, ref) => {
    const checkboxId = id || props.name;

    return (
      <div className="flex items-start gap-3">
        <div className="flex items-center h-5">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            {...props}
          />
        </div>
        <div className="text-sm">
          {label && (
            <label htmlFor={checkboxId} className="font-medium text-gray-900 cursor-pointer">
              {label}
            </label>
          )}
          {description && (
            <p className="text-gray-500 mt-0.5">{description}</p>
          )}
        </div>
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

interface RadioGroupProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; description?: string }[];
  className?: string;
}

export function RadioGroup({ name, value, onChange, options, className = '' }: RadioGroupProps) {
  return (
    <div className={className} role="radiogroup" aria-label={name}>
      {options.map((option) => (
        <label key={option.value} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="h-4 w-4 border-gray-300 text-primary-600 focus:ring-2 focus:ring-primary-500"
          />
          <div>
            <p className="font-medium text-gray-900">{option.label}</p>
            {option.description && (
              <p className="text-sm text-gray-500">{option.description}</p>
            )}
          </div>
        </label>
      ))}
    </div>
  );
}

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, description, className = '', id, ...props }, _ref) => {
    const switchId = id || props.name;

    return (
      <div className="flex items-center gap-3">
        <button
          role="switch"
          aria-checked={props.checked}
          onClick={() => props.onChange?.({ target: { checked: !props.checked } } as any)}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
            props.checked ? 'bg-primary-600' : 'bg-gray-200'
          } ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
          disabled={props.disabled}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
              props.checked ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
        <div className="text-sm">
          {label && (
            <label htmlFor={switchId} className="font-medium text-gray-900 cursor-pointer">
              {label}
            </label>
          )}
          {description && (
            <p className="text-gray-500 mt-0.5">{description}</p>
          )}
        </div>
      </div>
    );
  }
);

Switch.displayName = 'Switch';