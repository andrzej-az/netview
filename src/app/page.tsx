
'use client';

import type { Host } from '@/types/host';
// Ensure wails.d.ts is picked up
/// <reference types="@/types/wails" />

import { useState, useEffect, useMemo, useCallback } from 'react';
import { scanNetwork as mockScanNetworkService } from '@/services/network-scanner';
import { Header } from '@/components/layout/header';
import { HostCard } from '@/components/hosts/host-card';
import { HostListItem } from '@/components/hosts/host-list-item';
import { HostDetailsDrawer } from '@/components/hosts/host-details-drawer';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Loader2, ServerCrash, RotateCwIcon, WifiOffIcon, ScanSearch, LayoutGrid, List, Search as SearchIcon, History as HistoryIcon, ScanLine, SettingsIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { isValidIp } from '@/lib/ip-utils';
import { useToast } from '@/hooks/use-toast';
import { CustomRangeDialog } from '@/components/network/custom-range-dialog';
import { ScanHistoryDrawer } from '@/components/history/scan-history-drawer';
import { SettingsDialog } from '@/components/settings/settings-dialog';
import { useSettings } from '@/hooks/use-settings';


export default function HomePage() {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(true); // Unified scanning state
  const [error, setError] = useState<string | null>(null);

  const [customStartIp, setCustomStartIp] = useState<string>('');
  const [customEndIp, setCustomEndIp] = useState<string>('');
  const [isCustomRangeDialogOpen, setIsCustomRangeDialogOpen] = useState(false);

  const [currentScanType, setCurrentScanType] = useState<'full' | 'custom'>('full');
  const [lastScannedRange, setLastScannedRange] = useState<{ startIp: string; endIp: string } | null>(null);

  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);

  const { toast } = useToast();
  const { effectivePorts, isLoaded: settingsLoaded } = useSettings();

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
        } else if (!isValidIp(customEndIp)) {
          shouldSuggest = true;
        }
      }

      if (shouldSuggest) {
        setCustomEndIp(suggestedEndIp);
      }
    }
  }, [customStartIp, customEndIp]);

  const fetchHosts = useCallback(async (rangeInput?: { startIp: string; endIp: string }) => {
    if (!settingsLoaded) return; // Don't scan until settings (and thus ports) are loaded

    const isCustomScanRequest = !!rangeInput;

    setIsScanning(true);
    setHosts([]); 
    setError(null);

    if (isCustomScanRequest && rangeInput) {
      setCurrentScanType('custom');
      setLastScannedRange(rangeInput);
    } else {
      setCurrentScanType('full');
      setLastScannedRange(null);
    }
    
    const scanParameters: { startIp?: string; endIp?: string; ports: number[] } = { ports: effectivePorts };

    if (isCustomScanRequest && rangeInput) {
        scanParameters.startIp = rangeInput.startIp;
        scanParameters.endIp = rangeInput.endIp;
    }


    try {
      if (typeof window.go?.main?.App?.ScanNetwork === 'function' && typeof window.runtime?.EventsOn === 'function') {
        console.log("Using Wails backend for streaming network scan with params:", scanParameters);
        await window.go.main.App.ScanNetwork(scanParameters);
      } else {
        console.warn("Wails Go backend not available. Using mock streaming network scanner with params:", scanParameters);
        await mockScanNetworkService(
          scanParameters, // Pass the whole object
          (host: Host) => { 
            setHosts(prevHosts => {
              if (prevHosts.find(h => h.ipAddress === host.ipAddress)) return prevHosts;
              return [...prevHosts, host];
            });
          },
          () => { 
            setIsScanning(false);
          }
        );
      }
    } catch (e: any) {
      console.error("Failed to initiate network scan:", e);
      const errorMessage = e?.message || "Failed to start the network scan. Check backend connection.";
      setError(errorMessage);
      toast({
        title: "Scan Initiation Error",
        description: errorMessage,
        variant: "destructive",
      });
      setHosts([]);
      setIsScanning(false);
    }
  }, [toast, effectivePorts, settingsLoaded]);

  useEffect(() => {
    if (settingsLoaded) { // Only run initial scan if settings (and thus ports) are loaded
        fetchHosts();
    }
  }, [fetchHosts, settingsLoaded]);

  useEffect(() => {
    let unlistenHostFound: (() => void) | undefined;
    let unlistenScanComplete: (() => void) | undefined;

    if (typeof window.runtime?.EventsOn === 'function') {
      unlistenHostFound = window.runtime.EventsOn('hostFound', (host: Host) => {
        setHosts(prevHosts => {
          if (prevHosts.find(h => h.ipAddress === host.ipAddress)) return prevHosts; 
          return [...prevHosts, host];
        });
      });

      unlistenScanComplete = window.runtime.EventsOn('scanComplete', (success: boolean) => {
        setIsScanning(false);
        if (!success) {
          console.warn("Scan completed, but Go backend indicated an issue during the scan.");
           setError(prevError => prevError || "Scan finished with an issue from the backend.");
        }
      });
    }

    return () => {
      if (unlistenHostFound) unlistenHostFound();
      if (unlistenScanComplete) unlistenScanComplete();
    };
  }, []); 

  const handleHostSelect = (host: Host) => {
    setSelectedHost(host);
    setIsDrawerOpen(true);
  };

  const handleRefreshFullScan = () => {
    fetchHosts(); 
  };

  const handleScanFromDialog = () => {
    if (!isValidIp(customStartIp)) {
      toast({ title: "Invalid Input", description: "Start IP address is not valid.", variant: "destructive" });
      return;
    }
    if (!isValidIp(customEndIp)) {
      toast({ title: "Invalid Input", description: "End IP address is not valid.", variant: "destructive" });
      return;
    }
    fetchHosts({ startIp: customStartIp, endIp: customEndIp });
    setIsCustomRangeDialogOpen(false);
  };

  const handleRescanFromHistory = (startIp: string, endIp: string) => {
    setCustomStartIp(startIp);
    setCustomEndIp(endIp);
    fetchHosts({ startIp, endIp });
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

  const HostListItemSkeleton = () => (
    <div className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 border-b last:border-b-0">
      <Skeleton className="h-7 w-7 sm:h-8 sm:h-8 rounded-md shrink-0" />
      <div className="flex-1 space-y-1.5 min-w-0">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-3 w-2/5" />
      </div>
      <div className="hidden md:flex items-center gap-1 mx-4 shrink-0">
        <Skeleton className="h-5 w-8 rounded-full" />
        <Skeleton className="h-5 w-8 rounded-full" />
        <Skeleton className="h-5 w-8 rounded-full" />
      </div>
      <Skeleton className="h-8 w-8 rounded-md shrink-0" />
    </div>
  );

  const filteredHosts = useMemo(() => {
    if (!searchTerm) {
      return hosts;
    }
    return hosts.filter(host => {
      const term = searchTerm.toLowerCase();
      return (
        host.ipAddress.toLowerCase().includes(term) ||
        (host.hostname && host.hostname.toLowerCase().includes(term)) ||
        (host.macAddress && host.macAddress.toLowerCase().includes(term))
      );
    });
  }, [hosts, searchTerm]);

  return (
    <>
      <Header onSettingsClick={() => setIsSettingsDialogOpen(true)} />
      <main className="flex-grow container mx-auto p-4 md:p-8 space-y-8">
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-2xl font-semibold text-foreground">
              {currentScanType === 'custom' && lastScannedRange
                ? `Hosts in ${lastScannedRange.startIp} - ${lastScannedRange.endIp}`
                : 'Detected Hosts (Full Network)'}
              {isScanning && <span className="text-base font-normal text-muted-foreground ml-2">(Scanning...)</span>}
            </h2>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto justify-end">
              <Button
                onClick={() => setIsCustomRangeDialogOpen(true)}
                disabled={isScanning || !settingsLoaded}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <ScanSearch className="mr-2 h-4 w-4" />
                Scan Specific Range
              </Button>
              <Button
                onClick={handleRefreshFullScan}
                disabled={isScanning || !settingsLoaded}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <RotateCwIcon className={`mr-2 h-4 w-4 ${isScanning && currentScanType === 'full' ? 'animate-spin' : ''}`} />
                {isScanning && currentScanType === 'full' ? 'Scanning...' : 'Refresh Full Scan'}
              </Button>
              <Button
                onClick={() => setIsHistoryDrawerOpen(true)}
                variant="outline"
                className="w-full sm:w-auto"
                disabled={!settingsLoaded}
              >
                <HistoryIcon className="mr-2 h-4 w-4" />
                Scan History
              </Button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div className="relative w-full md:flex-grow">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Filter by IP, hostname, MAC..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
                disabled={(isScanning && hosts.length === 0) || !settingsLoaded} 
              />
            </div>
            <div className="flex items-center gap-2 self-end md:self-center">
              <Button
                variant={viewMode === 'card' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('card')}
                disabled={(isScanning && hosts.length === 0) || !settingsLoaded}
                aria-label="Card view"
              >
                <LayoutGrid className="h-5 w-5" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
                disabled={(isScanning && hosts.length === 0) || !settingsLoaded}
                aria-label="List view"
              >
                <List className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {!settingsLoaded && (
             <div className="flex items-center justify-center py-10 text-md text-accent">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading settings...
            </div>
          )}

          {settingsLoaded && isScanning && hosts.length === 0 && !error && (
             viewMode === 'card' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => <HostSkeletonCard key={i} />)}
              </div>
            ) : (
              <div className="border rounded-lg shadow">
                {[...Array(8)].map((_, i) => <HostListItemSkeleton key={i} />)}
              </div>
            )
          )}
          
          {settingsLoaded && isScanning && hosts.length > 0 && (
             <div className="flex items-center justify-center py-4 text-md text-accent mb-4">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Scanning in progress... Hosts will appear below as they are found.
            </div>
          )}


          {settingsLoaded && error && (
            <Alert variant="destructive" className="mb-6">
              <ServerCrash className="h-4 w-4" />
              <AlertTitle>Error During Scan</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {settingsLoaded && !isScanning && !error && filteredHosts.length === 0 && (
            <div className="text-center py-10">
              <WifiOffIcon className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-xl font-medium text-muted-foreground">
                {searchTerm ? 'No hosts match your filter.' : 'No hosts found.'}
              </p>
              <p className="text-sm text-muted-foreground">
                {searchTerm
                  ? 'Try a different filter term or clear the filter.'
                  : currentScanType === 'custom'
                  ? "No hosts found in the specified range."
                  : "Scan complete. No hosts detected or ensure Wails backend is running."}
              </p>
              {searchTerm && (
                <Button variant="link" onClick={() => setSearchTerm('')} className="mt-2">
                  Clear filter
                </Button>
              )}
            </div>
          )}
          
          {settingsLoaded && filteredHosts.length > 0 && (
            viewMode === 'card' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredHosts.map((host) => (
                  <HostCard key={host.ipAddress} host={host} onSelect={handleHostSelect} />
                ))}
              </div>
            ) : (
              <div className="border rounded-lg shadow overflow-hidden">
                {filteredHosts.map((host) => (
                  <HostListItem key={host.ipAddress} host={host} onSelect={handleHostSelect} />
                ))}
              </div>
            )
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
          isScanning={isScanning && currentScanType === 'custom'}
        />
        <ScanHistoryDrawer
            isOpen={isHistoryDrawerOpen}
            onOpenChange={setIsHistoryDrawerOpen}
            onRescan={handleRescanFromHistory}
        />
        <SettingsDialog
          isOpen={isSettingsDialogOpen}
          onOpenChange={setIsSettingsDialogOpen}
        />
      </main>
      <footer className="text-center py-4 border-t text-sm text-muted-foreground">
        NetView &copy; {new Date().getFullYear()}
      </footer>
    </>
  );
}
