import type { Host } from '@/types/host';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InfoIcon, WorkflowIcon } from 'lucide-react';
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
        <div> {/* Wrapper for content above the button */}
          <div className="text-xs text-muted-foreground mb-2">
            {host.macAddress && <p>MAC: {host.macAddress}</p>}
            {host.os && <p>OS: {host.os}</p>}
            {host.deviceType && <p className="capitalize">Type: {host.deviceType.replace(/_/g, ' ')}</p>}
          </div>

          {host.openPorts && host.openPorts.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center">
                <WorkflowIcon className="w-3 h-3 mr-1.5" />
                Open Ports:
              </p>
              <div className="flex flex-wrap gap-1">
                {host.openPorts.map((port) => (
                  <Badge key={port} variant="secondary" className="text-xs font-mono px-1.5 py-0.5">
                    {port}
                  </Badge>
                ))}
              </div>
            </div>
          )}
           {(!host.openPorts || host.openPorts.length === 0) && (
             <div className="mb-3">
                <p className="text-xs text-muted-foreground italic">No matching open ports found.</p>
             </div>
           )}
        </div>

        <Button variant="outline" size="sm" onClick={() => onSelect(host)} className="w-full mt-auto">
          <InfoIcon className="mr-2 h-4 w-4" />
          View Details
        </Button>
      </CardContent>
    </Card>
  );
}
