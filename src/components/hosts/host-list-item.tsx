
import type { Host } from '@/types/host';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InfoIcon, MoreHorizontal } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HostIcon } from './host-icon';
import { cn } from '@/lib/utils';

interface HostListItemProps {
  host: Host;
  onSelect: (host: Host) => void;
}

export function HostListItem({ host, onSelect }: HostListItemProps) {
  const displayPorts = host.openPorts?.slice(0, 3) || [];
  const hasMorePorts = (host.openPorts?.length || 0) > 3;

  const primaryDisplay = host.hostname || host.ipAddress;
  const secondaryDisplay = host.hostname ? host.ipAddress : (host.deviceType ? `Type: ${host.deviceType.replace(/_/g, ' ')}` : host.macAddress);


  return (
    <div className={cn(
      "flex items-center p-3 sm:p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors duration-150 ease-in-out",
      host.status === 'offline' && 'opacity-60 filter grayscale'
      )}
    >
      <HostIcon deviceType={host.deviceType} className="w-7 h-7 sm:w-8 sm:h-8 text-accent mr-3 sm:mr-4 shrink-0" />
      
      <div className="flex-1 min-w-0 mr-3">
        <p className="font-semibold text-sm sm:text-base truncate" title={primaryDisplay}>
          {primaryDisplay}
        </p>
        {secondaryDisplay && (
           <p className="text-xs sm:text-sm text-muted-foreground truncate capitalize" title={secondaryDisplay}>
            {secondaryDisplay}
          </p>
        )}
      </div>
      
      <div className="hidden md:flex items-center gap-1 mx-2 sm:mx-4 shrink-0 max-w-[150px] lg:max-w-[200px] overflow-x-auto">
        {displayPorts.length > 0 ? (
          <>
            {displayPorts.map(port => (
              <Badge key={port} variant="secondary" className="text-xs font-mono px-1.5 py-0.5 sm:px-2 sm:py-1 whitespace-nowrap">
                {port}
              </Badge>
            ))}
            {hasMorePorts && (
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs font-mono cursor-default px-1 py-0.5 sm:px-1.5 sm:py-1">
                      <MoreHorizontal className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>More open ports ({host.openPorts?.length})</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </>
        ) : (
          <span className="text-xs text-muted-foreground italic">No open ports</span>
        )}
      </div>
      
      <Button variant="ghost" size="icon" onClick={() => onSelect(host)} className="ml-auto shrink-0 h-8 w-8 sm:h-9 sm:w-9">
        <InfoIcon className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="sr-only">View Details for {primaryDisplay}</span>
      </Button>
    </div>
  );
}
