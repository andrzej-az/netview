
'use client';

import type { FC } from 'react';
import { useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { isValidIp } from '@/lib/ip-utils';
import { cn } from '@/lib/utils';

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
  const { toast } = useToast();
  const [isShaking, setIsShaking] = useState(false);

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500); // Duration matches shake animation in globals.css
  };

  const handleAttemptScan = () => {
    if (isScanning) return;

    if (!isValidIp(startIp)) {
      toast({
        title: "Invalid Input",
        description: "Start IP address is not valid.",
        variant: "destructive",
      });
      triggerShake();
      return;
    }
    if (!isValidIp(endIp)) {
      toast({
        title: "Invalid Input",
        description: "End IP address is not valid.",
        variant: "destructive",
      });
      triggerShake();
      return;
    }
    onScanRange(); // This calls handleScanFromDialog in HomePage, which closes dialog on success
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleAttemptScan();
  };

  const handleDialogInteraction = (event: Event) => {
    if (isScanning) {
      event.preventDefault();
    }
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(openState) => {
        if (isScanning && !openState && isOpen) return; // Prevent closing if scanning and dialog is currently open
        onOpenChange(openState);
      }}
    >
      <DialogContent 
        className={cn("sm:max-w-md", { 'shake': isShaking })}
        onPointerDownOutside={handleDialogInteraction}
        onEscapeKeyDown={handleDialogInteraction}
      >
        <DialogHeader>
          <DialogTitle>Scan Custom IP Range</DialogTitle>
          <DialogDescription>
            Specify a start and end IP address to scan a specific range on your network.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <IpRangeInput
              startIp={startIp}
              onStartIpChange={onStartIpChange}
              endIp={endIp}
              onEndIpChange={onEndIpChange}
              disabled={isScanning}
              showTitle={false} 
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isScanning}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isScanning}>
              <ScanLine className={`mr-2 h-4 w-4 ${isScanning ? 'animate-pulse' : ''}`} />
              {isScanning ? 'Scanning...' : 'Scan Range'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
