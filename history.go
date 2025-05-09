
package main

import (
	"sync"
	"time"
	// "fmt" // Uncomment if you need to print for debugging
)

// ScanHistoryItem represents a single entry in the scan history.
// Ensure JSON tags match frontend expectations (camelCase).
type ScanHistoryItem struct {
	StartIP   string    `json:"startIp"`
	EndIP     string    `json:"endIp"`
	Timestamp time.Time `json:"timestamp"`
}

const maxHistoryItems = 10

var scanHistory []ScanHistoryItem // Slice to store history items
var historyMutex sync.Mutex      // Mutex to protect concurrent access to scanHistory

// addScanToHistory adds a new scan range to the history.
// It ensures the history does not exceed maxHistoryItems.
// This function is intended for internal use by the backend and is not bound to Wails.
func addScanToHistory(scanRange *ScanRange) {
	if scanRange == nil || scanRange.StartIP == "" || scanRange.EndIP == "" {
		// fmt.Println("Debug: addScanToHistory - scanRange is nil or IPs are empty, skipping.")
		return // Do not add empty or incomplete ranges
	}

	historyMutex.Lock()
	defer historyMutex.Unlock()

	// Optional: Prevent adding exact duplicate of the most recent entry if timestamps are very close,
	// or simply refresh the timestamp of an identical recent scan.
	// For now, we'll add it as a new entry as "last 10 scans" implies order of execution.
	// If you want to avoid exact consecutive duplicates:
	// if len(scanHistory) > 0 {
	//  lastEntry := scanHistory[0]
	// 	if lastEntry.StartIP == scanRange.StartIP && lastEntry.EndIP == scanRange.EndIP {
	//      // Option 1: Update timestamp of the existing entry
	// 		// scanHistory[0].Timestamp = time.Now()
	// 		// return
	//      // Option 2: Don't add if it's an exact duplicate of the last one
	//      // return
	// 	}
	// }


	newItem := ScanHistoryItem{
		StartIP:   scanRange.StartIP,
		EndIP:     scanRange.EndIP,
		Timestamp: time.Now(),
	}
	// fmt.Printf("Debug: Adding to history: %+v\n", newItem)


	// Add to the beginning of the slice (most recent first)
	newHistory := make([]ScanHistoryItem, 0, maxHistoryItems+1)
	newHistory = append(newHistory, newItem)
	newHistory = append(newHistory, scanHistory...)
	scanHistory = newHistory


	// Trim to maxHistoryItems
	if len(scanHistory) > maxHistoryItems {
		scanHistory = scanHistory[:maxHistoryItems]
	}
	// fmt.Printf("Debug: History count after add: %d\n", len(scanHistory))
}

// GetScanHistory retrieves the current scan history.
// This function is a method of *App and will be bound to Wails.
func (a *App) GetScanHistory() []ScanHistoryItem {
	historyMutex.Lock()
	defer historyMutex.Unlock()
	
	// fmt.Printf("Debug: GetScanHistory called. Current history size: %d\n", len(scanHistory))

	// Return a copy to prevent external modification of the internal slice.
	// For a small, simple slice like this, direct return is often okay, but copying is safer.
	if scanHistory == nil {
		// fmt.Println("Debug: GetScanHistory - scanHistory is nil, returning empty slice.")
		return []ScanHistoryItem{} // Return empty slice, not nil, for consistent JSON marshalling
	}

	// Create a copy to return
	historyCopy := make([]ScanHistoryItem, len(scanHistory))
	copy(historyCopy, scanHistory)
	// fmt.Printf("Debug: Returning history copy: %+v\n", historyCopy)
	return historyCopy
}
