
'use client';

import type { FC } from 'react';
import { IpOctetInput } from '@/components/common/ip-octet-input';
import { cn } from '@/lib/utils';

interface IpRangeInputProps {
  startIp: string;
  onStartIpChange: (ip: string) => void;
  endIp: string;
  onEndIpChange: (ip: string) => void;
  disabled?: boolean;
  onEnterPress?: () => void; // New prop
}

export const IpRangeInput: FC<IpRangeInputProps> = ({
  startIp,
  onStartIpChange,
  endIp,
  onEndIpChange,
  disabled,
  onEnterPress,
}) => {
  return (
    // Use flexbox to arrange inputs: column on small screens, row on medium+
    <div className={cn("flex flex-col md:flex-row md:items-end md:gap-6 space-y-4 md:space-y-0")}>
        <div className="flex-1 min-w-0"> {/* Ensure inputs take available space but can shrink */}
            <IpOctetInput
            label="Start IP Address"
            idPrefix="start-ip"
            value={startIp}
            onChange={onStartIpChange}
            disabled={disabled}
            onEnterPress={onEnterPress}
            />
       </div>
       <div className="flex-1 min-w-0"> {/* Ensure inputs take available space but can shrink */}
            <IpOctetInput
            label="End IP Address"
            idPrefix="end-ip"
            value={endIp}
            onChange={onEndIpChange}
            disabled={disabled}
            onEnterPress={onEnterPress}
            />
        </div>
    </div>
  );
};

