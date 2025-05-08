'use client';

import { useState, useEffect } from 'react';
import type { Host } from '@/types/host';
import { scanNetwork } from '@/services/network-scanner';
import { Header } from '@/components/layout/header';
import { HostCard } from '@/components/hosts/host-card';
import { HostDetailsDrawer } from '@/components/hosts/host-details-drawer';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ServerCrash, RotateCwIcon, WifiOffIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';


export default function HomePage() {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHosts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedHosts = await scanNetwork();
      setHosts(fetchedHosts);
    } catch (e) {
      console.error("Failed to scan network:", e);
      setError("Failed to scan the network. Please check your connection or try again.");
      setHosts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHosts();
  }, []);

  const handleHostSelect = (host: Host) => {
    setSelectedHost(host);
    setIsDrawerOpen(true);
  };

  const handleRefresh = () => {
    fetchHosts();
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


  return (
    <>
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-foreground">Detected Hosts</h2>
          <Button onClick={handleRefresh} disabled={isLoading} variant="outline">
            <RotateCwIcon className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Scanning...' : 'Refresh Scan'}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <ServerCrash className="h-4 w-4" />
            <AlertTitle>Error Scanning Network</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading && !error && (
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => <HostSkeletonCard key={i} />)}
          </div>
        )}

        {!isLoading && !error && hosts.length === 0 && (
          <div className="text-center py-10">
            <WifiOffIcon className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-xl font-medium text-muted-foreground">No hosts found on the network.</p>
            <p className="text-sm text-muted-foreground">Ensure you are connected to the network and try refreshing.</p>
          </div>
        )}
        
        {!isLoading && !error && hosts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {hosts.map((host) => (
              <HostCard key={host.ipAddress} host={host} onSelect={handleHostSelect} />
            ))}
          </div>
        )}

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
