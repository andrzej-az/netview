
package main

import (
	"embed"
	"context"
	"fmt"
	"net"
	"time"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

//go:embed all:out
var assets embed.FS

// App struct
type App struct {
	ctx context.Context
}

// Host struct matching TypeScript Host type
type Host struct {
	IPAddress  string   `json:"ipAddress"`
	Hostname   string   `json:"hostname,omitempty"`
	MACAddress string   `json:"macAddress,omitempty"`
	OS         string   `json:"os,omitempty"`
	OpenPorts  []int    `json:"openPorts,omitempty"`
}

// ScanRange struct for custom IP range scanning
type ScanRange struct {
	StartIP string `json:"startIp"`
	EndIP   string `json:"endIp"`
}


// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// ipToUint32 converts an IP string to its uint32 representation.
func ipToUint32(ipStr string) (uint32, error) {
	ip := net.ParseIP(ipStr)
	if ip == nil {
		return 0, fmt.Errorf("invalid IP address: %s", ipStr)
	}
	ip = ip.To4()
	if ip == nil {
		return 0, fmt.Errorf("not an IPv4 address: %s", ipStr)
	}
	return uint32(ip[0])<<24 | uint32(ip[1])<<16 | uint32(ip[2])<<8 | uint32(ip[3]), nil
}

// uint32ToIP converts a uint32 IP representation back to a string.
// func uint32ToIP(ipUint uint32) string {
// 	return fmt.Sprintf("%d.%d.%d.%d", byte(ipUint>>24), byte(ipUint>>16), byte(ipUint>>8), byte(ipUint))
// }


// ScanNetwork simulates a network scan and emits events.
// It returns an error if scan initiation fails, nil otherwise.
func (a *App) ScanNetwork(scanRange *ScanRange) error {
	fmt.Println("Go: ScanNetwork (streaming) called")
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
				// runtime.EventsEmit(a.ctx, "scanError", fmt.Sprintf("Invalid IP range: %v, %v", errStart, errEnd))
				runtime.EventsEmit(a.ctx, "scanComplete", false) // success = false
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
			runtime.EventsEmit(a.ctx, "hostFound", host)
			// Simulate delay between finding hosts
            // Don't sleep after the last host to make scanComplete faster
            if i < len(hostsToScan) -1 {
			    time.Sleep(time.Duration(300 + 기본랜덤Seed.Intn(400)) * time.Millisecond) // Random delay
            }
		}
		
		fmt.Println("Go: Emitting scanComplete")
		runtime.EventsEmit(a.ctx, "scanComplete", true) // success = true
	}()
	
	return nil // Return nil for successful initiation
}


func main() {
	// Create an instance of the app structure
	app := NewApp()

	// Create application with options
	err := wails.Run(&options.App{
		Title:  "NetView - Network Scanner",
		Width:  1024,
		Height: 768,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1}, // Dark background
		OnStartup:        app.startup,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
