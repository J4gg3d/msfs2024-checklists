using Fleck;
using MSFSBridge.Models;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;

namespace MSFSBridge;

/// <summary>
/// WebSocket-Server der Sim-Daten an verbundene Clients sendet
/// </summary>
public class BridgeWebSocketServer : IDisposable
{
    private WebSocketServer? _server;
    private readonly List<IWebSocketConnection> _clients = new();
    private readonly object _lock = new();
    private bool _disposed = false;

    private readonly JsonSerializerSettings _jsonSettings = new()
    {
        ContractResolver = new CamelCasePropertyNamesContractResolver(),
        NullValueHandling = NullValueHandling.Ignore
    };

    public event Action<string>? OnLog;
    public event Action<IWebSocketConnection>? OnClientConnected;

    public int ClientCount
    {
        get
        {
            lock (_lock)
            {
                return _clients.Count;
            }
        }
    }

    /// <summary>
    /// Startet den WebSocket-Server
    /// </summary>
    public void Start(int port = 8080)
    {
        try
        {
            _server = new WebSocketServer($"ws://0.0.0.0:{port}");

            _server.Start(socket =>
            {
                socket.OnOpen = () =>
                {
                    lock (_lock)
                    {
                        _clients.Add(socket);
                    }
                    OnLog?.Invoke($"Client verbunden: {socket.ConnectionInfo.ClientIpAddress} (Gesamt: {ClientCount})");
                    OnClientConnected?.Invoke(socket);
                };

                socket.OnClose = () =>
                {
                    lock (_lock)
                    {
                        _clients.Remove(socket);
                    }
                    OnLog?.Invoke($"Client getrennt: {socket.ConnectionInfo.ClientIpAddress} (Gesamt: {ClientCount})");
                };

                socket.OnError = (ex) =>
                {
                    OnLog?.Invoke($"WebSocket-Fehler: {ex.Message}");
                    lock (_lock)
                    {
                        _clients.Remove(socket);
                    }
                };

                socket.OnMessage = (message) =>
                {
                    // Für zukünftige Befehle von der Webseite
                    OnLog?.Invoke($"Nachricht empfangen: {message}");
                    HandleClientMessage(socket, message);
                };
            });

            OnLog?.Invoke($"WebSocket-Server gestartet auf Port {port}");
        }
        catch (Exception ex)
        {
            OnLog?.Invoke($"Server-Startfehler: {ex.Message}");
            throw;
        }
    }

    /// <summary>
    /// Stoppt den WebSocket-Server
    /// </summary>
    public void Stop()
    {
        lock (_lock)
        {
            foreach (var client in _clients.ToList())
            {
                try
                {
                    client.Close();
                }
                catch { }
            }
            _clients.Clear();
        }

        _server?.Dispose();
        _server = null;

        OnLog?.Invoke("WebSocket-Server gestoppt");
    }

    /// <summary>
    /// Sendet Sim-Daten an alle verbundenen Clients
    /// </summary>
    public void BroadcastSimData(SimData data)
    {
        var json = JsonConvert.SerializeObject(data, _jsonSettings);
        Broadcast(json);
    }

    /// <summary>
    /// Sendet Sim-Daten an einen einzelnen Client
    /// </summary>
    public void SendToClient(IWebSocketConnection client, SimData data)
    {
        try
        {
            if (client.IsAvailable)
            {
                var json = JsonConvert.SerializeObject(data, _jsonSettings);
                client.Send(json);
            }
        }
        catch (Exception ex)
        {
            OnLog?.Invoke($"Send-Fehler: {ex.Message}");
        }
    }

    /// <summary>
    /// Sendet eine Nachricht an alle verbundenen Clients
    /// </summary>
    private void Broadcast(string message)
    {
        List<IWebSocketConnection> clientsCopy;

        lock (_lock)
        {
            clientsCopy = _clients.ToList();
        }

        foreach (var client in clientsCopy)
        {
            try
            {
                if (client.IsAvailable)
                {
                    client.Send(message);
                }
            }
            catch (Exception ex)
            {
                OnLog?.Invoke($"Broadcast-Fehler: {ex.Message}");
            }
        }
    }

    /// <summary>
    /// Verarbeitet Nachrichten vom Client
    /// </summary>
    private void HandleClientMessage(IWebSocketConnection socket, string message)
    {
        // Für zukünftige Erweiterungen:
        // - Checklisten-Status synchronisieren
        // - Befehle an den Simulator senden
        // - etc.

        try
        {
            var command = JsonConvert.DeserializeObject<ClientCommand>(message);
            if (command != null)
            {
                switch (command.Type)
                {
                    case "ping":
                        socket.Send(JsonConvert.SerializeObject(new { type = "pong" }));
                        break;
                    // Weitere Befehle hier hinzufügen
                }
            }
        }
        catch
        {
            // Ungültige Nachricht ignorieren
        }
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;

        Stop();
        GC.SuppressFinalize(this);
    }
}

/// <summary>
/// Datenmodell für Client-Befehle
/// </summary>
public class ClientCommand
{
    public string? Type { get; set; }
    public object? Data { get; set; }
}
