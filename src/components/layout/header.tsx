
import { Network, SettingsIcon } from 'lucide-react';
import { ThemeToggleButton } from '@/components/theme/theme-toggle-button';
import type { ButtonProps } from '@/components/ui/button'; // Import ButtonProps
import { Button } from '@/components/ui/button'; // Import Button

interface HeaderProps {
  onSettingsClick?: () => void;
}

export function Header({ onSettingsClick }: HeaderProps) {
  return (
    <header className="bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <Network className="h-8 w-8 mr-3" />
          <h1 className="text-2xl font-bold tracking-tight">NetView</h1>
        </div>
        <div className="flex items-center gap-2">
          {onSettingsClick && (
            <Button variant="ghost" size="icon" onClick={onSettingsClick} aria-label="Open settings">
              <SettingsIcon className="h-5 w-5" />
            </Button>
          )}
          <ThemeToggleButton />
        </div>
      </div>
    </header>
  );
}
