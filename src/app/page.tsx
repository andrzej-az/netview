
'use client';

import { useState, useEffect } from 'react';
import type { Host } from '@/types/host';
import { scanNetwork } from '@/services/network-scanner';
import { Header } from '@/components/layout/header';
import { HostCard } from '@/components/hosts/host-card';
import { HostDetailsDrawer } from '@/components/hosts/host-details-drawer';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ServerCrash, RotateCwIcon, WifiOffIcon, ScanLine } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { IpRangeInput } from '@/components/network/ip-range-input';
import { isValidIp } from '@/lib/ip-utils';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

export default function HomePage() {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isScanningCustomRange, setIsScanningCustomRange] = useState(false);

  const [customStartIp, setCustomStartIp] = useState<string>('');
  const [customEndIp, setCustomEndIp] = useState<string>('');

  const { toast } = useToast();

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
    } catch (e) {
      console.error("Failed to scan network:", e);
      const errorMessage = "Failed to scan the network. Please check your connection or try again.";
      setError(errorMessage);
      toast({
        title: "Scan Error",
        description: errorMessage,
        variant: "destructive",
      });
      setHosts([]);
    } finally {
      if (range) {
        setIsScanningCustomRange(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchHosts();
  }, []);

  const handleHostSelect = (host: Host) => {
    setSelectedHost(host);
    setIsDrawerOpen(true);
  };

  const handleRefreshFullScan = () => {
    fetchHosts();
  };

  const handleCustomRangeScan = () => {
    if (!isValidIp(customStartIp)) {
      toast({
        title: "Invalid Input",
        description: "Start IP address is not valid.",
        variant: "destructive",
      });
      return;
    }
    if (!isValidIp(customEndIp)) {
      toast({
        title: "Invalid Input",
        description: "End IP address is not valid.",
        variant: "destructive",
      });
      return;
    }
    // Optional: Add logic to check if start IP is less than or equal to end IP
    fetchHosts({ startIp: customStartIp, endIp: customEndIp });
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
          <IpRangeInput
            startIp={customStartIp}
            onStartIpChange={setCustomStartIp}
            endIp={customEndIp}
            onEndIpChange={setCustomEndIp}
            disabled={currentLoadingState}
          />
          <Button 
            onClick={handleCustomRangeScan} 
            disabled={currentLoadingState} 
            className="mt-4 w-full sm:w-auto"
          >
            <ScanLine className={`mr-2 h-4 w-4 ${isScanningCustomRange ? 'animate-pulse' : ''}`} />
            {isScanningCustomRange ? 'Scanning Range...' : 'Scan Custom Range'}
          </Button>
        </div>

        <Separator />

        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-foreground">
              {isScanningCustomRange && customStartIp && customEndIp ? `Hosts in ${customStartIp} - ${customEndIp}` : 'Detected Hosts (Full Network)'}
            </h2>
            <Button onClick={handleRefreshFullScan} disabled={currentLoadingState} variant="outline">
              <RotateCwIcon className={`mr-2 h-4 w-4 ${isLoading && !isScanningCustomRange ? 'animate-spin' : ''}`} />
              {isLoading && !isScanningCustomRange ? 'Scanning...' : 'Refresh Full Scan'}
            </Button>
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
              {[...Array(4)].map((_, i) => <HostSkeletonCard key={i} />)}
            </div>
          )}

          {!currentLoadingState && !error && hosts.length === 0 && (
            <div className="text-center py-10">
              <WifiOffIcon className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-xl font-medium text-muted-foreground">No hosts found.</p>
              <p className="text-sm text-muted-foreground">
                {customStartIp && customEndIp ? "No hosts found in the specified range." : "Ensure you are connected to the network and try refreshing."}
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
      </main>
      <footer className="text-center py-4 border-t text-sm text-muted-foreground">
        NetView &copy; {new Date().getFullYear()}
      </footer>
    </>
  );
}
