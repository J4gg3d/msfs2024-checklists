using MSFSBridge.Models;

namespace MSFSBridge;

/// <summary>
/// Trackt Flugdaten vom Takeoff bis zur Landung
/// </summary>
public class FlightTracker
{
    // Takeoff-Daten
    private DateTime _takeoffTime;
    private string? _originAirport;
    private double _takeoffLatitude;
    private double _takeoffLongitude;
    private string? _aircraftType;

    // Während des Flugs
    private double _maxAltitude;
    private double _totalDistanceNm;
    private double _lastLatitude;
    private double _lastLongitude;
    private bool _isTracking;

    // Session
    private string? _sessionCode;
    private string? _userId;

    public event Action<string>? OnLog;

    public bool IsTracking => _isTracking;

    /// <summary>
    /// Setzt User-ID für eingeloggte Benutzer
    /// </summary>
    public void SetUserId(string? userId)
    {
        _userId = userId;
    }

    /// <summary>
    /// Setzt Session-Code für anonyme Flüge
    /// </summary>
    public void SetSessionCode(string? sessionCode)
    {
        _sessionCode = sessionCode;
    }

    /// <summary>
    /// Startet das Tracking bei Takeoff
    /// </summary>
    public void StartTracking(SimData data, string? originAirport)
    {
        _takeoffTime = DateTime.UtcNow;
        _originAirport = originAirport?.ToUpperInvariant();
        _takeoffLatitude = data.Latitude ?? 0;
        _takeoffLongitude = data.Longitude ?? 0;
        _aircraftType = data.AircraftTitle;

        _maxAltitude = data.Altitude ?? 0;
        _totalDistanceNm = 0;
        _lastLatitude = data.Latitude ?? 0;
        _lastLongitude = data.Longitude ?? 0;
        _isTracking = true;

        OnLog?.Invoke($"Flight tracking started from {_originAirport ?? "unknown"}");
    }

    /// <summary>
    /// Aktualisiert die Flugdaten während des Flugs
    /// </summary>
    public void Update(SimData data)
    {
        if (!_isTracking) return;

        var currentAltitude = data.Altitude ?? 0;
        var currentLatitude = data.Latitude ?? 0;
        var currentLongitude = data.Longitude ?? 0;

        // Max Altitude tracken
        if (currentAltitude > _maxAltitude)
        {
            _maxAltitude = currentAltitude;
        }

        // Distanz berechnen (Haversine)
        if (_lastLatitude != 0 && _lastLongitude != 0)
        {
            var distance = CalculateDistanceNm(_lastLatitude, _lastLongitude, currentLatitude, currentLongitude);
            // Nur plausible Distanzen addieren (max 10 NM pro Update, verhindert Teleport-Bugs)
            if (distance < 10)
            {
                _totalDistanceNm += distance;
            }
        }

        _lastLatitude = currentLatitude;
        _lastLongitude = currentLongitude;
    }

    /// <summary>
    /// Beendet das Tracking bei Landung und gibt den FlightLog zurück
    /// </summary>
    public FlightLog? StopTracking(LandingInfo landing, string? destinationAirport)
    {
        if (!_isTracking) return null;

        _isTracking = false;

        var flightLog = new FlightLog
        {
            UserId = _userId,
            Origin = _originAirport,
            Destination = destinationAirport?.ToUpperInvariant(),
            AircraftType = _aircraftType,
            DepartureTime = _takeoffTime,
            ArrivalTime = DateTime.UtcNow,
            FlightDurationSeconds = (int)(DateTime.UtcNow - _takeoffTime).TotalSeconds,
            DistanceNm = Math.Round(_totalDistanceNm, 2),
            MaxAltitudeFt = (int)_maxAltitude,
            LandingRating = landing.RatingScore,
            LandingVs = landing.VerticalSpeed,
            LandingGforce = landing.GForce,
            SessionCode = _sessionCode
        };

        OnLog?.Invoke($"Flight completed: {flightLog.Origin ?? "?"} → {flightLog.Destination ?? "?"}, {flightLog.DistanceNm:F1} NM, {flightLog.FlightDurationSeconds / 60} min");

        return flightLog;
    }

    /// <summary>
    /// Bricht das Tracking ab (z.B. bei ungültigem Flug)
    /// </summary>
    public void CancelTracking()
    {
        _isTracking = false;
        OnLog?.Invoke("Flight tracking cancelled");
    }

    /// <summary>
    /// Berechnet die Distanz zwischen zwei Koordinaten in Nautical Miles (Haversine)
    /// </summary>
    private static double CalculateDistanceNm(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 3440.065; // Erdradius in NM

        var dLat = ToRadians(lat2 - lat1);
        var dLon = ToRadians(lon2 - lon1);

        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);

        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));

        return R * c;
    }

    private static double ToRadians(double degrees)
    {
        return degrees * Math.PI / 180;
    }
}
