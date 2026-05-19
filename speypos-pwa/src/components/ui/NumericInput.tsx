import React, { useState, useEffect } from 'react';
import { Input } from './input';

interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  allowDecimal?: boolean;
}

export const NumericInput = ({
  value,
  onChange,
  min,
  max,
  allowDecimal = false,
  ...props
}: NumericInputProps) => {
  const [internalValue, setInternalValue] = useState<string>(value.toString());
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    // Sync internal state when external value changes, but only if not focused
    // to avoid cursor jumping while typing
    if (!isFocused) {
      setInternalValue(value.toString());
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    // Regex for integer or decimal based on allowDecimal prop
    const regex = allowDecimal ? /^\d*\.?\d*$/ : /^\d*$/;

    if (val === '' || regex.test(val)) {
      setInternalValue(val);

      // If valid number, notify parent immediately but don't force snap-back yet
      if (val !== '' && val !== '.') {
        const num = allowDecimal ? parseFloat(val) : parseInt(val, 10);
        if (!isNaN(num)) {
          onChange(num);
        }
      }
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    let finalValue = allowDecimal ? parseFloat(internalValue) : parseInt(internalValue, 10);

    if (isNaN(finalValue)) {
      finalValue = min ?? 0;
    }

    // Clamp to range
    if (min !== undefined) finalValue = Math.max(min, finalValue);
    if (max !== undefined) finalValue = Math.min(max, finalValue);

    setInternalValue(finalValue.toString());
    onChange(finalValue);

    // Call external onBlur if provided
    if (props.onBlur) props.onBlur(e);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    if (props.onFocus) props.onFocus(e);
  };

  return (
    <Input
      {...props}
      type="text"
      inputMode={allowDecimal ? "decimal" : "numeric"}
      value={internalValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
    />
  );
};
