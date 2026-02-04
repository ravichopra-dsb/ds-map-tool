import React, { useState, useEffect, useRef } from "react";

export interface EditableSliderValueProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  format: 'percent' | 'decimal' | 'px' | 'degrees';
  decimalPlaces?: number;
  /** Optional suffix to append after the formatted value (e.g., 'x' for scale) */
  suffix?: string;
}

export const EditableSliderValue: React.FC<EditableSliderValueProps> = ({
  value,
  onChange,
  min,
  max,
  step,
  format,
  decimalPlaces = 1,
  suffix = '',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Format value for display
  const getDisplayValue = () => {
    let displayValue: string;
    switch (format) {
      case 'percent':
        displayValue = `${Math.round(value * 100)}%`;
        break;
      case 'decimal':
        displayValue = `${value.toFixed(decimalPlaces)}`;
        break;
      case 'px':
        displayValue = `${value}px`;
        break;
      case 'degrees':
        displayValue = `${Math.round(value)}°`;
        break;
      default:
        displayValue = String(value);
    }
    return displayValue + suffix;
  };

  // Get raw value for input (convert from internal to display format)
  const getInputValue = () => {
    switch (format) {
      case 'percent':
        return Math.round(value * 100);
      case 'decimal':
        return value.toFixed(decimalPlaces);
      case 'px':
      case 'degrees':
        return Math.round(value);
      default:
        return value;
    }
  };

  // Convert input to internal value
  const parseInputValue = (input: string): number | null => {
    const numericValue = parseFloat(input);
    if (isNaN(numericValue)) return null;

    let internalValue: number;
    switch (format) {
      case 'percent':
        // Input is 0-100, convert to 0-1
        internalValue = numericValue / 100;
        break;
      default:
        internalValue = numericValue;
    }

    // Clamp to min/max
    return Math.max(min, Math.min(max, internalValue));
  };

  const handleClick = () => {
    setInputValue(String(getInputValue()));
    setIsEditing(true);
  };

  const handleSave = () => {
    const parsed = parseInputValue(inputValue);
    if (parsed !== null) {
      onChange(parsed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  const handleBlur = () => {
    handleSave();
  };

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        step={format === 'percent' ? 1 : step}
        className="w-16 px-1 py-0 text-sm text-right bg-white dark:bg-slate-700 border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    );
  }

  return (
    <span
      onClick={handleClick}
      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 px-1 rounded transition-colors"
      title="Click to edit"
    >
      {getDisplayValue()}
    </span>
  );
};

export default EditableSliderValue;
