
'use client';

import { Minus, Square, X as LucideX, Maximize2, Minimize2, Network as AppIcon } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';

export function CustomTitlebar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isWailsEnv, setIsWailsEnv] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window.runtime?.WindowMinimise === 'function') {
      setIsWailsEnv(true);
    }
  }, []);

  const updateMaximisedState = useCallback(async () => {
    if (isWailsEnv && typeof window.runtime?.WindowIsMaximised === 'function') {
      try {
        const maximised = await window.runtime.WindowIsMaximised();
        setIsMaximized(maximised);
      } catch (e) {
        console.error("Failed to get window maximization state:", e);
      }
    }
  }, [isWailsEnv]);

  useEffect(() => {
    if (isClient && isWailsEnv) {
      updateMaximisedState();
    }
  }, [isClient, isWailsEnv, updateMaximisedState]);


  const handleToggleMaximize = async () => {
    if (isWailsEnv && typeof window.runtime?.WindowToggleMaximise === 'function') {
      try {
        await window.runtime.WindowToggleMaximise();
        setTimeout(updateMaximisedState, 150); 
      } catch (e) {
        console.error("Failed to toggle maximize window:", e);
      }
    } else {
      console.warn('WindowToggleMaximise function not available on window.runtime');
    }
  };

  const handleMinimize = () => {
    if (isWailsEnv && typeof window.runtime?.WindowMinimise === 'function') {
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
    if (isWailsEnv && typeof window.runtime?.Quit === 'function') {
        try {
            window.runtime.Quit();
        } catch (e) {
            console.error("Failed to close window:", e);
        }
    } else {
      console.warn('Quit function not available on window.runtime');
    }
  };
  
  if (!isClient && !isWailsEnv) { // Show placeholder only if not wails and not client
    // Placeholder to maintain layout space during SSR or before client-side check
    return <div className="h-8 bg-background print:hidden" />;
  }


  return (
    // Removed: fixed top-0 left-0 right-0 z-[101]
    // Added: position: relative and z-index to ensure it's above some elements but can be overlaid by high-z-index fixed elements.
    // However, for sheets to overlay it, it should generally not have a z-index if it's static.
    // Or, if it needs to be above some relative/sticky content, then relative and a z-index might be useful.
    // For now, let it be a simple block element in the flex flow.
    <div className="h-8 bg-background text-foreground flex items-center justify-between border-b print:hidden">
      {/* Draggable Area and Title */}
      <div data-wails-drag className="flex-grow h-full flex items-center px-3 select-none">
        <AppIcon className="h-4 w-4 mr-2 text-primary" />
        <span className="text-xs font-medium">NetView - Network Scanner</span>
      </div>

      {/* Window Controls: Render only if in Wails environment */}
      {isWailsEnv && (
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
