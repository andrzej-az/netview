// src/types/wails.d.ts
import type { Host } from '@/types/host';

export interface ScanHistoryItem {
  startIp: string;
  endIp: string;
  timestamp: string; // ISO string date, e.g., "2023-10-27T10:30:00Z"
}

declare global {
  interface Window {
    go: {
      main: {
        App: {
          /**
           * Initiates a network scan. Hosts are reported via 'hostFound' event.
           * 'scanComplete' event is emitted when the scan finishes.
           * Returns a promise that resolves when the scan is initiated,
           * or rejects if initiation fails.
           */
          ScanNetwork: (range?: { startIp: string; endIp: string } | null) => Promise<void>;
          /**
           * Retrieves the last 10 custom scan ranges.
           */
          GetScanHistory: () => Promise<ScanHistoryItem[]>;
        };
      };
    };
    // Wails runtime functions for events, etc.
    runtime: {
      EventsOn: (eventName: string, callback: (...data: any) => void) => () => void;
      EventsEmit: (eventName: string, ...data: any) => void;
      // Add other runtime functions if needed by the app
    };
    WailsInvoke: (method: string, ...args: any[]) => Promise<any>;
  }
}

// This ensures the file is treated as a module.
export {};
