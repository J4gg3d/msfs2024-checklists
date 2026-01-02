# MSFS 2024 Checklists

[English](README.md) | [Deutsch](README_DE.md)

Interactive checklist web app for Microsoft Flight Simulator 2024.

## Use the App - It's Free!

**Just open [simchecklist.app](https://simchecklist.app) in your browser and start flying!**

No installation required. The website works on any device - PC, tablet, or phone.

---

## Features

- **Interactive Checklists** for Airbus A330-200, Pilatus PC-12 NGX, Boeing 737 MAX 8
- **Two Modes**: Normal (full procedures) and Career (optimized for MSFS 2024 Career Mode)
- **Bilingual**: German and English
- **Progress Saving**: Your checked items are saved locally
- **Detail Panel**: Tap any item for explanations, cockpit locations, and images
- **Landing Rating**: Automatic landing quality assessment (requires SimConnect Bridge)
- **Dark Cockpit Theme**: Easy on the eyes during night flights

---

## Optional: SimConnect Bridge for Live Data

Want to see live flight data from your simulator? The **SimConnect Bridge** connects MSFS 2024 with the website and provides:

- Real-time flight data (altitude, speed, heading, position)
- Automatic landing quality rating with star display
- Live system status indicators on checklist items
- Tablet support via local network

### How It Works

```
Your PC:
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   MSFS 2024     │────►│ SimConnect      │────►│ simchecklist.app│
│   (Simulator)   │     │ Bridge          │     │ (in Browser)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

The Bridge runs locally on your PC, reads data from MSFS, and sends it to your browser.

---

## Bridge Installation (Step by Step)

### Step 1: Install Prerequisites

You need two things installed on your PC:

#### 1.1 MSFS 2024 SDK
The SDK is required for the Bridge to communicate with the simulator.

1. Start **MSFS 2024**
2. Go to **Options** → **General** → **Developers**
3. Enable **Developer Mode**
4. In the Developer menu at the top, click **Help** → **SDK Installer**
5. Run the installer and install the SDK
6. **Important**: Note the installation path (default: `C:\MSFS SDK`)

#### 1.2 .NET 8.0 Runtime
The Bridge is written in C# and needs the .NET runtime. This is also required by the MSFS 2024 SDK.

1. Download from [dotnet.microsoft.com/download/dotnet/8.0](https://dotnet.microsoft.com/download/dotnet/8.0)
2. Choose **.NET Desktop Runtime 8.0** (not SDK, unless you want to compile yourself)
3. Download and install the **Windows x64** version

### Step 2: Download the Bridge

You have two options:

#### Option A: Download ZIP (Easiest)
1. Go to [github.com/J4gg3d/msfs2024-checklists/releases](https://github.com/J4gg3d/msfs2024-checklists/releases)
2. Download the latest `MSFSBridge.zip`
3. Extract to any folder (e.g., `C:\MSFSBridge`)

#### Option B: Clone Repository (For Developers)
```bash
git clone https://github.com/J4gg3d/msfs2024-checklists.git
cd msfs2024-checklists/bridge-server/MSFSBridge
dotnet build
```

### Step 3: Start the Bridge

1. **Start MSFS 2024** first (or start it later - the Bridge will wait)
2. Navigate to the Bridge folder
3. Double-click `MSFSBridge.exe` (or run `dotnet run` if you cloned the repo)

You should see:
```
╔══════════════════════════════════════════════════════════════╗
║           MSFS Checklist - Bridge Server                     ║
╚══════════════════════════════════════════════════════════════╝

[AUTO] Trying to connect to MSFS...
[AUTO] Successfully connected to MSFS!
[SIM] Connected: Microsoft Flight Simulator
```

### Step 4: Open the Website

1. Open [simchecklist.app](https://simchecklist.app) in your browser
2. The website automatically connects to the Bridge on your PC
3. You should see a green **"Connected"** status

**That's it!** You now have live flight data in your checklist.

---

## Tablet Support

Use the checklist on your iPad or tablet while flying on your PC.

### Option A: Tablet in Same Network (Recommended)

1. Start the Bridge on your gaming PC
2. The Bridge shows your local IP in the console:
   ```
   ╔══════════════════════════════════════════════════════════════╗
   ║  Open this address on your tablet:                           ║
   ║     http://192.168.1.100:8081                                ║
   ╚══════════════════════════════════════════════════════════════╝
   ```
3. Open this URL on your tablet browser
4. Done! The tablet receives live data from your PC

### Option B: Connect Tablet to PC Bridge

If your tablet is on a different network, you can enter the PC's IP address manually:

1. On the tablet, open [simchecklist.app](https://simchecklist.app)
2. Go to **Menu** → **Tablet Access**
3. Enter your PC's local IP address
4. Click **Connect**

**Requirements:**
- PC and tablet must be on the same WiFi network
- The Bridge must be running on the PC

---

## Troubleshooting

### Bridge doesn't connect to MSFS

- Make sure MSFS 2024 is running (not just the launcher)
- Check if the SDK is installed (Developer Mode → Help → SDK Installer)
- The SimConnect.dll must be in the same folder as the Bridge, or the SDK path must be set

### Website shows "Not Connected"

- Make sure the Bridge is running (check the console window)
- The Bridge must show "Successfully connected to MSFS"
- Try refreshing the website (F5)

### Landing Rating doesn't work

- Make sure you have a valid flight (takeoff → fly → landing)
- Very short flights (< 10 seconds) or low altitude (< 100 ft) are ignored
- The Bridge must be connected to MSFS

### Tablet can't connect

- PC and tablet must be on the same WiFi network
- Check your firewall settings (allow port 8080 and 8081)
- Make sure you're using the correct IP address

---

## For Developers

If you want to contribute or run a local development version:

```bash
# Clone repository
git clone https://github.com/J4gg3d/msfs2024-checklists.git
cd msfs2024-checklists

# Install dependencies
npm install

# Start development server
npm run dev
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on adding new aircraft checklists.

---

## Available Aircraft

| Aircraft | Normal Mode | Career Mode | Languages |
|----------|:-----------:|:-----------:|:---------:|
| Airbus A330-200 | Yes | Yes | DE, EN |
| Pilatus PC-12 NGX | - | Yes | DE, EN |
| Boeing 737 MAX 8 | - | Yes | DE, EN |

Want to add your favorite aircraft? [Contribute!](CONTRIBUTING.md)

---

## License

GPL-3.0 License - This project is open source and free to use.

---

Made with love for the flight sim community
