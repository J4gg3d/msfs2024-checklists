# MSFS 2024 Checklists

[English](README.md) | [Deutsch](README_DE.md)

Interaktive Checklisten-Webapp für Microsoft Flight Simulator 2024.

## Nutze die App - Kostenlos!

**Öffne einfach [simchecklist.app](https://simchecklist.app) im Browser und leg los!**

Keine Installation nötig. Die Website funktioniert auf jedem Gerät - PC, Tablet oder Handy.

---

## Features

- **Interaktive Checklisten** für Airbus A330-200, Pilatus PC-12 NGX, Boeing 737 MAX 8
- **Zwei Modi**: Normal (vollständige Prozeduren) und Karriere (optimiert für MSFS 2024 Karriere-Modus)
- **Zweisprachig**: Deutsch und Englisch
- **Fortschritt speichern**: Abgehakte Items werden lokal gespeichert
- **Detail-Panel**: Tippe auf ein Item für Erklärungen, Cockpit-Positionen und Bilder
- **Landing-Rating**: Automatische Landebewertung (benötigt SimConnect Bridge)
- **Dunkles Cockpit-Theme**: Augenschonend bei Nachtflügen

---

## Optional: SimConnect Bridge für Live-Daten

Möchtest du Live-Flugdaten aus deinem Simulator sehen? Die **SimConnect Bridge** verbindet MSFS 2024 mit der Website und liefert:

- Echtzeit-Flugdaten (Höhe, Geschwindigkeit, Kurs, Position)
- Automatische Landebewertung mit Sterne-Anzeige
- Live-Status-Indikatoren bei Checklisten-Items
- Tablet-Unterstützung via lokales Netzwerk

### So funktioniert's

```
Dein PC:
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   MSFS 2024     │────►│ SimConnect      │────►│ simchecklist.app│
│   (Simulator)   │     │ Bridge          │     │ (im Browser)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

Die Bridge läuft lokal auf deinem PC, liest Daten aus MSFS und sendet sie an deinen Browser.

---

## Bridge-Installation (Schritt für Schritt)

### Schritt 1: Voraussetzungen installieren

Du brauchst zwei Dinge auf deinem PC:

#### 1.1 MSFS 2024 SDK
Das SDK wird benötigt, damit die Bridge mit dem Simulator kommunizieren kann.

1. Starte **MSFS 2024**
2. Gehe zu **Optionen** → **Allgemein** → **Entwickler**
3. Aktiviere den **Entwicklermodus**
4. Im Entwickler-Menü oben klicke auf **Hilfe** → **SDK-Installer**
5. Führe den Installer aus und installiere das SDK
6. **Wichtig**: Merke dir den Installationspfad (Standard: `C:\MSFS SDK`)

#### 1.2 .NET 8.0 Runtime
Die Bridge ist in C# geschrieben und braucht die .NET Runtime. Diese wird auch vom MSFS 2024 SDK benötigt.

1. Download von [dotnet.microsoft.com/download/dotnet/8.0](https://dotnet.microsoft.com/download/dotnet/8.0)
2. Wähle **.NET Desktop Runtime 8.0** (nicht SDK, außer du willst selbst kompilieren)
3. Lade die **Windows x64** Version herunter und installiere sie

### Schritt 2: Bridge herunterladen

1. Gehe zu [GitHub Releases](https://github.com/J4gg3d/msfs2024-checklists/releases)
2. Lade `MSFSBridge.zip` vom neuesten Release herunter
3. Entpacke in einen beliebigen Ordner (z.B. `C:\MSFSBridge`)

### Schritt 3: Bridge starten

1. **Starte MSFS 2024** zuerst (oder starte es später - die Bridge wartet)
2. Navigiere zum Bridge-Ordner
3. Doppelklicke auf `start-bridge.bat`

Du solltest sehen:
```
╔══════════════════════════════════════════════════════════════╗
║           MSFS Checklist - Bridge Server                     ║
╚══════════════════════════════════════════════════════════════╝

[AUTO] Versuche mit MSFS zu verbinden...
[AUTO] Erfolgreich mit MSFS verbunden!
[SIM] Verbunden: Microsoft Flight Simulator
```

### Schritt 4: Website öffnen

1. Öffne [simchecklist.app](https://simchecklist.app) im Browser
2. Die Website verbindet sich automatisch mit der Bridge auf deinem PC
3. Du solltest einen grünen **"Verbunden"** Status sehen

**Das war's!** Du hast jetzt Live-Flugdaten in deiner Checkliste.

---

## Tablet-Unterstützung

Nutze die Checkliste auf deinem iPad oder Tablet während du am PC fliegst.

### Option A: Tablet im gleichen Netzwerk (Empfohlen)

1. Starte die Bridge auf deinem Gaming-PC
2. Die Bridge zeigt deine lokale IP in der Konsole:
   ```
   ╔══════════════════════════════════════════════════════════════╗
   ║  Öffne diese Adresse auf deinem Tablet:                      ║
   ║     http://192.168.1.100:8081                                ║
   ╚══════════════════════════════════════════════════════════════╝
   ```
3. Öffne diese URL im Tablet-Browser
4. Fertig! Das Tablet empfängt Live-Daten von deinem PC

### Option B: Tablet manuell mit PC-Bridge verbinden

Falls dein Tablet in einem anderen Netzwerk ist, kannst du die IP-Adresse manuell eingeben:

1. Öffne auf dem Tablet [simchecklist.app](https://simchecklist.app)
2. Gehe zu **Menü** → **Tablet-Zugriff**
3. Gib die lokale IP-Adresse deines PCs ein
4. Klicke **Verbinden**

**Voraussetzungen:**
- PC und Tablet müssen im gleichen WLAN sein
- Die Bridge muss auf dem PC laufen

---

## Problemlösung

### Bridge verbindet sich nicht mit MSFS

- Stelle sicher, dass MSFS 2024 läuft (nicht nur der Launcher)
- Prüfe ob das SDK installiert ist (Entwicklermodus → Hilfe → SDK-Installer)
- Die SimConnect.dll muss im gleichen Ordner wie die Bridge sein, oder der SDK-Pfad muss gesetzt sein

### Website zeigt "Nicht verbunden"

- Stelle sicher, dass die Bridge läuft (prüfe das Konsolenfenster)
- Die Bridge muss "Erfolgreich mit MSFS verbunden" zeigen
- Versuche die Website neu zu laden (F5)

### Landing-Rating funktioniert nicht

- Stelle sicher, dass du einen gültigen Flug hast (Start → Fliegen → Landung)
- Sehr kurze Flüge (< 10 Sekunden) oder geringe Höhe (< 100 ft) werden ignoriert
- Die Bridge muss mit MSFS verbunden sein

### Tablet kann sich nicht verbinden

- PC und Tablet müssen im gleichen WLAN sein
- Prüfe deine Firewall-Einstellungen (Port 8080 und 8081 erlauben)
- Stelle sicher, dass du die richtige IP-Adresse verwendest

---

## Für Entwickler

Wenn du beitragen oder eine lokale Entwicklungsversion starten möchtest:

```bash
# Repository klonen
git clone https://github.com/J4gg3d/msfs2024-checklists.git
cd msfs2024-checklists

# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npm run dev
```

Siehe [CONTRIBUTING_DE.md](CONTRIBUTING_DE.md) für Anleitungen zum Hinzufügen neuer Flugzeug-Checklisten.

---

## Verfügbare Flugzeuge

| Flugzeug | Normal-Modus | Karriere-Modus | Sprachen |
|----------|:------------:|:--------------:|:--------:|
| Airbus A330-200 | Ja | Ja | DE, EN |
| Pilatus PC-12 NGX | - | Ja | DE, EN |
| Boeing 737 MAX 8 | - | Ja | DE, EN |

Möchtest du dein Lieblingsflugzeug hinzufügen? [Mitmachen!](CONTRIBUTING_DE.md)

---

## Lizenz

GPL-3.0 Lizenz - Dieses Projekt ist Open Source und kostenlos nutzbar.

---

Erstellt mit Liebe für die Flugsim-Community
