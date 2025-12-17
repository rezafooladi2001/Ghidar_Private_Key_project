import React from 'react';
import styles from './Input.module.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  rightElement?: React.ReactNode;
}

export function Input({
  label,
  error,
  helperText,
  rightElement,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className={`${styles.wrapper} ${className}`}>
      {label && <label className={styles.label}>{label}</label>}
      <div className={`${styles.inputWrapper} ${error ? styles.hasError : ''}`}>
        <input className={styles.input} {...props} />
        {rightElement && <div className={styles.rightElement}>{rightElement}</div>}
      </div>
      {error && <span className={styles.error}>{error}</span>}
      {helperText && !error && <span className={styles.helper}>{helperText}</span>}
    </div>
  );
}

interface NumberInputProps extends Omit<InputProps, 'type' | 'onChange'> {
  value: string | number;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  ...props
}: NumberInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    
    // Allow empty string or valid number
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      onChange(val);
    }
  };

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={handleChange}
      min={min}
      max={max}
      {...props}
    />
  );
}

