'use client';

import type { Host } from '@/types/host';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { GlobeIcon, HardDriveIcon, ListChecksIcon, RouterIcon, FingerprintIcon, WifiIcon } from 'lucide-react';

interface HostDetailsDrawerProps {
  host: Host | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HostDetailsDrawer({ host, isOpen, onOpenChange }: HostDetailsDrawerProps) {
  if (!host) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg w-[90vw] p-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="p-6 border-b">
            <SheetTitle className="text-2xl flex items-center">
              <HardDriveIcon className="mr-3 h-7 w-7 text-primary" />
              Host Details
            </SheetTitle>
            <SheetDescription>
              Detailed information for {host.hostname || host.ipAddress}.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-grow overflow-y-auto p-6 space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center"><FingerprintIcon className="w-4 h-4 mr-2 text-accent" />Identifiers</h3>
              <div className="p-4 bg-secondary/50 rounded-md space-y-1">
                <p><strong>IP Address:</strong> {host.ipAddress}</p>
                {host.hostname && <p><strong>Hostname:</strong> {host.hostname}</p>}
                {host.macAddress && <p><strong>MAC Address:</strong> {host.macAddress}</p>}
              </div>
            </div>

            <Separator />

            {host.os && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center"><RouterIcon className="w-4 h-4 mr-2 text-accent" />Operating System</h3>
                 <div className="p-4 bg-secondary/50 rounded-md">
                  <p>{host.os}</p>
                </div>
              </div>
            )}
            
            {(host.openPorts && host.openPorts.length > 0) && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center"><ListChecksIcon className="w-4 h-4 mr-2 text-accent" />Open Ports</h3>
                  <div className="flex flex-wrap gap-2 p-4 bg-secondary/50 rounded-md">
                    {host.openPorts.map((port) => (
                      <Badge key={port} variant="secondary" className="text-sm font-mono">{port}</Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
             {!host.os && (!host.openPorts || host.openPorts.length === 0) && (
                 <div className="text-center text-muted-foreground py-4">
                    <WifiIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>No additional details available for this host.</p>
                 </div>
             )}

          </div>

          <SheetFooter className="p-6 border-t">
            <SheetClose asChild>
              <Button type="button" variant="outline">Close</Button>
            </SheetClose>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
