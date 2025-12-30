namespace MSFSBridge.Models;

/// <summary>
/// Datenmodell für Landing-Informationen
/// </summary>
public class LandingInfo
{
    public DateTime Timestamp { get; set; } = DateTime.Now;

    // Touchdown-Daten
    public double VerticalSpeed { get; set; }  // ft/min (negativ = sinken)
    public double GForce { get; set; }
    public double GroundSpeed { get; set; }  // knots

    // Rating
    public string Rating { get; set; } = "Unknown";
    public int RatingScore { get; set; }  // 1-5 (5 = Perfect)

    // Flugzeug & Ort
    public string? AircraftTitle { get; set; }
    public string? Airport { get; set; }  // ICAO wenn verfügbar

    /// <summary>
    /// Berechnet das Rating basierend auf der Vertical Speed
    /// </summary>
    public static (string Rating, int Score) CalculateRating(double verticalSpeedFpm)
    {
        // Vertical Speed ist negativ beim Sinken, wir nehmen den Absolutwert
        double absVs = Math.Abs(verticalSpeedFpm);

        if (absVs < 100)
            return ("Perfect", 5);
        else if (absVs < 200)
            return ("Good", 4);
        else if (absVs < 300)
            return ("Acceptable", 3);
        else if (absVs < 500)
            return ("Hard", 2);
        else
            return ("Very Hard", 1);
    }
}
