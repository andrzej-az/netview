
'use client';

import type { FC } from 'react';
import { useState, useEffect } from 'react';
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
import { cn } from '@/lib/utils';

interface CustomRangeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  startIp: string;
  onStartIpChange: (ip: string) => void;
  endIp: string;
  onEndIpChange: (ip: string) => void;
  onScanRange: () => boolean; // Modified to return boolean for validation status
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
  const [isShaking, setIsShaking] = useState(false);

  const handleScanClick = () => {
    const validationPassed = onScanRange(); // Parent handles validation, scan logic
    if (!validationPassed) {
      setIsShaking(true);
    }
    // If validationPassed is true, parent (HomePage) will close the dialog via onOpenChange
  };

  useEffect(() => {
    if (isShaking) {
      const timer = setTimeout(() => setIsShaking(false), 500); // Duration of shake animation
      return () => clearTimeout(timer);
    }
  }, [isShaking]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-md", isShaking && 'animate-shake')}>
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
            onEnterPress={handleScanClick} // Trigger scan on Enter press
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
