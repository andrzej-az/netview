import type { Host } from '@/types/host';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InfoIcon } from 'lucide-react';
import { HostIcon } from './host-icon';

interface HostCardProps {
  host: Host;
  onSelect: (host: Host) => void;
}

export function HostCard({ host, onSelect }: HostCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 ease-in-out flex flex-col">
      <CardHeader className="flex flex-row items-center space-x-4 pb-2">
        <HostIcon deviceType={host.deviceType} className="w-10 h-10 text-accent" />
        <div>
          <CardTitle className="text-lg">{host.hostname || 'Unknown Host'}</CardTitle>
          <CardDescription className="text-sm">{host.ipAddress}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-between pt-2">
        <div className="text-xs text-muted-foreground mb-4">
          {host.macAddress && <p>MAC: {host.macAddress}</p>}
          {host.os && <p>OS: {host.os}</p>}
          {host.deviceType && <p className="capitalize">Type: {host.deviceType.replace(/_/g, ' ')}</p>}
        </div>
        <Button variant="outline" size="sm" onClick={() => onSelect(host)} className="w-full mt-auto">
          <InfoIcon className="mr-2 h-4 w-4" />
          View Details
        </Button>
      </CardContent>
    </Card>
  );
}
