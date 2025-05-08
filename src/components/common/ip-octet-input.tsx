
'use client';

import React, { useState, useEffect, useRef, ChangeEvent, KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { isValidOctet as validateOctetString } from '@/lib/ip-utils';

interface IpOctetInputProps {
  label: string;
  idPrefix: string;
  value: string; // Full IP string e.g., "192.168.1.1"
  onChange: (ip: string) => void;
  disabled?: boolean;
}

export const IpOctetInput: React.FC<IpOctetInputProps> = ({
  label,
  idPrefix,
  value,
  onChange,
  disabled,
}) => {
  const [octets, setOctets] = useState<[string, string, string, string]>(['', '', '', '']);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    if (value === octets.join('.')) return; // Avoid unnecessary updates if already in sync

    const parts = value.split('.');
    if (parts.length === 4) {
      const newOctets = parts.map(part => (validateOctetString(part) || part === '' ? part : '')) as [string, string, string, string];
      if (newOctets.join('.') !== octets.join('.')) {
        setOctets(newOctets);
      }
    } else if (!value) { // Handle empty value from parent
      if (octets.some(o => o !== '')) { // Only if different
         setOctets(['', '', '', '']);
      }
    }
  }, [value]); // Removed octets to prevent potential loop if parent onChange causes immediate value change

  const handleChange = (index: number, inputValue: string) => {
    let newOctetValue = inputValue;

    // Handle pasting full IP
    if (inputValue.includes('.')) {
      const pastedParts = inputValue.split('.');
      if (pastedParts.length === 4 && pastedParts.every(p => validateOctetString(p) || p === '')) {
        const newPastedOctets = pastedParts as [string, string, string, string];
        setOctets(newPastedOctets);
        onChange(newPastedOctets.join('.'));
        // Focus management after paste (e.g., next field or submit button) can be added here
        const nextFocusable = inputRefs[index === 3 ? 3 : index + 1]?.current;
        if(nextFocusable) nextFocusable.focus();
        return;
      }
      // If paste is not a full IP, take the first part for the current octet
      newOctetValue = pastedParts[0] || '';
    }
    
    // Validate single octet value
    if (newOctetValue !== '' && (!/^\d{1,3}$/.test(newOctetValue) || parseInt(newOctetValue, 10) > 255)) {
      // If invalid, keep the current octet value or clear it, based on desired UX
      // For now, we just don't update if it's completely invalid format beyond digits/length
      // Or, we can revert to the previous valid state of this octet.
      // The `value.split` in useEffect will handle re-syncing if parent rejects change.
      return; 
    }


    const newOctets = [...octets] as [string, string, string, string];
    newOctets[index] = newOctetValue;
    setOctets(newOctets);
    onChange(newOctets.join('.'));

    // Auto-tab to next input
    if (newOctetValue.length === 3 && index < 3 && inputRefs[index + 1]?.current) {
      inputRefs[index + 1].current?.select();
    }
     // If an octet (like "192") has a dot appended ("192."), move to next
    if (newOctetValue.endsWith('.') && newOctetValue.length > 1 && index < 3 && inputRefs[index + 1]?.current) {
      newOctets[index] = newOctetValue.slice(0,-1); // remove the dot
      setOctets(newOctets);
      onChange(newOctets.join('.'));
      inputRefs[index + 1].current?.focus();
      inputRefs[index+1].current?.select();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
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


  return (
    <div className="space-y-2">
      <Label htmlFor={`${idPrefix}-octet-0`} className="text-sm font-medium">
        {label}
      </Label>
      <div className="flex items-center space-x-1">
        {octets.map((octet, index) => (
          <React.Fragment key={`${idPrefix}-octet-${index}`}>
            <Input
              ref={inputRefs[index]}
              id={`${idPrefix}-octet-${index}`}
              type="text"
              value={octet}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange(index, e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => handleKeyDown(index, e)}
              className="w-16 text-center tabular-nums sm:w-20"
              maxLength={3}
              placeholder="0"
              aria-label={`${label} Octet ${index + 1}`}
              disabled={disabled}
            />
            {index < 3 && <span className="text-muted-foreground font-semibold">.</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
