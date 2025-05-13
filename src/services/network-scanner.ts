// src/services/network-scanner.ts
import type { Host } from '@/types/host';
import { DEFAULT_PORTS } from '@/types/settings';
import type { WailsScanParameters } from '@/types/wails'; // Use the Wails type for consistency

// Helper to simulate IP range filtering for the mock
function ipToUint32(ipStr: string): number | null {
  if (!ipStr) return null; 
  const ip = ipStr.split('.').map(Number);
  if (ip.length !== 4 || ip.some(isNaN) || ip.some(octet => octet < 0 || octet > 255)) {
    return null;
  }
  return (ip[0] << 24) | (ip[1] << 16) | (ip[2] << 8) | ip[3];
}

// Helper for mock device type determination
function mockDetermineDeviceType(os: string | undefined): string {
  if (!os) return "generic_device";
  const lowerOS = os.toLowerCase();

  if (lowerOS.includes("windows")) return "windows_pc";
  if (lowerOS.includes("android")) return "android_mobile";
  if (lowerOS.includes("ios") || lowerOS.includes("iphone") || lowerOS.includes("ipad")) return "ios_mobile";
  if (lowerOS.includes("printer")) return "printer";
  if (lowerOS.includes("router") || lowerOS.includes("firewall") || lowerOS.includes("gateway")) return "router_firewall";
  if (lowerOS.includes("linux")) {
    if (lowerOS.includes("server")) return "linux_server";
    return "linux_pc";
  }
  if (lowerOS.includes("macos") || lowerOS.includes("mac os x")) return "macos_pc";
  return "generic_device";
}


const mockHostsData: Host[] = [
  { ipAddress: "192.168.1.1", hostname: "router.local", macAddress: "00:1A:2B:3C:4D:5E", os: "RouterOS (Mock)", openPorts: [80, 443, 53, 22], deviceType: "router_firewall" },
  { ipAddress: "192.168.1.100", hostname: "my-desktop.local", macAddress: "A1:B2:C3:D4:E5:F6", os: "Windows 11 (Mock)", openPorts: [3389, 8080, 445], deviceType: "windows_pc" },
  { ipAddress: "192.168.1.101", hostname: "fileserver.lan", macAddress: "12:34:56:78:9A:BC", os: "Linux (Ubuntu Server) (Mock)", openPorts: [22, 445, 80, 443], deviceType: "linux_server" },
  { ipAddress: "192.168.1.102", hostname: "iphone-of-user.local", macAddress: "FE:DC:BA:98:76:54", os: "iOS (Mock)", openPorts: [], deviceType: "ios_mobile" },
  { ipAddress: "192.168.1.103", hostname: "android-tablet.local", macAddress: "AB:CD:EF:12:34:56", os: "Android 13 (Mock)", openPorts: [5555], deviceType: "android_mobile"},
  { ipAddress: "192.168.1.104", hostname: "dev-laptop.local", macAddress: "C0:FF:EE:00:11:22", os: "Linux (Ubuntu Desktop) (Mock)", openPorts: [22, 3000, 8000], deviceType: "linux_pc"},
  { ipAddress: "192.168.1.105", hostname: "printer.corp", macAddress: "AA:BB:CC:DD:EE:FF", os: "Printer OS (Mock)", openPorts: [80, 515, 631, 9100], deviceType: "printer" },
  { ipAddress: "192.168.1.106", hostname: "nas-storage.local", macAddress: "DE:AD:BE:EF:CA:FE", os: "Synology DSM (Linux based) (Mock)", openPorts: [22, 443, 5001, 445], deviceType: "linux_server"}, // or a new "nas" type
  { ipAddress: "192.168.1.107", hostname: "macbook-pro.local", macAddress: "F0:E1:D2:C3:B4:A5", os: "macOS Sonoma (Mock)", openPorts: [22, 445], deviceType: "macos_pc"},
  { ipAddress: "10.0.0.1", hostname: "gateway.corp", macAddress: "B1:C2:D3:E4:F5:00", os: "FirewallOS (Mock)", openPorts: [22, 443], deviceType: "router_firewall" },
  { ipAddress: "10.0.0.50", hostname: "dev-vm.corp", macAddress: "C1:D2:E3:F4:05:01", os: "Linux (Dev VM) (Mock)", openPorts: [22, 8000, 9000, 8080], deviceType: "linux_server" },
  { ipAddress: "192.168.1.250", hostname: "hidden-iot-device.local", macAddress: "01:23:45:67:89:AB", os: "Custom IoT OS (Mock)", openPorts: [7, 13], deviceType: "generic_device" }, // Example hidden device
];

export async function scanNetwork(
  scanParameters: WailsScanParameters, 
  onHostFound?: (host: Host) => void,
  onScanComplete?: () => void
): Promise<void> {
  console.log("Mock Service: scanNetwork (streaming) called with params:", scanParameters);
  
  // These are the ports to check for services on already discovered hosts
  const servicePortsToCheck = scanParameters.ports && scanParameters.ports.length > 0 ? scanParameters.ports : DEFAULT_PORTS;

  // These are additional ports to use for the liveness check if searchHiddenHosts is true
  const hiddenLivenessPorts = scanParameters.searchHiddenHosts ? scanParameters.hiddenHostsPorts : [];

  return new Promise((resolve) => {
    if (!scanParameters.startIp || !scanParameters.endIp) {
      console.error("Mock Service: Scan requires startIp and endIp.");
      if (onScanComplete) onScanComplete();
      resolve();
      return;
    }

    const startIPNum = ipToUint32(scanParameters.startIp);
    const endIPNum = ipToUint32(scanParameters.endIp);

    if (startIPNum === null || endIPNum === null) {
      console.error("Mock Service: Invalid IP range provided to mock scanner.");
      if (onScanComplete) onScanComplete();
      resolve();
      return;
    }

    let hostsToScan = mockHostsData.filter(host => {
      const hostIPNum = ipToUint32(host.ipAddress);
      return hostIPNum !== null && hostIPNum >= startIPNum && hostIPNum <= endIPNum;
    });
    
    hostsToScan = hostsToScan.map(host => ({
        ...host,
        deviceType: host.deviceType || mockDetermineDeviceType(host.os)
    }));

    // Mock: If searchHiddenHosts is true, some hosts might only "respond" if one of their openPorts matches hiddenLivenessPorts
    // This is a very simplified simulation
    if (scanParameters.searchHiddenHosts && hiddenLivenessPorts.length > 0) {
      console.log("Mock Service: Simulating hidden host search with ports:", hiddenLivenessPorts);
      // For this mock, we don't need complex logic, just acknowledge the params.
      // Real backend would use hiddenLivenessPorts in its `isHostAlive` check.
    }


    if (hostsToScan.length === 0) {
        console.log("Mock Service: No hosts to scan in the given range/criteria after filtering.");
    }

    let index = 0;
    function sendHost() {
      if (index < hostsToScan.length) {
        const originalHost = hostsToScan[index];
        
        // Simulate filtering open ports based on what was requested to be scanned for services
        const actualOpenPorts = originalHost.openPorts 
          ? originalHost.openPorts.filter(port => servicePortsToCheck.includes(port))
          : [];
        
        const hostToSend: Host = {
          ...originalHost,
          openPorts: actualOpenPorts, // Only list ports that were in the 'servicePortsToCheck'
        };
        
        console.log(`Mock Service: Simulating host found: ${hostToSend.ipAddress} (Type: ${hostToSend.deviceType}). Service ports checked: ${JSON.stringify(servicePortsToCheck)}, found open: ${JSON.stringify(hostToSend.openPorts)}.`);
        if (onHostFound) {
          onHostFound(hostToSend);
        }
        index++;
        setTimeout(sendHost, 300 + Math.random() * 400);
      } else {
        console.log("Mock Service: Simulating scan complete");
        if (onScanComplete) {
          onScanComplete();
        }
        resolve(); 
      }
    }
    
    if (hostsToScan.length > 0) { 
        setTimeout(sendHost, 200); 
    } else { 
        setTimeout(() => { 
            console.log("Mock Service: Simulating scan complete (no hosts in custom range or matching criteria)");
            if (onScanComplete) {
              onScanComplete();
            }
            resolve();
        }, 200);
    }
  });
}
