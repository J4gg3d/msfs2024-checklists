// LocalStorage Key für gecachte Flughafen-Koordinaten
const AIRPORT_CACHE_KEY = 'msfs-checklist-airport-cache';

// Lade gecachte Koordinaten aus localStorage
const loadAirportCache = () => {
  try {
    const cached = localStorage.getItem(AIRPORT_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
};

// Speichere Koordinaten im Cache
const saveToAirportCache = (icao, coords) => {
  try {
    const cache = loadAirportCache();
    cache[icao.toUpperCase()] = coords;
    localStorage.setItem(AIRPORT_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('Fehler beim Speichern im Airport-Cache:', e);
  }
};

// Statische Flughafen-Koordinaten (ICAO -> {lat, lon})
// Wird als Fallback und für schnellen Zugriff verwendet
const airportCoordinates = {
  // Deutschland
  'EDDF': { lat: 50.0379, lon: 8.5622 },   // Frankfurt
  'EDDM': { lat: 48.3538, lon: 11.7861 },  // München
  'EDDB': { lat: 52.3667, lon: 13.5033 },  // Berlin Brandenburg
  'EDDL': { lat: 51.2895, lon: 6.7668 },   // Düsseldorf
  'EDDH': { lat: 53.6304, lon: 9.9882 },   // Hamburg
  'EDDK': { lat: 50.8659, lon: 7.1427 },   // Köln/Bonn
  'EDDS': { lat: 48.6899, lon: 9.2220 },   // Stuttgart
  'EDDW': { lat: 53.0475, lon: 8.7867 },   // Bremen
  'EDDN': { lat: 49.4987, lon: 11.0669 },  // Nürnberg
  'EDDV': { lat: 52.4611, lon: 9.6850 },   // Hannover

  // Europa
  'EGLL': { lat: 51.4700, lon: -0.4543 },  // London Heathrow
  'EHAM': { lat: 52.3086, lon: 4.7639 },   // Amsterdam Schiphol
  'LFPG': { lat: 49.0097, lon: 2.5479 },   // Paris CDG
  'LEMD': { lat: 40.4719, lon: -3.5626 },  // Madrid
  'LIRF': { lat: 41.8003, lon: 12.2389 },  // Rom Fiumicino
  'LSZH': { lat: 47.4647, lon: 8.5492 },   // Zürich
  'LOWW': { lat: 48.1103, lon: 16.5697 },  // Wien
  'EBBR': { lat: 50.9014, lon: 4.4844 },   // Brüssel
  'EKCH': { lat: 55.6180, lon: 12.6560 },  // Kopenhagen
  'ENGM': { lat: 60.1939, lon: 11.1004 },  // Oslo
  'ESSA': { lat: 59.6519, lon: 17.9186 },  // Stockholm Arlanda
  'EFHK': { lat: 60.3172, lon: 24.9633 },  // Helsinki
  'LPPT': { lat: 38.7813, lon: -9.1359 },  // Lissabon
  'LEBL': { lat: 41.2971, lon: 2.0785 },   // Barcelona
  'EIDW': { lat: 53.4213, lon: -6.2701 },  // Dublin
  'EGKK': { lat: 51.1481, lon: -0.1903 },  // London Gatwick
  'EGCC': { lat: 53.3537, lon: -2.2750 },  // Manchester
  'LFPO': { lat: 48.7253, lon: 2.3594 },   // Paris Orly
  'LIMC': { lat: 45.6306, lon: 8.7231 },   // Mailand Malpensa
  'LGAV': { lat: 37.9364, lon: 23.9445 },  // Athen
  'LTFM': { lat: 41.2608, lon: 28.7419 },  // Istanbul

  // USA
  'KJFK': { lat: 40.6413, lon: -73.7781 }, // New York JFK
  'KLAX': { lat: 33.9416, lon: -118.4085 },// Los Angeles
  'KORD': { lat: 41.9742, lon: -87.9073 }, // Chicago O'Hare
  'KATL': { lat: 33.6407, lon: -84.4277 }, // Atlanta
  'KDFW': { lat: 32.8998, lon: -97.0403 }, // Dallas/Fort Worth
  'KDEN': { lat: 39.8561, lon: -104.6737 },// Denver
  'KSFO': { lat: 37.6213, lon: -122.3790 },// San Francisco
  'KLAS': { lat: 36.0840, lon: -115.1537 },// Las Vegas
  'KMIA': { lat: 25.7959, lon: -80.2870 }, // Miami
  'KSEA': { lat: 47.4502, lon: -122.3088 },// Seattle
  'KBOS': { lat: 42.3656, lon: -71.0096 }, // Boston
  'KEWR': { lat: 40.6895, lon: -74.1745 }, // Newark
  'KPHX': { lat: 33.4373, lon: -112.0078 },// Phoenix
  'KMSP': { lat: 44.8848, lon: -93.2223 }, // Minneapolis
  'KDTW': { lat: 42.2162, lon: -83.3554 }, // Detroit
  'KIAH': { lat: 29.9902, lon: -95.3368 }, // Houston

  // Asien
  'RJTT': { lat: 35.5494, lon: 139.7798 }, // Tokyo Haneda
  'VHHH': { lat: 22.3080, lon: 113.9185 }, // Hong Kong
  'WSSS': { lat: 1.3644, lon: 103.9915 },  // Singapore Changi
  'RKSI': { lat: 37.4691, lon: 126.4505 }, // Seoul Incheon
  'ZBAA': { lat: 40.0799, lon: 116.6031 }, // Beijing
  'ZSPD': { lat: 31.1443, lon: 121.8083 }, // Shanghai Pudong
  'OMDB': { lat: 25.2528, lon: 55.3644 },  // Dubai
  'VABB': { lat: 19.0896, lon: 72.8656 },  // Mumbai
  'VIDP': { lat: 28.5562, lon: 77.1000 },  // Delhi
  'VTBS': { lat: 13.6900, lon: 100.7501 }, // Bangkok

  // Ozeanien
  'YSSY': { lat: -33.9399, lon: 151.1753 },// Sydney
  'YMML': { lat: -37.6690, lon: 144.8410 },// Melbourne
  'NZAA': { lat: -37.0082, lon: 174.7850 },// Auckland

  // Südamerika
  'SBGR': { lat: -23.4356, lon: -46.4731 },// São Paulo
  'SCEL': { lat: -33.3930, lon: -70.7858 },// Santiago
  'SAEZ': { lat: -34.8222, lon: -58.5358 },// Buenos Aires

  // Afrika
  'FAOR': { lat: -26.1392, lon: 28.2460 }, // Johannesburg
  'HECA': { lat: 30.1219, lon: 31.4056 },  // Kairo
  'GMMN': { lat: 33.3675, lon: -7.5900 },  // Casablanca
  'GGOV': { lat: 11.8948, lon: -15.6531 }, // Bissau (Guinea-Bissau)
  'GOOY': { lat: 14.7397, lon: -17.4902 }, // Dakar (Senegal)
  'GABS': { lat: 13.4699, lon: -16.6522 }, // Banjul (Gambia)
  'GULB': { lat: 11.5886, lon: -13.1386 }, // Labé (Guinea)
  'GUCY': { lat: 10.3866, lon: -9.2617 },  // Conakry (Guinea)
  'DXXX': { lat: 6.1657, lon: 1.2546 },    // Lomé (Togo)
  'DGAA': { lat: 5.6052, lon: -0.1668 },   // Accra (Ghana)
  'DBBB': { lat: 6.3573, lon: 2.3844 },    // Cotonou (Benin)
  'DNMM': { lat: 6.5774, lon: 3.3212 },    // Lagos (Nigeria)
  'FKKD': { lat: 4.0061, lon: 9.7194 },    // Douala (Kamerun)
  'FCBB': { lat: -4.2517, lon: 15.2531 },  // Brazzaville (Kongo)
  'FZAA': { lat: -4.3858, lon: 15.4446 },  // Kinshasa (DR Kongo)
  'HKJK': { lat: -1.3192, lon: 36.9278 },  // Nairobi (Kenia)
  'HTDA': { lat: -6.8781, lon: 39.2026 },  // Dar es Salaam (Tansania)
  'FMEE': { lat: -20.4302, lon: 57.6836 }, // Mauritius
  'FMMI': { lat: -18.7969, lon: 47.4789 }, // Antananarivo (Madagaskar)
  'FACT': { lat: -33.9649, lon: 18.6017 }, // Kapstadt (Südafrika)
};

/**
 * Berechnet die Großkreis-Distanz zwischen zwei Punkten (Haversine-Formel)
 * @param {number} lat1 - Breitengrad Punkt 1
 * @param {number} lon1 - Längengrad Punkt 1
 * @param {number} lat2 - Breitengrad Punkt 2
 * @param {number} lon2 - Längengrad Punkt 2
 * @returns {number} Distanz in Nautischen Meilen (NM)
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3440.065; // Erdradius in Nautischen Meilen
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Holt die Koordinaten für einen Flughafen (synchron, nur aus Cache/statischer DB)
 * @param {string} icao - ICAO-Code des Flughafens
 * @returns {{lat: number, lon: number} | null} Koordinaten oder null wenn nicht gefunden
 */
export function getAirportCoordinates(icao) {
  if (!icao) return null;
  const code = icao.toUpperCase();

  // 1. Statische Datenbank prüfen
  if (airportCoordinates[code]) {
    return airportCoordinates[code];
  }

  // 2. Cache prüfen
  const cache = loadAirportCache();
  if (cache[code]) {
    return cache[code];
  }

  return null;
}

/**
 * Holt die Koordinaten für einen Flughafen (async, mit API-Fallback)
 * @param {string} icao - ICAO-Code des Flughafens
 * @returns {Promise<{lat: number, lon: number} | null>} Koordinaten oder null
 */
export async function getAirportCoordinatesAsync(icao) {
  if (!icao) return null;
  const code = icao.toUpperCase();

  // 1. Statische Datenbank prüfen
  if (airportCoordinates[code]) {
    return airportCoordinates[code];
  }

  // 2. Cache prüfen
  const cache = loadAirportCache();
  if (cache[code]) {
    return cache[code];
  }

  // 3. API abfragen
  try {
    const response = await fetch(`https://airport-data.com/api/ap_info.json?icao=${code}`);
    if (!response.ok) {
      console.warn(`Airport API Fehler für ${code}:`, response.status);
      return null;
    }

    const data = await response.json();

    if (data && data.latitude && data.longitude) {
      const coords = {
        lat: parseFloat(data.latitude),
        lon: parseFloat(data.longitude)
      };

      // Im Cache speichern
      saveToAirportCache(code, coords);
      console.log(`Airport ${code} von API geladen:`, coords);

      return coords;
    }
  } catch (error) {
    console.warn(`Fehler beim Laden von Airport ${code}:`, error);
  }

  return null;
}

/**
 * Berechnet die geflogene Distanz vom Startflughafen zur aktuellen Position
 * @param {string} originIcao - ICAO-Code des Startflughafens
 * @param {number} currentLat - Aktuelle Breitengrad
 * @param {number} currentLon - Aktuelle Längengrad
 * @returns {number | null} Geflogene Distanz in NM oder null wenn nicht berechenbar
 */
export function calculateFlownDistance(originIcao, currentLat, currentLon) {
  const origin = getAirportCoordinates(originIcao);
  if (!origin || currentLat == null || currentLon == null) {
    return null;
  }
  return calculateDistance(origin.lat, origin.lon, currentLat, currentLon);
}

/**
 * Berechnet die Distanz zwischen zwei Flughäfen (synchron, nur aus Cache/statischer DB)
 * @param {string} originIcao - ICAO-Code des Startflughafens
 * @param {string} destIcao - ICAO-Code des Zielflughafens
 * @returns {number | null} Distanz in NM oder null wenn nicht berechenbar
 */
export function calculateRouteDistance(originIcao, destIcao) {
  const origin = getAirportCoordinates(originIcao);
  const dest = getAirportCoordinates(destIcao);
  if (!origin || !dest) {
    return null;
  }
  return Math.round(calculateDistance(origin.lat, origin.lon, dest.lat, dest.lon));
}

/**
 * Berechnet die Distanz zwischen zwei Flughäfen (async, mit API-Fallback)
 * @param {string} originIcao - ICAO-Code des Startflughafens
 * @param {string} destIcao - ICAO-Code des Zielflughafens
 * @returns {Promise<number | null>} Distanz in NM oder null wenn nicht berechenbar
 */
export async function calculateRouteDistanceAsync(originIcao, destIcao) {
  if (!originIcao || !destIcao) return null;

  // Beide Flughäfen laden (parallel)
  const [origin, dest] = await Promise.all([
    getAirportCoordinatesAsync(originIcao),
    getAirportCoordinatesAsync(destIcao)
  ]);

  if (!origin || !dest) {
    return null;
  }

  return Math.round(calculateDistance(origin.lat, origin.lon, dest.lat, dest.lon));
}

/**
 * Prüft ob ein Flughafen in der Datenbank oder im Cache vorhanden ist
 * @param {string} icao - ICAO-Code
 * @returns {boolean}
 */
export function isAirportKnown(icao) {
  if (!icao) return false;
  const code = icao.toUpperCase();

  // Statische DB prüfen
  if (code in airportCoordinates) return true;

  // Cache prüfen
  const cache = loadAirportCache();
  return code in cache;
}

/**
 * Gibt alle bekannten Flughafen-Codes zurück (statisch + Cache)
 * @returns {string[]}
 */
export function getKnownAirports() {
  const cache = loadAirportCache();
  return [...new Set([...Object.keys(airportCoordinates), ...Object.keys(cache)])];
}
