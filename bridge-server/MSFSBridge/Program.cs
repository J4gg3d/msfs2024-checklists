using MSFSBridge;
using DotNetEnv;

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
    Console.WriteLine();
    Console.WriteLine("[SESSION] Supabase nicht konfiguriert - Remote-Session deaktiviert.");
    Console.WriteLine("          Setze SUPABASE_URL und SUPABASE_ANON_KEY als Umgebungsvariablen");
    Console.WriteLine("          um Remote-Zugriff von Tablets zu ermöglichen.");
    Console.WriteLine();
}

// SimConnect-Manager erstellen
using var simConnect = new SimConnectManager();

simConnect.OnStatusChanged += (status) => Console.WriteLine($"[SIM] {status}");
simConnect.OnError += (error) => Console.WriteLine($"[SIM FEHLER] {error}");
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
Console.WriteLine($"WebSocket-Server läuft auf: ws://localhost:{WEBSOCKET_PORT}");
Console.WriteLine();
Console.WriteLine("Befehle:");
Console.WriteLine("  [C] Verbinden mit MSFS");
Console.WriteLine("  [D] Trennen von MSFS");
Console.WriteLine("  [S] Status anzeigen");
Console.WriteLine("  [Q] Beenden");
Console.WriteLine();

// Hauptschleife
bool running = true;
while (running)
{
    if (Console.KeyAvailable)
    {
        var key = Console.ReadKey(true).Key;

        switch (key)
        {
            case ConsoleKey.C:
                if (!simConnect.IsConnected)
                {
                    Console.WriteLine("\nVerbinde mit MSFS...");
                    simConnect.Connect();
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
                }
                else
                {
                    Console.WriteLine("\nNicht verbunden.");
                }
                break;

            case ConsoleKey.S:
                Console.WriteLine();
                Console.WriteLine("=== STATUS ===");
                Console.WriteLine($"  SimConnect: {(simConnect.IsConnected ? "Verbunden" : "Nicht verbunden")}");
                Console.WriteLine($"  WebSocket Clients: {webSocketServer.ClientCount}");
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
