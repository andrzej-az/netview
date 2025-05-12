
package main

import (
	"context"
	"fmt"
	"sync"
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
	monitoredIPs          map[string]bool    // IP -> last known online status
	monitorMutex          sync.Mutex         // Protects access to monitoring-related shared variables
	isCurrentlyMonitoring bool               // Flag indicating if monitoring is active
)

const monitorInterval = 10 * time.Second // Interval for checking host statuses

// InitializeMonitor prepares the monitoring system. Called on app startup.
// It uses the main app context `a.ctx` as the base for monitoring operations.
func (a *App) InitializeMonitor() {
	monitorMutex.Lock()
	defer monitorMutex.Unlock()
	// `a.ctx` is the main application context passed during startup.
	// It will be used as the parent for the cancellable monitoringCtx.
	if a.ctx == nil {
		// This should ideally not happen if startup sequence is correct.
		// Fallback to background if necessary, though Wails runtime might not work correctly.
		fmt.Println("Warning: App context is nil during monitor initialization. Using background context.")
		// Using context.Background() here might mean runtime.Log functions inside monitoring
		// won't have the correct Wails application context if a.ctx was truly nil.
		// However, StartMonitoring will use a.ctx when it's called.
	}
	monitoredIPs = make(map[string]bool)
	isCurrentlyMonitoring = false // Explicitly set to false initially
	runtime.LogDebug(a.ctx, "Monitoring system initialized.")
}

// StartMonitoring begins periodically checking the status of the given IP addresses.
func (a *App) StartMonitoring(ips []string) error {
	monitorMutex.Lock()
	defer monitorMutex.Unlock()

	if a.ctx == nil {
		return fmt.Errorf("application context not initialized, cannot start monitoring")
	}

	// If monitoring is already active, stop it first.
	if isCurrentlyMonitoring && monitoringCancel != nil {
		runtime.LogDebug(a.ctx, "Monitoring already active. Stopping existing monitor first.")
		monitoringCancel()  // Signal the previous monitoring goroutine to stop
		monitoringWg.Wait() // Wait for it to fully stop
		runtime.LogDebug(a.ctx, "Previous monitoring stopped.")
	}

	runtime.LogDebug(a.ctx, fmt.Sprintf("StartMonitoring called with %d IPs: %v", len(ips), ips))
	if len(ips) == 0 {
		runtime.LogInfo(a.ctx, "StartMonitoring called with no IPs. Monitoring will not actively run.")
		isCurrentlyMonitoring = false // Ensure flag is false if no IPs
		// We still set up a cancellable context in case StopMonitoring is called.
		// Or, we could just return here. Let's return to avoid a dangling goroutine.
		return nil
	}


	// Create a new cancellable context for this monitoring session, derived from the app's main context
	monitoringCtx, monitoringCancel = context.WithCancel(a.ctx)
	isCurrentlyMonitoring = true

	// Reset and populate the list of IPs to monitor
	monitoredIPs = make(map[string]bool)
	for _, ip := range ips {
		// Assume IPs are online initially based on the scan that found them.
		// The first check cycle will verify and update if necessary.
		monitoredIPs[ip] = true
	}

	monitoringWg.Add(1) // Increment counter for the main monitoring goroutine
	go func() {
		defer monitoringWg.Done() // Decrement counter when goroutine exits
		defer func() {
			monitorMutex.Lock()
			isCurrentlyMonitoring = false // Ensure this is reset when goroutine ends
			runtime.LogDebug(monitoringCtx, "Monitoring goroutine fully finished.")
			monitorMutex.Unlock()
		}()

		runtime.LogInfo(monitoringCtx, fmt.Sprintf("Monitoring goroutine started for %d IPs.", len(ips)))
		ticker := time.NewTicker(monitorInterval)
		defer ticker.Stop()

		// Perform an initial check immediately
		a.performStatusChecks(monitoringCtx)

		for {
			select {
			case <-monitoringCtx.Done(): // If context is cancelled (e.g., by StopMonitoring or app shutdown)
				runtime.LogInfo(monitoringCtx, "Monitoring loop stopping due to context cancellation.")
				return
			case <-ticker.C: // Triggered by the ticker interval
				a.performStatusChecks(monitoringCtx)
			}
		}
	}()

	return nil
}

// performStatusChecks iterates through monitored IPs and checks their online status.
// Emits 'hostStatusUpdate' event if a status change is detected.
func (a *App) performStatusChecks(ctx context.Context) {
	monitorMutex.Lock()
	// Create a snapshot of IPs to check to avoid holding the lock during network calls
	ipsToCheck := make([]string, 0, len(monitoredIPs))
	currentStatuses := make(map[string]bool)
	for ip, status := range monitoredIPs {
		ipsToCheck = append(ipsToCheck, ip)
		currentStatuses[ip] = status
	}
	monitorMutex.Unlock()

	if len(ipsToCheck) == 0 {
		// runtime.LogDebug(ctx, "performStatusChecks: No IPs currently being monitored.")
		return
	}

	runtime.LogDebug(ctx, fmt.Sprintf("Performing status checks for %d IPs: %v", len(ipsToCheck), ipsToCheck))

	for _, ip := range ipsToCheck {
		select {
		case <-ctx.Done(): // Check for cancellation before each potentially long operation
			runtime.LogDebug(ctx, fmt.Sprintf("Status check for %s cancelled.", ip))
			return
		default:
			// Continue
		}

		var rtt time.Duration // Required by isHostAlive
		// isHostAlive is a package-level function from scan.go
		// It uses `appCtx` internally for logging, which is `a.ctx` if InitScanner was called.
		// For status checks, it's fine that its internal logs use the main app context.
		isNowOnline := isHostAlive(ip, &rtt)

		monitorMutex.Lock()
		// Check if the IP is still in the monitoredIPs list and if its status changed
		lastKnownStatus, stillMonitored := monitoredIPs[ip]
		if !stillMonitored {
			// IP was removed from monitoring list (e.g., StopMonitoring called with a new list)
			monitorMutex.Unlock()
			continue
		}

		if isNowOnline != lastKnownStatus {
			monitoredIPs[ip] = isNowOnline // Update the status
			runtime.LogInfo(ctx, fmt.Sprintf("Host %s status changed: was %t, now %t. Emitting event.", ip, lastKnownStatus, isNowOnline))
			// Emit event to frontend. Use the monitoring context for this emission.
			runtime.EventsEmit(ctx, "hostStatusUpdate", HostStatusUpdate{IPAddress: ip, IsOnline: isNowOnline})
		}
		monitorMutex.Unlock()
	}
	runtime.LogDebug(ctx, "Finished performing status checks cycle.")
}

// StopMonitoring cancels any active monitoring operations.
func (a *App) StopMonitoring() error {
	monitorMutex.Lock()
	// Unlock is deferred to ensure it's called even if there's an early return or panic.

	runtime.LogDebug(a.ctx, "StopMonitoring called.")

	if !isCurrentlyMonitoring {
		runtime.LogDebug(a.ctx, "Monitoring is not active, nothing to stop.")
		monitorMutex.Unlock()
		return nil
	}

	if monitoringCancel != nil {
		runtime.LogDebug(a.ctx, "Cancelling monitoring context.")
		monitoringCancel() // Signal the monitoring goroutine to stop
	}
	// Unlock before waiting to prevent deadlock if performStatusChecks tries to lock.
	monitorMutex.Unlock()

	monitoringWg.Wait() // Wait for the main monitoring goroutine to fully complete

	// Re-acquire lock to safely update shared state if needed, though isCurrentlyMonitoring is set by the goroutine itself.
	monitorMutex.Lock()
	isCurrentlyMonitoring = false // Ensure flag is accurate after wait
	runtime.LogInfo(a.ctx, "Monitoring successfully stopped.")
	monitorMutex.Unlock()
	return nil
}

// IsMonitoringActive returns the current monitoring status.
func (a *App) IsMonitoringActive() bool {
	monitorMutex.Lock()
	defer monitorMutex.Unlock()
	return isCurrentlyMonitoring
}
