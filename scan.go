package main

import (
	"bufio"
	"context"
	"errors" // For errors.Is
	"fmt"
	"net"
	"os/exec"
	"regexp"
	runtime_go "runtime" // To get OS for arp command
	"strings"
	"sync"
	"syscall" // For syscall.ECONNREFUSED
	"time"

	ping "github.com/prometheus-community/pro-bing"

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

// ScanRange struct for custom IP range scanning, now also includes ports and hidden host options
type ScanRange struct {
	StartIP           string `json:"startIp"`
	EndIP             string `json:"endIp"`
	Ports             []int  `json:"ports,omitempty"`            // Ports to scan for services
	SearchHiddenHosts bool   `json:"searchHiddenHosts"`          // Flag to enable scanning for hidden hosts
	HiddenHostsPorts  []int  `json:"hiddenHostsPorts,omitempty"` // Specific ports to probe for hidden host liveness
}

var appCtx context.Context
var defaultPortsToScan = []int{22, 80, 443, 8080, 445} // Default service ports if not specified by user

const (
	tcpPingTimeout  = 200 * time.Millisecond // Timeout for TCP "ping" attempts
	portScanTimeout = 500 * time.Millisecond
	maxConcurrency  = 100             // Max concurrent goroutines for scanning IPs
	arpTimeout      = 2 * time.Second // Timeout for ARP command execution
)

// var macDB *ouidb.OuiDb

// // InitScanner initializes the scanner with the application context.
// func InitScanner(ctx context.Context, db *OuiDb) {
// 	appCtx = ctx
// 	macDB = db

// }

// isHostAlive attempts a TCP connection to common ports and optionally specified hidden ports to check for liveness.
// RTT will be the time taken for the first successful or refused connection.
func isHostAlive(targetIP string, RTT *time.Duration, searchHidden bool, hiddenPorts []int) bool {
	*RTT = -1 // Default to invalid RTT
	startTime := time.Now()
	pinger, err := ping.NewPinger(targetIP)
	if err == nil {

		pinger.Count = 1
		pinger.Timeout = time.Second
		if runtime_go.GOOS == "windows" {
			pinger.SetPrivileged(true)
		} else {
			pinger.SetPrivileged(false)
		}
		err = pinger.Run()
		if err == nil {

			stats := pinger.Statistics()
			if stats.PacketsRecv > 0 {
				fmt.Printf("Ping success: %s\n", targetIP)

				duration := time.Since(startTime)
				*RTT = duration
				return true
			}
		} else {
			fmt.Printf("Ping error: %v\n", err)
		}
	} else {
		fmt.Printf("Ping error: %v\n", err)
	}
	if searchHidden {
		for _, port := range hiddenPorts {
			address := fmt.Sprintf("%s:%d", targetIP, port)
			startTime := time.Now()
			conn, err := net.DialTimeout("tcp", address, tcpPingTimeout)
			duration := time.Since(startTime)

			if err == nil {
				conn.Close()
				*RTT = duration
				// runtime.EventsEmit(appCtx, "scanDebug", fmt.Sprintf("TCP Ping: Host %s is alive (port %d open, RTT: %s)", targetIP, port, duration))
				return true
			}

			if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
				// runtime.EventsEmit(appCtx, "scanDebug", fmt.Sprintf("TCP Ping: Host %s timeout on port %d", targetIP, port))
				continue
			}

			if errors.Is(err, syscall.ECONNREFUSED) {
				*RTT = duration
				// runtime.EventsEmit(appCtx, "scanDebug", fmt.Sprintf("TCP Ping: Host %s is alive (port %d refused - ECONNREFUSED, RTT: %s)", targetIP, port, duration))
				return true
			}

			if strings.Contains(strings.ToLower(err.Error()), "connection refused") {
				*RTT = duration
				// runtime.EventsEmit(appCtx, "scanDebug", fmt.Sprintf("TCP Ping: Host %s is alive (port %d refused by string match, RTT: %s)", targetIP, port, duration))
				return true
			}
			// runtime.EventsEmit(appCtx, "scanDebug", fmt.Sprintf("TCP Ping: Host %s other error on port %d: %v. Type: %T. Trying next port.", targetIP, port, err, err))
		}
	}
	// runtime.EventsEmit(appCtx, "scanDebug", fmt.Sprintf("TCP Ping: Host %s appears down after trying all probe ports.", targetIP))
	return false
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
func getMacAddress(ipAddress string) string {
	var cmd *exec.Cmd
	ctx, cancel := context.WithTimeout(context.Background(), arpTimeout)
	defer cancel()

	switch runtime_go.GOOS {
	case "linux", "darwin":
		cmd = exec.CommandContext(ctx, "arp", "-n", ipAddress)
	case "windows":
		cmd = exec.CommandContext(ctx, "arp", "-a", ipAddress)
	default:
		return ""
	}

	output, err := cmd.Output()
	if err != nil {
		return ""
	}

	macRegex := regexp.MustCompile(`([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})`)
	scanner := bufio.NewScanner(strings.NewReader(string(output)))
	for scanner.Scan() {
		line := scanner.Text()
		if strings.Contains(line, ipAddress) {
			match := macRegex.FindString(line)
			if match != "" {
				return strings.ToUpper(match)
			}
		}
	}
	return ""
}

// determineDeviceTypeBasedOnData provides a heuristic for device type.
func determineDeviceTypeBasedOnData(ipAddress, hostname, macAddress string, openPorts []int) string {
	lowerHostname := strings.ToLower(hostname)

	if strings.Contains(lowerHostname, "printer") || containsAny(openPorts, []int{631, 9100, 515}) {
		return "printer"
	}
	if strings.Contains(lowerHostname, "router") || strings.Contains(lowerHostname, "gateway") ||
		strings.Contains(lowerHostname, "firewall") || strings.Contains(lowerHostname, "switch") ||
		ipAddress == "192.168.1.1" || ipAddress == "192.168.0.1" || ipAddress == "10.0.0.1" {
		return "router_firewall"
	}

	if strings.Contains(lowerHostname, "macbook") || strings.Contains(lowerHostname, "imac") || strings.Contains(lowerHostname, "apple") || (containsAny(openPorts, []int{22, 548, 445}) && !strings.Contains(lowerHostname, "linux")) {
		return "macos_pc"
	}

	if macAddress != "" && macDB != nil {
		vendor, err := macDB.VendorLookup(macAddress)
		if err == nil {
			lowerVendor := strings.ToLower(vendor)
			if strings.Contains(lowerVendor, "apple") {
				return "macos_pc"
			} else if strings.Contains(lowerVendor, "raspberry") {
				return "raspberry_pi"
			}
		}
	}
	
	if containsAny(openPorts, []int{135, 137, 138, 139, 445}) {
		return "windows_pc"
	}

	hasSSH := containsAny(openPorts, []int{22})
	if hasSSH {
		if strings.Contains(lowerHostname, "server") || strings.Contains(lowerHostname, "nas") ||
			strings.Contains(lowerHostname, "ubuntu-server") || strings.Contains(lowerHostname, "centos") ||
			strings.Contains(lowerHostname, "debian") || containsAny(openPorts, []int{5000, 5001, 8080, 8000, 3000}) {
			return "linux_server"
		}
		return "linux_pc"
	}

	if strings.Contains(lowerHostname, "android") {
		return "android_mobile"
	}
	if strings.Contains(lowerHostname, "iphone") || strings.Contains(lowerHostname, "ipad") {
		return "ios_mobile"
	}

	return "generic_device"
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
	localAppCtx := ctx

	if scanParams == nil || scanParams.StartIP == "" || scanParams.EndIP == "" {
		errMsg := "PerformScan requires a valid start and end IP address."
		runtime.EventsEmit(localAppCtx, "scanError", errMsg)
		runtime.EventsEmit(localAppCtx, "scanComplete", false)
		return fmt.Errorf(errMsg)
	}

	addScanToHistory(localAppCtx, scanParams)
	runtime.LogDebug(localAppCtx, fmt.Sprintf("PerformScan starting for range %s - %s. SearchHidden: %t, HiddenPorts: %v, ServicePorts: %v",
		scanParams.StartIP, scanParams.EndIP, scanParams.SearchHiddenHosts, scanParams.HiddenHostsPorts, scanParams.Ports))

	// These are ports to check for services AFTER host is found alive
	servicePortsToScan := defaultPortsToScan
	if scanParams.Ports != nil && len(scanParams.Ports) > 0 {
		servicePortsToScan = scanParams.Ports
		runtime.LogDebug(localAppCtx, fmt.Sprintf("Scanning for services on custom ports: %v", servicePortsToScan))
	} else {
		runtime.LogDebug(localAppCtx, fmt.Sprintf("Scanning for services on default ports: %v", servicePortsToScan))
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

	go func() {
		defer func() {
			runtime.LogDebug(localAppCtx, "Scan goroutine finished. Emitting scanComplete.")
			runtime.EventsEmit(localAppCtx, "scanComplete", true)
		}()

		for i := uint32(0); i <= (endIPNum - startIPNum); i++ {
			select {
			case <-localAppCtx.Done():
				runtime.LogDebug(localAppCtx, "Scan cancelled via context.")
				return
			default:
			}

			currentIPNum := startIPNum + i
			ipStr := uint32ToIP(currentIPNum)

			wg.Add(1)
			semaphore <- struct{}{}

			go func(ipToScan string) {
				defer wg.Done()
				defer func() { <-semaphore }()

				var rtt time.Duration
				// Pass SearchHiddenHosts and HiddenHostsPorts to isHostAlive
				if !isHostAlive(ipToScan, &rtt, scanParams.SearchHiddenHosts, scanParams.HiddenHostsPorts) {
					return
				}
				// runtime.EventsEmit(localAppCtx, "scanDebug", fmt.Sprintf("Go: Host %s is alive (RTT: %s). Scanning service ports...", ipToScan, rtt.String()))

				var openPorts []int
				var portWg sync.WaitGroup
				openPortsChan := make(chan int, len(servicePortsToScan))

				for _, port := range servicePortsToScan {
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

				hostname := resolveHostname(ipToScan)
				macAddress := getMacAddress(ipToScan)
				deviceType := determineDeviceTypeBasedOnData(ipToScan, hostname, macAddress, openPorts)

				host := Host{
					IPAddress:  ipToScan,
					Hostname:   hostname,
					MACAddress: macAddress,
					OpenPorts:  openPorts, // These are the service ports found open
					DeviceType: deviceType,
					OS:         "",
				}
				runtime.EventsEmit(localAppCtx, "hostFound", host)

			}(ipStr)
		}
		wg.Wait()
	}()

	return nil
}
