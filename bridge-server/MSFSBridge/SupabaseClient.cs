using System.Text;
using MSFSBridge.Models;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;

namespace MSFSBridge;

/// <summary>
/// HTTP Client für Supabase REST API (Flüge speichern)
/// </summary>
public class SupabaseClient : IDisposable
{
    private readonly HttpClient _httpClient;
    private readonly string? _supabaseUrl;
    private readonly string? _supabaseKey;
    private readonly bool _isConfigured;
    private bool _disposed;

    private readonly JsonSerializerSettings _jsonSettings = new()
    {
        ContractResolver = new CamelCasePropertyNamesContractResolver(),
        NullValueHandling = NullValueHandling.Ignore
    };

    public event Action<string>? OnLog;
    public event Action<string>? OnError;

    public bool IsConfigured => _isConfigured;

    public SupabaseClient()
    {
        _httpClient = new HttpClient();

        // Credentials aus Environment laden
        _supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL")
                      ?? Environment.GetEnvironmentVariable("VITE_SUPABASE_URL");

        // Service Role Key bevorzugen (umgeht RLS), sonst Anon Key
        _supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_SERVICE_KEY")
                      ?? Environment.GetEnvironmentVariable("SUPABASE_ANON_KEY")
                      ?? Environment.GetEnvironmentVariable("VITE_SUPABASE_ANON_KEY");

        _isConfigured = !string.IsNullOrEmpty(_supabaseUrl) && !string.IsNullOrEmpty(_supabaseKey);

        if (_isConfigured)
        {
            _httpClient.DefaultRequestHeaders.Add("apikey", _supabaseKey);
            _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {_supabaseKey}");
            _httpClient.DefaultRequestHeaders.Add("Prefer", "return=representation");
        }
    }

    /// <summary>
    /// Speichert einen Flug in der Datenbank
    /// </summary>
    public async Task<bool> SaveFlightAsync(FlightLog flight)
    {
        if (!_isConfigured)
        {
            OnLog?.Invoke("Supabase nicht konfiguriert - Flug wird nicht gespeichert");
            return false;
        }

        try
        {
            var json = JsonConvert.SerializeObject(flight, _jsonSettings);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var url = $"{_supabaseUrl}/rest/v1/flights";
            var response = await _httpClient.PostAsync(url, content);

            if (response.IsSuccessStatusCode)
            {
                OnLog?.Invoke($"Flug gespeichert: {flight.Origin} → {flight.Destination}");
                return true;
            }
            else
            {
                var error = await response.Content.ReadAsStringAsync();
                OnError?.Invoke($"Fehler beim Speichern: {response.StatusCode} - {error}");
                return false;
            }
        }
        catch (Exception ex)
        {
            OnError?.Invoke($"Fehler beim Speichern: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Holt die letzten Flüge eines Users
    /// </summary>
    public async Task<List<FlightLog>?> GetFlightsAsync(string userId, int limit = 10)
    {
        if (!_isConfigured) return null;

        try
        {
            var url = $"{_supabaseUrl}/rest/v1/flights?user_id=eq.{userId}&order=created_at.desc&limit={limit}";
            var response = await _httpClient.GetAsync(url);

            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync();
                return JsonConvert.DeserializeObject<List<FlightLog>>(json, _jsonSettings);
            }
        }
        catch (Exception ex)
        {
            OnError?.Invoke($"Fehler beim Laden: {ex.Message}");
        }

        return null;
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        _httpClient.Dispose();
        GC.SuppressFinalize(this);
    }
}
