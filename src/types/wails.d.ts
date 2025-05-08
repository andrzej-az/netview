
// src/types/wails.d.ts
import type { Host } from '@/types/host';

declare global {
  interface Window {
    go: {
      main: {
        App: {
          ScanNetwork: (range?: { startIp: string; endIp: string } | null) => Promise<Host[]>;
        };
      };
    };
    WailsInvoke: (method: string, ...args: any[]) => Promise<any>;
  }
}

// This ensures the file is treated as a module.
export {};
