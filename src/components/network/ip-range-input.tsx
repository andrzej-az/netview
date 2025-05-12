
'use client';

import type { FC } from 'react';
import { IpOctetInput } from '@/components/common/ip-octet-input';
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; // Removed Card imports
import { cn } from '@/lib/utils';

interface IpRangeInputProps {
  startIp: string;
  onStartIpChange: (ip: string) => void;
  endIp: string;
  onEndIpChange: (ip: string) => void;
  disabled?: boolean;
  // showTitle?: boolean; // Removed prop
  onEnterPress?: () => void; // New prop
}

export const IpRangeInput: FC<IpRangeInputProps> = ({
  startIp,
  onStartIpChange,
  endIp,
  onEndIpChange,
  disabled,
  // showTitle = true, // Removed usage
  onEnterPress,
}) => {
  return (
    // Removed Card wrapper
    <div className={cn("space-y-6")}>
        <IpOctetInput
          label="Start IP Address"
          idPrefix="start-ip"
          value={startIp}
          onChange={onStartIpChange}
          disabled={disabled}
          onEnterPress={onEnterPress}
        />
        <IpOctetInput
          label="End IP Address"
          idPrefix="end-ip"
          value={endIp}
          onChange={onEndIpChange}
          disabled={disabled}
          onEnterPress={onEnterPress}
        />
    </div>
  );
};
