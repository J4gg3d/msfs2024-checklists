# MSFS 2024 Checklists

[English](README.md) | [Deutsch](README_DE.md)

Interaktive Checklisten-Webapp für Microsoft Flight Simulator 2024. Aktuell mit **Airbus A330-200** - weitere Flugzeuge folgen durch Community-Beiträge.

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
- ATC-Daten: Callsign, Airline, Flugnummer
- Flugzeugsysteme: Lichter, Elektrik, APU, Anti-Ice, etc.

Erfordert das MSFS 2024 SDK.

```bash
cd bridge-server/MSFSBridge
dotnet build
dotnet run
```

Die Bridge:
- Läuft auf WebSocket-Port 8080
- Verbindet sich automatisch mit MSFS beim Start
- Zeigt deine lokale IP-Adresse für Tablet-Verbindungen
- Versucht alle 5 Sekunden erneut zu verbinden wenn MSFS nicht läuft

## Tablet-Unterstützung (Lokales Netzwerk)

Nutze die Checkliste auf deinem iPad oder Tablet mit Live-Flugdaten von deinem Gaming-PC.

### So funktioniert's

1. Bridge auf dem Gaming-PC starten
2. IP-Adresse aus der Bridge-Konsole notieren (z.B. `192.168.1.100`)
3. Auf dem Tablet: Webseite öffnen → Menü → Tablet
4. IP-Adresse eingeben und verbinden
5. Fertig! Flugdaten werden in Echtzeit synchronisiert

### Voraussetzungen
- PC und Tablet müssen im gleichen WLAN sein
- Bridge muss auf dem PC laufen

### Architektur

```
+------------------+     WebSocket (Port 8080)     +---------------+
|  Gaming-PC       |<----------------------------->|  iPad/Tablet  |
|  MSFS + Bridge   |        Lokales WLAN           |  Browser      |
+------------------+                               +---------------+
```

## Flugrouten-Tracking

Die App verfolgt automatisch deinen Flugfortschritt:

- **GPS-basiert**: Distanz wird aus aktueller Position zum Startflughafen berechnet
- **Weltweite Flughäfen**: Unbekannte ICAO-Codes werden automatisch via API nachgeschlagen
- **Caching**: Flughäfen werden lokal gecacht für schnelleren Zugriff
- **Bridge-Neustart sicher**: Distanz wird korrekt aus GPS-Position rekonstruiert

## Verfügbare Flugzeuge

| Flugzeug | Normal-Modus | Karriere-Modus | Sprachen | Beigetragen von |
|----------|:------------:|:--------------:|:--------:|-----------------|
| Airbus A330-200 | Ja | Ja | DE, EN | [@J4gg3d](https://github.com/J4gg3d) |
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
