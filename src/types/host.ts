/**
 * Represents a host in the network.
 */
export interface Host {
  /**
   * The IP address of the host.
   */
  ipAddress: string;
  /**
   * The hostname of the host (if available).
   */
  hostname?: string;
  /**
   * The MAC address of the host (if available).
   */
  macAddress?: string;
  /**
   * The operating system of the host (if available).
   */
  os?: string;
  /**
   * List of open ports on the host.
   */
  openPorts?: number[];
  /**
   * The determined type of the device (e.g., 'windows_pc', 'linux_server', 'printer').
   */
  deviceType?: string;
  /**
   * The current monitoring status of the host.
   * 'online': Host is reachable.
   * 'offline': Host is not reachable.
   * undefined: Status not determined or monitoring not active for this host.
   */
  status?: 'online' | 'offline';
}
