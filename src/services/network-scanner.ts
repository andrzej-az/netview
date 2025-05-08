
import type { Host } from '@/types/host';

const MOCK_HOSTS: Host[] = [
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

/**
 * Asynchronously scans the network for active hosts.
 *
 * @param range - Optional. An object with startIp and endIp to scan a specific range.
 * @returns A promise that resolves to an array of Host objects.
 */
export async function scanNetwork(range?: { startIp: string, endIp: string }): Promise<Host[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  if (range) {
    console.log(`Simulating scan for IP range: ${range.startIp} - ${range.endIp}`);
    // In a real application, you would filter hosts based on the range or pass the range to a scanning utility.
    // For this mock, we'll return a subset if the range implies it, or all for broad ranges.
    // This is a very simplistic filter for demonstration.
    const startIpNum = ipToNumber(range.startIp);
    const endIpNum = ipToNumber(range.endIp);

    if (startIpNum === -1 || endIpNum === -1) { // Invalid IP format for filtering
        return MOCK_HOSTS;
    }
    
    return MOCK_HOSTS.filter(host => {
        const hostIpNum = ipToNumber(host.ipAddress);
        return hostIpNum >= startIpNum && hostIpNum <= endIpNum;
    });

  } else {
    console.log('Simulating full network scan.');
  }
  // TODO: Implement this by calling an API or using a network scanning library.
  // For now, returning mock data.
  return MOCK_HOSTS;
}


// Helper function to convert IP string to a number for comparison
function ipToNumber(ip: string): number {
  const parts = ip.split('.');
  if (parts.length !== 4) return -1; // Invalid IP
  let num = 0;
  for (let i = 0; i < 4; i++) {
    const partNum = parseInt(parts[i], 10);
    if (isNaN(partNum) || partNum < 0 || partNum > 255) return -1; // Invalid octet
    num = (num << 8) + partNum;
  }
  return num >>> 0; // Convert to unsigned 32-bit integer
}
