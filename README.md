# MSFS 2024 Checklists

[English](README.md) | [Deutsch](README_DE.md)

Interactive checklist web app for Microsoft Flight Simulator 2024. Currently featuring the **Airbus A330-200** with more aircraft coming soon through community contributions.

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
- ATC data: Callsign, Airline, Flight Number
- Aircraft systems: Lights, Electrical, APU, Anti-Ice, etc.

Requires MSFS 2024 SDK.

```bash
cd bridge-server/MSFSBridge
dotnet build
dotnet run
```

The bridge:
- Runs on WebSocket port 8080
- Auto-connects to MSFS on startup
- Shows your local IP address for tablet connections
- Retries every 5 seconds if MSFS isn't running

## Tablet Support (Local Network)

Use the checklist on your iPad or tablet while receiving live flight data from your gaming PC.

### How it works

1. Start the Bridge on your gaming PC
2. Note the IP address shown in the bridge console (e.g., `192.168.1.100`)
3. On your tablet: Open the website -> Menu -> Tablet
4. Enter the IP address and connect
5. Done! Flight data syncs in real-time

### Requirements
- PC and tablet must be on the same WiFi network
- Bridge must be running on the PC

### Architecture

```
+------------------+     WebSocket (Port 8080)     +---------------+
|  Gaming PC       |<----------------------------->|  iPad/Tablet  |
|  MSFS + Bridge   |         Local WiFi            |  Browser      |
+------------------+                               +---------------+
```

## Flight Route Tracking

The app automatically tracks your flight progress:

- **GPS-based**: Distance calculated from current position to departure airport
- **Worldwide airports**: Unknown ICAO codes are automatically looked up via API
- **Caching**: Airports are cached locally for faster access
- **Bridge restart safe**: Distance is correctly reconstructed from GPS position

## Available Aircraft

| Aircraft | Normal Mode | Career Mode | Languages | Contributor |
|----------|:-----------:|:-----------:|:---------:|-------------|
| Airbus A330-200 | Yes | Yes | DE, EN | [@J4gg3d](https://github.com/J4gg3d) |
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
