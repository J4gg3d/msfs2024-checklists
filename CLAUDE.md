# MSFS Checklist - Projektübersicht

## Beschreibung
Interaktive Checklisten-Webapp für Microsoft Flight Simulator 2024. Fokus auf Airbus A330-200 mit zwei Modi:
- **Normal-Modus**: Vollständige Checkliste für alle Flugphasen
- **Karriere-Modus**: Optimiert für MSFS 2024 Career Mode

## Technologie-Stack
- **Frontend**: React 18 + Vite
- **Styling**: Plain CSS (kein Framework)
- **Daten**: JSON-Dateien für Checklisten
- **Persistenz**: LocalStorage für Fortschritt
- **Bridge** (optional): C# SimConnect Server für Live-Daten
- **Tablet-Zugriff**: Lokales Netzwerk via IP-Adresse

## Projektstruktur
```
src/
├── App.jsx                 # Hauptkomponente, State-Management, Menü
├── App.css                 # Globale Styles, Modal-Styles, Menü-Styles
├── components/
│   ├── Checklist.jsx       # Container für Sektionen, Header, Modus-Toggle
│   ├── Checklist.css
│   ├── ChecklistSection.jsx # Einzelne Sektion (z.B. "BEFORE START")
│   ├── ChecklistSection.css
│   ├── ChecklistItem.jsx   # Einzelner Checkpunkt mit Checkbox
│   ├── ChecklistItem.css
│   ├── FlightInfo.jsx      # Fluginformationen (Route, Distanz, ETE)
│   ├── FlightInfo.css
│   ├── DetailPanel.jsx     # Seitenpanel mit Item-Details
│   ├── DetailPanel.css
│   ├── SimStatus.jsx       # SimConnect Verbindungsstatus
│   └── SimStatus.css
├── hooks/
│   └── useSimConnect.js    # WebSocket-Hook für SimConnect Bridge
├── utils/
│   └── geoUtils.js         # Flughafen-Koordinaten & Distanzberechnung
├── data/
│   ├── a330-checklist.json      # Normal-Modus Checkliste
│   └── a330-career-checklist.json # Karriere-Modus Checkliste
└── main.jsx                # Entry Point

public/
└── images/                 # Bilder für Detail-Panel

bridge-server/MSFSBridge/   # C# SimConnect Server (optional)
├── Program.cs              # Hauptprogramm mit Auto-Connect
├── MSFSBridge.csproj
├── WebSocketServer.cs      # Lokaler WebSocket-Server
├── SimConnectManager.cs    # SimConnect Integration
└── Models/SimData.cs       # Datenmodell
```

## Wichtige Befehle
```bash
# Entwicklung starten
npm run dev

# Produktions-Build
npm run build

# Bridge kompilieren (optional)
cd bridge-server/MSFSBridge
dotnet build
dotnet run
```

## Checklisten-Datenstruktur
```json
{
  "aircraft": "Airbus A330-200",
  "mode": "career",
  "sections": [
    {
      "id": "section-id",
      "title": "SECTION NAME",
      "color": "#hex-color",
      "items": [
        {
          "id": "item-id",
          "item": "ITEM NAME",
          "action": "ACTION",
          "details": {
            "description": "Erklärung was zu tun ist",
            "location": "Wo im Cockpit",
            "image": "/images/filename.png"
          }
        }
      ]
    }
  ]
}
```

## Konventionen

### Item-IDs
- Prefix basierend auf Sektion: `bs-` (Before Start), `pb-` (Pushback), `tx-` (Taxi), etc.
- Beispiel: `bs-parking-brake`, `pb-engine-start`

### Actions
- Standard: `ON`, `OFF`, `SET`, `CHECK`
- Bedingt: `AS RQRD` (As Required)
- Bestätigungen: `ANFORDERN`, `BESTÄTIGEN`

### Farben (Sektionen)
- Before Start: `#7b68ee`
- Pushback: `#9370db`
- Taxi: `#20b2aa`
- Before Takeoff: `#32cd32`
- Take Off: `#00e676`
- Cruise: `#4fc3f7`
- Approach: `#ffa726`
- After Landing: `#ef5350`
- Shutdown: `#78909c`

## LocalStorage Keys
```
msfs-checklist-mode           # "normal" | "career"
msfs-checklist-checked-normal  # Array von Item-IDs
msfs-checklist-checked-career  # Array von Item-IDs
msfs-checklist-collapsed-*     # Eingeklappte Sektionen
msfs-checklist-bridge-ip       # IP-Adresse für Tablet-Verbindung
msfs-checklist-airport-cache   # Gecachte Flughafen-Koordinaten (von API)
```

## SimConnect Bridge

Die Bridge läuft als separater C# Prozess und kommuniziert über WebSocket (Port 8080).

### Features
- **Auto-Connect**: Verbindet sich automatisch mit MSFS beim Start
- **Auto-Retry**: Versucht alle 5 Sekunden erneut zu verbinden wenn MSFS nicht läuft
- **IP-Anzeige**: Zeigt lokale IP-Adresse für Tablet-Zugriff
- **Demo-Modus**: Simulierte Daten wenn MSFS nicht läuft

### Übertragene Daten
- Flugdaten: Altitude, Ground Speed, Heading, Latitude, Longitude
- ATC-Daten: Callsign, Airline, Flugnummer
- Flugzeugstatus: On Ground, Engines Running, Gear, Flaps
- Systeme: Lichter, Elektrik, APU, Anti-Ice, Transponder

### Start
```bash
cd bridge-server/MSFSBridge
dotnet run
# Oder: start-bridge.bat doppelklicken
```

## Tablet-Zugriff (Lokales Netzwerk)

Ermöglicht Zugriff auf die Checklist und Flugdaten von Tablets/iPads im gleichen WLAN.

### Nutzung
1. Bridge auf dem Gaming-PC starten
2. IP-Adresse aus der Bridge-Konsole notieren (z.B. `192.168.1.100`)
3. Auf dem Tablet: Webseite öffnen → Menü → Tablet
4. IP-Adresse eingeben und verbinden

### Architektur
```
┌─────────────────┐     WebSocket (Port 8080)     ┌───────────────┐
│ Gaming-PC       │◀─────────────────────────────▶│ iPad/Tablet   │
│ MSFS + Bridge   │        Lokales WLAN           │ Browser       │
└─────────────────┘                               └───────────────┘
```

## Flugrouten-Tracking

Die App berechnet automatisch die geflogene Distanz basierend auf GPS-Position.

### Features
- **GPS-basiert**: Distanz wird aus aktueller Position zum Startflughafen berechnet
- **Weltweite Flughäfen**: Unbekannte ICAO-Codes werden automatisch via API nachgeschlagen
- **Caching**: Einmal geladene Flughäfen werden im LocalStorage gespeichert
- **Bridge-Restart sicher**: Distanz wird korrekt aus Position rekonstruiert

### Flughafen-API
- Verwendet: `airport-data.com` (kostenlos, kein API-Key nötig)
- ~80 Flughäfen in statischer Datenbank (schneller Zugriff)
- Alle anderen Flughäfen werden on-demand geladen

## Hinweise für Entwicklung
- Sprache in UI/Daten: Deutsch (mit i18n für Englisch)
- Monospace-Font für Cockpit-Ästhetik
- Dunkles Theme (Cockpit-Style)
- Bilder in `public/images/` ablegen
- LocalStorage für Persistenz (kein Cookie-Banner nötig)
