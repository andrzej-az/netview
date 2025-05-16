package main

import (
	"context"
	"embed"

	// "fmt" // No longer needed here
	// "net" // No longer needed here
	"netview/ouidb"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/runtime" // Needed for logging in init funcs
)

//go:embed all:out
var assets embed.FS

//go:embed macdb/oui.txt
var ouiData embed.FS

// Global variable for the OUI database
var macDB *ouidb.OuiDb

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	// Initialize the OUI database
	initOuiDatabase(ctx)
	// Initialize the scanner with the context and the OUI database
	//InitScanner(ctx, macDB)
	// Initialize and load scan history
	initHistory(ctx) // Pass context for logging
	// Initialize monitoring components
	a.InitializeMonitor()
	runtime.LogInfo(ctx, "Application startup complete.")
}

// initOuiDatabase initializes the OUI database from the embedded assets/oui.txt file.
func initOuiDatabase(ctx context.Context) {
	file, err := ouiData.Open("macdb/oui.txt")
	if err != nil {
		runtime.LogError(ctx, "Failed to open oui.txt: "+err.Error())
		return
	}
	defer file.Close()
	macDB := &ouidb.OuiDb{}
	if err := macDB.Load(file); err != nil {
		runtime.LogError(ctx, "Failed to initialize OUI database: "+err.Error())
	}
}

// ScanNetwork now accepts a pointer to ScanRange, which may include IPs and/or Ports.
// If scanRange is nil, or if fields within are zero-valued, PerformScan handles defaults.
func (a *App) ScanNetwork(scanRange *ScanRange) error {
	// If scanRange is nil (e.g., from a frontend call with `null`), PerformScan should handle it.
	// Or, if scanRange is an empty struct (e.g., `{}` from frontend), specific fields like Ports might be set.
	return PerformScan(a.ctx, scanRange) // Pass context to PerformScan
}

// GetScanHistory is defined in history.go as a method of *App.
// It will be automatically bound when `app` instance of `*App` is bound.

// StartMonitoring, StopMonitoring, IsMonitoringActive will be defined in monitor.go
// and bound automatically as methods of *App.

func main() {
	// Create an instance of the app structure
	app := NewApp()

	// Create application with options
	err := wails.Run(&options.App{
		Title:     "NetView - Network Scanner",
		Width:     1024,
		Height:    768,
		Frameless: true, // Enable frameless window for custom title bar
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		CSSDragProperty:  "widows",
		CSSDragValue:     "1",
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1}, // Dark background, can be adjusted
		OnStartup:        app.startup,
		Bind: []interface{}{
			app, // Binding the app instance makes all its methods available to the frontend.
		},
		// Enable debug logging for Wails runtime
		// LogLevel: logger.DEBUG,
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
