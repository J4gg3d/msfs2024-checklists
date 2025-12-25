# Contributing to MSFS 2024 Checklists

Thank you for your interest in contributing! This project thrives on community contributions, especially new aircraft checklists.

## Ways to Contribute

- **Add new aircraft checklists** (most wanted!)
- Fix bugs or improve existing checklists
- Add translations
- Improve documentation
- Report issues

## Getting Started

### 1. Fork & Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR-USERNAME/msfs2024-checklists.git
cd msfs2024-checklists
npm install
npm run dev
```

### 2. Create a Branch

```bash
git checkout -b feature/add-boeing-737
```

### 3. Make Your Changes

See the sections below for specific guidelines.

### 4. Test Locally

```bash
npm run dev
# Open http://localhost:5173 and test your changes
```

### 5. Submit a Pull Request

Push your branch and create a Pull Request on GitHub.

---

## Adding a New Aircraft Checklist

This is the most common contribution. Follow these steps:

### Step 1: Create Checklist Files

Create JSON files for both languages and modes:

```
src/data/
├── de/
│   ├── YOUR-AIRCRAFT-normal.json
│   └── YOUR-AIRCRAFT-career.json
└── en/
    ├── YOUR-AIRCRAFT-normal.json
    └── YOUR-AIRCRAFT-career.json
```

**Naming convention**: Use lowercase with hyphens, e.g., `boeing-737`, `cessna-172`, `airbus-a320`.

### Step 2: Checklist Data Structure

Each checklist file follows this structure:

```json
{
  "aircraft": "Aircraft Display Name",
  "mode": "normal",
  "version": "1.0",
  "author": "Your GitHub Username",
  "sections": [
    {
      "id": "section-id",
      "title": "SECTION NAME",
      "color": "#hex-color",
      "items": [
        {
          "id": "unique-item-id",
          "item": "ITEM NAME",
          "action": "ACTION",
          "details": {
            "description": "What to do and why",
            "location": "Where in the cockpit",
            "image": "/images/optional-image.png"
          }
        }
      ]
    }
  ]
}
```

### Step 3: Register the Aircraft

Edit `src/hooks/useChecklist.js`:

```javascript
// Add imports at the top
import deYourAircraftNormal from '../data/de/your-aircraft-normal.json'
import deYourAircraftCareer from '../data/de/your-aircraft-career.json'
import enYourAircraftNormal from '../data/en/your-aircraft-normal.json'
import enYourAircraftCareer from '../data/en/your-aircraft-career.json'

// Add to checklists object
const checklists = {
  de: {
    'a330-normal': deA330Normal,
    'a330-career': deA330Career,
    'your-aircraft-normal': deYourAircraftNormal,  // Add this
    'your-aircraft-career': deYourAircraftCareer   // Add this
  },
  en: {
    'a330-normal': enA330Normal,
    'a330-career': enA330Career,
    'your-aircraft-normal': enYourAircraftNormal,  // Add this
    'your-aircraft-career': enYourAircraftCareer   // Add this
  }
}

// Add to availableAircraft array
export const availableAircraft = [
  { id: 'a330', name: 'Airbus A330-200', hasNormal: true, hasCareer: true },
  { id: 'your-aircraft', name: 'Your Aircraft Name', hasNormal: true, hasCareer: true }  // Add this
]
```

### Step 4: Add Images (Optional)

Place cockpit images in `public/images/`. Use descriptive names:
- `boeing737-autopilot.png`
- `boeing737-flaps-lever.png`

---

## Conventions

### Item IDs

Use a prefix based on the section:

| Section | Prefix | Example |
|---------|--------|---------|
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

### Actions

Use consistent action terminology:

| Action | Usage |
|--------|-------|
| `ON` / `OFF` | Switches |
| `SET` | Values to configure |
| `CHECK` | Verify status |
| `AS RQRD` | As Required |
| `CONFIRM` | Verbal confirmation |
| `REQUEST` | ATC communication |
| `COMPLETE` | Checklist/procedure done |

### Section Colors

Recommended color palette for visual consistency:

| Phase | Color | Hex |
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

## Translation Guidelines

When adding translations:

1. Translate ALL text in the checklist files
2. Keep technical terms consistent (e.g., "Autopilot" stays "Autopilot" in German)
3. Use proper aviation terminology for each language
4. Test both language versions

---

## Normal Mode vs Career Mode

- **Normal Mode**: Complete, realistic procedures for full flight simulation
- **Career Mode**: Streamlined for MSFS 2024 Career mode
  - Skip items handled automatically by the sim
  - Focus on what the pilot actually needs to do
  - Shorter, more practical

---

## Code Style

- Use 2-space indentation
- Use single quotes for strings in JavaScript
- Use meaningful variable names
- Keep components small and focused

---

## Questions?

Open an issue on GitHub if you have questions or need help with your contribution.

Thank you for making MSFS 2024 Checklists better!
