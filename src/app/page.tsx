
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
import { Loader2, ServerCrash, WifiOffIcon, ScanSearch, LayoutGrid, List, Search as SearchIcon, History as HistoryIcon, ScanLine } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { isValidIp, isValidOctet } from '@/lib/ip-utils';
import { useToast } from '@/hooks/use-toast';
import { CustomRangeDialog } from '@/components/network/custom-range-dialog';
import { ScanHistoryDrawer } from '@/components/history/scan-history-drawer';
import { SettingsDialog } from '@/components/settings/settings-dialog';
import { useSettings } from '@/hooks/use-settings';
import type { WailsScanParameters } from '@/types/wails';


export default function HomePage() {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false); 
  const [error, setError] = useState<string | null>(null);

  const [customStartIp, setCustomStartIp] = useState<string>('');
  const [customEndIp, setCustomEndIp] = useState<string>('');
  const [isCustomRangeDialogOpen, setIsCustomRangeDialogOpen] = useState(false);

  const [scannedRangeTitle, setScannedRangeTitle] = useState<{ startIp: string; endIp: string } | null>(null);

  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);

  const { toast } = useToast();
  const { effectivePorts, isLoaded: settingsLoaded } = useSettings();

  useEffect(() => {
    const startOctets = customStartIp.split('.');
    // Ensure startOctets has 4 elements, padding with empty strings if necessary for consistent processing
    while (startOctets.length < 4) startOctets.push('');
    startOctets.length = 4; // Ensure it's exactly 4 elements

    // If the first octet of startIP is empty, don't attempt to suggest EndIP changes based on it.
    if (startOctets[0].trim() === '') {
        // Optionally, if Start IP becomes completely empty, one might choose to clear End IP or leave it.
        // For now, we only act if Start IP has content.
        return;
    }
    
    const currentEndOctetsRaw = customEndIp.split('.');
    // Ensure currentEndOctetsRaw has 4 elements for consistent processing
    while (currentEndOctetsRaw.length < 4) currentEndOctetsRaw.push('');
    currentEndOctetsRaw.length = 4;

    let newEndOctets = [...currentEndOctetsRaw]; // Create a mutable copy from current end IP state
    let ipChanged = false;

    // Sync A, B, C octets of EndIP with StartIP
    for (let i = 0; i < 3; i++) {
        // Update EndIP's octet if StartIP's octet is validly formed (can be empty string for deletion effect)
        // and is different from EndIP's current corresponding octet.
        if (startOctets[i] !== newEndOctets[i]) {
          // Allow empty start octet to clear corresponding end octet
          if (startOctets[i] === '' || isValidOctet(startOctets[i])) {
            newEndOctets[i] = startOctets[i];
            ipChanged = true;
          }
        }
    }

    // D octet logic for EndIP:
    // If StartIP's A, B, C octets are all validly filled:
    if (isValidOctet(startOctets[0]) && isValidOctet(startOctets[1]) && isValidOctet(startOctets[2])) {
        // And if the D octet of the *original* customEndIp was empty or '255' (indicating it was default or ready for suggestion)
        if (currentEndOctetsRaw[3] === '' || currentEndOctetsRaw[3] === '255') {
            // Then, set the D octet of newEndOctets to '255', if it's not already.
            if (newEndOctets[3] !== '255') {
                newEndOctets[3] = '255';
                ipChanged = true;
            }
        }
        // If currentEndOctetsRaw[3] was something specific (e.g., "50"), newEndOctets[3] would have inherited that value,
        // and this block wouldn't change it, thus preserving user's specific End D octet.
    } else {
        // If Start IP's A.B.C prefix is not fully valid, don't force End D to 255.
        // If End D was '255' and Start A.B.C becomes incomplete, End D might get cleared if an earlier Start octet was cleared.
        // e.g. if startC clears, newEndC clears, and newEndD stays as it was (could be '255' or user value).
        // This behavior is generally fine as user is editing.
    }

    if (ipChanged) {
        const finalNewEndIp = newEndOctets.join('.');
        if (finalNewEndIp !== customEndIp) {
            setCustomEndIp(finalNewEndIp);
        }
    }
  }, [customStartIp]); // Only react to changes in customStartIp


  const fetchHosts = useCallback(async (rangeInput: { startIp: string; endIp: string }) => {
    if (!settingsLoaded) {
        toast({
            title: "Settings Not Loaded",
            description: "Cannot start scan until settings are loaded.",
            variant: "destructive",
        });
        return;
    }
    if (!rangeInput || !rangeInput.startIp || !rangeInput.endIp) {
        toast({
            title: "Invalid Range",
            description: "A valid IP range must be provided to scan.",
            variant: "destructive",
        });
        return;
    }


    setIsScanning(true);
    setHosts([]); 
    setError(null);
    setScannedRangeTitle(rangeInput); // Set the title for the currently scanned range
    
    const scanParameters: WailsScanParameters = { 
        startIp: rangeInput.startIp, 
        endIp: rangeInput.endIp, 
        ports: effectivePorts 
    };

    try {
      if (typeof window.go?.main?.App?.ScanNetwork === 'function' && typeof window.runtime?.EventsOn === 'function') {
        console.log("Using Wails backend for streaming network scan with params:", scanParameters);
        await window.go.main.App.ScanNetwork(scanParameters);
      } else {
        console.warn("Wails Go backend not available. Using mock streaming network scanner with params:", scanParameters);
        await mockScanNetworkService(
          scanParameters, 
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
    // No initial scan on load. User must initiate a scan.
  }, []);


  useEffect(() => {
    let unlistenHostFound: (() => void) | undefined;
    let unlistenScanComplete: (() => void) | undefined;
    let unlistenScanError: (() => void) | undefined;

    if (typeof window.runtime?.EventsOn === 'function') {
      unlistenHostFound = window.runtime.EventsOn('hostFound', (host: Host) => {
        setHosts(prevHosts => {
          // Check if host already exists to prevent duplicates if events are re-emitted or similar
          if (prevHosts.find(h => h.ipAddress === host.ipAddress)) {
             // Optionally, update existing host data if needed, though for this app, it's mostly new discoveries
            return prevHosts.map(h => h.ipAddress === host.ipAddress ? host : h);
          }
          return [...prevHosts, host].sort((a, b) => {
            // Basic IP sorting: convert to numbers for comparison
            const ipToNum = (ip: string) => ip.split('.').reduce((acc, octet, i) => acc + parseInt(octet) * Math.pow(256, 3 - i), 0);
            return ipToNum(a.ipAddress) - ipToNum(b.ipAddress);
          });
        });
      });

      unlistenScanComplete = window.runtime.EventsOn('scanComplete', (success: boolean) => {
        setIsScanning(false);
        if (!success) {
          console.warn("Scan completed, but Go backend indicated an issue during the scan.");
           setError(prevError => prevError || "Scan finished with an issue from the backend.");
        }
      });

      unlistenScanError = window.runtime.EventsOn('scanError', (errorMessage: string) => {
        console.error("Received scanError event:", errorMessage);
        setError(errorMessage);
        toast({
            title: "Scan Error",
            description: errorMessage,
            variant: "destructive",
        });
        setIsScanning(false); // Ensure scanning stops on error
      });
    }

    return () => {
      if (unlistenHostFound) unlistenHostFound();
      if (unlistenScanComplete) unlistenScanComplete();
      if (unlistenScanError) unlistenScanError();
    };
  }, [toast]); 

  const handleHostSelect = (host: Host) => {
    setSelectedHost(host);
    setIsDrawerOpen(true);
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
      <main className="flex-grow container mx-auto p-4 md:px-8 md:pt-8 space-y-8">
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-2xl font-semibold text-foreground">
              {scannedRangeTitle 
                ? `Hosts in ${scannedRangeTitle.startIp} - ${scannedRangeTitle.endIp}` 
                : 'Scan an IP Range'}
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
                onClick={() => setIsHistoryDrawerOpen(true)}
                variant="outline"
                className="w-full sm:w-auto"
                disabled={!settingsLoaded} // Keep disabled based on settingsLoaded
              >
                <HistoryIcon className="mr-2 h-4 w-4" />
                Scan History
              </Button>
            </div>
          </div>
          {/* The sticky container's top value should account for the custom title bar (h-8 = 2rem) 
              AND the main app header below it if that header is also fixed/sticky.
              Assuming the main <Header/> is not sticky, top-8 (for title bar) is fine.
              If <Header/> from layout becomes sticky, this top value needs to be adjusted further.
              Current <Header/> is part of the scrollable content flow so top-[calc(2rem)] (for title bar) is enough.
              The `pt-8` on `RootLayout`'s main div already pushes content down.
              So, `top-0` for this sticky bar means it sticks to the top of the scrollable main content area.
          */}
          <div className="sticky top-0 z-10 bg-background py-4 mb-6 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="relative w-full md:flex-grow">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Filter by IP, hostname, MAC..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                  disabled={(!scannedRangeTitle && hosts.length === 0) || (isScanning && hosts.length === 0) || !settingsLoaded} 
                />
              </div>
              <div className="flex items-center gap-2 self-end md:self-center">
                <Button
                  variant={viewMode === 'card' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('card')}
                  disabled={(!scannedRangeTitle && hosts.length === 0) || (isScanning && hosts.length === 0) || !settingsLoaded}
                  aria-label="Card view"
                >
                  <LayoutGrid className="h-5 w-5" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                  disabled={(!scannedRangeTitle && hosts.length === 0) || (isScanning && hosts.length === 0) || !settingsLoaded}
                  aria-label="List view"
                >
                  <List className="h-5 w-5" />
                </Button>
              </div>
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
              {scannedRangeTitle ? (
                searchTerm ? (
                  <>
                    <p className="text-xl font-medium text-muted-foreground">No hosts match your filter.</p>
                    <p className="text-sm text-muted-foreground">
                      For range: {scannedRangeTitle.startIp} - {scannedRangeTitle.endIp}. Try a different filter or clear it.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-medium text-muted-foreground">No hosts found.</p>
                    <p className="text-sm text-muted-foreground">
                      In the range: {scannedRangeTitle.startIp} - {scannedRangeTitle.endIp}.
                    </p>
                  </>
                )
              ) : (
                <>
                  <p className="text-xl font-medium text-muted-foreground">No Scan Performed Yet</p>
                  <p className="text-sm text-muted-foreground">
                    Click 'Scan Specific Range' to discover hosts.
                  </p>
                </>
              )}
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
          isScanning={isScanning}
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

