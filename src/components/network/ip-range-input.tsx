
'use client';

import type { FC } from 'react';
import { IpOctetInput } from '@/components/common/ip-octet-input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface IpRangeInputProps {
  startIp: string;
  onStartIpChange: (ip: string) => void;
  endIp: string;
  onEndIpChange: (ip: string) => void;
  disabled?: boolean;
}

export const IpRangeInput: FC<IpRangeInputProps> = ({
  startIp,
  onStartIpChange,
  endIp,
  onEndIpChange,
  disabled,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Scan Custom IP Range</CardTitle>
        <CardDescription>
          Specify a start and end IP address to scan a specific range on your network.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <IpOctetInput
          label="Start IP Address"
          idPrefix="start-ip"
          value={startIp}
          onChange={onStartIpChange}
          disabled={disabled}
        />
        <IpOctetInput
          label="End IP Address"
          idPrefix="end-ip"
          value={endIp}
          onChange={onEndIpChange}
          disabled={disabled}
        />
      </CardContent>
    </Card>
  );
};
