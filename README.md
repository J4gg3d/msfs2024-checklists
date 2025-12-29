# MSFS 2024 Checklists

[English](README.md) | [Deutsch](README_DE.md)

Interactive checklist web app for Microsoft Flight Simulator 2024. Currently featuring the **Airbus A330-200**, **Pilatus PC-12 NGX**, and **Boeing 737 MAX 8** with more aircraft coming soon through community contributions.

**Live Website: [simchecklist.app](https://simchecklist.app)**

## Features

- **Two Modes**: Normal mode (full procedures) and Career mode (optimized for MSFS 2024 Career)
- **Bilingual**: Full support for German and English (UI + checklists)
- **Progress Tracking**: Your checked items are saved locally
- **Detail Panel**: Tap any item to see descriptions, cockpit locations, and images
- **Flight Info**: Route tracking with distance flown, ETE, and flight number display
- **Collapsible Sections**: Organize your workflow by flight phase
- **Dark Cockpit Theme**: Easy on the eyes during night flights
- **SimConnect Bridge** (optional): Live flight data from the simulator
- **Tablet Support** (optional): Use on iPad/tablet via local network
- **Docker Support**: Easy deployment with Docker

## Screenshots

*Coming soon*

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)

### Installation

```bash
# Clone the repository
git clone https://github.com/J4gg3d/msfs2024-checklists.git
cd msfs2024-checklists

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build

```bash
npm run build
npm run preview
```

### Docker

```bash
# Build and start container
docker compose up -d

# App available at
http://localhost:8080
```

## SimConnect Bridge (Optional)

The SimConnect Bridge provides live flight data from the simulator including:
- Flight data: Altitude, Ground Speed, Heading, GPS Position
- GPS data: Flight plan, waypoints, ETE, destination airport
- ATC data: Callsign, Airline, Flight Number
- Aircraft systems: Lights, Electrical, APU, Anti-Ice, etc.

Requires MSFS 2024 SDK.

```bash
cd bridge-server/MSFSBridge
dotnet build
dotnet run
```

The bridge:
- WebSocket server on port 8080 (flight data)
- HTTP server on port 8081 (serves website for tablets)
- Route sync between PC and tablet (automatic)
- Airport lookup API (bypasses CORS restrictions)
- Auto-connects to MSFS on startup
- Shows tablet URL in console (e.g., `http://192.168.1.100:8081`)
- Retries every 5 seconds if MSFS isn't running

**Important**: After building the frontend, copy dist files to Bridge:
```bash
cp -r dist/* bridge-server/MSFSBridge/bin/Debug/net7.0/www/
```

## Tablet Support (Local Network)

Use the checklist on your iPad or tablet while receiving live flight data from your gaming PC.

### How it works

**Option A: Using simchecklist.app (Desktop PC)**
1. Open [simchecklist.app](https://simchecklist.app) in your browser
2. Start the Bridge on your PC
3. The website automatically connects to `ws://127.0.0.1:8080`
4. Done! (Works in Chrome/Firefox via localhost loopback exception)

**Option B: Tablet via Bridge (Local Network)**
1. Start the Bridge on your gaming PC
2. Note the URL shown in the bridge console (e.g., `http://192.168.1.100:8081`)
3. Open this URL on your tablet browser
4. Done! The Bridge serves both the website and flight data

### Route Synchronization
- Flight route is automatically synced between PC and tablet
- Route entered on PC appears instantly on tablet
- New clients receive the current route when connecting
- Works bidirectionally (PC ↔ Tablet)

### Requirements
- PC and tablet must be on the same WiFi network
- Bridge must be running on the PC

### Architecture

```
Desktop PC:
  simchecklist.app (HTTPS) ──► ws://127.0.0.1:8080 ──► Bridge

Tablet:
  http://[PC-IP]:8081 ◄──── Bridge serves website + WebSocket

Route Sync:
  PC sends route ──► Bridge stores ──► Broadcasts to all clients
```

## Flight Route Tracking

The app automatically tracks your flight progress:

- **GPS-based**: Distance calculated from current position to departure airport
- **Worldwide airports**: Unknown ICAO codes are automatically looked up
- **Caching**: Airports are cached locally for faster access
- **Bridge restart safe**: Distance is correctly reconstructed from GPS position
- **Route sync**: Route is synchronized between PC and tablet

Airport data is loaded via the Bridge (bypasses CORS) or falls back to direct API calls locally.

## Available Aircraft

| Aircraft | Normal Mode | Career Mode | Languages | Contributor |
|----------|:-----------:|:-----------:|:---------:|-------------|
| Airbus A330-200 | Yes | Yes | DE, EN | [@J4gg3d](https://github.com/J4gg3d) |
| Pilatus PC-12 NGX | - | Yes | DE, EN | [@J4gg3d](https://github.com/J4gg3d) |
| Boeing 737 MAX 8 | - | Yes | DE, EN | [@J4gg3d](https://github.com/J4gg3d) |
| *Your aircraft here* | - | - | - | [Contribute!](CONTRIBUTING.md) |

## Contributing

We welcome contributions! Whether it's new aircraft checklists, bug fixes, or translations.

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to add new checklists.

## Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Plain CSS (no frameworks)
- **i18n**: react-i18next for translations
- **Data**: JSON files for checklists (per language)
- **Persistence**: LocalStorage
- **Bridge**: C# with SimConnect SDK
- **Airport Data**: airport-data.com API (free, no key required)
- **Deployment**: Docker + nginx

## Project Structure

```
src/
├── i18n/                    # Internationalization
│   └── locales/
│       ├── de/translation.json
│       └── en/translation.json
├── data/                    # Checklist data
│   ├── de/                  # German checklists
│   └── en/                  # English checklists
├── components/              # React components
├── hooks/                   # Custom hooks
└── utils/                   # Utility functions (geo calculations)

bridge-server/MSFSBridge/    # C# SimConnect Server
├── Program.cs               # Main program with auto-connect
├── SimConnectManager.cs     # SimConnect integration
├── WebSocketServer.cs       # WebSocket server for flight data
├── StaticFileServer.cs      # HTTP server for tablet website
└── Models/SimData.cs        # Data model
```

## License

This project is licensed under the **GPL-3.0 License** - see the [LICENSE](LICENSE) file for details.

This means:
- You can use, modify, and distribute this project
- You must keep it open source
- You must credit the original authors
- You cannot use it in closed-source commercial products

## Acknowledgments

- The MSFS community for feedback and testing
- Contributors who add new aircraft checklists
- [airport-data.com](https://www.airport-data.com/) for the free airport API

---

Made with love for the flight sim community
