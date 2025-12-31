# MSFS Checklist - Projektübersicht

## Beschreibung
Interaktive Checklisten-Webapp für Microsoft Flight Simulator 2024.

**Live-Website**: https://simchecklist.app

**Unterstützte Flugzeuge**:
- Airbus A330-200 (Normal + Karriere)
- Pilatus PC-12 NGX (Karriere)

**Modi**:
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
│   ├── LandingRating.jsx   # Landing-Rating Modal + Panel
│   ├── LandingRating.css
│   ├── SimStatus.jsx       # SimConnect Verbindungsstatus
│   └── SimStatus.css
├── hooks/
│   ├── useSimConnect.js    # WebSocket-Hook für SimConnect Bridge
│   └── useChecklist.js     # Checklist-Loader mit Flugzeug-Registry
├── utils/
│   └── geoUtils.js         # Flughafen-Koordinaten & Distanzberechnung
├── data/
│   ├── de/                 # Deutsche Checklisten
│   │   ├── a330-normal.json
│   │   ├── a330-career.json
│   │   └── pc12-career.json
│   └── en/                 # Englische Checklisten
│       ├── a330-normal.json
│       ├── a330-career.json
│       └── pc12-career.json
└── main.jsx                # Entry Point

public/
├── favicon.svg             # Turbinen-Icon
└── images/                 # Bilder für Detail-Panel (pro Flugzeug)

bridge-server/MSFSBridge/   # C# SimConnect Server (optional)
├── Program.cs              # Hauptprogramm mit Auto-Connect
├── MSFSBridge.csproj
├── WebSocketServer.cs      # WebSocket-Server (Port 8080)
├── StaticFileServer.cs     # HTTP-Server für Tablets (Port 8081)
├── SimConnectManager.cs    # SimConnect Integration + Landing Detection
└── Models/
    ├── SimData.cs          # Flugdaten-Modell
    └── LandingInfo.cs      # Landing-Rating Datenmodell
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
- **WebSocket-Server**: Port 8080 für Flugdaten
- **HTTP-Server**: Port 8081 serviert Website für Tablets
- **Route-Sync**: Synchronisiert Flugroute zwischen PC und Tablet
- **Airport-API**: Lädt Flughafen-Koordinaten (umgeht CORS)
- **Landing-Rating**: Automatische Erkennung und Bewertung von Landungen
- **IP-Anzeige**: Zeigt Tablet-URL in der Konsole
- **Demo-Modus**: Simulierte Daten wenn MSFS nicht läuft

### Übertragene Daten
- Flugdaten: Altitude, Ground Speed, Heading, Latitude, Longitude, Vertical Speed, G-Force
- ATC-Daten: Callsign, Airline, Flugnummer
- GPS-Daten: Flugplan, Waypoints, ETE, Zielflughafen
- Flugzeugstatus: On Ground, Engines Running, Gear, Flaps
- Systeme: Lichter, Elektrik, APU, Anti-Ice, Transponder
- Landing-Events: Automatische Erkennung mit Rating (1-5 Sterne)

### WebSocket-Nachrichten (Client → Bridge)
```json
{ "type": "route", "data": { "origin": "EDDF", "destination": "KJFK" } }
{ "type": "getAirport", "data": "EDDF" }
{ "type": "ping" }
```

### WebSocket-Nachrichten (Bridge → Client)
```json
{ "type": "route", "route": { "origin": "EDDF", "destination": "KJFK" } }
{ "type": "airportCoords", "icao": "EDDF", "coords": { "lat": 50.0379, "lon": 8.5622 } }
{ "type": "landing", "landing": { "verticalSpeed": -150, "gForce": 1.2, "rating": "Good", "ratingScore": 4 } }
{ "type": "pong" }
// SimData wird direkt als JSON gesendet (ohne type-Wrapper)
```

### Landing-Rating System
Die Bridge erkennt automatisch Landungen (Übergang von Luft zu Boden) und bewertet sie:

| Rating | Vertical Speed | Score |
|--------|----------------|-------|
| Perfect | < 100 ft/min | 5/5 ★★★★★ |
| Good | 100-200 ft/min | 4/5 ★★★★☆ |
| Acceptable | 200-300 ft/min | 3/5 ★★★☆☆ |
| Hard | 300-500 ft/min | 2/5 ★★☆☆☆ |
| Very Hard | > 500 ft/min | 1/5 ★☆☆☆☆ |

### Start
```bash
cd bridge-server/MSFSBridge
dotnet build
dotnet run
# Oder: start-bridge.bat doppelklicken
```

### Nach Frontend-Build: Dist-Dateien kopieren
```bash
# Windows PowerShell
cp -r dist/* bridge-server/MSFSBridge/bin/Debug/net8.0/www/

# Oder manuell: dist/ Inhalt nach www/ kopieren
```

## Tablet-Zugriff (Lokales Netzwerk)

Ermöglicht Zugriff auf die Checklist und Flugdaten von Tablets/iPads im gleichen WLAN.

### Option A: Desktop-PC mit simchecklist.app
1. Öffne https://simchecklist.app im Browser
2. Starte die Bridge auf dem PC
3. Website verbindet sich automatisch zu `ws://127.0.0.1:8080`
4. Funktioniert in Chrome/Firefox (Localhost-Loopback-Ausnahme)

### Option B: Tablet via Bridge
1. Bridge auf dem Gaming-PC starten
2. URL aus der Bridge-Konsole notieren (z.B. `http://192.168.1.100:8081`)
3. URL im Tablet-Browser öffnen
4. Bridge liefert Website + WebSocket-Daten

### Route-Synchronisation
- Route wird automatisch zwischen PC und Tablet synchronisiert
- Auf dem PC eingegebene Route erscheint sofort auf dem Tablet
- Neue Clients erhalten beim Verbinden die aktuelle Route
- Funktioniert bidirektional (PC↔Tablet)

### Architektur
```
Desktop-PC:
  simchecklist.app (HTTPS) ──► ws://127.0.0.1:8080 ──► Bridge

Tablet:
  http://[PC-IP]:8081 ◄──── Bridge serviert Website + WebSocket

Route-Sync:
  PC sendet Route ──► Bridge speichert ──► Broadcast an alle Clients
```

## Flugrouten-Tracking

Die App berechnet automatisch die geflogene Distanz basierend auf GPS-Position.

### Features
- **GPS-basiert**: Distanz wird aus aktueller Position zum Startflughafen berechnet
- **Weltweite Flughäfen**: Unbekannte ICAO-Codes werden automatisch nachgeschlagen
- **Caching**: Einmal geladene Flughäfen werden im LocalStorage gespeichert
- **Bridge-Restart sicher**: Distanz wird korrekt aus Position rekonstruiert
- **Route-Sync**: Route wird zwischen PC und Tablet synchronisiert

### Flughafen-API
- Verwendet: `airport-data.com` (kostenlos, kein API-Key nötig)
- ~100 Flughäfen in statischer Datenbank (`geoUtils.js`)
- Unbekannte Flughäfen werden über Bridge geladen (umgeht CORS)
- Fallback: Direkte API-Anfrage (nur lokal, nicht auf HTTPS)

## Neues Flugzeug hinzufügen

1. Checklisten-JSON erstellen in `src/data/de/` und `src/data/en/`
2. Bilder in `public/images/` ablegen (Prefix: `flugzeug_`)
3. In `src/hooks/useChecklist.js`:
   - Import hinzufügen
   - In `checklists` Registry eintragen
   - In `availableAircraft` Array hinzufügen

## Hinweise für Entwicklung
- Sprache in UI/Daten: Deutsch (mit i18n für Englisch)
- Monospace-Font für Cockpit-Ästhetik
- Dunkles Theme (Cockpit-Style)
- Bilder in `public/images/` ablegen (Prefix: `flugzeug_`)
- LocalStorage für Persistenz (kein Cookie-Banner nötig)
- READMEs und CLAUDE.md bei größeren Änderungen aktualisieren
