import React from 'react';
import { FiAlertCircle } from 'react-icons/fi';

/**
 * Reusable form field wrapper that displays label, children (input/select/textarea),
 * and an inline error message below the field.
 *
 * Usage:
 *   <FormField label="Email" error={errors.email} required>
 *     <input ... className={`input-field ${errors.email ? 'input-error' : ''}`} />
 *   </FormField>
 */
export default function FormField({
  label,
  error,
  required = false,
  className = '',
  children,
  labelClassName = '',
}) {
  return (
    <div className={className}>
      {label && (
        <label className={`block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ${labelClassName}`}>
          {label}
          {required && <span className="text-danger-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="mt-1.5 text-sm text-danger-600 dark:text-danger-400 flex items-center gap-1.5 animate-fade-in">
          <FiAlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
