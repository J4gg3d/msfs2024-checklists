using MSFSBridge;
using DotNetEnv;
using System.Net;
using System.Net.Sockets;

// Hilfsfunktion: Lokale IP-Adressen ermitteln
static List<string> GetLocalIPAddresses()
{
    var ips = new List<string>();
    try
    {
        var host = Dns.GetHostEntry(Dns.GetHostName());
        foreach (var ip in host.AddressList)
        {
            if (ip.AddressFamily == AddressFamily.InterNetwork)
            {
                ips.Add(ip.ToString());
            }
        }
    }
    catch { }
    return ips;
}

// .env Datei laden (aus dem Hauptverzeichnis des Projekts)
var envPaths = new[] {
    Path.Combine(AppContext.BaseDirectory, ".env"),
    Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", ".env"),
    Path.Combine(Directory.GetCurrentDirectory(), ".env"),
    Path.Combine(Directory.GetCurrentDirectory(), "..", "..", ".env")
};

foreach (var envPath in envPaths)
{
    if (File.Exists(envPath))
    {
        Env.Load(envPath);
        Console.WriteLine($"[CONFIG] .env geladen: {Path.GetFullPath(envPath)}");
        break;
    }
}

Console.WriteLine("╔══════════════════════════════════════════════════════════════╗");
Console.WriteLine("║           MSFS Checklist - Bridge Server                     ║");
Console.WriteLine("║                                                              ║");
Console.WriteLine("║  Verbindet Microsoft Flight Simulator mit der Checkliste     ║");
Console.WriteLine("╚══════════════════════════════════════════════════════════════╝");
Console.WriteLine();

const int WEBSOCKET_PORT = 8080;
const int HTTP_PORT = 8081;

// WWW-Ordner für statische Dateien (Website)
var wwwRoot = Path.Combine(AppContext.BaseDirectory, "www");

// Statischen Webserver starten (für Tablets)
using var staticServer = new StaticFileServer(wwwRoot);
staticServer.OnLog += (message) => Console.WriteLine($"[HTTP] {message}");
staticServer.Start(HTTP_PORT);
string? sessionCode = null;

// WebSocket-Server erstellen und starten
using var webSocketServer = new BridgeWebSocketServer();
webSocketServer.OnLog += (message) => Console.WriteLine($"[WS] {message}");

// Speichert den Session-Code für neue Client-Verbindungen
string? activeSessionCode = null;

// Bei neuer Client-Verbindung sofort Session-Code senden
webSocketServer.OnClientConnected += (client) =>
{
    if (!string.IsNullOrEmpty(activeSessionCode))
    {
        var welcomeData = new MSFSBridge.Models.SimData
        {
            Connected = false,
            SessionCode = activeSessionCode
        };
        webSocketServer.SendToClient(client, welcomeData);
        Console.WriteLine($"[WS] Session-Code an neuen Client gesendet: {activeSessionCode}");
    }
};

try
{
    webSocketServer.Start(WEBSOCKET_PORT);
}
catch (Exception ex)
{
    Console.WriteLine($"[FEHLER] WebSocket-Server konnte nicht gestartet werden: {ex.Message}");
    Console.WriteLine("         Möglicherweise ist Port 8080 bereits belegt.");
    Console.WriteLine();
    Console.WriteLine("Drücke eine Taste zum Beenden...");
    Console.ReadKey();
    return;
}

// Supabase Session-Manager erstellen (optional)
using var supabaseSession = new SupabaseSessionManager();
supabaseSession.OnLog += (message) => Console.WriteLine($"[SESSION] {message}");
supabaseSession.OnError += (error) => Console.WriteLine($"[SESSION FEHLER] {error}");

// Session starten wenn Supabase konfiguriert ist
if (SupabaseSessionManager.IsConfigured())
{
    Console.WriteLine();
    Console.WriteLine("[SESSION] Supabase konfiguriert - starte Remote-Session...");
    sessionCode = await supabaseSession.StartSessionAsync();
    activeSessionCode = sessionCode; // Für neue Client-Verbindungen speichern

    if (sessionCode != null)
    {
        Console.WriteLine();
        Console.WriteLine("╔══════════════════════════════════════════════════════════════╗");
        Console.WriteLine("║                    REMOTE SESSION AKTIV                      ║");
        Console.WriteLine("╠══════════════════════════════════════════════════════════════╣");
        Console.WriteLine($"║                                                              ║");
        Console.WriteLine($"║     Session-Code:   {sessionCode}                         ║");
        Console.WriteLine($"║                                                              ║");
        Console.WriteLine("║  Gib diesen Code auf deinem Tablet/Handy ein, um             ║");
        Console.WriteLine("║  Live-Flugdaten zu empfangen.                                ║");
        Console.WriteLine("╚══════════════════════════════════════════════════════════════╝");
        Console.WriteLine();
    }
}
else
{
    // Zeige lokale Netzwerk-Info für Tablet-Zugriff
    var localIPs = GetLocalIPAddresses();
    Console.WriteLine();
    Console.WriteLine("╔══════════════════════════════════════════════════════════════╗");
    Console.WriteLine("║                  TABLET-ZUGRIFF (LOKALES NETZWERK)           ║");
    Console.WriteLine("╠══════════════════════════════════════════════════════════════╣");
    Console.WriteLine("║                                                              ║");
    if (localIPs.Count > 0)
    {
        Console.WriteLine("║  Oeffne diese Adresse im Browser deines Tablets:             ║");
        Console.WriteLine("║                                                              ║");
        foreach (var ip in localIPs)
        {
            var urlDisplay = $"http://{ip}:{HTTP_PORT}".PadRight(30);
            Console.WriteLine($"║     {urlDisplay}                   ║");
        }
        Console.WriteLine("║                                                              ║");
        Console.WriteLine("║  Oder auf diesem PC:                                         ║");
        Console.WriteLine($"║     http://localhost:{HTTP_PORT}                                    ║");
    }
    else
    {
        Console.WriteLine("║  Keine Netzwerk-Verbindung gefunden.                         ║");
        Console.WriteLine("║                                                              ║");
        Console.WriteLine("║  Lokaler Zugriff:                                            ║");
        Console.WriteLine($"║     http://localhost:{HTTP_PORT}                                    ║");
    }
    Console.WriteLine("║                                                              ║");
    Console.WriteLine("║  Tablet und PC muessen im gleichen WLAN sein!                ║");
    Console.WriteLine("╚══════════════════════════════════════════════════════════════╝");
    Console.WriteLine();
}

// SimConnect-Manager erstellen
using var simConnect = new SimConnectManager();

// Supabase Client für Flight-Logging erstellen
using var supabaseClient = new SupabaseClient();
supabaseClient.OnLog += (message) => Console.WriteLine($"[FLIGHT-LOG] {message}");
supabaseClient.OnError += (error) => Console.WriteLine($"[FLIGHT-LOG FEHLER] {error}");

if (supabaseClient.IsConfigured)
{
    Console.WriteLine("[FLIGHT-LOG] Supabase konfiguriert - Flüge werden gespeichert");
}

// Session-Code für Flight-Logging setzen (für anonyme Flüge)
if (!string.IsNullOrEmpty(activeSessionCode))
{
    simConnect.SetSessionCode(activeSessionCode);
}

// User-Authentifizierung vom Frontend empfangen
webSocketServer.OnUserAuthenticated += (userId) =>
{
    simConnect.SetUserId(userId);
    Console.WriteLine($"[AUTH] User-ID gesetzt: {(string.IsNullOrEmpty(userId) ? "(keiner)" : userId)}");
};

simConnect.OnStatusChanged += (status) => Console.WriteLine($"[SIM] {status}");
simConnect.OnError += (error) => Console.WriteLine($"[SIM FEHLER] {error}");
simConnect.OnLandingDetected += (landing) =>
{
    // Landing an alle Clients broadcasten
    webSocketServer.BroadcastLanding(landing);
};
simConnect.OnFlightCompleted += async (flight) =>
{
    // Flug in Supabase speichern
    if (supabaseClient.IsConfigured)
    {
        await supabaseClient.SaveFlightAsync(flight);
    }
};
simConnect.OnDataReceived += async (data) =>
{
    // Session-Code hinzufügen wenn aktiv
    if (supabaseSession.IsConnected && supabaseSession.SessionCode != null)
    {
        data.SessionCode = supabaseSession.SessionCode;
    }

    // Daten an alle verbundenen WebSocket-Clients senden
    webSocketServer.BroadcastSimData(data);

    // Auch an Remote-Session senden (wenn aktiv)
    if (supabaseSession.IsConnected)
    {
        await supabaseSession.BroadcastSimDataAsync(data);
    }
};

Console.WriteLine();
Console.WriteLine($"WebSocket-Server: ws://localhost:{WEBSOCKET_PORT}");
Console.WriteLine($"HTTP-Server:      http://localhost:{HTTP_PORT}");
Console.WriteLine();
Console.WriteLine("Befehle:");
Console.WriteLine("  [C] Verbinden mit MSFS (manuell)");
Console.WriteLine("  [D] Trennen von MSFS");
Console.WriteLine("  [R] Auto-Retry aktivieren");
Console.WriteLine("  [S] Status anzeigen");
Console.WriteLine("  [Q] Beenden");
Console.WriteLine();

// Auto-Connect Konfiguration
const int AUTO_RETRY_INTERVAL_MS = 5000; // Alle 5 Sekunden versuchen
bool autoRetryEnabled = true;
DateTime lastRetryTime = DateTime.MinValue;

// Automatischer Verbindungsversuch beim Start
Console.WriteLine("[AUTO] Versuche automatisch mit MSFS zu verbinden...");
if (!simConnect.Connect())
{
    Console.WriteLine($"[AUTO] MSFS nicht gefunden. Automatischer Retry alle {AUTO_RETRY_INTERVAL_MS / 1000} Sekunden...");
    Console.WriteLine("       Starte MSFS und die Verbindung wird automatisch hergestellt.");
    Console.WriteLine();
}
else
{
    autoRetryEnabled = false; // Keine Retries mehr nötig wenn verbunden
}

// Hauptschleife
bool running = true;
while (running)
{
    // Auto-Retry Logik: Wenn nicht verbunden und Auto-Retry aktiviert
    if (autoRetryEnabled && !simConnect.IsConnected)
    {
        if ((DateTime.Now - lastRetryTime).TotalMilliseconds >= AUTO_RETRY_INTERVAL_MS)
        {
            lastRetryTime = DateTime.Now;
            Console.WriteLine("[AUTO] Verbindungsversuch...");
            if (simConnect.Connect())
            {
                Console.WriteLine("[AUTO] Erfolgreich mit MSFS verbunden!");
                autoRetryEnabled = false;
            }
        }
    }

    // Wenn Verbindung verloren geht, Auto-Retry wieder aktivieren
    if (!autoRetryEnabled && !simConnect.IsConnected)
    {
        Console.WriteLine("[AUTO] Verbindung verloren. Aktiviere Auto-Retry...");
        autoRetryEnabled = true;
        lastRetryTime = DateTime.Now;
    }

    if (Console.KeyAvailable)
    {
        var key = Console.ReadKey(true).Key;

        switch (key)
        {
            case ConsoleKey.C:
                if (!simConnect.IsConnected)
                {
                    Console.WriteLine("\nVerbinde mit MSFS...");
                    if (simConnect.Connect())
                    {
                        autoRetryEnabled = false;
                    }
                }
                else
                {
                    Console.WriteLine("\nBereits verbunden.");
                }
                break;

            case ConsoleKey.D:
                if (simConnect.IsConnected)
                {
                    Console.WriteLine("\nTrenne Verbindung...");
                    simConnect.Disconnect();
                    autoRetryEnabled = false; // Manuell getrennt, kein Auto-Retry
                    Console.WriteLine("Auto-Retry deaktiviert. Drücke [C] zum manuellen Verbinden oder [R] für Auto-Retry.");
                }
                else
                {
                    Console.WriteLine("\nNicht verbunden.");
                }
                break;

            case ConsoleKey.R:
                if (!autoRetryEnabled)
                {
                    autoRetryEnabled = true;
                    lastRetryTime = DateTime.MinValue; // Sofort versuchen
                    Console.WriteLine("\nAuto-Retry aktiviert.");
                }
                else
                {
                    Console.WriteLine("\nAuto-Retry ist bereits aktiv.");
                }
                break;

            case ConsoleKey.S:
                Console.WriteLine();
                Console.WriteLine("=== STATUS ===");
                Console.WriteLine($"  SimConnect: {(simConnect.IsConnected ? "Verbunden" : "Nicht verbunden")}");
                Console.WriteLine($"  Auto-Retry: {(autoRetryEnabled ? "Aktiv" : "Deaktiviert")}");
                Console.WriteLine($"  WebSocket Clients: {webSocketServer.ClientCount}");
                Console.WriteLine($"  HTTP-Server: Port {HTTP_PORT}");
                Console.WriteLine($"  Remote Session: {(supabaseSession.IsConnected ? $"Aktiv ({supabaseSession.SessionCode})" : "Nicht aktiv")}");
                Console.WriteLine("==============");
                break;

            case ConsoleKey.Q:
                Console.WriteLine("\nBeende...");
                running = false;
                break;
        }
    }

    Thread.Sleep(50);
}

// Aufräumen
simConnect.Disconnect();
webSocketServer.Stop();
await supabaseSession.StopSessionAsync();

Console.WriteLine("Bridge-Server beendet.");
