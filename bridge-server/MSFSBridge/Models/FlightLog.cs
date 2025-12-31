using Newtonsoft.Json;

namespace MSFSBridge.Models;

/// <summary>
/// Repräsentiert einen kompletten Flug für das Logbuch
/// </summary>
public class FlightLog
{
    [JsonProperty("user_id")]
    public string? UserId { get; set; }

    [JsonProperty("origin")]
    public string? Origin { get; set; }

    [JsonProperty("destination")]
    public string? Destination { get; set; }

    [JsonProperty("aircraft_type")]
    public string? AircraftType { get; set; }

    [JsonProperty("departure_time")]
    public DateTime? DepartureTime { get; set; }

    [JsonProperty("arrival_time")]
    public DateTime ArrivalTime { get; set; } = DateTime.UtcNow;

    [JsonProperty("flight_duration_seconds")]
    public int FlightDurationSeconds { get; set; }

    [JsonProperty("distance_nm")]
    public double DistanceNm { get; set; }

    [JsonProperty("max_altitude_ft")]
    public int MaxAltitudeFt { get; set; }

    [JsonProperty("landing_rating")]
    public int LandingRating { get; set; }

    [JsonProperty("landing_vs")]
    public double LandingVs { get; set; }

    [JsonProperty("landing_gforce")]
    public double LandingGforce { get; set; }

    [JsonProperty("session_code")]
    public string? SessionCode { get; set; }
}
