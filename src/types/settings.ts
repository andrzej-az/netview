// src/types/settings.ts
export interface AppSettings {
  customPorts: string; // Comma-separated string of ports
  searchHiddenHosts: boolean;
  hiddenHostsPorts: string; // Comma-separated string of ports for hidden host search
}

export const DEFAULT_PORTS = [22, 80, 443, 8080, 445];
export const DEFAULT_PORTS_STRING = DEFAULT_PORTS.join(', ');
export const DEFAULT_SEARCH_HIDDEN_HOSTS = false;
export const DEFAULT_HIDDEN_HOSTS_PORTS_STRING = ''; // e.g., "7,9,13,19,21,23,25,110,143" - user can fill this
