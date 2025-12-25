# Mitmachen bei MSFS 2024 Checklists

Danke für dein Interesse am Projekt! Dieses Projekt lebt von Community-Beiträgen, besonders von neuen Flugzeug-Checklisten.

## Möglichkeiten mitzuwirken

- **Neue Flugzeug-Checklisten hinzufügen** (am meisten gesucht!)
- Fehler beheben oder bestehende Checklisten verbessern
- Übersetzungen hinzufügen
- Dokumentation verbessern
- Issues melden

## Erste Schritte

### 1. Fork & Clone

```bash
# Repository auf GitHub forken, dann:
git clone https://github.com/DEIN-USERNAME/msfs2024-checklists.git
cd msfs2024-checklists
npm install
npm run dev
```

### 2. Branch erstellen

```bash
git checkout -b feature/add-boeing-737
```

### 3. Änderungen vornehmen

Siehe die Abschnitte unten für spezifische Richtlinien.

### 4. Lokal testen

```bash
npm run dev
# Öffne http://localhost:5173 und teste deine Änderungen
```

### 5. Pull Request erstellen

Pushe deinen Branch und erstelle einen Pull Request auf GitHub.

---

## Neue Flugzeug-Checkliste hinzufügen

Dies ist der häufigste Beitrag. Folge diesen Schritten:

### Schritt 1: Checklisten-Dateien erstellen

Erstelle JSON-Dateien für beide Sprachen und Modi:

```
src/data/
├── de/
│   ├── DEIN-FLUGZEUG-normal.json
│   └── DEIN-FLUGZEUG-career.json
└── en/
    ├── DEIN-FLUGZEUG-normal.json
    └── DEIN-FLUGZEUG-career.json
```

**Namenskonvention**: Kleinbuchstaben mit Bindestrichen, z.B. `boeing-737`, `cessna-172`, `airbus-a320`.

### Schritt 2: Checklisten-Datenstruktur

Jede Checklisten-Datei folgt dieser Struktur:

```json
{
  "aircraft": "Flugzeug-Anzeigename",
  "mode": "normal",
  "version": "1.0",
  "author": "Dein GitHub Username",
  "sections": [
    {
      "id": "section-id",
      "title": "SEKTIONSNAME",
      "color": "#hex-farbe",
      "items": [
        {
          "id": "eindeutige-item-id",
          "item": "ITEM NAME",
          "action": "AKTION",
          "details": {
            "description": "Was zu tun ist und warum",
            "location": "Wo im Cockpit",
            "image": "/images/optionales-bild.png"
          }
        }
      ]
    }
  ]
}
```

### Schritt 3: Flugzeug registrieren

Bearbeite `src/hooks/useChecklist.js`:

```javascript
// Imports oben hinzufügen
import deDeinFlugzeugNormal from '../data/de/dein-flugzeug-normal.json'
import deDeinFlugzeugCareer from '../data/de/dein-flugzeug-career.json'
import enDeinFlugzeugNormal from '../data/en/dein-flugzeug-normal.json'
import enDeinFlugzeugCareer from '../data/en/dein-flugzeug-career.json'

// Zum checklists Objekt hinzufügen
const checklists = {
  de: {
    'a330-normal': deA330Normal,
    'a330-career': deA330Career,
    'dein-flugzeug-normal': deDeinFlugzeugNormal,  // Hinzufügen
    'dein-flugzeug-career': deDeinFlugzeugCareer   // Hinzufügen
  },
  en: {
    'a330-normal': enA330Normal,
    'a330-career': enA330Career,
    'dein-flugzeug-normal': enDeinFlugzeugNormal,  // Hinzufügen
    'dein-flugzeug-career': enDeinFlugzeugCareer   // Hinzufügen
  }
}

// Zum availableAircraft Array hinzufügen
export const availableAircraft = [
  { id: 'a330', name: 'Airbus A330-200', hasNormal: true, hasCareer: true },
  { id: 'dein-flugzeug', name: 'Dein Flugzeugname', hasNormal: true, hasCareer: true }  // Hinzufügen
]
```

### Schritt 4: Bilder hinzufügen (Optional)

Platziere Cockpit-Bilder in `public/images/`. Verwende beschreibende Namen:
- `boeing737-autopilot.png`
- `boeing737-flaps-hebel.png`

---

## Konventionen

### Item-IDs

Verwende ein Präfix basierend auf der Sektion:

| Sektion | Präfix | Beispiel |
|---------|--------|----------|
| Before Start | `bs-` | `bs-parking-brake` |
| Pushback | `pb-` | `pb-engine-start` |
| Taxi | `tx-` | `tx-flaps-set` |
| Before Takeoff | `bt-` | `bt-flight-controls` |
| Takeoff | `to-` | `to-thrust-set` |
| Climb | `cl-` | `cl-autopilot` |
| Cruise | `cr-` | `cr-fuel-check` |
| Descent | `ds-` | `ds-approach-brief` |
| Approach | `ap-` | `ap-landing-gear` |
| Landing | `ld-` | `ld-reversers` |
| After Landing | `al-` | `al-flaps-up` |
| Shutdown | `sd-` | `sd-engines-off` |

### Aktionen

Verwende konsistente Aktionsbegriffe:

| Aktion | Verwendung |
|--------|------------|
| `ON` / `OFF` | Schalter |
| `SET` | Werte einstellen |
| `CHECK` | Status prüfen |
| `AS RQRD` | Nach Bedarf |
| `BESTÄTIGEN` | Verbale Bestätigung |
| `ANFORDERN` | ATC-Kommunikation |
| `COMPLETE` | Checkliste/Prozedur abgeschlossen |

### Sektionsfarben

Empfohlene Farbpalette für visuelle Konsistenz:

| Phase | Farbe | Hex |
|-------|-------|-----|
| Before Start | Medium Slate Blue | `#7b68ee` |
| Pushback | Medium Purple | `#9370db` |
| Taxi | Light Sea Green | `#20b2aa` |
| Before Takeoff | Lime Green | `#32cd32` |
| Takeoff | Light Green | `#00e676` |
| Cruise | Light Blue | `#4fc3f7` |
| Approach | Orange | `#ffa726` |
| After Landing | Light Red | `#ef5350` |
| Shutdown | Blue Grey | `#78909c` |

---

## Übersetzungsrichtlinien

Beim Hinzufügen von Übersetzungen:

1. Übersetze ALLE Texte in den Checklisten-Dateien
2. Halte technische Begriffe konsistent (z.B. "Autopilot" bleibt "Autopilot")
3. Verwende korrekte Luftfahrt-Terminologie für jede Sprache
4. Teste beide Sprachversionen

---

## Normal-Modus vs Karriere-Modus

- **Normal-Modus**: Vollständige, realistische Prozeduren für komplette Flugsimulation
- **Karriere-Modus**: Optimiert für MSFS 2024 Karriere-Modus
  - Überspringe Items die automatisch vom Sim gehandhabt werden
  - Fokus auf das was der Pilot wirklich tun muss
  - Kürzer, praktischer

---

## Code-Style

- 2-Leerzeichen Einrückung
- Einfache Anführungszeichen für Strings in JavaScript
- Aussagekräftige Variablennamen
- Komponenten klein und fokussiert halten

---

## Fragen?

Öffne ein Issue auf GitHub wenn du Fragen hast oder Hilfe bei deinem Beitrag brauchst.

Danke, dass du MSFS 2024 Checklists besser machst!
