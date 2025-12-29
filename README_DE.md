# MSFS 2024 Checklists

[English](README.md) | [Deutsch](README_DE.md)

Interaktive Checklisten-Webapp für Microsoft Flight Simulator 2024. Aktuell mit **Airbus A330-200**, **Pilatus PC-12 NGX** und **Boeing 737 MAX 8** - weitere Flugzeuge folgen durch Community-Beiträge.

**Live-Website: [simchecklist.app](https://simchecklist.app)**

## Features

- **Zwei Modi**: Normal-Modus (vollständige Prozeduren) und Karriere-Modus (optimiert für MSFS 2024 Karriere)
- **Zweisprachig**: Vollständige Unterstützung für Deutsch und Englisch (UI + Checklisten)
- **Fortschrittsspeicherung**: Abgehakte Items werden lokal gespeichert
- **Detail-Panel**: Tippe auf ein Item für Beschreibung, Cockpit-Position und Bilder
- **Fluginfo**: Routenverfolgung mit geflogener Distanz, ETE und Flugnummer
- **Einklappbare Sektionen**: Organisiere deinen Workflow nach Flugphasen
- **Dunkles Cockpit-Theme**: Augenschonend bei Nachtflügen
- **SimConnect Bridge** (optional): Live-Flugdaten aus dem Simulator
- **Tablet-Unterstützung** (optional): Nutzung auf iPad/Tablet via lokales Netzwerk
- **Docker Support**: Einfaches Deployment mit Docker

## Screenshots

*Folgen in Kürze*

## Schnellstart

### Voraussetzungen
- [Node.js](https://nodejs.org/) (v18 oder höher)

### Installation

```bash
# Repository klonen
git clone https://github.com/J4gg3d/msfs2024-checklists.git
cd msfs2024-checklists

# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npm run dev
```

Öffne [http://localhost:5173](http://localhost:5173) im Browser.

### Produktions-Build

```bash
npm run build
npm run preview
```

### Docker

```bash
# Container bauen und starten
docker compose up -d

# App verfügbar unter
http://localhost:8080
```

## SimConnect Bridge (Optional)

Die SimConnect Bridge liefert Live-Flugdaten aus dem Simulator:
- Flugdaten: Altitude, Ground Speed, Heading, GPS-Position
- GPS-Daten: Flugplan, Waypoints, ETE, Zielflughafen
- ATC-Daten: Callsign, Airline, Flugnummer
- Flugzeugsysteme: Lichter, Elektrik, APU, Anti-Ice, etc.

Erfordert das MSFS 2024 SDK.

```bash
cd bridge-server/MSFSBridge
dotnet build
dotnet run
```

Die Bridge:
- WebSocket-Server auf Port 8080 (Flugdaten)
- HTTP-Server auf Port 8081 (Website für Tablets)
- Route-Sync zwischen PC und Tablet (automatisch)
- Flughafen-API (umgeht CORS-Einschränkungen)
- Verbindet sich automatisch mit MSFS beim Start
- Zeigt Tablet-URL in der Konsole (z.B. `http://192.168.1.100:8081`)
- Versucht alle 5 Sekunden erneut zu verbinden wenn MSFS nicht läuft

**Wichtig**: Nach dem Frontend-Build die Dist-Dateien zur Bridge kopieren:
```bash
cp -r dist/* bridge-server/MSFSBridge/bin/Debug/net7.0/www/
```

## Tablet-Unterstützung (Lokales Netzwerk)

Nutze die Checkliste auf deinem iPad oder Tablet mit Live-Flugdaten von deinem Gaming-PC.

### So funktioniert's

**Option A: simchecklist.app nutzen (Desktop-PC)**
1. Öffne [simchecklist.app](https://simchecklist.app) im Browser
2. Starte die Bridge auf deinem PC
3. Die Website verbindet sich automatisch mit `ws://127.0.0.1:8080`
4. Fertig! (Funktioniert in Chrome/Firefox via Localhost-Loopback-Ausnahme)

**Option B: Tablet via Bridge (Lokales Netzwerk)**
1. Starte die Bridge auf deinem Gaming-PC
2. Notiere die URL aus der Bridge-Konsole (z.B. `http://192.168.1.100:8081`)
3. Öffne diese URL im Tablet-Browser
4. Fertig! Die Bridge liefert Website und Flugdaten

### Route-Synchronisation
- Flugroute wird automatisch zwischen PC und Tablet synchronisiert
- Auf dem PC eingegebene Route erscheint sofort auf dem Tablet
- Neue Clients erhalten beim Verbinden die aktuelle Route
- Funktioniert bidirektional (PC ↔ Tablet)

### Voraussetzungen
- PC und Tablet müssen im gleichen WLAN sein
- Bridge muss auf dem PC laufen

### Architektur

```
Desktop-PC:
  simchecklist.app (HTTPS) ──► ws://127.0.0.1:8080 ──► Bridge

Tablet:
  http://[PC-IP]:8081 ◄──── Bridge liefert Website + WebSocket

Route-Sync:
  PC sendet Route ──► Bridge speichert ──► Broadcast an alle Clients
```

## Flugrouten-Tracking

Die App verfolgt automatisch deinen Flugfortschritt:

- **GPS-basiert**: Distanz wird aus aktueller Position zum Startflughafen berechnet
- **Weltweite Flughäfen**: Unbekannte ICAO-Codes werden automatisch nachgeschlagen
- **Caching**: Flughäfen werden lokal gecacht für schnelleren Zugriff
- **Bridge-Neustart sicher**: Distanz wird korrekt aus GPS-Position rekonstruiert
- **Route-Sync**: Route wird zwischen PC und Tablet synchronisiert

Flughafen-Daten werden über die Bridge geladen (umgeht CORS) oder lokal direkt via API.

## Verfügbare Flugzeuge

| Flugzeug | Normal-Modus | Karriere-Modus | Sprachen | Beigetragen von |
|----------|:------------:|:--------------:|:--------:|-----------------|
| Airbus A330-200 | Ja | Ja | DE, EN | [@J4gg3d](https://github.com/J4gg3d) |
| Pilatus PC-12 NGX | - | Ja | DE, EN | [@J4gg3d](https://github.com/J4gg3d) |
| Boeing 737 MAX 8 | - | Ja | DE, EN | [@J4gg3d](https://github.com/J4gg3d) |
| *Dein Flugzeug hier* | - | - | - | [Mitmachen!](CONTRIBUTING_DE.md) |

## Mitmachen

Wir freuen uns über Beiträge! Ob neue Flugzeug-Checklisten, Bugfixes oder Übersetzungen.

Siehe [CONTRIBUTING_DE.md](CONTRIBUTING_DE.md) für eine Anleitung zum Hinzufügen neuer Checklisten.

## Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Plain CSS (keine Frameworks)
- **i18n**: react-i18next für Übersetzungen
- **Daten**: JSON-Dateien für Checklisten (pro Sprache)
- **Persistenz**: LocalStorage
- **Bridge**: C# mit SimConnect SDK
- **Flughafen-Daten**: airport-data.com API (kostenlos, kein Key nötig)
- **Deployment**: Docker + nginx

## Projektstruktur

```
src/
├── i18n/                    # Internationalisierung
│   └── locales/
│       ├── de/translation.json
│       └── en/translation.json
├── data/                    # Checklisten-Daten
│   ├── de/                  # Deutsche Checklisten
│   └── en/                  # Englische Checklisten
├── components/              # React-Komponenten
├── hooks/                   # Custom Hooks
└── utils/                   # Hilfsfunktionen (Geo-Berechnungen)

bridge-server/MSFSBridge/    # C# SimConnect Server
├── Program.cs               # Hauptprogramm mit Auto-Connect
├── SimConnectManager.cs     # SimConnect Integration
├── WebSocketServer.cs       # WebSocket-Server für Flugdaten
├── StaticFileServer.cs      # HTTP-Server für Tablet-Website
└── Models/SimData.cs        # Datenmodell
```

## Lizenz

Dieses Projekt steht unter der **GPL-3.0 Lizenz** - siehe [LICENSE](LICENSE) für Details.

Das bedeutet:
- Du kannst dieses Projekt nutzen, ändern und verbreiten
- Es muss Open Source bleiben
- Die Original-Autoren müssen genannt werden
- Keine Nutzung in Closed-Source kommerziellen Produkten

## Danksagung

- Der MSFS-Community für Feedback und Tests
- Allen Contributors, die neue Flugzeug-Checklisten beisteuern
- [airport-data.com](https://www.airport-data.com/) für die kostenlose Flughafen-API

---

Erstellt mit Liebe für die Flugsim-Community
