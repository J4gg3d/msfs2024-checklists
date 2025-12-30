import { useState, useCallback, useRef, useMemo, useEffect } from 'react';

// WebSocket-URL dynamisch basierend auf aktuellem Host oder manueller IP
const getWebSocketUrl = (manualIP = null) => {
  // Manuelle IP (Tablet-Modus) - nur wenn gültiger String
  if (manualIP && typeof manualIP === 'string' && manualIP.trim() && !manualIP.startsWith('{')) {
    return `ws://${manualIP.trim()}:8080`;
  }

  // Wenn auf HTTPS (z.B. simchecklist.app) → verwende localhost/127.0.0.1
  // Browser erlauben ws://localhost von HTTPS (Loopback-Ausnahme)
  if (window.location.protocol === 'https:') {
    return 'ws://127.0.0.1:8080';
  }

  // Lokale Entwicklung oder Bridge-gehostete Website
  const hostname = window.location.hostname || 'localhost';
  return `ws://${hostname}:8080`;
};

// LocalStorage Keys
const BRIDGE_IP_KEY = 'msfs-checklist-bridge-ip';

/**
 * Prüft ob ein autoCheck für ein Item erfüllt ist
 * @param {Object} autoCheck - Die autoCheck-Konfiguration aus der Checkliste
 * @param {Object} simData - Die aktuellen SimVar-Daten
 * @returns {Object} { status: 'ok'|'fail'|'unknown', value: any }
 */
function evaluateAutoCheck(autoCheck, simData) {
  if (!autoCheck || !simData) {
    return { status: 'unknown', value: null };
  }

  const { simVar, expectedValue, simVar2, expectedValue2, logic, comparison, optional } = autoCheck;

  // Ersten SimVar-Wert holen
  const value1 = simData[simVar];
  if (value1 === undefined) {
    return { status: 'unknown', value: null };
  }

  // Vergleich durchführen
  let result1;
  if (comparison === 'gte') {
    result1 = value1 >= expectedValue;
  } else if (comparison === 'lte') {
    result1 = value1 <= expectedValue;
  } else if (comparison === 'gt') {
    result1 = value1 > expectedValue;
  } else if (comparison === 'lt') {
    result1 = value1 < expectedValue;
  } else {
    // Standardvergleich (equals)
    result1 = value1 === expectedValue;
  }

  // Wenn kein zweiter SimVar definiert ist
  if (!simVar2) {
    // Wenn optional und nicht erfüllt, zeige als unknown
    if (optional && !result1) {
      return { status: 'unknown', value: value1 };
    }
    return { status: result1 ? 'ok' : 'fail', value: value1 };
  }

  // Zweiten SimVar-Wert holen
  const value2 = simData[simVar2];
  if (value2 === undefined) {
    return { status: 'unknown', value: null };
  }

  const result2 = value2 === expectedValue2;

  // Logik anwenden
  let finalResult;
  if (logic === 'or') {
    finalResult = result1 || result2;
  } else {
    // Standard: AND
    finalResult = result1 && result2;
  }

  return {
    status: finalResult ? 'ok' : 'fail',
    value: { [simVar]: value1, [simVar2]: value2 }
  };
}

/**
 * Hook für die Verbindung zum SimConnect Bridge-Server
 *
 * Features:
 * - WebSocket-Verbindung zur Bridge
 * - Automatischer Demo-Modus wenn Bridge nicht läuft
 * - Manuelle IP-Verbindung für Tablets im lokalen Netzwerk
 * - Hilfsfunktion zum Prüfen von autoCheck-Konfigurationen
 */
function useSimConnect() {
  const [isConnected, setIsConnected] = useState(false);
  const [simData, setSimData] = useState(null);
  const [error, setError] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [sharedRoute, setSharedRoute] = useState(null); // Synchronisierte Route von Bridge
  const [lastLanding, setLastLanding] = useState(null); // Letzte Landung für Modal
  const [landingHistory, setLandingHistory] = useState([]); // Historie für Panel

  // Pending Airport-Requests (ICAO -> resolve callbacks)
  const airportRequestsRef = useRef(new Map());

  // Manuelle Bridge-IP für Tablet-Zugriff
  const [bridgeIP, setBridgeIP] = useState(() => {
    try {
      const saved = localStorage.getItem(BRIDGE_IP_KEY);
      // Sicherstellen, dass es ein gültiger String ist (kein JSON-Objekt)
      if (saved && typeof saved === 'string' && !saved.startsWith('{')) {
        return saved;
      }
      // Falls ein ungültiger Wert gespeichert war, entfernen
      if (saved) {
        localStorage.removeItem(BRIDGE_IP_KEY);
      }
      return '';
    } catch {
      return '';
    }
  });
  const [isManualIPMode, setIsManualIPMode] = useState(false);

  const wsRef = useRef(null);
  const demoIntervalRef = useRef(null);

  // Demo-Modus Daten (simuliert verschiedene Zustände - muss Bridge-Keys entsprechen)
  const generateDemoData = useCallback(() => {
    return {
      connected: true,
      simRate: 1,
      paused: false,

      // Flugdaten
      altitude: 0,
      groundSpeed: 0,
      heading: 180,
      latitude: 50.0379,
      longitude: 8.5622,
      aircraftTitle: "Airbus A330-200 (Demo)",
      onGround: true,
      enginesRunning: false,

      // Parkbremse
      parkingBrake: true,

      // Gear & Flaps
      gearDown: true,
      flapsPosition: 0,

      // Lichter
      lightNav: false,
      lightBeacon: false,
      lightLanding: false,
      lightTaxi: false,
      lightStrobe: false,
      lightRecognition: false,
      lightWing: false,
      lightLogo: false,
      lightPanel: true,

      // Elektrisch
      battery1: true,
      battery2: true,
      externalPower: false,
      avionicsMaster: true,

      // APU
      apuMaster: false,
      apuRunning: false,
      apuPctRpm: 0,

      // Triebwerke
      engineMaster1: false,
      engineMaster2: false,
      engine1N1: 0,
      engine1N2: 0,
      engine2N1: 0,
      engine2N2: 0,
      throttle1: 0,
      throttle2: 0,

      // Flugsteuerung
      spoilersArmed: false,
      spoilersPosition: 0,
      autopilotMaster: false,
      autothrottleArmed: false,

      // Kabine
      seatbeltSign: true,
      noSmokingSign: true,

      // Transponder (0=Off, 1=Standby, 2=Test, 3=On, 4=Alt/TA-RA)
      transponderState: 1,

      // Anti-Ice
      antiIceEng1: false,
      antiIceEng2: false,
      antiIceStructural: false,
      pitotHeat: false,

      // Treibstoffpumpen
      fuelPump1: false,
      fuelPump2: false,

      // Hydraulik
      hydraulicPump1: false,
      hydraulicPump2: false,

      // Flugplan / ATC Info
      atcId: "DLH123",
      atcAirline: "Lufthansa",
      atcFlightNumber: "123",
    };
  }, []);

  // Demo-Modus starten
  const startDemoMode = useCallback(() => {
    console.log('SimConnect: Starting demo mode');
    setIsConnected(true);
    setIsDemoMode(true);
    setError(null);

    // Initiale Demo-Daten setzen
    setSimData(generateDemoData());

    // Regelmäßig Demo-Daten aktualisieren
    demoIntervalRef.current = setInterval(() => {
      setSimData(generateDemoData());
    }, 1000);
  }, [generateDemoData]);

  // Demo-Modus stoppen
  const stopDemoMode = useCallback(() => {
    if (demoIntervalRef.current) {
      clearInterval(demoIntervalRef.current);
      demoIntervalRef.current = null;
    }
    setIsDemoMode(false);
  }, []);

  const connect = useCallback((customIP = null) => {
    // Verhindere mehrfache Verbindungsversuche
    if (wsRef.current || demoIntervalRef.current) {
      console.log('SimConnect: Already connected or connecting');
      return;
    }

    const wsUrl = getWebSocketUrl(customIP);
    console.log('SimConnect: Attempting to connect to', wsUrl);
    setError(null);

    let connectionSuccessful = false;

    // Timeout für Verbindungsversuch
    const connectionTimeout = setTimeout(() => {
      if (!connectionSuccessful) {
        console.log('SimConnect: Connection timeout, starting demo mode');
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }
        // Bei manueller IP keinen Demo-Modus starten, sondern Fehler zeigen
        if (customIP) {
          setError(`Verbindung zu ${customIP} fehlgeschlagen`);
          setIsManualIPMode(false);
        } else {
          startDemoMode();
        }
      }
    }, 2000);

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        connectionSuccessful = true;
        clearTimeout(connectionTimeout);
        console.log('SimConnect: Connected to Bridge-Server');
        setIsConnected(true);
        setIsDemoMode(false);
        setError(null);
        if (customIP) {
          setIsManualIPMode(true);
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Prüfen ob es eine Route-Nachricht ist
          if (data.type === 'route') {
            console.log('SimConnect: Route received:', data.route);
            setSharedRoute(data.route);
            return;
          }

          // Prüfen ob es eine Airport-Koordinaten-Antwort ist
          if (data.type === 'airportCoords') {
            const icao = data.icao?.toUpperCase();
            const pending = airportRequestsRef.current.get(icao);
            if (pending) {
              if (data.coords) {
                console.log('SimConnect: Airport coords received:', icao, data.coords);
                pending.resolve({ lat: data.coords.lat, lon: data.coords.lon });
              } else {
                console.log('SimConnect: Airport not found:', icao);
                pending.resolve(null);
              }
              airportRequestsRef.current.delete(icao);
            }
            return;
          }

          // Prüfen ob es eine Landing-Nachricht ist
          if (data.type === 'landing') {
            console.log('SimConnect: Landing received:', data.landing);
            setLastLanding(data.landing);
            setLandingHistory(prev => [data.landing, ...prev].slice(0, 10)); // Max 10 Landungen speichern
            return;
          }

          // Debug: Zeige empfangene Daten einmalig
          if (!window._simDataLogged) {
            console.log('SimConnect received data keys:', Object.keys(data));
            console.log('SimConnect sample data:', data);
            window._simDataLogged = true;
          }
          setSimData(data);
        } catch (e) {
          console.error('SimConnect: Failed to parse message', e);
        }
      };

      ws.onclose = () => {
        console.log('SimConnect: Disconnected from Bridge-Server');
        wsRef.current = null;
        // Nur Status ändern wenn nicht im Demo-Modus
        if (!demoIntervalRef.current) {
          setIsConnected(false);
          setSimData(null);
        }
      };

      ws.onerror = () => {
        clearTimeout(connectionTimeout);
        console.log('SimConnect: WebSocket error');
        ws.close();
        wsRef.current = null;
        // Bei manueller IP keinen Demo-Modus starten
        if (customIP) {
          setError(`Verbindung zu ${customIP} fehlgeschlagen`);
          setIsManualIPMode(false);
        } else {
          startDemoMode();
        }
      };

      wsRef.current = ws;
    } catch (err) {
      clearTimeout(connectionTimeout);
      console.error('SimConnect: Connection failed', err);
      if (customIP) {
        setError(`Verbindung zu ${customIP} fehlgeschlagen`);
        setIsManualIPMode(false);
      } else {
        startDemoMode();
      }
    }
  }, [startDemoMode]);

  const disconnect = useCallback(() => {
    console.log('SimConnect: Disconnecting...');

    // Stop demo mode if running
    stopDemoMode();

    // Close WebSocket if connected
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setSimData(null);
    setError(null);
    setIsManualIPMode(false);
  }, [stopDemoMode]);

  /**
   * Verbindet mit einer Bridge über manuelle IP-Adresse (für Tablets im lokalen Netzwerk)
   * @param {string} ip - Die IP-Adresse des PCs mit der Bridge (z.B. "192.168.1.100")
   */
  const connectToIP = useCallback(async (ip) => {
    if (!ip || !ip.trim()) {
      setError('Bitte gib eine IP-Adresse ein');
      return false;
    }

    const cleanIP = ip.trim();
    console.log('SimConnect: Verbinde mit Bridge-IP:', cleanIP);

    // Vorherige Verbindungen trennen
    stopDemoMode();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // IP speichern
    setBridgeIP(cleanIP);
    try {
      localStorage.setItem(BRIDGE_IP_KEY, cleanIP);
    } catch (e) {
      console.warn('Konnte Bridge-IP nicht speichern:', e);
    }

    // Mit der IP verbinden
    connect(cleanIP);
    return true;
  }, [connect, stopDemoMode]);

  /**
   * Trennt die manuelle IP-Verbindung und wechselt zurück zum normalen Modus
   */
  const disconnectFromIP = useCallback(() => {
    console.log('SimConnect: Trenne manuelle IP-Verbindung...');

    // Verbindung trennen
    disconnect();

    // IP aus State und Storage entfernen
    setBridgeIP('');
    setIsManualIPMode(false);
    try {
      localStorage.removeItem(BRIDGE_IP_KEY);
    } catch (e) {
      console.warn('Konnte Bridge-IP nicht entfernen:', e);
    }

    // Normale Verbindung versuchen (localhost oder aktueller Host)
    setTimeout(() => connect(), 100);
  }, [disconnect, connect]);

  /**
   * Prüft den autoCheck-Status für ein einzelnes Item
   * @param {Object} autoCheck - Die autoCheck-Konfiguration
   * @returns {Object} { status: 'ok'|'fail'|'unknown', value: any }
   */
  const checkAutoStatus = useCallback((autoCheck) => {
    return evaluateAutoCheck(autoCheck, simData);
  }, [simData]);

  /**
   * Prüft ob alle autoChecks einer Liste erfüllt sind
   * @param {Array} items - Array von Items mit autoCheck-Konfiguration
   * @returns {Object} { total: number, ok: number, fail: number, unknown: number }
   */
  const checkAllAutoStatus = useCallback((items) => {
    const result = { total: 0, ok: 0, fail: 0, unknown: 0 };

    if (!items || !simData) return result;

    items.forEach(item => {
      if (item.autoCheck) {
        result.total++;
        const status = evaluateAutoCheck(item.autoCheck, simData).status;
        result[status]++;
      }
    });

    return result;
  }, [simData]);

  // Memoized Flugdaten für einfachen Zugriff
  const flightData = useMemo(() => {
    if (!simData) return null;
    return {
      altitude: simData.altitude,
      speed: simData.groundSpeed,
      heading: simData.heading,
      onGround: simData.onGround,
      paused: simData.paused,
      simRate: simData.simRate,
      aircraftTitle: simData.aircraftTitle,
    };
  }, [simData]);

  /**
   * Sendet Route-Informationen an alle verbundenen Clients über die Bridge
   * @param {Object} route - { origin: string, destination: string }
   */
  const sendRoute = useCallback((route) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({
        type: 'route',
        data: route  // Bridge erwartet 'data', nicht 'route'
      });
      console.log('SimConnect: Sending route:', route);
      wsRef.current.send(message);
    } else {
      console.log('SimConnect: Cannot send route - not connected');
    }
  }, []);

  /**
   * Holt Flughafen-Koordinaten über die Bridge (umgeht CORS)
   * @param {string} icao - ICAO-Code des Flughafens
   * @returns {Promise<{lat: number, lon: number} | null>}
   */
  const getAirportFromBridge = useCallback((icao) => {
    return new Promise((resolve) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        console.log('SimConnect: Cannot get airport - not connected');
        resolve(null);
        return;
      }

      const code = icao.toUpperCase();

      // Prüfen ob bereits ein Request läuft
      if (airportRequestsRef.current.has(code)) {
        // An existierenden Request anhängen
        const existing = airportRequestsRef.current.get(code);
        existing.callbacks.push(resolve);
        return;
      }

      // Neuen Request starten
      airportRequestsRef.current.set(code, {
        resolve: (result) => {
          // Alle Callbacks aufrufen
          resolve(result);
        },
        callbacks: [resolve]
      });

      // Request an Bridge senden
      const message = JSON.stringify({
        type: 'getAirport',
        data: code
      });
      console.log('SimConnect: Requesting airport:', code);
      wsRef.current.send(message);

      // Timeout nach 10 Sekunden
      setTimeout(() => {
        if (airportRequestsRef.current.has(code)) {
          console.log('SimConnect: Airport request timeout:', code);
          airportRequestsRef.current.get(code).resolve(null);
          airportRequestsRef.current.delete(code);
        }
      }, 10000);
    });
  }, []);

  // Automatisch mit gespeicherter Bridge-IP verbinden
  useEffect(() => {
    const savedIP = bridgeIP;
    // Sicherstellen, dass die IP ein gültiger String ist (keine Objekte oder leere Werte)
    if (savedIP && typeof savedIP === 'string' && savedIP.trim()) {
      console.log('SimConnect: Verbinde mit gespeicherter Bridge-IP:', savedIP);
      connect(savedIP);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Landing-Modal schließen
  const clearLastLanding = useCallback(() => {
    setLastLanding(null);
  }, []);

  return {
    isConnected,
    simData,
    flightData,
    error,
    isDemoMode,
    // Manuelle IP-Verbindung (lokales Netzwerk)
    bridgeIP,
    isManualIPMode,
    connectToIP,
    disconnectFromIP,
    // Route-Synchronisation
    sharedRoute,
    sendRoute,
    // Airport-Lookup über Bridge
    getAirportFromBridge,
    // Landing-Rating
    lastLanding,
    landingHistory,
    clearLastLanding,
    // Standard-Funktionen
    connect,
    disconnect,
    checkAutoStatus,
    checkAllAutoStatus,
  };
}

export default useSimConnect;
