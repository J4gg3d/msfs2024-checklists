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
│   ├── DetailPanel.jsx     # Seitenpanel mit Item-Details
│   ├── DetailPanel.css
│   ├── SimStatus.jsx       # SimConnect Verbindungsstatus
│   └── SimStatus.css
├── hooks/
│   └── useSimConnect.js    # WebSocket-Hook für SimConnect Bridge
├── data/
│   ├── a330-checklist.json      # Normal-Modus Checkliste
│   └── a330-career-checklist.json # Karriere-Modus Checkliste
└── main.jsx                # Entry Point

public/
└── images/                 # Bilder für Detail-Panel

SimConnectBridge/           # C# SimConnect Server (optional)
├── Program.cs
├── SimConnectBridge.csproj
└── bin/                    # Kompilierte Bridge
```

## Wichtige Befehle
```bash
# Entwicklung starten
npm run dev

# Produktions-Build
npm run build

# Bridge kompilieren (optional)
cd SimConnectBridge
dotnet build
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
```

## SimConnect Bridge
Die Bridge läuft als separater C# Prozess und kommuniziert über WebSocket (Port 8765).
- Sendet Flugdaten (Altitude, Speed, Position)
- Erkennt Pause-Status via SimConnect Events
- Demo-Modus wenn MSFS nicht läuft

## Hinweise für Entwicklung
- Sprache in UI/Daten: Deutsch
- Monospace-Font für Cockpit-Ästhetik
- Dunkles Theme (Cockpit-Style)
- Bilder in `public/images/` ablegen
- LocalStorage für Persistenz (kein Cookie-Banner nötig)
