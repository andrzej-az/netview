
'use client';

import type { FC } from 'react';
import { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Loader2, AlertCircle, ListRestart } from 'lucide-react';
import type { ScanHistoryItem } from '@/types/wails';
import { formatDistanceToNow } from 'date-fns';

interface ScanHistoryDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onRescan: (startIp: string, endIp: string) => void;
}

export const ScanHistoryDrawer: FC<ScanHistoryDrawerProps> = ({
  isOpen,
  onOpenChange,
  onRescan,
}) => {
  const [historyItems, setHistoryItems] = useState<ScanHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const fetchHistory = async () => {
        setIsLoading(true);
        setError(null);
        try {
          if (window.go?.main?.App?.GetScanHistory) {
            const items = await window.go.main.App.GetScanHistory();
            setHistoryItems(items);
          } else {
            console.warn("Wails GetScanHistory function not available.");
            setError("Scan history feature is not available (backend function missing).");
          }
        } catch (e: any) {
          console.error("Failed to fetch scan history:", e);
          setError(e.message || "Could not load scan history.");
        } finally {
          setIsLoading(false);
        }
      };
      fetchHistory();
    }
  }, [isOpen]);

  const handleRescanClick = (item: ScanHistoryItem) => {
    onRescan(item.startIp, item.endIp);
    onOpenChange(false); // Close drawer after selecting
  };

  const formatTimestampSafe = (timestampStr: string): string => {
    try {
      const date = new Date(timestampStr);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn(`Invalid timestamp string received: ${timestampStr}`);
        return "Invalid date";
      }
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      console.error("Error formatting timestamp:", timestampStr, e);
      return "Date error";
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[350px] sm:w-[400px] p-0 flex flex-col">
        <SheetHeader className="p-6 border-b">
          <SheetTitle className="flex items-center text-xl">
            <History className="mr-3 h-6 w-6 text-primary" />
            Scan History
          </SheetTitle>
          <SheetDescription>
            Last 10 custom IP range scans. Click an item to rescan that range.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-grow">
          <div className="p-4 space-y-3">
            {isLoading && (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            {error && !isLoading && (
              <div className="text-destructive-foreground p-4 bg-destructive/90 rounded-md flex items-start text-sm">
                <AlertCircle className="h-5 w-5 mr-3 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}
            {!isLoading && !error && historyItems.length === 0 && (
              <div className="text-center text-muted-foreground py-10 px-4">
                <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No Scan History Yet</p>
                <p className="text-sm">Perform a custom range scan to see it listed here.</p>
              </div>
            )}
            {!isLoading && !error && historyItems.length > 0 && (
              historyItems.map((item, index) => (
                <Button
                  key={`${item.startIp}-${item.endIp}-${item.timestamp}-${index}`} // More unique key
                  variant="outline"
                  className="w-full justify-start h-auto py-3 px-4 text-left hover:bg-accent/50 focus-visible:bg-accent/50"
                  onClick={() => handleRescanClick(item)}
                >
                  <ListRestart className="mr-3 h-5 w-5 shrink-0 text-accent" />
                  <div className="flex-grow min-w-0">
                    <p className="font-mono text-sm truncate" title={`${item.startIp} - ${item.endIp}`}>{item.startIp} - {item.endIp}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTimestampSafe(item.timestamp)}
                    </p>
                  </div>
                </Button>
              ))
            )}
          </div>
        </ScrollArea>
        <SheetFooter className="p-4 border-t bg-background">
            <SheetClose asChild>
              <Button variant="outline" className="w-full">Close</Button>
            </SheetClose>
          </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

