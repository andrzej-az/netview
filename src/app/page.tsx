
'use client';

// Use Wails generated Host type
import type { Host as WailsHost, ScanHistoryItem, WailsScanParameters, HostStatusUpdate } from '@/types/wails';
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
import { Loader2, ServerCrash, WifiOffIcon, ScanSearch, LayoutGrid, List, Search as SearchIcon, History as HistoryIcon, Activity, EyeOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { isValidIp, isValidOctet, ipToNumber } from '@/lib/ip-utils';
import { useToast } from '@/hooks/use-toast';
import { IpRangeInput } from '@/components/network/ip-range-input'; 
import { ScanHistoryDrawer } from '@/components/history/scan-history-drawer';
import { SettingsDialog } from '@/components/settings/settings-dialog';
import { useSettings } from '@/hooks/use-settings';
import { Card, CardContent } from '@/components/ui/card'; 
import type { Host as FrontendHost } from '@/types/host'; // Keep frontend Host type for local state

export default function HomePage() {
  const [hosts, setHosts] = useState<FrontendHost[]>([]); // Local state uses FrontendHost
  const [selectedHost, setSelectedHost] = useState<FrontendHost | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [startIp, setStartIp] = useState<string>('');
  const [endIp, setEndIp] = useState<string>('');

  const [scanInitiated, setScanInitiated] = useState(false); 

  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);


  const { toast } = useToast();
  const { 
    effectivePorts, 
    searchHiddenHosts, 
    parsedHiddenHostsPorts, 
    isLoaded: settingsLoaded 
  } = useSettings();

  useEffect(() => {
    const startOctets = startIp.split('.');
    while (startOctets.length < 4) startOctets.push('');
    startOctets.length = 4;

    if (startOctets[0].trim() === '') {
        return;
    }

    const currentEndOctetsRaw = endIp.split('.');
    while (currentEndOctetsRaw.length < 4) currentEndOctetsRaw.push('');
    currentEndOctetsRaw.length = 4;

    let newEndOctets = [...currentEndOctetsRaw];
    let ipChanged = false;

    for (let i = 0; i < 3; i++) {
        if (startOctets[i] !== newEndOctets[i]) {
          if (startOctets[i] === '' || isValidOctet(startOctets[i])) {
            newEndOctets[i] = startOctets[i];
            ipChanged = true;
          }
        }
    }

    if (isValidOctet(startOctets[0]) && isValidOctet(startOctets[1]) && isValidOctet(startOctets[2])) {
        if (currentEndOctetsRaw[3] === '' || currentEndOctetsRaw[3] === '255') {
            if (newEndOctets[3] !== '255') {
                newEndOctets[3] = '255';
                ipChanged = true;
            }
        }
    }

    if (ipChanged) {
        const finalNewEndIp = newEndOctets.join('.');
        if (finalNewEndIp !== endIp) {
            setEndIp(finalNewEndIp);
        }
    }
  }, [startIp, endIp]);


  const fetchHosts = useCallback(async (rangeInput: { startIp: string; endIp: string }) => {
    if (!settingsLoaded) {
        toast({
            title: "Settings Not Loaded",
            description: "Cannot start scan until settings are loaded.",
            variant: "destructive",
        });
        return;
    }

    if (isMonitoring && typeof window.go?.main?.App?.StopMonitoring === 'function') {
      try {
        console.log("Stopping existing monitoring before new scan.");
        await window.go.main.App.StopMonitoring();
        setIsMonitoring(false); 
        toast({ title: "Monitoring Paused", description: "Live monitoring paused for new scan."});
      } catch (e:any) {
        toast({ title: "Error Pausing Monitoring", description: e.message, variant: "destructive" });
      }
    }

    setIsScanning(true);
    setHosts([]);
    setError(null);
    setScanInitiated(true); 

    const scanParameters: WailsScanParameters = {
        startIp: rangeInput.startIp,
        endIp: rangeInput.endIp,
        ports: effectivePorts,
        searchHiddenHosts: searchHiddenHosts,
        hiddenHostsPorts: parsedHiddenHostsPorts,
    };

    try {
      if (typeof window.go?.main?.App?.ScanNetwork === 'function' && typeof window.runtime?.EventsOn === 'function') {
        console.log("Using Wails backend for streaming network scan with params:", scanParameters);
        await window.go.main.App.ScanNetwork(scanParameters);
      } else {
        console.warn("Wails Go backend not available. Using mock streaming network scanner with params:", scanParameters);
        await mockScanNetworkService(
          scanParameters,
          (host: FrontendHost) => { // Mock service returns FrontendHost
            setHosts(prevHosts => {
              const newHostWithStatus = { ...host, status: 'online' as const };
              if (prevHosts.find(h => h.ipAddress === newHostWithStatus.ipAddress)) return prevHosts;
              return [...prevHosts, newHostWithStatus];
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
  }, [toast, effectivePorts, searchHiddenHosts, parsedHiddenHostsPorts, settingsLoaded, isMonitoring]);

  useEffect(() => {
    if (settingsLoaded && typeof window.go?.main?.App?.IsMonitoringActive === 'function') {
      window.go.main.App.IsMonitoringActive().then(active => {
        setIsMonitoring(active);
        if (active) {
          toast({ title: "Monitoring Active", description: "Resumed live host status monitoring." });
        }
      }).catch(err => console.error("Failed to get initial monitoring state:", err));
    }
  }, [settingsLoaded, toast]);


  useEffect(() => {
    let unlistenHostFound: (() => void) | undefined;
    let unlistenScanComplete: (() => void) | undefined;
    let unlistenScanError: (() => void) | undefined;
    let unlistenHostStatusUpdate: (() => void) | undefined;

    if (typeof window.runtime?.EventsOn === 'function') {
      // WailsHost is received from Go backend
      unlistenHostFound = window.runtime.EventsOn('hostFound', (hostFromGo: WailsHost) => {
        setHosts(prevHosts => {
          // Convert WailsHost to FrontendHost for local state
          const newHostWithStatus: FrontendHost = { ...hostFromGo, status: 'online' as const };
          if (prevHosts.find(h => h.ipAddress === newHostWithStatus.ipAddress)) {
            return prevHosts.map(h => h.ipAddress === newHostWithStatus.ipAddress ? newHostWithStatus : h);
          }
          return [...prevHosts, newHostWithStatus].sort((a, b) => {
            const ipNumA = ipToNumber(a.ipAddress);
            const ipNumB = ipToNumber(b.ipAddress);
            if (ipNumA === null || ipNumB === null) return 0;
            return ipNumA - ipNumB;
          });
        });
      });

      unlistenScanComplete = window.runtime.EventsOn('scanComplete', async (success: boolean) => {
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
        setIsScanning(false);
      });

      unlistenHostStatusUpdate = window.runtime.EventsOn('hostStatusUpdate', (update: HostStatusUpdate) => {
        let hostForToast: FrontendHost | undefined;
        setHosts(prevHosts => {
          const updatedHosts = prevHosts.map(h => {
            if (h.ipAddress === update.ipAddress) {
              hostForToast = { ...h, status: update.isOnline ? 'online' : 'offline' };
              return hostForToast; 
            }
            return h; 
          });
          return updatedHosts; 
        });

        if (hostForToast) {
            const displayIdentifier = hostForToast.hostname || hostForToast.ipAddress;
            toast({
                title: `Host ${update.isOnline ? 'Online' : 'Offline'}`,
                description: `${displayIdentifier} (${hostForToast.ipAddress}) is now ${update.isOnline ? 'reachable' : 'unreachable'}.`,
                variant: update.isOnline ? 'default' : 'destructive',
            });
        } else {
            console.warn(`Received status update for IP not in current list: ${update.ipAddress}`);
        }
      });

    }

    return () => {
      if (unlistenHostFound) unlistenHostFound();
      if (unlistenScanComplete) unlistenScanComplete();
      if (unlistenScanError) unlistenScanError();
      if (unlistenHostStatusUpdate) unlistenHostStatusUpdate();
    };
  }, [toast]); 

  const handleHostSelect = (host: FrontendHost) => {
    setSelectedHost(host);
    setIsDrawerOpen(true);
  };

  const handleScan = useCallback((): boolean => {
    let sIp = startIp;
    let eIp = endIp;

    const sIpPartsRaw = sIp.split('.');
    while (sIpPartsRaw.length < 4) sIpPartsRaw.push('');
    const finalStartIpParts = sIpPartsRaw.slice(0, 4).map(part => (part.trim() === '' ? '0' : part.trim()));
    const finalStartIp = finalStartIpParts.join('.');

    const eIpPartsRaw = eIp.split('.');
    while (eIpPartsRaw.length < 4) eIpPartsRaw.push('');
    const finalEndIpParts = eIpPartsRaw.slice(0, 4).map((part, index) => {
      const trimmedPart = part.trim();
      if (trimmedPart === '') {
        return index === 3 ? '255' : '0';
      }
      return trimmedPart;
    });
    const finalEndIp = finalEndIpParts.join('.');

    if (!isValidIp(finalStartIp)) {
      toast({ title: "Invalid Input", description: "Start IP address is not valid. Empty octets were treated as '0'.", variant: "destructive" });
      const ipRangeContainer = document.getElementById('ip-range-container');
      ipRangeContainer?.classList.add('animate-shake');
      setTimeout(() => ipRangeContainer?.classList.remove('animate-shake'), 500);
      return false;
    }
    if (!isValidIp(finalEndIp)) {
      toast({ title: "Invalid Input", description: "End IP address is not valid. Empty octets were treated as '0' (or '255' for the last octet).", variant: "destructive" });
      const ipRangeContainer = document.getElementById('ip-range-container');
      ipRangeContainer?.classList.add('animate-shake');
      setTimeout(() => ipRangeContainer?.classList.remove('animate-shake'), 500);
      return false;
    }

    const startNum = ipToNumber(finalStartIp);
    const endNum = ipToNumber(finalEndIp);

    if (startNum === null || endNum === null || startNum > endNum) {
      toast({ title: "Invalid Range", description: "Start IP cannot be greater than End IP after processing.", variant: "destructive" });
       const ipRangeContainer = document.getElementById('ip-range-container');
      ipRangeContainer?.classList.add('animate-shake');
      setTimeout(() => ipRangeContainer?.classList.remove('animate-shake'), 500);
      return false;
    }

    fetchHosts({ startIp: finalStartIp, endIp: finalEndIp });
    return true;
  }, [startIp, endIp, fetchHosts, toast]);

  const handleRescanFromHistory = (histStartIp: string, histEndIp: string) => {
    setStartIp(histStartIp);
    setEndIp(histEndIp);

    const sIpPartsRaw = histStartIp.split('.');
    while (sIpPartsRaw.length < 4) sIpPartsRaw.push('');
    const finalStartIpParts = sIpPartsRaw.slice(0, 4).map(part => (part.trim() === '' ? '0' : part.trim()));
    const finalHistStartIp = finalStartIpParts.join('.');

    const eIpPartsRaw = histEndIp.split('.');
    while (eIpPartsRaw.length < 4) eIpPartsRaw.push('');
    const finalEndIpParts = eIpPartsRaw.slice(0, 4).map((part, index) => {
      const trimmedPart = part.trim();
      if (trimmedPart === '') {
        return index === 3 ? '255' : '0';
      }
      return trimmedPart;
    });
    const finalHistEndIp = finalEndIpParts.join('.');


    if (!isValidIp(finalHistStartIp) || !isValidIp(finalHistEndIp)) {
        toast({ title: "Invalid History Item", description: "The selected history item has an invalid IP range after processing.", variant: "destructive" });
        return;
    }
    const startNum = ipToNumber(finalHistStartIp);
    const endNum = ipToNumber(finalHistEndIp);
    if (startNum === null || endNum === null || startNum > endNum) {
        toast({ title: "Invalid History Range", description: "Start IP cannot be greater than End IP in history item.", variant: "destructive" });
        return;
    }

    fetchHosts({ startIp: finalHistStartIp, endIp: finalHistEndIp });
  };

  const handleToggleMonitoring = async () => {
    if (isScanning) {
      toast({ title: "Scan in Progress", description: "Wait for scan to complete.", variant: "default" });
      return;
    }

    if (isMonitoring) { 
      if (typeof window.go?.main?.App?.StopMonitoring === 'function') {
        try {
          await window.go.main.App.StopMonitoring();
          setIsMonitoring(false);
          setHosts(prevHosts => prevHosts.map(h => ({ ...h, status: undefined })));
          toast({ title: "Monitoring Stopped", description: "Live host monitoring deactivated." });
        } catch (e: any) {
          toast({ title: "Error Stopping Monitoring", description: e.message || "Unknown error", variant: "destructive" });
        }
      } else {
        toast({ title: "Feature Not Available", description: "StopMonitoring backend function missing.", variant: "destructive" });
      }
    } else { 
      if (hosts.length === 0) {
        toast({ title: "No Hosts to Monitor", description: "Scan for hosts first." });
        return;
      }
      if (typeof window.go?.main?.App?.StartMonitoring === 'function') {
        // Convert FrontendHost[] to WailsHost[] before sending to backend
        const hostsForBackend: WailsHost[] = hosts.map(h => ({
          ipAddress: h.ipAddress,
          hostname: h.hostname,
          macAddress: h.macAddress,
          os: h.os,
          openPorts: h.openPorts,
          deviceType: h.deviceType,
          // 'status' field is frontend-only, not sent to backend StartMonitoring
        }));

        try {
          await window.go.main.App.StartMonitoring(hostsForBackend, searchHiddenHosts, parsedHiddenHostsPorts);
          setIsMonitoring(true);
          setHosts(prevHosts => prevHosts.map(h => ({ ...h, status: 'online' })));
          toast({ title: "Monitoring Started", description: `Monitoring ${hostsForBackend.length} hosts.` });
        } catch (e: any) {
          toast({ title: "Error Starting Monitoring", description: e.message || "Unknown error", variant: "destructive" });
        }
      } else {
         toast({ title: "Feature Not Available", description: "StartMonitoring backend function missing.", variant: "destructive" });
      }
    }
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
      <main className="flex-grow container mx-auto p-4 md:px-8 md:pt-8 space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div id="ip-range-container" className="flex flex-col lg:flex-row lg:items-end gap-4 lg:gap-6">
              <div className="flex-grow"> 
                <IpRangeInput
                  startIp={startIp}
                  onStartIpChange={setStartIp}
                  endIp={endIp}
                  onEndIpChange={setEndIp}
                  disabled={isScanning || !settingsLoaded}
                  onEnterPress={handleScan}
                />
              </div>
              <div className="flex flex-row gap-2 w-full lg:w-auto flex-shrink-0 mt-4 lg:mt-0 lg:self-end">
                <Button
                  onClick={handleScan}
                  disabled={isScanning || !settingsLoaded}
                  className="flex-grow md:flex-grow-0" 
                  title="Scan the specified IP range"
                >
                  <ScanSearch className={`mr-2 h-4 w-4 ${isScanning ? 'animate-pulse' : ''}`} />
                  {isScanning ? 'Scanning...' : 'Scan'}
                </Button>
                 <Button
                  onClick={() => setIsHistoryDrawerOpen(true)}
                  variant="outline"
                  className="flex-grow md:flex-grow-0" 
                  disabled={!settingsLoaded}
                  aria-label="Scan History"
                  title="View Scan History"
                >
                  <HistoryIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
             {!settingsLoaded && (
                 <div className="flex items-center justify-center pt-4 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading settings... Scan disabled.
                </div>
              )}
          </CardContent>
        </Card>


        <div>
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-2xl font-semibold text-foreground">
              Network Scan Results
              {(isScanning || (isMonitoring && hosts.length > 0) ) &&
                <span className="text-base font-normal text-muted-foreground ml-2">
                  ({isScanning ? 'Scanning...' : isMonitoring ? 'Monitoring...' : ''})
                </span>
              }
            </h2>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto justify-end">
               <Button
                onClick={handleToggleMonitoring}
                disabled={isScanning || !settingsLoaded || (hosts.length === 0 && !isMonitoring)}
                variant={isMonitoring ? "secondary" : "outline"}
                className="w-full sm:w-auto"
                title={isMonitoring ? "Stop live monitoring of hosts" : "Start live monitoring of found hosts"}
              >
                {isMonitoring ? <EyeOff className="mr-2 h-4 w-4" /> : <Activity className="mr-2 h-4 w-4" />}
                {isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
              </Button>
            </div>
          </div>

          <div className="sticky top-0 z-10 bg-background py-4 mb-6 shadow-sm -mx-4 px-4 md:-mx-8 md:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="relative w-full md:flex-grow">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Filter by IP, hostname, MAC..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                  disabled={(!scanInitiated && hosts.length === 0) || (isScanning && hosts.length === 0) || !settingsLoaded}
                  aria-label="Filter scan results"
                />
              </div>
              <div className="flex items-center gap-2 self-end md:self-center">
                <Button
                  variant={viewMode === 'card' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('card')}
                  disabled={(!scanInitiated && hosts.length === 0) || (isScanning && hosts.length === 0) || !settingsLoaded}
                  aria-label="Card view"
                  title="Display results as cards"
                >
                  <LayoutGrid className="h-5 w-5" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                  disabled={(!scanInitiated && hosts.length === 0) || (isScanning && hosts.length === 0) || !settingsLoaded}
                  aria-label="List view"
                  title="Display results as a list"
                >
                  <List className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>


          {isScanning && hosts.length === 0 && !error && (
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

          {isScanning && hosts.length > 0 && (
             <div className="flex items-center justify-center py-4 text-md text-accent mb-4">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Scanning in progress... Hosts will appear below as they are found.
            </div>
          )}


          {error && (
            <Alert variant="destructive" className="mb-6">
              <ServerCrash className="h-4 w-4" />
              <AlertTitle>Error During Scan</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!isScanning && !error && filteredHosts.length === 0 && scanInitiated && (
             <div className="text-center py-10">
              <WifiOffIcon className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              {searchTerm ? (
                  <>
                    <p className="text-xl font-medium text-muted-foreground">No hosts match your filter.</p>
                    <p className="text-sm text-muted-foreground">
                      Try a different filter or clear it.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-medium text-muted-foreground">No hosts found.</p>
                    <p className="text-sm text-muted-foreground">
                     No devices responded in the scanned range.
                    </p>
                  </>
                )
              }
              {searchTerm && (
                <Button variant="link" onClick={() => setSearchTerm('')} className="mt-2">
                  Clear filter
                </Button>
              )}
            </div>
          )}

           {!isScanning && !error && hosts.length === 0 && !scanInitiated && (
             <div className="text-center py-10">
                <ScanSearch className="mx-auto h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                <p className="text-xl font-medium text-muted-foreground">Enter an IP Range</p>
                <p className="text-sm text-muted-foreground">
                    Specify the start and end IP addresses above and click 'Scan'.
                </p>
             </div>
           )}

          {filteredHosts.length > 0 && (
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
