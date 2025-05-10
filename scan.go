
package main

import (
	"context"
	"fmt"
	"net"
	"strings"
	"sync"
	"time"

	"golang.org/x/net/icmp"
	"golang.org/x/net/ipv4"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// Host struct matching TypeScript Host type
type Host struct {
	IPAddress  string `json:"ipAddress"`
	Hostname   string `json:"hostname,omitempty"`
	MACAddress string `json:"macAddress,omitempty"` // Note: Real MAC address retrieval is complex and not implemented here
	OS         string `json:"os,omitempty"`         // Note: Real OS detection is complex and not implemented here
	OpenPorts  []int  `json:"openPorts,omitempty"`
	DeviceType string `json:"deviceType,omitempty"`
}

// ScanRange struct for custom IP range scanning, now also includes ports
type ScanRange struct {
	StartIP string `json:"startIp"`
	EndIP   string `json:"endIp"`
	Ports   []int  `json:"ports,omitempty"` // Ports to scan
}

var appCtx context.Context
var defaultPortsToScan = []int{22, 80, 443, 8080, 445} // Default ports if not specified by user

const (
	pingTimeout     = 1 * time.Second
	portScanTimeout = 500 * time.Millisecond 
	maxConcurrency  = 100 // Max concurrent goroutines for scanning IPs
)

// InitScanner initializes the scanner with the application context.
func InitScanner(ctx context.Context) {
	appCtx = ctx
}

// isHostAlive sends an ICMP echo request to the target IP.
// May require administrator/root privileges.
func isHostAlive(targetIP string, RTT *time.Duration) bool {
	*RTT = -1 // Default to invalid RTT

	conn, err := icmp.ListenPacket("ip4:icmp", "0.0.0.0")
	if err != nil {
		// runtime.EventsEmit(appCtx, "scanDebug", fmt.Sprintf("ICMP ListenPacket error for %s (permissions?): %v", targetIP, err))
		// Fallback: Try a TCP ping to a common port as an alternative
		// For now, if ICMP fails to listen, we assume we can't ping.
		return false
	}
	defer conn.Close()

	dstAddr, err := net.ResolveIPAddr("ip4", targetIP)
	if err != nil {
		// runtime.EventsEmit(appCtx, "scanDebug", fmt.Sprintf("ResolveIPAddr error for %s: %v", targetIP, err))
		return false
	}

	// Using a unique ID and sequence number for each ping attempt might be better in complex scenarios
	// but for simplicity, a fixed ID/Seq is used here.
	msg := icmp.Message{
		Type: ipv4.ICMPTypeEcho, Code: 0,
		Body: &icmp.Echo{
			ID:   int(time.Now().UnixNano() & 0xffff), // Pseudo-random ID
			Seq:  1,                                  // Sequence number
			Data: []byte("netview-ping"),
		},
	}
	msgBytes, err := msg.Marshal(nil)
	if err != nil {
		// runtime.EventsEmit(appCtx, "scanDebug", fmt.Sprintf("ICMP Marshal error for %s: %v", targetIP, err))
		return false
	}

	startTime := time.Now()
	if _, err := conn.WriteTo(msgBytes, dstAddr); err != nil {
		// runtime.EventsEmit(appCtx, "scanDebug", fmt.Sprintf("ICMP WriteTo error for %s: %v", targetIP, err))
		return false
	}

	reply := make([]byte, 1500)
	err = conn.SetReadDeadline(time.Now().Add(pingTimeout))
	if err != nil {
		// runtime.EventsEmit(appCtx, "scanDebug", fmt.Sprintf("ICMP SetReadDeadline error for %s: %v", targetIP, err))
		return false
	}

	n, _, err := conn.ReadFrom(reply)
	if err != nil { // This includes timeout
		// runtime.EventsEmit(appCtx, "scanDebug", fmt.Sprintf("ICMP ReadFrom error/timeout for %s: %v", targetIP, err))
		return false
	}
	*RTT = time.Since(startTime)

	parsedReply, err := icmp.ParseMessage(ipv4.ICMPTypeEchoReply.Protocol(), reply[:n])
	if err != nil {
		// runtime.EventsEmit(appCtx, "scanDebug", fmt.Sprintf("ICMP ParseMessage error for %s: %v", targetIP, err))
		return false
	}

	switch parsedReply.Type {
	case ipv4.ICMPTypeEchoReply:
		return true
	default:
		// runtime.EventsEmit(appCtx, "scanDebug", fmt.Sprintf("Received non-EchoReply ICMP type %v for %s", parsedReply.Type, targetIP))
		return false
	}
}

// scanPort checks if a specific port is open on the target IP.
func scanPort(targetIP string, port int, timeout time.Duration) bool {
	address := fmt.Sprintf("%s:%d", targetIP, port)
	conn, err := net.DialTimeout("tcp", address, timeout)
	if err != nil {
		return false // Port is closed or filtered
	}
	conn.Close()
	return true // Port is open
}

// resolveHostname tries to get the hostname for an IP address.
func resolveHostname(ipAddress string) string {
	names, err := net.LookupAddr(ipAddress)
	if err == nil && len(names) > 0 {
		return strings.TrimSuffix(names[0], ".")
	}
	return ""
}

// determineDeviceTypeBasedOnData provides a heuristic for device type.
func determineDeviceTypeBasedOnData(ipAddress, hostname string, openPorts []int) string {
	lowerHostname := strings.ToLower(hostname)

	// Printers
	if strings.Contains(lowerHostname, "printer") || containsAny(openPorts, []int{631, 9100, 515}) {
		return "printer"
	}
	// Routers/Firewalls
	if strings.Contains(lowerHostname, "router") || strings.Contains(lowerHostname, "gateway") ||
		strings.Contains(lowerHostname, "firewall") || strings.Contains(lowerHostname, "switch") ||
		ipAddress == "192.168.1.1" || ipAddress == "192.168.0.1" || ipAddress == "10.0.0.1" { // Common gateway IPs
		return "router_firewall"
	}

	// Windows
	if containsAny(openPorts, []int{135, 137, 138, 139, 445, 3389}) { // RPC, NetBIOS, SMB, RDP
		return "windows_pc"
	}
    // macOS (often has SSH, AFP/SMB might be open)
    if strings.Contains(lowerHostname, "macbook") || strings.Contains(lowerHostname, "imac") || strings.Contains(lowerHostname, "apple") || (containsAny(openPorts, []int{22, 548, 445}) && !strings.Contains(lowerHostname, "linux"))  {
         // Checking for common Mac services or hostname patterns
        return "macos_pc"
    }

	// Linux Servers / PCs
	hasSSH := containsAny(openPorts, []int{22})
	if hasSSH {
		if strings.Contains(lowerHostname, "server") || strings.Contains(lowerHostname, "nas") ||
			strings.Contains(lowerHostname, "ubuntu-server") || strings.Contains(lowerHostname, "centos") ||
			strings.Contains(lowerHostname, "debian") || containsAny(openPorts, []int{5000,5001,8080,8000,3000}) { // Common web/app/NAS ports
			return "linux_server"
		}
		return "linux_pc" 
	}
    
    // Mobile devices (harder to detect without OS fingerprinting or specific app ports)
    // Basic check if common mobile related services are open (less reliable)
    // Or if hostname indicates. Often mobiles are DHCP and don't have many open ports.
    if strings.Contains(lowerHostname, "android") { return "android_mobile" }
    if strings.Contains(lowerHostname, "iphone") || strings.Contains(lowerHostname, "ipad") { return "ios_mobile" }


	// Default for alive hosts with some web services
	if containsAny(openPorts, []int{80, 443, 8000, 8080}) {
		return "generic_device" // Could be a web server, IoT device, etc.
	}
    
	return "generic_device" // Fallback for any other alive device
}

// containsAny checks if a slice of ints contains any of the elements from another slice.
func containsAny(slice []int, elements []int) bool {
	for _, s := range slice {
		for _, e := range elements {
			if s == e {
				return true
			}
		}
	}
	return false
}

// PerformScan scans the network for hosts and open ports.
func PerformScan(scanParams *ScanRange) error {
	if appCtx == nil {
		return fmt.Errorf("scanner not initialized with context")
	}

	if scanParams == nil || scanParams.StartIP == "" || scanParams.EndIP == "" {
		errMsg := "PerformScan requires a valid start and end IP address."
		runtime.EventsEmit(appCtx, "scanError", errMsg)
		runtime.EventsEmit(appCtx, "scanComplete", false) // Signal unsuccessful completion
		return fmt.Errorf(errMsg)
	}

	addScanToHistory(scanParams) // Add to history before starting scan
	// runtime.EventsEmit(appCtx, "scanDebug", fmt.Sprintf("Go: Real PerformScan starting for range %s - %s", scanParams.StartIP, scanParams.EndIP))


	portsToScan := defaultPortsToScan
	if scanParams.Ports != nil && len(scanParams.Ports) > 0 {
		portsToScan = scanParams.Ports
		// runtime.EventsEmit(appCtx, "scanDebug", fmt.Sprintf("Go: Scanning with custom ports: %v", portsToScan))
	} else {
		// runtime.EventsEmit(appCtx, "scanDebug", fmt.Sprintf("Go: Scanning with default ports: %v", portsToScan))
	}

	startIPNum, errStart := ipToUint32(scanParams.StartIP)
	endIPNum, errEnd := ipToUint32(scanParams.EndIP)

	if errStart != nil || errEnd != nil {
		errMsg := fmt.Sprintf("Invalid IP range: StartIP parse error: %v, EndIP parse error: %v", errStart, errEnd)
		runtime.EventsEmit(appCtx, "scanError", errMsg)
		runtime.EventsEmit(appCtx, "scanComplete", false)
		return fmt.Errorf(errMsg)
	}
	if startIPNum > endIPNum {
		errMsg := "Start IP cannot be greater than End IP."
		runtime.EventsEmit(appCtx, "scanError", errMsg)
		runtime.EventsEmit(appCtx, "scanComplete", false)
		return fmt.Errorf(errMsg)
	}

	var wg sync.WaitGroup
	semaphore := make(chan struct{}, maxConcurrency)

	go func() { // Main scanning goroutine
		activeScanCtx, cancelScan := context.WithCancel(appCtx) // Allow scan cancellation if needed
		defer cancelScan()                                      // Ensure cancellation resources are cleaned up
		defer func() {
			// runtime.EventsEmit(activeScanCtx, "scanDebug", "Go: Real scan goroutine finished. Emitting scanComplete.")
			runtime.EventsEmit(activeScanCtx, "scanComplete", true) // True indicates the scan process itself completed
		}()

		for i := uint32(0); i <= (endIPNum - startIPNum); i++ {
			select {
			case <-activeScanCtx.Done(): // Check for cancellation (e.g., app closing)
				// runtime.EventsEmit(appCtx, "scanDebug", "Go: Scan cancelled.")
				return
			default:
				// Continue scanning
			}

			currentIPNum := startIPNum + i
			ipStr := uint32ToIP(currentIPNum)

			wg.Add(1)
			semaphore <- struct{}{} // Acquire semaphore

			go func(ipToScan string) {
				defer wg.Done()
				defer func() { <-semaphore }() // Release semaphore

				var rtt time.Duration
				if !isHostAlive(ipToScan, &rtt) {
					return // Host is not alive or did not respond to ping
				}
				// runtime.EventsEmit(activeScanCtx, "scanDebug", fmt.Sprintf("Go: Host %s is alive (RTT: %s). Scanning ports...", ipToScan, rtt.String()))

				var openPorts []int
				// Scan ports concurrently for an alive host
				var portWg sync.WaitGroup
				openPortsChan := make(chan int, len(portsToScan))

				for _, port := range portsToScan {
					portWg.Add(1)
					go func(p int) {
						defer portWg.Done()
						if scanPort(ipToScan, p, portScanTimeout) {
							openPortsChan <- p
						}
					}(port)
				}
				portWg.Wait()
				close(openPortsChan)

				for p := range openPortsChan {
					openPorts = append(openPorts, p)
				}
				
				// Even if no specified ports are open, we found an alive host.
				// The frontend can decide how to display hosts with no matching open ports.
				hostname := resolveHostname(ipToScan)
				deviceType := determineDeviceTypeBasedOnData(ipToScan, hostname, openPorts)

				host := Host{
					IPAddress:  ipToScan,
					Hostname:   hostname,
					OpenPorts:  openPorts,
					DeviceType: deviceType,
					// MACAddress and OS are not reliably fetched by this basic scanner
				}
				// runtime.EventsEmit(activeScanCtx, "scanDebug", fmt.Sprintf("Go: Emitting hostFound: %+v", host))
				runtime.EventsEmit(activeScanCtx, "hostFound", host)

			}(ipStr)
		}
		wg.Wait() // Wait for all IP scanning goroutines to complete
	}()

	return nil
}

    