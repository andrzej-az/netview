
'use client';

import { Minus, Square, X as LucideX, Maximize2, Minimize2, Network as AppIcon } from 'lucide-react';
// Removed direct import: import { WindowMinimise, WindowToggleMaximise, Quit, WindowIsMaximised } from 'frontend/wailsjs/runtime';
import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';

export function CustomTitlebar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const updateMaximisedState = useCallback(async () => {
    if (typeof window.runtime?.WindowIsMaximised === 'function') {
      try {
        const maximised = await window.runtime.WindowIsMaximised();
        setIsMaximized(maximised);
      } catch (e) {
        console.error("Failed to get window maximization state:", e);
      }
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      updateMaximisedState();
      // Optional: Listen for resize or specific Wails events if maximization can change externally
      // and updateMaximisedState accordingly.
    }
  }, [isClient, updateMaximisedState]);


  const handleToggleMaximize = async () => {
    if (typeof window.runtime?.WindowToggleMaximise === 'function') {
      try {
        await window.runtime.WindowToggleMaximise();
        // Wails may not immediately reflect the change, a slight delay can help
        setTimeout(updateMaximisedState, 150); 
      } catch (e) {
        console.error("Failed to toggle maximize window:", e);
      }
    } else {
      console.warn('WindowToggleMaximise function not available on window.runtime');
    }
  };

  const handleMinimize = () => {
    if (typeof window.runtime?.WindowMinimise === 'function') {
        try {
            window.runtime.WindowMinimise();
        } catch (e) {
            console.error("Failed to minimize window:", e);
        }
    } else {
      console.warn('WindowMinimise function not available on window.runtime');
    }
  };

  const handleClose = () => {
    if (typeof window.runtime?.Quit === 'function') {
        try {
            window.runtime.Quit();
        } catch (e) {
            console.error("Failed to close window:", e);
        }
    } else {
      console.warn('Quit function not available on window.runtime');
    }
  };
  
  // Render a placeholder or nothing until client-side effects determine Wails availability
  if (!isClient) {
    // This div helps maintain layout space, crucial for `pt-8` in RootLayout
    return <div className="h-8 bg-background fixed top-0 left-0 right-0 z-[60] print:hidden" />;
  }

  return (
    <div className="h-8 bg-background text-foreground flex items-center justify-between border-b fixed top-0 left-0 right-0 z-[60] print:hidden">
      {/* Draggable Area and Title */}
      <div data-wails-drag className="flex-grow h-full flex items-center px-3 select-none">
        <AppIcon className="h-4 w-4 mr-2 text-primary" />
        <span className="text-xs font-medium">NetView - Network Scanner</span>
      </div>

      {/* Window Controls: Render only if Wails runtime functions are likely available */}
      {typeof window.runtime?.WindowMinimise === 'function' && (
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-0 rounded-none hover:bg-muted focus-visible:ring-0 focus-visible:ring-offset-0"
            onClick={handleMinimize}
            aria-label="Minimize"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-0 rounded-none hover:bg-muted focus-visible:ring-0 focus-visible:ring-offset-0"
            onClick={handleToggleMaximize}
            aria-label={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-0 rounded-none hover:bg-destructive/90 hover:text-destructive-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
            onClick={handleClose}
            aria-label="Close"
          >
            <LucideX className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

