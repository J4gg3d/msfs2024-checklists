# MSFS 2024 Checklists

[🇬🇧 English](README.md) | 🇩🇪 Deutsch

Interaktive Checklisten-Webapp für Microsoft Flight Simulator 2024. Aktuell mit **Airbus A330-200** - weitere Flugzeuge folgen durch Community-Beiträge.

## Features

- **Zwei Modi**: Normal-Modus (vollständige Prozeduren) und Karriere-Modus (optimiert für MSFS 2024 Karriere)
- **Zweisprachig**: Vollständige Unterstützung für Deutsch und Englisch (UI + Checklisten)
- **Fortschrittsspeicherung**: Abgehakte Items werden lokal gespeichert
- **Detail-Panel**: Tippe auf ein Item für Beschreibung, Cockpit-Position und Bilder
- **Einklappbare Sektionen**: Organisiere deinen Workflow nach Flugphasen
- **Dunkles Cockpit-Theme**: Augenschonend bei Nachtflügen
- **SimConnect Bridge** (optional): Live-Flugdaten aus dem Simulator
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

Die SimConnect Bridge liefert Live-Flugdaten aus dem Simulator. Erfordert das MSFS 2024 SDK.

```bash
cd SimConnectBridge
dotnet build
dotnet run
```

Die Bridge läuft auf WebSocket-Port 8765 und verbindet sich automatisch mit der Web-App.

## Verfügbare Flugzeuge

| Flugzeug | Normal-Modus | Karriere-Modus | Sprachen | Beigetragen von |
|----------|:------------:|:--------------:|:--------:|-----------------|
| Airbus A330-200 | ✅ | ✅ | DE, EN | [@J4gg3d](https://github.com/J4gg3d) |
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
└── hooks/                   # Custom Hooks
```

## Lizenz

Dieses Projekt steht unter der **GPL-3.0 Lizenz** - siehe [LICENSE](LICENSE) für Details.

Das bedeutet:
- ✅ Du kannst dieses Projekt nutzen, ändern und verbreiten
- ✅ Es muss Open Source bleiben
- ✅ Die Original-Autoren müssen genannt werden
- ❌ Keine Nutzung in Closed-Source kommerziellen Produkten

## Danksagung

- Der MSFS-Community für Feedback und Tests
- Allen Contributors, die neue Flugzeug-Checklisten beisteuern

---

Erstellt mit ✈️ für die Flugsim-Community
