// src/components/settings/settings-dialog.tsx
'use client';

import type { FC } from 'react';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox'; // Import Checkbox
import { useSettings } from '@/hooks/use-settings';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_PORTS_STRING, DEFAULT_HIDDEN_HOSTS_PORTS_STRING } from '@/types/settings';
import { SaveIcon, Settings2Icon, RotateCcwIcon, Moon, Sun, Laptop, EyeIcon, EyeOffIcon } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useTheme } from '@/components/theme/theme-provider';
import { Separator } from '@/components/ui/separator';

interface SettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SettingsDialog: FC<SettingsDialogProps> = ({ isOpen, onOpenChange }) => {
  const { 
    customPortsString, setCustomPortsString, 
    searchHiddenHosts, setSearchHiddenHosts,
    hiddenHostsPortsString, setHiddenHostsPortsString,
    isLoaded: settingsLoaded 
  } = useSettings();
  
  const [localPortsString, setLocalPortsString] = useState<string>('');
  const [localSearchHiddenHosts, setLocalSearchHiddenHosts] = useState<boolean>(false);
  const [localHiddenHostsPortsString, setLocalHiddenHostsPortsString] = useState<string>('');
  
  const { theme, setTheme, effectiveTheme } = useTheme(); 
  const [localTheme, setLocalTheme] = useState(theme); 
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && settingsLoaded) {
      setLocalPortsString(customPortsString);
      setLocalSearchHiddenHosts(searchHiddenHosts);
      setLocalHiddenHostsPortsString(hiddenHostsPortsString);
      setLocalTheme(theme); 
    }
  }, [isOpen, settingsLoaded, customPortsString, searchHiddenHosts, hiddenHostsPortsString, theme]);

  const validatePortsList = (portsListString: string): string[] => {
    return portsListString
      .split(',')
      .map(s => s.trim())
      .filter(s => s !== '')
      .filter(p => {
        const num = parseInt(p, 10);
        return isNaN(num) || num < 1 || num > 65535;
      });
  };

  const handleSave = () => {
    const invalidMainPorts = validatePortsList(localPortsString);
    if (invalidMainPorts.length > 0) {
      toast({
        title: 'Invalid Main Ports',
        description: `The following ports are invalid: ${invalidMainPorts.join(', ')}. Ports must be numbers between 1 and 65535.`,
        variant: 'destructive',
      });
      return;
    }

    if (localSearchHiddenHosts) {
      const invalidHiddenPorts = validatePortsList(localHiddenHostsPortsString);
      if (invalidHiddenPorts.length > 0) {
        toast({
          title: 'Invalid Hidden Hosts Ports',
          description: `The following ports are invalid: ${invalidHiddenPorts.join(', ')}. Ports must be numbers between 1 and 65535.`,
          variant: 'destructive',
        });
        return;
      }
    }

    // Save settings
    setCustomPortsString(localPortsString);
    setSearchHiddenHosts(localSearchHiddenHosts);
    setHiddenHostsPortsString(localHiddenHostsPortsString);
    setTheme(localTheme);

    toast({
      title: 'Settings Saved',
      description: 'Your settings have been updated.',
    });
    onOpenChange(false);
  };

  const handleResetMainPorts = () => {
    setLocalPortsString(DEFAULT_PORTS_STRING);
  };

  const handleResetHiddenPorts = () => {
    setLocalHiddenHostsPortsString(DEFAULT_HIDDEN_HOSTS_PORTS_STRING);
  }

  if (!settingsLoaded && isOpen) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Settings2Icon className="mr-2 h-5 w-5" /> Application Settings
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">Loading settings...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Settings2Icon className="mr-2 h-5 w-5" /> Application Settings
          </DialogTitle>
          <DialogDescription>
            Customize network scanning parameters and application appearance.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-2">
          {/* Scan Settings Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Scan Settings</h3>
            <div className="space-y-2 pl-2">
              <Label htmlFor="custom-ports">Main Ports to Scan for Services</Label>
              <Input
                id="custom-ports"
                placeholder="e.g., 22, 80, 443, 3000"
                value={localPortsString}
                onChange={(e) => setLocalPortsString(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated. If empty, defaults to: ({DEFAULT_PORTS_STRING}). These ports are checked for services on discovered hosts.
              </p>
            </div>
            <div className="pl-2">
              <Button variant="outline" size="sm" onClick={handleResetMainPorts} className="w-full sm:w-auto">
                <RotateCcwIcon className="mr-2 h-4 w-4" />
                Reset Main Ports
              </Button>
            </div>
          </div>

          <Separator />

          {/* Hidden Host Discovery Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Hidden Host Discovery</h3>
            <div className="items-top flex space-x-2 pl-2">
              <Checkbox 
                id="search-hidden-hosts"
                checked={localSearchHiddenHosts}
                onCheckedChange={(checked) => setLocalSearchHiddenHosts(checked as boolean)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="search-hidden-hosts" className="font-normal cursor-pointer">
                  Enable advanced discovery for hidden hosts
                </Label>
                <p className="text-xs text-muted-foreground">
                  Probes additional ports to find hosts that might not respond to standard pings or common service ports.
                </p>
              </div>
            </div>

            {localSearchHiddenHosts && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="hidden-hosts-ports">Additional Ports for Hidden Host Discovery</Label>
                <Input
                  id="hidden-hosts-ports"
                  placeholder="e.g., 7, 9, 13, 19"
                  value={localHiddenHostsPortsString}
                  onChange={(e) => setLocalHiddenHostsPortsString(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated. These ports are used in the initial liveness check if enabled above.
                  If empty and enabled, no extra ports are probed for liveness.
                </p>
                <Button variant="outline" size="sm" onClick={handleResetHiddenPorts} className="w-full sm:w-auto mt-1">
                    <RotateCcwIcon className="mr-2 h-4 w-4" />
                    Reset Hidden Discovery Ports
                 </Button>
              </div>
            )}
          </div>

          <Separator />

          {/* Theme Settings Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Appearance</h3>
            <RadioGroup
              value={localTheme}
              onValueChange={(value) => setLocalTheme(value as 'light' | 'dark' | 'system')}
              className="space-y-1 pl-2"
            >
              <Label htmlFor="theme-light" className="flex items-center space-x-2 cursor-pointer">
                <RadioGroupItem value="light" id="theme-light" />
                <Sun className="mr-2 h-4 w-4" />
                <span>Light</span>
              </Label>
              <Label htmlFor="theme-dark" className="flex items-center space-x-2 cursor-pointer">
                <RadioGroupItem value="dark" id="theme-dark" />
                 <Moon className="mr-2 h-4 w-4" />
                <span>Dark</span>
              </Label>
              <Label htmlFor="theme-system" className="flex items-center space-x-2 cursor-pointer">
                <RadioGroupItem value="system" id="theme-system" />
                <Laptop className="mr-2 h-4 w-4" />
                <span>System</span>
              </Label>
            </RadioGroup>
            <p className="text-xs text-muted-foreground pl-2">
              Current effective theme: {effectiveTheme === 'light' ? 'Light' : 'Dark'}
            </p>
          </div>
        </div>
        <DialogFooter className="pt-4 border-t">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleSave}>
            <SaveIcon className="mr-2 h-4 w-4" />
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
