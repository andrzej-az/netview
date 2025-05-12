package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	// Use Wails runtime for path resolution if needed, or os package
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// ScanHistoryItem represents a single entry in the scan history.
// Ensure JSON tags match frontend expectations (camelCase).
type ScanHistoryItem struct {
	StartIP   string    `json:"startIp"`
	EndIP     string    `json:"endIp"`
	Timestamp time.Time `json:"timestamp"`
}

const maxHistoryItems = 10
const historyFilename = "scan_history.json"

var scanHistory []ScanHistoryItem // Slice to store history items
var historyMutex sync.Mutex       // Mutex to protect concurrent access to scanHistory
var historyFilePath string        // Full path to the history file

// initHistory loads scan history from the persistent file on startup.
func initHistory(ctx AppContext) {
	historyMutex.Lock()
	defer historyMutex.Unlock()

	// Determine storage path (using Wails runtime or os package)
	// Option 1: Using os package (more standard Go, less Wails specific)
	configDir, err := os.UserConfigDir()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error getting user config dir: %v\n", err)
		// Fallback or handle error appropriately
		configDir = "." // Fallback to current directory (not ideal)
	}
	appDataDir := filepath.Join(configDir, "NetView") // App-specific folder
	err = os.MkdirAll(appDataDir, 0750)               // Ensure directory exists (permission 0750)
	if err != nil && !os.IsExist(err) {
		fmt.Fprintf(os.Stderr, "Error creating app data dir '%s': %v\n", appDataDir, err)
		// Handle error - perhaps history won't be persistent
		historyFilePath = "" // Indicate persistence isn't available
		scanHistory = []ScanHistoryItem{}
		return
	}
	historyFilePath = filepath.Join(appDataDir, historyFilename)
	runtime.LogDebug(ctx, fmt.Sprintf("History file path set to: %s", historyFilePath))

	// Attempt to load history from file
	data, err := os.ReadFile(historyFilePath)
	if err != nil {
		if os.IsNotExist(err) {
			runtime.LogInfo(ctx, "Scan history file not found, starting fresh.")
			scanHistory = []ScanHistoryItem{} // Initialize empty if file doesn't exist
		} else {
			runtime.LogError(ctx, fmt.Sprintf("Error reading scan history file '%s': %v", historyFilePath, err))
			scanHistory = []ScanHistoryItem{} // Initialize empty on other read errors
		}
		return
	}

	// Unmarshal JSON data
	err = json.Unmarshal(data, &scanHistory)
	if err != nil {
		runtime.LogError(ctx, fmt.Sprintf("Error unmarshalling scan history from '%s': %v. Starting fresh.", historyFilePath, err))
		scanHistory = []ScanHistoryItem{} // Initialize empty if JSON is corrupt
		// Optionally: backup the corrupted file
		_ = os.Rename(historyFilePath, historyFilePath+".bak")
	} else {
		runtime.LogInfo(ctx, fmt.Sprintf("Loaded %d items from scan history.", len(scanHistory)))
		// Ensure history doesn't exceed max items (in case file was manually edited)
		if len(scanHistory) > maxHistoryItems {
			scanHistory = scanHistory[:maxHistoryItems]
			runtime.LogDebug(ctx, fmt.Sprintf("Trimmed loaded history to %d items.", maxHistoryItems))
			// Save the trimmed history back
			saveHistory(ctx) // Save immediately after trimming
		}
	}

	// Ensure scanHistory is never nil
	if scanHistory == nil {
		scanHistory = []ScanHistoryItem{}
	}
}

// saveHistory saves the current scan history to the persistent file.
// Assumes mutex is handled by the caller or it's called from a context where mutex is already locked.
func saveHistory(ctx AppContext) {
	if historyFilePath == "" {
		runtime.LogWarning(ctx, "History file path not set, skipping save.")
		return // Persistence not available or not initialized correctly
	}

	// Marshal the current history to JSON
	data, err := json.MarshalIndent(scanHistory, "", "  ") // Use indent for readability
	if err != nil {
		runtime.LogError(ctx, fmt.Sprintf("Error marshalling scan history: %v", err))
		return
	}

	// Write the JSON data to the file
	// Use a temporary file and rename for atomic write, preventing corruption on partial write
	tempFilePath := historyFilePath + ".tmp"
	err = os.WriteFile(tempFilePath, data, 0640) // Write with permission 0640
	if err != nil {
		runtime.LogError(ctx, fmt.Sprintf("Error writing temporary scan history file '%s': %v", tempFilePath, err))
		return
	}

	// Rename temporary file to the actual history file
	err = os.Rename(tempFilePath, historyFilePath)
	if err != nil {
		runtime.LogError(ctx, fmt.Sprintf("Error renaming temporary history file to '%s': %v", historyFilePath, err))
		// Attempt to clean up temp file
		_ = os.Remove(tempFilePath)
		return
	}

	runtime.LogDebug(ctx, fmt.Sprintf("Successfully saved scan history to %s", historyFilePath))
}

// addScanToHistory adds a new scan range to the history and saves it.
// It ensures the history does not exceed maxHistoryItems.
func addScanToHistory(ctx AppContext, scanRange *ScanRange) {
	if scanRange == nil || scanRange.StartIP == "" || scanRange.EndIP == "" {
		runtime.LogDebug(ctx, "addScanToHistory - scanRange is nil or IPs are empty, skipping.")
		return // Do not add empty or incomplete ranges
	}

	historyMutex.Lock()
	defer historyMutex.Unlock()

	newItem := ScanHistoryItem{
		StartIP:   scanRange.StartIP,
		EndIP:     scanRange.EndIP,
		Timestamp: time.Now(),
	}
	runtime.LogDebug(ctx, fmt.Sprintf("Adding to history: %+v", newItem))

	// Add to the beginning of the slice (most recent first)
	// Avoid adding exact duplicate of the immediate previous scan
	if len(scanHistory) > 0 && scanHistory[0].StartIP == newItem.StartIP && scanHistory[0].EndIP == newItem.EndIP {
		runtime.LogDebug(ctx, "Skipping add to history: duplicate of last entry.")
	} else {
		newHistory := make([]ScanHistoryItem, 0, maxHistoryItems+1)
		newHistory = append(newHistory, newItem)
		newHistory = append(newHistory, scanHistory...)
		scanHistory = newHistory

		// Trim to maxHistoryItems
		if len(scanHistory) > maxHistoryItems {
			scanHistory = scanHistory[:maxHistoryItems]
		}
		runtime.LogDebug(ctx, fmt.Sprintf("History count after add: %d", len(scanHistory)))

		// Save the updated history
		saveHistory(ctx)
	}
}

// GetScanHistory retrieves the current scan history.
// This function is a method of *App and will be bound to Wails.
func (a *App) GetScanHistory() []ScanHistoryItem {
	historyMutex.Lock()
	defer historyMutex.Unlock()

	runtime.LogDebug(a.ctx, fmt.Sprintf("GetScanHistory called. Current history size: %d", len(scanHistory)))

	// Return a copy to prevent external modification of the internal slice.
	if scanHistory == nil {
		runtime.LogDebug(a.ctx, "GetScanHistory - scanHistory is nil, returning empty slice.")
		return []ScanHistoryItem{} // Return empty slice, not nil, for consistent JSON marshalling
	}

	// Create a copy to return
	historyCopy := make([]ScanHistoryItem, len(scanHistory))
	copy(historyCopy, scanHistory)
	runtime.LogDebug(a.ctx, fmt.Sprintf("Returning history copy: %+v", historyCopy))
	return historyCopy
}

// AppContext is an alias for context.Context for clarity
type AppContext = context.Context
