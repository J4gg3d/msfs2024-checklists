import { useState, useCallback, useRef, useMemo } from 'react';

// WebSocket-URL dynamisch basierend auf aktuellem Host
const getWebSocketUrl = () => {
  const hostname = window.location.hostname || 'localhost';
  return `ws://${hostname}:8080`;
};

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
 * - Hilfsfunktion zum Prüfen von autoCheck-Konfigurationen
 */
function useSimConnect() {
  const wsUrl = getWebSocketUrl();
  const [isConnected, setIsConnected] = useState(false);
  const [simData, setSimData] = useState(null);
  const [error, setError] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
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
      gpsWpNextId: "EDDF",
      gpsWpIndex: 0,
      gpsWpCount: 5,
      gpsWpDistance: 245.5,
      gpsWpEte: 3600,
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

  const connect = useCallback(() => {
    // Verhindere mehrfache Verbindungsversuche
    if (wsRef.current || demoIntervalRef.current) {
      console.log('SimConnect: Already connected or connecting');
      return;
    }

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
        startDemoMode();
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
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
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
        console.log('SimConnect: WebSocket error, starting demo mode');
        ws.close();
        wsRef.current = null;
        startDemoMode();
      };

      wsRef.current = ws;
    } catch (err) {
      clearTimeout(connectionTimeout);
      console.error('SimConnect: Connection failed', err);
      startDemoMode();
    }
  }, [wsUrl, startDemoMode]);

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
  }, [stopDemoMode]);

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

  return {
    isConnected,
    simData,
    flightData,
    error,
    isDemoMode,
    connect,
    disconnect,
    checkAutoStatus,
    checkAllAutoStatus,
  };
}

export default useSimConnect;
