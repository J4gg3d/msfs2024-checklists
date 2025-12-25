using MSFSBridge;

Console.WriteLine("╔══════════════════════════════════════════════════════════════╗");
Console.WriteLine("║           MSFS Checklist - Bridge Server                     ║");
Console.WriteLine("║                                                              ║");
Console.WriteLine("║  Verbindet Microsoft Flight Simulator mit der Checkliste     ║");
Console.WriteLine("╚══════════════════════════════════════════════════════════════╝");
Console.WriteLine();

const int WEBSOCKET_PORT = 8080;

// WebSocket-Server erstellen und starten
using var webSocketServer = new BridgeWebSocketServer();
webSocketServer.OnLog += (message) => Console.WriteLine($"[WS] {message}");

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

// SimConnect-Manager erstellen
using var simConnect = new SimConnectManager();

simConnect.OnStatusChanged += (status) => Console.WriteLine($"[SIM] {status}");
simConnect.OnError += (error) => Console.WriteLine($"[SIM FEHLER] {error}");
simConnect.OnDataReceived += (data) =>
{
    // Daten an alle verbundenen WebSocket-Clients senden
    webSocketServer.BroadcastSimData(data);
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

Console.WriteLine("Bridge-Server beendet.");
