import React, { useState, useEffect, useRef } from 'react';

interface EditableCellProps {
  value: string | number;
  onChange: (newValue: string) => void;
  type?: 'text' | 'select' | 'date' | 'number';
  options?: { label: string; value: string; color?: string; bg?: string }[];
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  isDateUrgent?: 'overdue' | 'today' | 'future' | 'none';
  formatter?: (val: any) => string;
}

export const EditableCell: React.FC<EditableCellProps> = ({
  value,
  onChange,
  type = 'text',
  options = [],
  placeholder = '',
  className = '',
  inputClassName = '',
  isDateUrgent = 'none',
  formatter,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState<string>(String(value ?? ''));
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  // Sync internal state when external value changes
  useEffect(() => {
    setCurrentValue(String(value ?? ''));
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (type === 'text' || type === 'number') {
        (inputRef.current as HTMLInputElement).select?.();
      }
    }
  }, [isEditing, type]);

  const handleSave = () => {
    setIsEditing(false);
    if (currentValue !== String(value ?? '')) {
      onChange(currentValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setCurrentValue(String(value ?? ''));
      setIsEditing(false);
    }
  };

  // If type is select, render styled select directly or on-focus
  if (type === 'select') {
    const selectedOption = options.find((o) => o.value === String(value));
    return (
      <div className={`relative w-full h-full flex items-center ${className}`}>
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full h-full bg-transparent px-2 py-1.5 text-xs font-semibold rounded cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:bg-white border-0 ${
            selectedOption?.bg || 'hover:bg-slate-100/80 text-slate-800'
          } ${selectedOption?.color || ''} ${inputClassName}`}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-white text-slate-800 font-normal">
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Active editing view
  if (isEditing) {
    if (type === 'date') {
      return (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="date"
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className={`w-full h-full bg-white border border-[#D4AF37] px-2 py-1 text-xs font-mono font-bold text-slate-800 rounded focus:outline-none focus:ring-2 focus:ring-[#D4AF37] shadow-inner ${inputClassName}`}
        />
      );
    }

    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={type === 'number' ? 'number' : 'text'}
        value={currentValue}
        onChange={(e) => setCurrentValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full h-full bg-white border border-[#0B1B32] px-2 py-1 text-xs text-slate-900 rounded focus:outline-none focus:ring-2 focus:ring-[#0B1B32] shadow-inner ${inputClassName}`}
      />
    );
  }

  // Non-editing (read & click-to-edit) view
  const displayValue = formatter ? formatter(value) : (value ? String(value) : '');

  return (
    <div
      onClick={() => setIsEditing(true)}
      tabIndex={0}
      onFocus={() => setIsEditing(true)}
      className={`w-full h-full min-h-[32px] px-2.5 py-1.5 flex items-center cursor-pointer transition-all hover:bg-amber-50/50 focus:bg-amber-50/70 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] group relative ${className}`}
      title="Click to edit cell inline"
    >
      {displayValue ? (
        <span className="truncate block w-full text-slate-800">{displayValue}</span>
      ) : (
        <span className="text-slate-300 italic text-[11px] select-none">{placeholder || '—'}</span>
      )}
      
      {/* Subtle Excel edit indicator on hover */}
      <span className="absolute right-1 top-1 w-1.5 h-1.5 rounded-full bg-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};
