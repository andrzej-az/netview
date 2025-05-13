package main

import (
	"context"
	"errors" // Required for errors.Is
	"fmt"
	"net"     // Required for net.DialTimeout and net.Error
	"strings" // Required for strings.Contains
	"sync"
	"syscall" // Required for syscall.ECONNREFUSED
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// HostStatusUpdate matches the TypeScript interface for host status updates.
type HostStatusUpdate struct {
	IPAddress string `json:"ipAddress"`
	IsOnline  bool   `json:"isOnline"`
}

var (
	monitoringCtx         context.Context    // Context for the current monitoring session
	monitoringCancel      context.CancelFunc // Function to cancel the current monitoring session
	monitoringWg          sync.WaitGroup     // Waits for monitoring goroutines to complete
	monitorMutex          sync.Mutex         // Protects access to monitoring-related shared variables
	isCurrentlyMonitoring bool               // Flag indicating if monitoring is active

	monitoredHostDetails       map[string]Host // IP -> Host details as found by scan (includes OpenPorts)
	monitoredHostStatuses      map[string]bool // IP -> last known online status for monitoring
	currentMonitorSearchHidden bool            // SearchHiddenHosts setting at the time monitoring started
	currentMonitorHiddenPorts  []int           // HiddenHostsPorts setting at the time monitoring started
)

const monitorInterval = 10 * time.Second             // Interval for checking host statuses
const monitorTcpPingTimeout = 200 * time.Millisecond // Timeout for individual TCP pings during monitoring (same as isHostAlive)

// InitializeMonitor prepares the monitoring system. Called on app startup.
func (a *App) InitializeMonitor() {
	monitorMutex.Lock()
	defer monitorMutex.Unlock()
	if a.ctx == nil {
		fmt.Println("Warning: App context is nil during monitor initialization. Using background context.")
	}
	monitoredHostDetails = make(map[string]Host)
	monitoredHostStatuses = make(map[string]bool)
	isCurrentlyMonitoring = false
	currentMonitorSearchHidden = false  // Default value
	currentMonitorHiddenPorts = []int{} // Default empty slice
	runtime.LogDebug(a.ctx, "Monitoring system initialized.")
}

// StartMonitoring begins periodically checking the status of the given hosts.
// It now accepts the full Host objects and the relevant scanning parameters active at the time of starting.
func (a *App) StartMonitoring(hostsToMonitor []Host, searchHiddenParameters bool, hiddenPortsParameters []int) error {
	monitorMutex.Lock()
	defer monitorMutex.Unlock()

	if a.ctx == nil {
		return fmt.Errorf("application context not initialized, cannot start monitoring")
	}

	if isCurrentlyMonitoring && monitoringCancel != nil {
		runtime.LogDebug(a.ctx, "Monitoring already active. Stopping existing monitor first.")
		monitoringCancel()
		monitoringWg.Wait()
		runtime.LogDebug(a.ctx, "Previous monitoring stopped.")
	}

	runtime.LogDebug(a.ctx, fmt.Sprintf("StartMonitoring called with %d hosts. SearchHidden: %t, HiddenPorts: %v", len(hostsToMonitor), searchHiddenParameters, hiddenPortsParameters))
	if len(hostsToMonitor) == 0 {
		runtime.LogInfo(a.ctx, "StartMonitoring called with no hosts. Monitoring will not actively run.")
		isCurrentlyMonitoring = false
		return nil
	}

	monitoringCtx, monitoringCancel = context.WithCancel(a.ctx)
	isCurrentlyMonitoring = true

	// Store details and initial status for monitored hosts
	monitoredHostDetails = make(map[string]Host)
	monitoredHostStatuses = make(map[string]bool)
	for _, h := range hostsToMonitor {
		monitoredHostDetails[h.IPAddress] = h     // Store the full host detail
		monitoredHostStatuses[h.IPAddress] = true // Assume online initially; first check will verify
	}
	// Store the monitoring parameters
	currentMonitorSearchHidden = searchHiddenParameters
	currentMonitorHiddenPorts = hiddenPortsParameters

	monitoringWg.Add(1)
	go func() {
		defer monitoringWg.Done()
		defer func() {
			monitorMutex.Lock()
			isCurrentlyMonitoring = false
			runtime.LogDebug(monitoringCtx, "Monitoring goroutine fully finished.")
			monitorMutex.Unlock()
		}()

		runtime.LogInfo(monitoringCtx, fmt.Sprintf("Monitoring goroutine started for %d hosts.", len(monitoredHostDetails)))
		ticker := time.NewTicker(monitorInterval)
		defer ticker.Stop()

		a.performStatusChecks(monitoringCtx) // Initial check

		for {
			select {
			case <-monitoringCtx.Done():
				runtime.LogInfo(monitoringCtx, "Monitoring loop stopping due to context cancellation.")
				return
			case <-ticker.C:
				a.performStatusChecks(monitoringCtx)
			}
		}
	}()

	return nil
}

// performStatusChecks iterates through monitored IPs and checks their online status.
func (a *App) performStatusChecks(ctx context.Context) {
	monitorMutex.Lock()
	// Create a snapshot of IPs to check
	ipsToCheck := make([]string, 0, len(monitoredHostDetails))
	for ip := range monitoredHostDetails {
		ipsToCheck = append(ipsToCheck, ip)
	}
	// Snapshot of current settings for this check cycle
	localSearchHidden := currentMonitorSearchHidden
	localHiddenPorts := make([]int, len(currentMonitorHiddenPorts))
	copy(localHiddenPorts, currentMonitorHiddenPorts)
	monitorMutex.Unlock()

	if len(ipsToCheck) == 0 {
		return
	}
	runtime.LogDebug(ctx, fmt.Sprintf("Performing status checks for %d IPs: %v", len(ipsToCheck), ipsToCheck))

	for _, ip := range ipsToCheck {
		select {
		case <-ctx.Done():
			runtime.LogDebug(ctx, fmt.Sprintf("Status check for %s cancelled.", ip))
			return
		default:
		}

		monitorMutex.Lock() // Lock before accessing shared maps
		hostDetail, exists := monitoredHostDetails[ip]
		if !exists { // Should not happen if ipsToCheck is derived correctly
			monitorMutex.Unlock()
			continue
		}
		monitorMutex.Unlock() // Unlock after reading, before network ops

		isNowOnline := false
		//var rttForLog time.Duration = -1 // For logging if needed, not strictly used by logic here

		// Priority 1: Check known open service ports of this specific host
		if len(hostDetail.OpenPorts) > 0 {
			// runtime.LogDebug(ctx, fmt.Sprintf("Monitor: Checking known open ports for %s: %v", ip, hostDetail.OpenPorts))
			for _, port := range hostDetail.OpenPorts {
				address := fmt.Sprintf("%s:%d", ip, port)
				// startTime := time.Now() // RTT not critical for monitoring, focus on reachability
				conn, errDial := net.DialTimeout("tcp", address, monitorTcpPingTimeout)
				// rttForLog = time.Since(startTime) // Can be captured if needed for detailed logs

				if errDial == nil {
					conn.Close()
					isNowOnline = true
					// runtime.LogDebug(ctx, fmt.Sprintf("Monitor: Host %s alive (known port %d open)", ip, port))
					break // Found alive via known open port
				}
				if netErr, ok := errDial.(net.Error); ok && netErr.Timeout() {
					// runtime.LogDebug(ctx, fmt.Sprintf("Monitor: Host %s timeout on known port %d", ip, port))
					continue // Timeout on this port, try next known open port
				}
				if errors.Is(errDial, syscall.ECONNREFUSED) || strings.Contains(strings.ToLower(errDial.Error()), "connection refused") {
					isNowOnline = true
					// runtime.LogDebug(ctx, fmt.Sprintf("Monitor: Host %s alive (known port %d refused)", ip, port))
					break // Found alive via known port refused
				}
				// runtime.LogDebug(ctx, fmt.Sprintf("Monitor: Host %s other error on known port %d: %v", ip, port, errDial))
			}
		}

		// Priority 2: If not found alive via its specific open ports (or if it had none),
		// then use the general isHostAlive logic with the monitoring-session's settings.
		if !isNowOnline {
			// runtime.LogDebug(ctx, fmt.Sprintf("Monitor: Host %s not via known open ports. Using general isHostAlive. SearchHidden: %t, HiddenPorts: %v", ip, localSearchHidden, localHiddenPorts))
			var fallbackRtt time.Duration // isHostAlive requires a pointer for RTT
			// isHostAlive is from scan.go (same package)
			isNowOnline = isHostAlive(ip, &fallbackRtt, localSearchHidden, localHiddenPorts)
			if isNowOnline {
				//rttForLog = fallbackRtt
				// runtime.LogDebug(ctx, fmt.Sprintf("Monitor: Host %s found alive via general isHostAlive check (RTT: %s)", ip, fallbackRtt))
			} else {
				// runtime.LogDebug(ctx, fmt.Sprintf("Monitor: Host %s also not found via general isHostAlive check.", ip))
			}
		}

		// Update status and emit event if changed
		monitorMutex.Lock()
		// Verify host is still being monitored before updating/emitting
		_, stillMonitored := monitoredHostDetails[ip]
		if !stillMonitored {
			monitorMutex.Unlock()
			continue
		}

		currentStatusInMap := monitoredHostStatuses[ip] // Re-fetch in case of concurrent modification (though unlikely here)
		if isNowOnline != currentStatusInMap {          // Compare with the status from the map for this cycle
			monitoredHostStatuses[ip] = isNowOnline // Update the status in the map
			runtime.LogInfo(ctx, fmt.Sprintf("Host %s status changed: was %t, now %t. Emitting event.", ip, currentStatusInMap, isNowOnline))
			runtime.EventsEmit(ctx, "hostStatusUpdate", HostStatusUpdate{IPAddress: ip, IsOnline: isNowOnline})
		}
		monitorMutex.Unlock()
	}
	runtime.LogDebug(ctx, "Finished performing status checks cycle.")
}

// StopMonitoring cancels any active monitoring operations.
func (a *App) StopMonitoring() error {
	monitorMutex.Lock()
	runtime.LogDebug(a.ctx, "StopMonitoring called.")

	if !isCurrentlyMonitoring {
		runtime.LogDebug(a.ctx, "Monitoring is not active, nothing to stop.")
		monitorMutex.Unlock()
		return nil
	}

	if monitoringCancel != nil {
		runtime.LogDebug(a.ctx, "Cancelling monitoring context.")
		monitoringCancel()
	}
	monitorMutex.Unlock() // Unlock before Wait to prevent potential deadlocks

	monitoringWg.Wait()

	monitorMutex.Lock()           // Re-acquire lock to safely update shared state
	isCurrentlyMonitoring = false // Ensure flag is accurate
	// Clear monitored data
	monitoredHostDetails = make(map[string]Host)
	monitoredHostStatuses = make(map[string]bool)
	runtime.LogInfo(a.ctx, "Monitoring successfully stopped and data cleared.")
	monitorMutex.Unlock()
	return nil
}

// IsMonitoringActive returns the current monitoring status.
func (a *App) IsMonitoringActive() bool {
	monitorMutex.Lock()
	defer monitorMutex.Unlock()
	return isCurrentlyMonitoring
}
