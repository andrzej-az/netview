
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
  onEnterPress?: () => void; // New prop
}

export const IpOctetInput: React.FC<IpOctetInputProps> = ({
  label,
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


  return (
    <div className="space-y-2">
      <Label htmlFor={`${idPrefix}-octet-0`} className="text-sm font-medium">
        {label}
      </Label>
      <div className="flex items-center space-x-1">
        {octets.map((octet, idx) => (
          <React.Fragment key={`${idPrefix}-octet-${idx}`}>
            <Input
              ref={inputRefs[idx]}
              id={`${idPrefix}-octet-${idx}`}
              type="text" // Using text to allow paste, validation handles numeric
              inputMode="numeric" // Hint for mobile keyboards
              value={octet}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange(idx, e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => handleKeyDown(idx, e)}
              className="w-16 text-center tabular-nums sm:w-20"
              // Removed maxLength={3} to allow pasting full IP
              placeholder="0"
              aria-label={`${label} Octet ${idx + 1}`}
              disabled={disabled}
            />
            {idx < 3 && <span className="text-muted-foreground font-semibold">.</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
