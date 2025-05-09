
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

// ScanRange struct for custom IP range scanning
type ScanRange struct {
	StartIP string `json:"startIp"`
	EndIP   string `json:"endIp"`
}

var appCtx context.Context
var 기본랜덤Seed = rand.New(rand.NewSource(time.Now().UnixNano()))


// InitScanner initializes the scanner with the application context.
// This context is needed for emitting events back to the frontend.
func InitScanner(ctx context.Context) {
	appCtx = ctx
}


// PerformScan simulates a network scan and emits events.
// It returns an error if scan initiation fails, nil otherwise.
func PerformScan(scanRange *ScanRange) error {
	if appCtx == nil {
		return fmt.Errorf("scanner not initialized with context")
	}

	fmt.Println("Go: PerformScan (streaming) called from scan.go")
	if scanRange != nil {
		fmt.Printf("Go: Scanning range: %s - %s\n", scanRange.StartIP, scanRange.EndIP)
	} else {
		fmt.Println("Go: Scanning full network (mock)")
	}

	// Run the scan in a goroutine to not block the main Wails thread
	// and allow events to be emitted asynchronously.
	go func() {
		// Mock hosts - replace with actual scanning logic
		allHosts := []Host{
			{IPAddress: "192.168.1.1", Hostname: "router.local", MACAddress: "00:1A:2B:3C:4D:5E", OS: "RouterOS", OpenPorts: []int{80, 443, 53}},
			{IPAddress: "192.168.1.100", Hostname: "my-desktop.local", MACAddress: "A1:B2:C3:D4:E5:F6", OS: "Windows 11", OpenPorts: []int{3389, 8080}},
			{IPAddress: "192.168.1.101", Hostname: "fileserver.lan", MACAddress: "12:34:56:78:9A:BC", OS: "Linux (Ubuntu Server)", OpenPorts: []int{22, 445, 80, 443}},
			{IPAddress: "192.168.1.102", Hostname: "iphone-of-user.local", MACAddress: "FE:DC:BA:98:76:54", OS: "iOS", OpenPorts: []int{}},
			{IPAddress: "192.168.1.105", Hostname: "printer.corp", MACAddress: "AA:BB:CC:DD:EE:FF", OS: "Printer OS", OpenPorts: []int{80, 515, 631, 9100}},
			{IPAddress: "10.0.0.1", Hostname: "gateway.corp", MACAddress: "B1:C2:D3:E4:F5:00", OS: "FirewallOS", OpenPorts: []int{22, 443}},
			{IPAddress: "10.0.0.50", Hostname: "dev-vm.corp", MACAddress: "C1:D2:E3:F4:05:01", OS: "Linux (Dev VM)", OpenPorts: []int{22, 8000, 9000}},
		}

		var hostsToScan []Host
		if scanRange != nil {
			startIPNum, errStart := ipToUint32(scanRange.StartIP)
			endIPNum, errEnd := ipToUint32(scanRange.EndIP)

			if errStart != nil || errEnd != nil {
				fmt.Printf("Go: Invalid IP range in goroutine: %v, %v\n", errStart, errEnd)
				runtime.EventsEmit(appCtx, "scanError", fmt.Sprintf("Invalid IP range: %v, %v", errStart, errEnd))
				runtime.EventsEmit(appCtx, "scanComplete", false) // success = false
				return
			}

			for _, host := range allHosts {
				hostIPNum, err := ipToUint32(host.IPAddress)
				if err != nil {
					continue // Skip invalid mock hosts
				}
				if hostIPNum >= startIPNum && hostIPNum <= endIPNum {
					hostsToScan = append(hostsToScan, host)
				}
			}
		} else {
			hostsToScan = allHosts
		}

		if len(hostsToScan) == 0 {
			fmt.Println("Go: No hosts to scan in the given range/criteria.")
		}

		for i, host := range hostsToScan {
			fmt.Printf("Go: Emitting hostFound: %s\n", host.IPAddress)
			runtime.EventsEmit(appCtx, "hostFound", host)
			// Simulate delay between finding hosts
			// Don't sleep after the last host to make scanComplete faster
			if i < len(hostsToScan)-1 {
				time.Sleep(time.Duration(300+기본랜덤Seed.Intn(400)) * time.Millisecond) // Random delay
			}
		}

		fmt.Println("Go: Emitting scanComplete")
		runtime.EventsEmit(appCtx, "scanComplete", true) // success = true
	}()

	return nil // Return nil for successful initiation
}
