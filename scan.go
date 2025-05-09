
package main

import (
	"context"
	"fmt"
	"math/rand"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// Host struct matching TypeScript Host type
type Host struct {
	IPAddress  string `json:"ipAddress"`
	Hostname   string `json:"hostname,omitempty"`
	MACAddress string `json:"macAddress,omitempty"`
	OS         string `json:"os,omitempty"`
	OpenPorts  []int  `json:"openPorts,omitempty"`
}

// ScanRange struct for custom IP range scanning, now also includes ports
type ScanRange struct {
	StartIP string `json:"startIp,omitempty"` // Use omitempty if IPs are optional for full scan
	EndIP   string `json:"endIp,omitempty"`   // Use omitempty
	Ports   []int  `json:"ports,omitempty"` // Ports to scan
}

var appCtx context.Context
var 기본랜덤Seed = rand.New(rand.NewSource(time.Now().UnixNano()))
var defaultPortsToScan = []int{22, 80, 443, 8080, 445}


// InitScanner initializes the scanner with the application context.
func InitScanner(ctx context.Context) {
	appCtx = ctx
}


// PerformScan simulates a network scan and emits events.
func PerformScan(scanParams *ScanRange) error {
	if appCtx == nil {
		return fmt.Errorf("scanner not initialized with context")
	}

	// Add to history only if it's a custom IP range scan (both StartIP and EndIP are provided)
	if scanParams != nil && scanParams.StartIP != "" && scanParams.EndIP != "" {
		addScanToHistory(scanParams) // scanParams here includes StartIP, EndIP, and potentially Ports
	}

	fmt.Println("Go: PerformScan (streaming) called from scan.go")

	portsForThisScan := defaultPortsToScan
	if scanParams != nil && len(scanParams.Ports) > 0 {
		portsForThisScan = scanParams.Ports
		fmt.Printf("Go: Scanning with custom ports: %v\n", portsForThisScan)
	} else {
		fmt.Printf("Go: Scanning with default ports: %v\n", portsForThisScan)
	}
	
	isCustomIPRangeScan := false
	if scanParams != nil && scanParams.StartIP != "" && scanParams.EndIP != "" {
		isCustomIPRangeScan = true
		fmt.Printf("Go: Scanning custom IP range: %s - %s\n", scanParams.StartIP, scanParams.EndIP)
	} else {
		fmt.Println("Go: Scanning full network (mock criteria based on allHosts)")
	}


	go func() {
		allHosts := []Host{
			{IPAddress: "192.168.1.1", Hostname: "router.local", MACAddress: "00:1A:2B:3C:4D:5E", OS: "RouterOS", OpenPorts: []int{80, 443, 53, 22}},
			{IPAddress: "192.168.1.100", Hostname: "my-desktop.local", MACAddress: "A1:B2:C3:D4:E5:F6", OS: "Windows 11", OpenPorts: []int{3389, 8080, 445}},
			{IPAddress: "192.168.1.101", Hostname: "fileserver.lan", MACAddress: "12:34:56:78:9A:BC", OS: "Linux (Ubuntu Server)", OpenPorts: []int{22, 445, 80, 443}},
			{IPAddress: "192.168.1.102", Hostname: "iphone-of-user.local", MACAddress: "FE:DC:BA:98:76:54", OS: "iOS", OpenPorts: []int{}},
			{IPAddress: "192.168.1.105", Hostname: "printer.corp", MACAddress: "AA:BB:CC:DD:EE:FF", OS: "Printer OS", OpenPorts: []int{80, 515, 631, 9100}},
			{IPAddress: "10.0.0.1", Hostname: "gateway.corp", MACAddress: "B1:C2:D3:E4:F5:00", OS: "FirewallOS", OpenPorts: []int{22, 443}},
			{IPAddress: "10.0.0.50", Hostname: "dev-vm.corp", MACAddress: "C1:D2:E3:F4:05:01", OS: "Linux (Dev VM)", OpenPorts: []int{22, 8000, 9000, 8080}},
		}

		var hostsToConsider []Host
		if isCustomIPRangeScan {
			startIPNum, errStart := ipToUint32(scanParams.StartIP)
			endIPNum, errEnd := ipToUint32(scanParams.EndIP)

			if errStart != nil || errEnd != nil {
				fmt.Printf("Go: Invalid IP range in goroutine: %v, %v\n", errStart, errEnd)
				runtime.EventsEmit(appCtx, "scanError", fmt.Sprintf("Invalid IP range: %v, %v", errStart, errEnd))
				runtime.EventsEmit(appCtx, "scanComplete", false) 
				return
			}

			for _, host := range allHosts {
				hostIPNum, err := ipToUint32(host.IPAddress)
				if err != nil {
					continue 
				}
				if hostIPNum >= startIPNum && hostIPNum <= endIPNum {
					hostsToConsider = append(hostsToConsider, host)
				}
			}
		} else {
			hostsToConsider = allHosts // Full scan considers all mock hosts
		}

		if len(hostsToConsider) == 0 {
			fmt.Println("Go: No hosts to scan in the given range/criteria.")
		}

		for i, mockHost := range hostsToConsider {
			var actualOpenPorts []int
			// Filter mockHost.OpenPorts against portsForThisScan
			for _, mockOpenPort := range mockHost.OpenPorts {
				for _, portToCheck := range portsForThisScan {
					if mockOpenPort == portToCheck {
						actualOpenPorts = append(actualOpenPorts, mockOpenPort)
						break
					}
				}
			}
			
			hostToSend := mockHost // Create a new host instance to send
			hostToSend.OpenPorts = actualOpenPorts // Set the filtered open ports

			fmt.Printf("Go: Emitting hostFound: %s with open ports: %v (scanned for: %v)\n", hostToSend.IPAddress, hostToSend.OpenPorts, portsForThisScan)
			runtime.EventsEmit(appCtx, "hostFound", hostToSend)
			
			if i < len(hostsToConsider)-1 {
				time.Sleep(time.Duration(300+기본랜덤Seed.Intn(400)) * time.Millisecond) 
			}
		}

		fmt.Println("Go: Emitting scanComplete")
		runtime.EventsEmit(appCtx, "scanComplete", true) 
	}()

	return nil 
}
