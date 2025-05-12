
'use client';

import React, { useState, useEffect, useRef, ChangeEvent, KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // Keep Label import for parent component usage if needed
import { cn } from '@/lib/utils';
import { isValidOctet as validateOctetString } from '@/lib/ip-utils';

interface IpOctetInputProps {
  // Removed label prop as it will be handled by the parent (IpRangeInput)
  idPrefix: string;
  value: string; // Full IP string e.g., "192.168.1.1"
  onChange: (ip: string) => void;
  disabled?: boolean;
  onEnterPress?: () => void;
}

export const IpOctetInput: React.FC<IpOctetInputProps> = ({
  idPrefix,
  value,
  onChange,
  disabled,
  onEnterPress,
}) => {
  const [octets, setOctets] = useState<[string, string, string, string]>(['', '', '', '']);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value === octets.join('.')) return;

    const parts = value.split('.');
    if (parts.length === 4) {
      const newOctets = parts.map(part => (validateOctetString(part) || part === '' ? part : '')) as [string, string, string, string];
      if (newOctets.join('.') !== octets.join('.')) {
        setOctets(newOctets);
      }
    } else if (!value) {
      if (octets.some(o => o !== '')) {
         setOctets(['', '', '', '']);
      }
    }
  }, [value, octets]);

  const handleChange = (index: number, inputValue: string) => {
    let newOctetValue = inputValue;

    if (inputValue.includes('.')) {
      const pastedParts = inputValue.split('.');
      if (pastedParts.length === 4 && pastedParts.every(p => validateOctetString(p) || p === '')) {
        const newValidOctets = pastedParts.map(p => (validateOctetString(p) ? p : '')) as [string, string, string, string];
        setOctets(newValidOctets);
        onChange(newValidOctets.join('.'));

        const nextFocusable = inputRefs[index === 3 ? 3 : index + 1]?.current;
        if(nextFocusable) {
            nextFocusable.focus();
            nextFocusable.select();
        }
        return;
      }
      newOctetValue = pastedParts[0] || '';
    }

    if (newOctetValue !== '' && (!/^\d{1,3}$/.test(newOctetValue) || parseInt(newOctetValue, 10) > 255)) {
      return;
    }

    const newOctetsArray = [...octets] as [string, string, string, string];
    newOctetsArray[index] = newOctetValue;
    setOctets(newOctetsArray);
    onChange(newOctetsArray.join('.'));

    if (newOctetValue.length === 3 && index < 3 && inputRefs[index + 1]?.current) {
      inputRefs[index + 1].current?.select();
    }
    if (newOctetValue.endsWith('.') && newOctetValue.length > 1 && index < 3 && inputRefs[index + 1]?.current) {
      newOctetsArray[index] = newOctetValue.slice(0,-1);
      setOctets(newOctetsArray);
      onChange(newOctetsArray.join('.'));
      inputRefs[index + 1].current?.focus();
      inputRefs[index+1].current?.select();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onEnterPress?.();
      return;
    }
    if (e.key === '.') {
      e.preventDefault();
      if (index < 3 && inputRefs[index + 1]?.current) {
        inputRefs[index + 1].current.focus();
        inputRefs[index + 1].current.select();
      }
    } else if (e.key === 'Backspace' && octets[index] === '' && index > 0 && inputRefs[index - 1]?.current) {
      inputRefs[index - 1].current.focus();
    } else if (e.key === 'ArrowRight' && (e.target as HTMLInputElement).selectionStart === octets[index].length && index < 3 && inputRefs[index+1]?.current) {
        e.preventDefault();
        inputRefs[index+1].current.focus();
    } else if (e.key === 'ArrowLeft' && (e.target as HTMLInputElement).selectionStart === 0 && index > 0 && inputRefs[index-1]?.current) {
        e.preventDefault();
        inputRefs[index-1].current.focus();
    }
  };

  // Function to focus the first input when clicking the container
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
     // Prevent focusing if the click is already on an input
    if (e.target instanceof HTMLInputElement) {
      return;
    }
    inputRefs[0]?.current?.focus();
  };


  return (
    // Outer container styled to look like a single input field
    <div
      ref={containerRef}
      onClick={handleContainerClick} // Focus first input on container click
      className={cn(
        // Removed w-full
        "flex h-10 items-center space-x-1 rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background max-w-[18rem]", // Added max-w-[18rem]
        "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2", // Apply focus ring to the container
        disabled ? "cursor-not-allowed opacity-50" : "cursor-text", // Change cursor based on disabled state
        "md:text-sm" // Responsive text size
      )}
      // Add accessibility attributes if needed, like aria-label for the whole group
      aria-label={`IP Address Input ${idPrefix}`}
    >
      {octets.map((octet, idx) => (
        <React.Fragment key={`${idPrefix}-octet-${idx}`}>
          <Input
            ref={inputRefs[idx]}
            id={`${idPrefix}-octet-${idx}`}
            type="text"
            inputMode="numeric"
            value={octet}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange(idx, e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => handleKeyDown(idx, e)}
            className={cn(
              "max-w-[4rem] flex-shrink grow basis-0 text-center tabular-nums", // max-w limits width
              "border-none bg-transparent p-0 shadow-none", // Remove individual input styling
              // Explicitly remove both focus and focus-visible rings from individual inputs
              "focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            )}
            placeholder="0"
            aria-label={`Octet ${idx + 1}`}
            disabled={disabled}
            autoComplete="off" // Prevent browser autocomplete popups inside octets
          />
          {idx < 3 && (
            <span
                className={cn("select-none text-muted-foreground", disabled && "opacity-50")}
                aria-hidden="true" // Hide dot from screen readers
            >
                .
            </span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

