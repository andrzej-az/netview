
'use client';

import { useState, useEffect } from 'react';
import type { Host } from '@/types/host';
import { scanNetwork } from '@/services/network-scanner';
import { Header } from '@/components/layout/header';
import { HostCard } from '@/components/hosts/host-card';
import { HostDetailsDrawer } from '@/components/hosts/host-details-drawer';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ServerCrash, RotateCwIcon, WifiOffIcon, ScanLine, ScanSearch } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { isValidIp } from '@/lib/ip-utils';
import { useToast } from '@/hooks/use-toast';
import { CustomRangeDialog } from '@/components/network/custom-range-dialog';

export default function HomePage() {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // For full network scan
  const [error, setError] = useState<string | null>(null);
  const [isScanningCustomRange, setIsScanningCustomRange] = useState(false); // For custom range scan

  const [customStartIp, setCustomStartIp] = useState<string>('');
  const [customEndIp, setCustomEndIp] = useState<string>('');
  const [isCustomRangeDialogOpen, setIsCustomRangeDialogOpen] = useState(false);

  const [currentScanType, setCurrentScanType] = useState<'full' | 'custom'>('full');
  const [lastScannedRange, setLastScannedRange] = useState<{ startIp: string; endIp: string } | null>(null);


  const { toast } = useToast();

  useEffect(() => {
    if (isValidIp(customStartIp)) {
      const startParts = customStartIp.split('.');
      const suggestedEndIp = `${startParts[0]}.${startParts[1]}.${startParts[2]}.255`;

      let shouldSuggest = false;
      if (customEndIp === '') {
        shouldSuggest = true;
      } else {
        const currentEndParts = customEndIp.split('.');
        if (currentEndParts.length === 4 && currentEndParts[3] === '255') {
          const currentEndNetworkPrefix = `${currentEndParts[0]}.${currentEndParts[1]}.${currentEndParts[2]}`;
          const startNetworkPrefix = `${startParts[0]}.${startParts[1]}.${startParts[2]}`;
          if (currentEndNetworkPrefix !== startNetworkPrefix) {
            shouldSuggest = true;
          }
        } else if (!isValidIp(customEndIp)) { // Also suggest if end IP is invalid
          shouldSuggest = true;
        }
      }

      if (shouldSuggest) {
        setCustomEndIp(suggestedEndIp);
      }
    }
  }, [customStartIp, customEndIp]); // Added customEndIp to dependency to re-evaluate if it becomes invalid

  const fetchHosts = async (range?: { startIp: string; endIp: string }) => {
    if (range) {
      setIsScanningCustomRange(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    try {
      const fetchedHosts = await scanNetwork(range);
      setHosts(fetchedHosts);
      if (range) {
        setCurrentScanType('custom');
        setLastScannedRange(range);
      } else {
        setCurrentScanType('full');
        setLastScannedRange(null);
      }
    } catch (e) {
      console.error("Failed to scan network:", e);
      const errorMessage = "Failed to scan the network. Please check your connection or try again.";
      setError(errorMessage);
      toast({
        title: "Scan Error",
        description: errorMessage,
        variant: "destructive",
      });
      setHosts([]); // Clear hosts on error
    } finally {
      if (range) {
        setIsScanningCustomRange(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchHosts(); // Initial full network scan
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const handleHostSelect = (host: Host) => {
    setSelectedHost(host);
    setIsDrawerOpen(true);
  };

  const handleRefreshFullScan = () => {
    // Reset custom IP fields if user explicitly requests full scan
    // setCustomStartIp(''); 
    // setCustomEndIp(''); 
    // Decide if resetting IPs is desired UX, for now, keep them.
    fetchHosts();
  };

  const handleScanFromDialog = () => {
    if (!isValidIp(customStartIp)) {
      toast({
        title: "Invalid Input",
        description: "Start IP address is not valid.",
        variant: "destructive",
      });
      return; // Don't close dialog
    }
    if (!isValidIp(customEndIp)) {
      toast({
        title: "Invalid Input",
        description: "End IP address is not valid.",
        variant: "destructive",
      });
      return; // Don't close dialog
    }
    // Optional: Add logic to check if start IP is numerically less than or equal to end IP
    fetchHosts({ startIp: customStartIp, endIp: customEndIp });
    setIsCustomRangeDialogOpen(false); // Close dialog after initiating scan
  };
  
  const HostSkeletonCard = () => (
    <div className="flex flex-col space-y-3 p-4 border rounded-lg shadow">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[150px]" />
          <Skeleton className="h-4 w-[100px]" />
        </div>
      </div>
      <Skeleton className="h-4 w-[120px]" />
      <Skeleton className="h-4 w-[180px]" />
      <Skeleton className="h-8 w-full mt-2" />
    </div>
  );

  const currentLoadingState = isLoading || isScanningCustomRange;

  return (
    <>
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-8 space-y-8">
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-2xl font-semibold text-foreground">
              {currentScanType === 'custom' && lastScannedRange
                ? `Hosts in ${lastScannedRange.startIp} - ${lastScannedRange.endIp}`
                : 'Detected Hosts (Full Network)'}
            </h2>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button 
                onClick={() => setIsCustomRangeDialogOpen(true)} 
                disabled={currentLoadingState} 
                variant="outline"
                className="w-full sm:w-auto"
              >
                <ScanSearch className="mr-2 h-4 w-4" />
                Scan Specific Range
              </Button>
              <Button 
                onClick={handleRefreshFullScan} 
                disabled={currentLoadingState} 
                variant="outline"
                className="w-full sm:w-auto"
              >
                <RotateCwIcon className={`mr-2 h-4 w-4 ${isLoading && !isScanningCustomRange ? 'animate-spin' : ''}`} />
                {isLoading && !isScanningCustomRange ? 'Scanning Full...' : 'Refresh Full Scan'}
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <ServerCrash className="h-4 w-4" />
              <AlertTitle>Error Scanning Network</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {currentLoadingState && !error && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => <HostSkeletonCard key={i} />)} {/* Increased skeleton count */}
            </div>
          )}

          {!currentLoadingState && !error && hosts.length === 0 && (
            <div className="text-center py-10">
              <WifiOffIcon className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-xl font-medium text-muted-foreground">No hosts found.</p>
              <p className="text-sm text-muted-foreground">
                {currentScanType === 'custom' ? "No hosts found in the specified range." : "Ensure you are connected to the network and try refreshing."}
              </p>
            </div>
          )}
          
          {!currentLoadingState && !error && hosts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {hosts.map((host) => (
                <HostCard key={host.ipAddress} host={host} onSelect={handleHostSelect} />
              ))}
            </div>
          )}
        </div>

        <HostDetailsDrawer
          host={selectedHost}
          isOpen={isDrawerOpen}
          onOpenChange={setIsDrawerOpen}
        />

        <CustomRangeDialog
          isOpen={isCustomRangeDialogOpen}
          onOpenChange={setIsCustomRangeDialogOpen}
          startIp={customStartIp}
          onStartIpChange={setCustomStartIp}
          endIp={customEndIp}
          onEndIpChange={setCustomEndIp}
          onScanRange={handleScanFromDialog}
          isScanning={isScanningCustomRange}
        />
      </main>
      <footer className="text-center py-4 border-t text-sm text-muted-foreground">
        NetView &copy; {new Date().getFullYear()}
      </footer>
    </>
  );
}

