
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
import { useSettings } from '@/hooks/use-settings';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_PORTS_STRING } from '@/types/settings';
import { SaveIcon, Settings2Icon, RotateCcwIcon, Moon, Sun, Laptop } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useTheme } from '@/components/theme/theme-provider';
import { Separator } from '@/components/ui/separator';

interface SettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SettingsDialog: FC<SettingsDialogProps> = ({ isOpen, onOpenChange }) => {
  const { customPortsString, setCustomPortsString, isLoaded: settingsLoaded } = useSettings();
  const [localPortsString, setLocalPortsString] = useState<string>('');
  const { theme, setTheme, effectiveTheme } = useTheme(); // Added theme state
  const [localTheme, setLocalTheme] = useState(theme); // Local state for radio group
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && settingsLoaded) {
      setLocalPortsString(customPortsString);
      setLocalTheme(theme); // Sync local theme state when dialog opens
    }
  }, [isOpen, settingsLoaded, customPortsString, theme]);

  const handleSave = () => {
    // Validate ports string (basic validation, could be more advanced)
    const ports = localPortsString
      .split(',')
      .map(s => s.trim())
      .filter(s => s !== '');

    const invalidPorts = ports.filter(p => {
      const num = parseInt(p, 10);
      return isNaN(num) || num < 1 || num > 65535;
    });

    if (invalidPorts.length > 0) {
      toast({
        title: 'Invalid Ports',
        description: `The following ports are invalid: ${invalidPorts.join(', ')}. Ports must be numbers between 1 and 65535.`,
        variant: 'destructive',
      });
      return;
    }

    // Save ports
    setCustomPortsString(localPortsString);
    // Save theme
    setTheme(localTheme);

    toast({
      title: 'Settings Saved',
      description: 'Your custom port and theme settings have been updated.',
    });
    onOpenChange(false);
  };

  const handleResetToDefault = () => {
    setLocalPortsString(DEFAULT_PORTS_STRING);
  };

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
        <div className="space-y-6 py-4">
          {/* Port Settings Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Scan Settings</h3>
            <div className="space-y-2 pl-2">
              <Label htmlFor="custom-ports">Custom Ports to Scan</Label>
              <Input
                id="custom-ports"
                placeholder="e.g., 22, 80, 443, 3000"
                value={localPortsString}
                onChange={(e) => setLocalPortsString(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter comma-separated port numbers. If empty, defaults will be used ({DEFAULT_PORTS_STRING}).
              </p>
            </div>
             <div className="pl-2">
                 <Button variant="outline" size="sm" onClick={handleResetToDefault} className="w-full sm:w-auto">
                    <RotateCcwIcon className="mr-2 h-4 w-4" />
                    Reset to Default Ports
                 </Button>
            </div>
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
        <DialogFooter>
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
