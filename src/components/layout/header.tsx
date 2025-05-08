
import { Network } from 'lucide-react';
import { ThemeToggleButton } from '@/components/theme/theme-toggle-button';

export function Header() {
  return (
    <header className="bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <Network className="h-8 w-8 mr-3" />
          <h1 className="text-2xl font-bold tracking-tight">NetView</h1>
        </div>
        <ThemeToggleButton />
      </div>
    </header>
  );
}
