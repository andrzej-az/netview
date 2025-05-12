
'use client';

import type { FC } from 'react';
import { IpOctetInput } from '@/components/common/ip-octet-input';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label'; // Import Label

interface IpRangeInputProps {
  startIp: string;
  onStartIpChange: (ip: string) => void;
  endIp: string;
  onEndIpChange: (ip: string) => void;
  disabled?: boolean;
  onEnterPress?: () => void;
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
    // Arrange inputs in a row on medium+ screens, stack vertically on small screens
    <div className={cn("flex flex-col md:flex-row md:items-start md:gap-6 space-y-4 md:space-y-0")}>
        {/* Start IP Section */}
        <div className="flex-1 min-w-0 space-y-2">
            <Label htmlFor="start-ip-octet-0" className="text-sm font-medium">
                Start IP Address
            </Label>
            <IpOctetInput
                idPrefix="start-ip"
                value={startIp}
                onChange={onStartIpChange}
                disabled={disabled}
                onEnterPress={onEnterPress}
            />
       </div>
       {/* End IP Section */}
       <div className="flex-1 min-w-0 space-y-2">
            <Label htmlFor="end-ip-octet-0" className="text-sm font-medium">
                End IP Address
            </Label>
            <IpOctetInput
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
