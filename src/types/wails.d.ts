
// src/types/wails.d.ts
import type { Host } from '@/types/host';

export interface ScanHistoryItem {
  startIp: string;
  endIp: string;
  timestamp: string; // ISO string date, e.g., "2023-10-27T10:30:00Z"
}

// This interface must match the Go struct ScanRange in scan.go
export interface WailsScanParameters {
  startIp: string; 
  endIp: string;   
  ports: number[]; // List of ports to scan (useSettings provides default if user leaves empty)
}

declare global {
  interface Window {
    go: {
      main: {
        App: {
          /**
           * Initiates a network scan for a specific IP range. Hosts are reported via 'hostFound' event.
           * 'scanComplete' event is emitted when the scan finishes.
           * 'scanError' event may be emitted if there's an issue during the scan process.
           * Returns a promise that resolves when the scan is initiated,
           * or rejects if initiation fails.
           */
          ScanNetwork: (params: WailsScanParameters) => Promise<void>;
          /**
           * Retrieves the last 10 custom scan ranges.
           */
          GetScanHistory: () => Promise<ScanHistoryItem[]>;
        };
      };
    };
    // Wails runtime functions for events, window manipulation, etc.
    runtime: {
      EventsOn: (eventName: string, callback: (...data: any) => void) => () => void;
      EventsEmit: (eventName: string, ...data: any) => void;
      WindowMinimise?: () => void;
      WindowToggleMaximise?: () => Promise<void>; // Can be async
      Quit?: () => void;
      WindowIsMaximised?: () => Promise<boolean>; // Can be async
      // Add other runtime functions as needed by the app
      // For example, if using other functions from frontend/wailsjs/runtime/runtime.js:
      // WindowCenter?: () => void;
      // WindowSetTitle?: (title: string) => void;
      // ... etc.
    };
    WailsInvoke: (method: string, ...args: any[]) => Promise<any>;
  }
}

// This ensures the file is treated as a module.
export {};
