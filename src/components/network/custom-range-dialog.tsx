
'use client';

import type { FC } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { IpRangeInput } from '@/components/network/ip-range-input';
import { ScanLine } from 'lucide-react';

interface CustomRangeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  startIp: string;
  onStartIpChange: (ip: string) => void;
  endIp: string;
  onEndIpChange: (ip: string) => void;
  onScanRange: () => void;
  isScanning: boolean;
}

export const CustomRangeDialog: FC<CustomRangeDialogProps> = ({
  isOpen,
  onOpenChange,
  startIp,
  onStartIpChange,
  endIp,
  onEndIpChange,
  onScanRange,
  isScanning,
}) => {
  const handleScanClick = () => {
    onScanRange(); // Parent handles validation, scan logic, and closing the dialog
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan Custom IP Range</DialogTitle>
          <DialogDescription>
            Specify a start and end IP address to scan a specific range on your network.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <IpRangeInput
            startIp={startIp}
            onStartIpChange={onStartIpChange}
            endIp={endIp}
            onEndIpChange={onEndIpChange}
            disabled={isScanning}
            showTitle={false} // Hide IpRangeInput's own title as dialog provides it
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isScanning}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleScanClick} disabled={isScanning}>
            <ScanLine className={`mr-2 h-4 w-4 ${isScanning ? 'animate-pulse' : ''}`} />
            {isScanning ? 'Scanning...' : 'Scan Range'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
