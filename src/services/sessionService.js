import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from '../config/supabase';

/**
 * Session-Service für Geräte-übergreifende Synchronisation
 *
 * Ermöglicht es, SimConnect-Daten vom PC an Tablets/Handys zu übertragen,
 * auch wenn diese nicht im selben Netzwerk sind.
 */

let supabase = null;
let currentChannel = null;
let currentSessionCode = null;

// Supabase Client initialisieren
const getSupabase = () => {
  if (!supabase && isSupabaseConfigured()) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });
  }
  return supabase;
};

/**
 * Generiert einen zufälligen Session-Code
 * Format: XXXX-XXXX (8 Zeichen, leicht zu tippen)
 */
export const generateSessionCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Ohne I, O, 0, 1 für bessere Lesbarkeit
  let code = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-';
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Erstellt eine neue Session (für den PC mit Bridge)
 * @returns {Promise<{code: string, broadcast: function}>}
 */
export const createSession = async () => {
  const client = getSupabase();
  if (!client) {
    throw new Error('Supabase nicht konfiguriert');
  }

  // Alte Session beenden falls vorhanden
  if (currentChannel) {
    await leaveSession();
  }

  const code = generateSessionCode();
  currentSessionCode = code;

  // Channel für diese Session erstellen
  currentChannel = client.channel(`session:${code}`, {
    config: {
      broadcast: { self: false }
    }
  });

  await currentChannel.subscribe();

  console.log(`[Session] Erstellt: ${code}`);

  return {
    code,
    /**
     * Sendet SimData an alle verbundenen Clients
     * @param {Object} simData - Die SimConnect-Daten
     */
    broadcast: async (simData) => {
      if (currentChannel) {
        await currentChannel.send({
          type: 'broadcast',
          event: 'simdata',
          payload: simData
        });
      }
    }
  };
};

/**
 * Tritt einer bestehenden Session bei (für Tablet/Handy)
 * @param {string} code - Der Session-Code
 * @param {function} onSimData - Callback für empfangene SimData
 * @param {function} onFlightRoute - Callback für empfangene FlightRoute
 * @returns {Promise<void>}
 */
export const joinSession = async (code, onSimData, onFlightRoute) => {
  const client = getSupabase();
  if (!client) {
    throw new Error('Supabase nicht konfiguriert');
  }

  // Code normalisieren (Großbuchstaben, mit Bindestrich)
  const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const formattedCode = normalizedCode.length === 8
    ? `${normalizedCode.slice(0, 4)}-${normalizedCode.slice(4)}`
    : code.toUpperCase();

  // Alte Session beenden falls vorhanden
  if (currentChannel) {
    await leaveSession();
  }

  currentSessionCode = formattedCode;

  // Channel für diese Session beitreten
  currentChannel = client.channel(`session:${formattedCode}`, {
    config: {
      broadcast: { self: false }
    }
  });

  // Auf SimData Events hören
  currentChannel.on('broadcast', { event: 'simdata' }, ({ payload }) => {
    if (onSimData && payload) {
      onSimData(payload);
    }
  });

  // Auf FlightRoute Events hören
  currentChannel.on('broadcast', { event: 'flightroute' }, ({ payload }) => {
    if (onFlightRoute && payload) {
      onFlightRoute(payload);
    }
  });

  await currentChannel.subscribe((status) => {
    console.log(`[Session] Beigetreten: ${formattedCode}, Status: ${status}`);
  });

  return formattedCode;
};

/**
 * Sendet FlightRoute-Daten an die Session (vom PC)
 * @param {Object} flightRoute - Die Flugrouten-Daten
 */
export const broadcastFlightRoute = async (flightRoute) => {
  if (!currentChannel) {
    console.log('[Session] broadcastFlightRoute: Kein Channel vorhanden');
    return;
  }
  if (!currentSessionCode) {
    console.log('[Session] broadcastFlightRoute: Kein Session-Code vorhanden');
    return;
  }

  try {
    await currentChannel.send({
      type: 'broadcast',
      event: 'flightroute',
      payload: flightRoute
    });
    console.log('[Session] FlightRoute gesendet an', currentSessionCode, ':', flightRoute);
  } catch (err) {
    console.error('[Session] FlightRoute senden fehlgeschlagen:', err);
  }
};

/**
 * Tritt einer Session als Host bei (für PC mit Bridge)
 * Ermöglicht das Senden von FlightRoute-Daten
 * @param {string} code - Der Session-Code von der Bridge
 */
export const joinAsHost = async (code) => {
  console.log('[Session] joinAsHost aufgerufen mit Code:', code);

  const client = getSupabase();
  if (!client) {
    console.log('[Session] Supabase nicht konfiguriert - Host-Modus nicht möglich');
    return;
  }

  // Falls schon verbunden mit gleichem Code, nichts tun
  if (currentSessionCode === code && currentChannel) {
    console.log('[Session] Bereits als Host verbunden mit:', code);
    return;
  }

  // Alte Session beenden falls vorhanden
  if (currentChannel) {
    console.log('[Session] Beende vorherige Session');
    await leaveSession();
  }

  currentSessionCode = code;

  // Channel für diese Session erstellen
  currentChannel = client.channel(`session:${code}`, {
    config: {
      broadcast: { self: false }
    }
  });

  await currentChannel.subscribe((status) => {
    console.log(`[Session] Als Host beigetreten: ${code}, Status: ${status}`);
    if (status === 'SUBSCRIBED') {
      console.log('[Session] Host-Channel bereit zum Senden');
    }
  });
};

/**
 * Verlässt die aktuelle Session
 */
export const leaveSession = async () => {
  if (currentChannel) {
    await currentChannel.unsubscribe();
    currentChannel = null;
  }
  currentSessionCode = null;
  console.log('[Session] Verlassen');
};

/**
 * Gibt den aktuellen Session-Code zurück
 */
export const getCurrentSessionCode = () => currentSessionCode;

/**
 * Prüft ob Supabase konfiguriert ist
 */
export const isSessionSyncAvailable = isSupabaseConfigured;
