
package main

import (
	"bufio"
	"context"
	"errors" // For errors.Is
	"fmt"
	"net"
	"os/exec"
	"regexp"
	"runtime" // To get OS for arp command
	"strings"
	"sync"
	"syscall" // For syscall.ECONNREFUSED
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	// ICMP related imports are no longer needed as isHostAlive now uses TCP
	// "golang.org/x/net/icmp"
	// "golang.org/x/net/ipv4"
)

// Host struct matching TypeScript Host type
type Host struct {
	IPAddress  string `json:"ipAddress"`
	Hostname   string `json:"hostname,omitempty"`
	MACAddress string `json:"macAddress,omitempty"`
	OS         string `json:"os,omitempty"` // Note: Real OS detection is complex and not implemented here
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
	tcpPingTimeout  = 1 * time.Second // Timeout for TCP "ping" attempts
	portScanTimeout = 500 * time.Millisecond
	maxConcurrency  = 100 // Max concurrent goroutines for scanning IPs
	arpTimeout      = 2 * time.Second // Timeout for ARP command execution
)

// InitScanner initializes the scanner with the application context.
func InitScanner(ctx context.Context) {
	appCtx = ctx
}

// isHostAlive attempts a TCP connection to common ports to check for liveness.
// This does not require administrator/root privileges.
// RTT will be the time taken for the first successful or refused connection.
func isHostAlive(targetIP string, RTT *time.Duration) bool {
	*RTT = -1 // Default to invalid RTT

	// Ports to try for a "TCP ping".
	// Common ports that are likely to elicit a quick response (open or RST).
	probePorts := []int{80, 443, 22, 8080} // Common ports

	for _, port := range probePorts {
		address := fmt.Sprintf("%s:%d", targetIP, port)
		startTime := time.Now()
		conn, err := net.DialTimeout("tcp", address, tcpPingTimeout)
		duration := time.Since(startTime)

		if err == nil {
			// Connection successful, host is alive.
			conn.Close()
			*RTT = duration
			// runtime.EventsEmit(appCtx, "scanDebug", fmt.Sprintf("TCP Ping: Host %s is alive (port %d open, RTT: %s)", targetIP, port, duration))
			return true
		}

		// If it's a timeout, host is likely down or unresponsive on this port.
		// We continue to the next probe port.
		if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
			// runtime.EventsEmit(appCtx, "scanDebug", fmt.Sprintf("TCP Ping: Host %s timeout on port %d", targetIP, port))
			continue
		}

		// Check if the error is syscall.ECONNREFUSED (connection refused).
		// This indicates the host is up but the port is closed.
		if errors.Is(err, syscall.ECONNREFUSED) {
			*RTT = duration
			// runtime.EventsEmit(appCtx, "scanDebug", fmt.Sprintf("TCP Ping: Host %s is alive (port %d refused - ECONNREFUSED, RTT: %s)", targetIP, port, duration))
			return true
		}

		// Fallback for systems (like Windows) where ECONNREFUSED might not be wrapped as syscall.Errno directly,
		// or for other errors that might still imply liveness if it's a "connection refused" type message.
		if strings.Contains(strings.ToLower(err.Error()), "connection refused") {
			*RTT = duration
			// runtime.EventsEmit(appCtx, "scanDebug", fmt.Sprintf("TCP Ping: Host %s is alive (port %d refused by string match, RTT: %s)", targetIP, port, duration))
			return true
		}

		// runtime.EventsEmit(appCtx, "scanDebug", fmt.Sprintf("TCP Ping: Host %s other error on port %d: %v. Type: %T. Trying next port.", targetIP, port, err, err))
		// For other errors (e.g., "no route to host", "network is unreachable"),
		// it's safer to assume the host is not reachable via this port and try the next.
	}

	// runtime.EventsEmit(appCtx, "scanDebug", fmt.Sprintf("TCP Ping: Host %s appears down after trying all probe ports.", targetIP))
	return false // Host did not respond affirmatively on any probe port.
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

// getMacAddress attempts to retrieve the MAC address for a given IP by parsing the system's ARP table.
// This is a best-effort approach and might not work on all systems or for all IPs.
// It does not require root privileges but relies on the `arp` command being available and accessible.
func getMacAddress(ipAddress string) string {
	var cmd *exec.Cmd
	ctx, cancel := context.WithTimeout(context.Background(), arpTimeout)
	defer cancel()

	switch runtime.GOOS {
	case "linux", "darwin": // macOS uses similar arp command to Linux
		// Using -n to prevent DNS resolution, which can be slow.
		cmd = exec.CommandContext(ctx, "arp", "-n", ipAddress)
	case "windows":
		// `arp -a <ip>` might not work; `arp -a` lists all, then we'd filter.
		// For simplicity here, we'll try `arp -a` and let parsing handle it.
		// A more robust Windows solution might involve PowerShell or other APIs.
		cmd = exec.CommandContext(ctx, "arp", "-a", ipAddress) // This specific invocation might not work on all Windows versions
		// A more common approach for Windows is to call `arp -a` and parse the entire table.
		// However, this example tries to get a specific entry. If it fails, we'll have to parse the full table.
	default:
		// runtime.EventsEmit(appCtx, "scanDebug", fmt.Sprintf("MAC detection: Unsupported OS: %s for IP %s", runtime.GOOS, ipAddress))
		return "" // Unsupported OS
	}

	output, err := cmd.Output()
	if err != nil {
		// This can happen if the IP is not in the ARP cache, or command fails.
		// runtime.EventsEmit(appCtx, "scanDebug", fmt.Sprintf("MAC detection: arp command failed for %s: %v. Output: %s", ipAddress, err, string(output)))
		return ""
	}

	// Regex to find MAC addresses (common formats)
	// This regex is quite generic, specific OS outputs might need more tailored regex.
	// Formats: xx:xx:xx:xx:xx:xx or xx-xx-xx-xx-xx-xx
	macRegex := regexp.MustCompile(`([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})`)

	scanner := bufio.NewScanner(strings.NewReader(string(output)))
	for scanner.Scan() {
		line := scanner.Text()
		// Check if the line contains the IP address we are looking for.
		// This is important because `arp -a` on Windows lists all entries.
		if strings.Contains(line, ipAddress) {
			match := macRegex.FindString(line)
			if match != "" {
				// runtime.EventsEmit(appCtx, "scanDebug", fmt.Sprintf("MAC detection: Found MAC %s for IP %s from line: %s", match, ipAddress, line))
				return strings.ToUpper(match) // Standardize to uppercase
			}
		}
	}
	// runtime.EventsEmit(appCtx, "scanDebug", fmt.Sprintf("MAC detection: No MAC address found in arp output for IP %s", ipAddress))
	return "" // MAC address not found
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
func PerformScan(ctx context.Context, scanParams *ScanRange) error {
	if ctx == nil {
		return fmt.Errorf("scanner not initialized with context")
	}
	localAppCtx := ctx // Use the passed context for this scan operation

	if scanParams == nil || scanParams.StartIP == "" || scanParams.EndIP == "" {
		errMsg := "PerformScan requires a valid start and end IP address."
		runtime.EventsEmit(localAppCtx, "scanError", errMsg)
		runtime.EventsEmit(localAppCtx, "scanComplete", false) // Signal unsuccessful completion
		return fmt.Errorf(errMsg)
	}

	addScanToHistory(localAppCtx, scanParams) // Add to history before starting scan, passing context
	runtime.LogDebug(localAppCtx, fmt.Sprintf("PerformScan starting for range %s - %s", scanParams.StartIP, scanParams.EndIP))


	portsToScan := defaultPortsToScan
	if scanParams.Ports != nil && len(scanParams.Ports) > 0 {
		portsToScan = scanParams.Ports
		runtime.LogDebug(localAppCtx, fmt.Sprintf("Scanning with custom ports: %v", portsToScan))
	} else {
		runtime.LogDebug(localAppCtx, fmt.Sprintf("Scanning with default ports: %v", portsToScan))
	}

	startIPNum, errStart := ipToUint32(scanParams.StartIP)
	endIPNum, errEnd := ipToUint32(scanParams.EndIP)

	if errStart != nil || errEnd != nil {
		errMsg := fmt.Sprintf("Invalid IP range: StartIP parse error: %v, EndIP parse error: %v", errStart, errEnd)
		runtime.EventsEmit(localAppCtx, "scanError", errMsg)
		runtime.EventsEmit(localAppCtx, "scanComplete", false)
		return fmt.Errorf(errMsg)
	}
	if startIPNum > endIPNum {
		errMsg := "Start IP cannot be greater than End IP."
		runtime.EventsEmit(localAppCtx, "scanError", errMsg)
		runtime.EventsEmit(localAppCtx, "scanComplete", false)
		return fmt.Errorf(errMsg)
	}

	var wg sync.WaitGroup
	semaphore := make(chan struct{}, maxConcurrency)

	go func() { // Main scanning goroutine
		// Use the context passed into PerformScan for cancellation checks
		defer func() {
			runtime.LogDebug(localAppCtx, "Scan goroutine finished. Emitting scanComplete.")
			runtime.EventsEmit(localAppCtx, "scanComplete", true) // True indicates the scan process itself completed
		}()

		for i := uint32(0); i <= (endIPNum - startIPNum); i++ {
			select {
			case <-localAppCtx.Done(): // Check for cancellation (e.g., app closing)
				runtime.LogDebug(localAppCtx, "Scan cancelled via context.")
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
				// runtime.EventsEmit(localAppCtx, "scanDebug", fmt.Sprintf("Go: Host %s is alive (RTT: %s). Scanning ports...", ipToScan, rtt.String()))

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
				macAddress := getMacAddress(ipToScan) // Attempt to get MAC address
				deviceType := determineDeviceTypeBasedOnData(ipToScan, hostname, openPorts)
				// OS detection is very complex and usually requires Nmap or similar tools, so it's omitted for this basic scanner.

				host := Host{
					IPAddress:  ipToScan,
					Hostname:   hostname,
					MACAddress: macAddress,
					OpenPorts:  openPorts,
					DeviceType: deviceType,
					OS:         "", // OS detection is complex and not implemented
				}
				// runtime.EventsEmit(localAppCtx, "scanDebug", fmt.Sprintf("Go: Emitting hostFound: %+v", host))
				runtime.EventsEmit(localAppCtx, "hostFound", host) // Use the scan's context

			}(ipStr)
		}
		wg.Wait() // Wait for all IP scanning goroutines to complete
	}()

	return nil
}

    