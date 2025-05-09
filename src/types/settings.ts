// src/types/settings.ts
export interface AppSettings {
  customPorts: string; // Comma-separated string of ports
}

export const DEFAULT_PORTS = [22, 80, 443, 8080, 445];
export const DEFAULT_PORTS_STRING = DEFAULT_PORTS.join(', ');
