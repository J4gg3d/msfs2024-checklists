# MSFS 2024 Checklists

🇬🇧 English | [🇩🇪 Deutsch](README_DE.md)

Interactive checklist web app for Microsoft Flight Simulator 2024. Currently featuring the **Airbus A330-200** with more aircraft coming soon through community contributions.

## Features

- **Two Modes**: Normal mode (full procedures) and Career mode (optimized for MSFS 2024 Career)
- **Bilingual**: Full support for German and English (UI + checklists)
- **Progress Tracking**: Your checked items are saved locally
- **Detail Panel**: Tap any item to see descriptions, cockpit locations, and images
- **Collapsible Sections**: Organize your workflow by flight phase
- **Dark Cockpit Theme**: Easy on the eyes during night flights
- **SimConnect Bridge** (optional): Live flight data from the simulator
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

The SimConnect Bridge provides live flight data from the simulator. Requires MSFS 2024 SDK.

```bash
cd SimConnectBridge
dotnet build
dotnet run
```

The bridge runs on WebSocket port 8765 and automatically connects to the web app.

## Available Aircraft

| Aircraft | Normal Mode | Career Mode | Languages | Contributor |
|----------|:-----------:|:-----------:|:---------:|-------------|
| Airbus A330-200 | ✅ | ✅ | DE, EN | [@J4gg3d](https://github.com/J4gg3d) |
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
└── hooks/                   # Custom hooks
```

## License

This project is licensed under the **GPL-3.0 License** - see the [LICENSE](LICENSE) file for details.

This means:
- ✅ You can use, modify, and distribute this project
- ✅ You must keep it open source
- ✅ You must credit the original authors
- ❌ You cannot use it in closed-source commercial products

## Acknowledgments

- The MSFS community for feedback and testing
- Contributors who add new aircraft checklists

---

Made with ✈️ for the flight sim community
