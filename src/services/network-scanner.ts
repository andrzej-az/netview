// src/services/network-scanner.ts
import type { Host } from '@/types/host';

// Helper to simulate IP range filtering for the mock
function ipToUint32(ipStr: string): number | null {
  const ip = ipStr.split('.').map(Number);
  if (ip.length !== 4 || ip.some(isNaN) || ip.some(octet => octet < 0 || octet > 255)) {
    return null;
  }
  return (ip[0] << 24) | (ip[1] << 16) | (ip[2] << 8) | ip[3];
}

const mockHostsData: Host[] = [
  { ipAddress: "192.168.1.1", hostname: "router.local", macAddress: "00:1A:2B:3C:4D:5E", os: "RouterOS (Mock)", openPorts: [80, 443, 53] },
  { ipAddress: "192.168.1.100", hostname: "my-desktop.local", macAddress: "A1:B2:C3:D4:E5:F6", os: "Windows 11 (Mock)", openPorts: [3389, 8080] },
  { ipAddress: "192.168.1.101", hostname: "fileserver.lan", macAddress: "12:34:56:78:9A:BC", os: "Linux (Ubuntu Server) (Mock)", openPorts: [22, 445, 80, 443] },
  { ipAddress: "192.168.1.102", hostname: "iphone-of-user.local", macAddress: "FE:DC:BA:98:76:54", os: "iOS (Mock)", openPorts: [] },
  { ipAddress: "192.168.1.105", hostname: "printer.corp", macAddress: "AA:BB:CC:DD:EE:FF", os: "Printer OS (Mock)", openPorts: [80, 515, 631, 9100] },
  { ipAddress: "10.0.0.1", hostname: "gateway.corp", macAddress: "B1:C2:D3:E4:F5:00", os: "FirewallOS (Mock)", openPorts: [22, 443] },
  { ipAddress: "10.0.0.50", hostname: "dev-vm.corp", macAddress: "C1:D2:E3:F4:05:01", os: "Linux (Dev VM) (Mock)", openPorts: [22, 8000, 9000] },
];

export async function scanNetwork(rangeInput?: { startIp: string; endIp: string }): Promise<Host[]> {
  console.log("Mock Service: scanNetwork called");
  if (rangeInput) {
    console.log(`Mock Service: Scanning range: ${rangeInput.startIp} - ${rangeInput.endIp}`);
  } else {
    console.log("Mock Service: Scanning full network (mock)");
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      if (rangeInput) {
        const startIPNum = ipToUint32(rangeInput.startIp);
        const endIPNum = ipToUint32(rangeInput.endIp);

        if (startIPNum === null || endIPNum === null) {
          console.error("Mock Service: Invalid IP range provided to mock scanner.");
          resolve([]);
          return;
        }

        const filteredHosts = mockHostsData.filter(host => {
          const hostIPNum = ipToUint32(host.ipAddress);
          return hostIPNum !== null && hostIPNum >= startIPNum && hostIPNum <= endIPNum;
        });
        console.log(`Mock Service: Returning ${filteredHosts.length} filtered mock hosts`);
        resolve(filteredHosts);
      } else {
        console.log(`Mock Service: Returning ${mockHostsData.length} mock hosts (full scan)`);
        resolve(mockHostsData);
      }
    }, 1000); // Simulate network delay
  });
}
