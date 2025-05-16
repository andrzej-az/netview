
# NetView - Network Scanner

NetView is a desktop application built with Wails (Go + Svelte/React/Vue) and Next.js for the frontend, designed to help you discover and monitor devices on your local network. It provides a user-friendly interface to scan IP ranges, identify hosts, and get insights into their open ports and potential device types.

![NetView Screenshot](docs/netview.jpg)
*Note: If the screenshot above is not visible, please ensure you have an image at `docs/netview.jpg` in your project.*

## Features

*   **Custom IP Range Scanning:** Specify start and end IP addresses to scan a specific segment of your network.
*   **Easy IP Address Entry:** User-friendly octet-based input for IP addresses with smart auto-completion for the end IP based on the start IP. Copy and paste of full IP addresses into the first octet field is supported.
*   **Host Discovery:** Identifies active hosts within the scanned range.
*   **Port Scanning:** Checks for common open ports on discovered hosts. Users can customize the list of ports to scan via settings.
*   **Device Type Identification (Heuristic):** Attempts to identify the type of device (e.g., Windows PC, Linux Server, Printer, Mobile device) based on open ports, hostname, and MAC address vendor (OUI).
    *   Uses Devicons for distinct visual representation of different OS/device types (Windows, Linux, macOS, Android, Raspberry Pi).
*   **Multiple Views:**
    *   **Card View:** Displays hosts as individual cards with key information.
    *   **List View:** Presents hosts in a compact list format.
*   **Host Details Drawer:** Click on any host to see more detailed information including all identified open ports.
*   **Filtering:** Quickly find specific hosts by searching via IP address, hostname, or MAC address.
*   **Scan History:** Keeps a record of your last 10 custom IP range scans, allowing you to easily re-scan a previous range. History is persistent across application sessions.
*   **Settings Panel:**
    *   Customize the list of ports to scan for services.
    *   Option to enable/disable "Search for hidden hosts" which probes additional, less common ports for liveness checks.
    *   Customize the list of ports used for hidden host discovery.
    *   Theme selection (Light, Dark, System).
*   **Live Host Monitoring:**
    *   Toggle monitoring for currently discovered hosts.
    *   App periodically checks the status of monitored hosts.
    *   Sends notifications and visually updates hosts (e.g., greys out offline hosts) when their status changes.
*   **Custom Title Bar:** (Wails Desktop App) Provides standard window controls (minimize, maximize/restore, close) for a native feel.
*   **Wails Backend:** Core scanning and network logic implemented in Go for performance, with a Next.js frontend.
*   **Responsive Design:** UI adapts to different window sizes.

## Supported OS

The application is built using Wails and can be compiled for:

*   **Linux**
*   **Windows**

*(macOS support is possible with Wails but the current GitHub workflow is configured for Linux and Windows builds.)*

## Downloads / Releases

You can find pre-built versions of NetView for supported operating systems on the [GitHub Releases page](https://github.com/andrzej-az/netview/releases).

## Usage Scenarios

*   **Network Auditing:** Quickly get an overview of active devices on your home or small office network.
*   **Troubleshooting:** Identify if a specific device is online and what ports might be open.
*   **Security Awareness:** Discover unexpected devices or open ports that might indicate misconfigurations or unauthorized access.
*   **Device Management:** Keep track of devices by their IP, hostname, or MAC address.
*   **Learning & Exploration:** Understand what devices are present on a network and how they might be identified.
*   **Monitoring Critical Devices:** Use the monitoring feature to get notified if key devices (like servers or IoT devices) go offline or come back online.

## Author

This application prototype was developed by with the assistance of **Firebase Studio App Prototyper**.

## Getting Started (Development)

This is a Next.js project bootstrapped with Wails.

To get started with development:

1.  Ensure you have Go, Node.js, and npm installed.
2.  Install Wails CLI: `go install github.com/wailsapp/wails/v2/cmd/wails@latest` (or the specific version used in the project).
3.  Install frontend dependencies: `npm install` in the project root.
4.  Run the development server: `wails dev`
    *   This will typically start the Next.js dev server (e.g., on `localhost:9002`) and the Wails application which will load the frontend from that URL.

To build the application for production:

*   `wails build` - This will build the Go backend and bundle the Next.js frontend (after running `npm run build:export`) into a native desktop application.

Look at `src/app/page.tsx` for the main frontend entry point and `main.go` for the Go backend entry point.

