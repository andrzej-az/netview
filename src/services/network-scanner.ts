import type { Host } from '@/types/host';

/**
 * Asynchronously scans the network for active hosts.
 *
 * @returns A promise that resolves to an array of Host objects.
 */
export async function scanNetwork(): Promise<Host[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // TODO: Implement this by calling an API or using a network scanning library.
  // For now, returning mock data.
  return [
    {
      ipAddress: '192.168.1.1',
      hostname: 'router.local',
      macAddress: '00:1A:2B:3C:4D:5E',
      os: 'RouterOS',
      openPorts: [80, 443, 53],
    },
    {
      ipAddress: '192.168.1.100',
      hostname: 'my-desktop.local',
      macAddress: 'A1:B2:C3:D4:E5:F6',
      os: 'Windows 11',
      openPorts: [3389, 8080],
    },
    {
      ipAddress: '192.168.1.101',
      hostname: 'fileserver.lan',
      macAddress: '12:34:56:78:9A:BC',
      os: 'Linux (Ubuntu Server)',
      openPorts: [22, 445, 80, 443],
    },
    {
      ipAddress: '192.168.1.102',
      hostname: 'iphone-of-user.local',
      macAddress: 'FE:DC:BA:98:76:54',
      os: 'iOS',
      openPorts: [],
    },
     {
      ipAddress: '192.168.1.105',
      hostname: 'printer.corp',
      macAddress: 'AA:BB:CC:DD:EE:FF',
      os: 'Printer OS',
      openPorts: [80, 515, 631, 9100],
    },
  ];
}
