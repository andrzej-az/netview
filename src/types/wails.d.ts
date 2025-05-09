// src/types/wails.d.ts
import type { Host } from '@/types/host';

export interface ScanHistoryItem {
  startIp: string;
  endIp: string;
  timestamp: string; // ISO string date, e.g., "2023-10-27T10:30:00Z"
}

// This interface must match the Go struct ScanRange in scan.go
export interface WailsScanParameters {
  startIp?: string; // Optional: for full scan, these might be empty or undefined
  endIp?: string;   // Optional
  ports?: number[]; // List of ports to scan
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
           * Parameters can include specific IPs for a range scan, or just ports for a full scan with custom ports.
           * If parameters is null or an empty object, a default full scan might be performed.
           */
          ScanNetwork: (params?: WailsScanParameters | null) => Promise<void>;
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
