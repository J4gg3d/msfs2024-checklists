using Microsoft.FlightSimulator.SimConnect;
using MSFSBridge.Models;
using System.Runtime.InteropServices;

namespace MSFSBridge;

/// <summary>
/// Manager für die SimConnect-Verbindung zu MSFS
/// </summary>
public class SimConnectManager : IDisposable
{
    private SimConnect? _simConnect;
    private bool _isConnected = false;
    private bool _disposed = false;
    private Thread? _messageThread;
    private bool _running = false;
    private bool _isPaused = false;  // Wird durch System-Event gesetzt
    private bool _atcDebugLogged = false;

    // Landing Detection
    private bool _wasOnGround = true;
    private double _lastVerticalSpeed = 0;
    private double _lastGForce = 1.0;
    private double _lastGroundSpeed = 0;
    private DateTime _lastLandingTime = DateTime.MinValue;

    // Windows Message für SimConnect
    private const int WM_USER_SIMCONNECT = 0x0402;

    // Event IDs
    private enum EVENTS
    {
        PAUSE_STATE,
        PAUSE_EX1
    }

    // Data Definition IDs
    private enum DEFINITIONS
    {
        SimData
    }

    // Request IDs
    private enum REQUESTS
    {
        SimData
    }

    // Struct für SimConnect-Daten (muss exakt zu AddToDataDefinition passen)
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    private struct SimDataStruct
    {
        public double SimulationRate;
        public double SimOnGround;
        public double Altitude;
        public double GroundSpeed;
        public double Heading;
        public double Latitude;
        public double Longitude;
        public double VerticalSpeed;  // ft/min
        public double GForce;
        public double EngCombustion1;
        public double FlapsPosition;
        public double GearPosition;

        // Parkbremse
        public double ParkingBrake;

        // Lichter
        public double LightNav;
        public double LightBeacon;
        public double LightLanding;
        public double LightTaxi;
        public double LightStrobe;
        public double LightRecognition;
        public double LightWing;
        public double LightLogo;
        public double LightPanel;

        // Elektrisch
        public double Battery1;
        public double Battery2;
        public double ExternalPower;
        public double AvionicsMaster;

        // APU
        public double ApuSwitch;
        public double ApuPctRpm;

        // Triebwerke
        public double EngCombustion2;
        public double Engine1N1;
        public double Engine1N2;
        public double Engine2N1;
        public double Engine2N2;
        public double Throttle1;
        public double Throttle2;

        // Flugsteuerung
        public double SpoilersArmed;
        public double SpoilersPosition;
        public double AutopilotMaster;
        public double AutothrottleArmed;

        // Kabine
        public double SeatbeltSign;
        public double NoSmokingSign;

        // Transponder
        public double TransponderState;

        // Anti-Ice
        public double AntiIceEng1;
        public double AntiIceEng2;
        public double AntiIceStructural;
        public double PitotHeat;

        // Treibstoffpumpen
        public double FuelPump1;
        public double FuelPump2;

        // Hydraulik - deaktiviert, existiert nicht mit Index in MSFS 2024
        // public double HydraulicPump1;
        // public double HydraulicPump2;

        // GPS Flugplan (numerische Werte)
        public double GpsIsActiveFlightPlan;
        public double GpsFlightPlanWpCount;
        public double GpsFlightPlanWpIndex;
        public double GpsWpDistance;  // in meters
        public double GpsWpEte;       // in seconds
        public double GpsEte;         // in seconds

        // Strings am Ende (müssen am Ende stehen wegen Marshalling)
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 256)]
        public string AircraftTitle;

        // ATC-SimVars für Flugnummer
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 64)]
        public string AtcId;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 64)]
        public string AtcAirline;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 8)]
        public string AtcFlightNumber;

        // GPS Waypoint Strings
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)]
        public string GpsWpNextId;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)]
        public string GpsWpPrevId;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 8)]
        public string GpsApproachAirportId;
    }

    // Events
    public event Action<SimData>? OnDataReceived;
    public event Action<LandingInfo>? OnLandingDetected;
    public event Action<string>? OnStatusChanged;
    public event Action<string>? OnError;

    public bool IsConnected => _isConnected;

    /// <summary>
    /// Prüft ob ein String gültige Zeichen enthält (keine Sonderzeichen/Müll)
    /// </summary>
    private static bool IsValidString(string? str)
    {
        if (string.IsNullOrWhiteSpace(str)) return false;
        // Prüfen ob der String nur druckbare ASCII-Zeichen enthält
        foreach (char c in str)
        {
            if (c < 32 || c > 126) return false;
        }
        return true;
    }

    /// <summary>
    /// Prüft ob ein String ein gültiger ICAO-Code ist (4 Buchstaben)
    /// </summary>
    private static bool IsValidIcao(string? str)
    {
        if (string.IsNullOrWhiteSpace(str)) return false;
        str = str.Trim();
        if (str.Length < 3 || str.Length > 4) return false;
        // ICAO-Codes sind alphanumerisch
        foreach (char c in str)
        {
            if (!char.IsLetterOrDigit(c)) return false;
        }
        return true;
    }

    /// <summary>
    /// Verbindung zum Simulator herstellen
    /// </summary>
    public bool Connect()
    {
        if (_isConnected)
        {
            OnStatusChanged?.Invoke("Bereits verbunden");
            return true;
        }

        try
        {
            OnStatusChanged?.Invoke("Verbinde mit MSFS...");

            // SimConnect-Verbindung erstellen
            _simConnect = new SimConnect("MSFS Checklist Bridge", IntPtr.Zero, WM_USER_SIMCONNECT, null, 0);

            // Event Handler registrieren
            _simConnect.OnRecvOpen += SimConnect_OnRecvOpen;
            _simConnect.OnRecvQuit += SimConnect_OnRecvQuit;
            _simConnect.OnRecvException += SimConnect_OnRecvException;
            _simConnect.OnRecvSimobjectData += SimConnect_OnRecvSimobjectData;
            _simConnect.OnRecvEvent += SimConnect_OnRecvEvent;

            // System-Events für Pause abonnieren
            _simConnect.SubscribeToSystemEvent(EVENTS.PAUSE_STATE, "Pause");
            _simConnect.SubscribeToSystemEvent(EVENTS.PAUSE_EX1, "Pause_EX1");

            // MINIMALE Daten-Definition für MSFS 2024 Kompatibilität
            // Viele SimVars aus MSFS 2020 sind in MSFS 2024 obsolete!
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "SIMULATION RATE", "number", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "SIM ON GROUND", "bool", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "PLANE ALTITUDE", "feet", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "GROUND VELOCITY", "knots", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "PLANE HEADING DEGREES TRUE", "degrees", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "PLANE LATITUDE", "degrees", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "PLANE LONGITUDE", "degrees", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "VERTICAL SPEED", "feet per minute", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "G FORCE", "GForce", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "GENERAL ENG COMBUSTION:1", "bool", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "FLAPS HANDLE PERCENT", "percent", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "GEAR TOTAL PCT EXTENDED", "percent", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);  // Ersetzt GEAR HANDLE POSITION

            // Parkbremse
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "BRAKE PARKING INDICATOR", "bool", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);

            // Lichter
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "LIGHT NAV ON", "bool", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "LIGHT BEACON ON", "bool", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "LIGHT LANDING ON", "bool", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "LIGHT TAXI ON", "bool", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "LIGHT STROBE ON", "bool", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "LIGHT RECOGNITION ON", "bool", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "LIGHT WING ON", "bool", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "LIGHT LOGO ON", "bool", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "LIGHT PANEL ON", "bool", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);

            // Elektrisch - vereinfacht für MSFS 2024
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "ELECTRICAL MASTER BATTERY:1", "bool", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "ELECTRICAL MASTER BATTERY:2", "bool", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "EXTERNAL POWER ON:1", "bool", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "CIRCUIT AVIONICS ON", "bool", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);  // Ersetzt AVIONICS MASTER SWITCH

            // APU
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "APU SWITCH", "bool", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "APU PCT RPM", "percent", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);

            // Triebwerke
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "GENERAL ENG COMBUSTION:2", "bool", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "ENG N1 RPM:1", "percent", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "ENG N2 RPM:1", "percent", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "ENG N1 RPM:2", "percent", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "ENG N2 RPM:2", "percent", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "GENERAL ENG THROTTLE LEVER POSITION:1", "percent", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "GENERAL ENG THROTTLE LEVER POSITION:2", "percent", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);

            // Flugsteuerung
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "SPOILERS ARMED", "bool", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "SPOILERS HANDLE POSITION", "percent", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "AUTOPILOT MASTER", "bool", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "AUTOPILOT THROTTLE ARM", "bool", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);

            // Kabine - deaktiviert, möglicherweise nicht in MSFS 2024
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "CABIN SEATBELTS ALERT SWITCH", "bool", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "CABIN NO SMOKING ALERT SWITCH", "bool", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);

            // Transponder
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "TRANSPONDER STATE:1", "number", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);

            // Anti-Ice
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "ENG ANTI ICE:1", "bool", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "ENG ANTI ICE:2", "bool", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "STRUCTURAL DEICE SWITCH", "bool", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "PITOT HEAT", "bool", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);

            // Treibstoffpumpen
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "GENERAL ENG FUEL PUMP SWITCH:1", "bool", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "GENERAL ENG FUEL PUMP SWITCH:2", "bool", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);

            // Hydraulik - deaktiviert, HYDRAULIC SWITCH existiert nicht mit Index in MSFS 2024
            // _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "HYDRAULIC SWITCH:1", "bool", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            // _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "HYDRAULIC SWITCH:2", "bool", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);

            // GPS Flugplan (numerische Werte)
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "GPS IS ACTIVE FLIGHT PLAN", "bool", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "GPS FLIGHT PLAN WP COUNT", "number", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "GPS FLIGHT PLAN WP INDEX", "number", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "GPS WP DISTANCE", "meters", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "GPS WP ETE", "seconds", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "GPS ETE", "seconds", SIMCONNECT_DATATYPE.FLOAT64, 0.0f, SimConnect.SIMCONNECT_UNUSED);

            // Strings am Ende
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "TITLE", null, SIMCONNECT_DATATYPE.STRING256, 0.0f, SimConnect.SIMCONNECT_UNUSED);

            // ATC-SimVars für Flugnummer
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "ATC ID", null, SIMCONNECT_DATATYPE.STRING64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "ATC AIRLINE", null, SIMCONNECT_DATATYPE.STRING64, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "ATC FLIGHT NUMBER", null, SIMCONNECT_DATATYPE.STRING8, 0.0f, SimConnect.SIMCONNECT_UNUSED);

            // GPS Waypoint Strings
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "GPS WP NEXT ID", null, SIMCONNECT_DATATYPE.STRING32, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "GPS WP PREV ID", null, SIMCONNECT_DATATYPE.STRING32, 0.0f, SimConnect.SIMCONNECT_UNUSED);
            _simConnect.AddToDataDefinition(DEFINITIONS.SimData, "GPS APPROACH AIRPORT ID", null, SIMCONNECT_DATATYPE.STRING8, 0.0f, SimConnect.SIMCONNECT_UNUSED);

            // Struct registrieren
            _simConnect.RegisterDataDefineStruct<SimDataStruct>(DEFINITIONS.SimData);

            // Message-Thread starten
            _running = true;
            _messageThread = new Thread(MessageLoop)
            {
                IsBackground = true,
                Name = "SimConnect Message Loop"
            };
            _messageThread.Start();

            // Periodische Datenabfrage starten (SECOND statt SIM_FRAME, ohne CHANGED Flag für kontinuierliche Updates)
            _simConnect.RequestDataOnSimObject(REQUESTS.SimData, DEFINITIONS.SimData, SimConnect.SIMCONNECT_OBJECT_ID_USER, SIMCONNECT_PERIOD.SECOND, SIMCONNECT_DATA_REQUEST_FLAG.DEFAULT, 0, 0, 0);

            _isConnected = true;
            OnStatusChanged?.Invoke("Verbunden mit MSFS");
            return true;
        }
        catch (COMException ex)
        {
            OnError?.Invoke($"SimConnect-Fehler: {ex.Message}");
            OnError?.Invoke("Ist MSFS gestartet?");
            Disconnect();
            return false;
        }
        catch (Exception ex)
        {
            OnError?.Invoke($"Verbindungsfehler: {ex.Message}");
            Disconnect();
            return false;
        }
    }

    /// <summary>
    /// Verbindung trennen
    /// </summary>
    public void Disconnect()
    {
        _running = false;
        _isConnected = false;

        if (_simConnect != null)
        {
            try
            {
                _simConnect.Dispose();
            }
            catch { }
            _simConnect = null;
        }

        _messageThread?.Join(1000);
        _messageThread = null;

        OnStatusChanged?.Invoke("Verbindung getrennt");
    }

    /// <summary>
    /// Message-Loop für SimConnect
    /// </summary>
    private void MessageLoop()
    {
        while (_running && _simConnect != null)
        {
            try
            {
                _simConnect.ReceiveMessage();
            }
            catch (Exception)
            {
                // Verbindung verloren
                if (_running)
                {
                    _isConnected = false;
                    OnError?.Invoke("Verbindung zu MSFS verloren");
                    _running = false;
                }
            }

            Thread.Sleep(10);
        }
    }

    #region SimConnect Event Handlers

    private void SimConnect_OnRecvOpen(SimConnect sender, SIMCONNECT_RECV_OPEN data)
    {
        OnStatusChanged?.Invoke($"Verbunden: {data.szApplicationName}");
    }

    private void SimConnect_OnRecvQuit(SimConnect sender, SIMCONNECT_RECV data)
    {
        OnStatusChanged?.Invoke("MSFS wurde beendet");
        _isConnected = false;
        _running = false;
    }

    private void SimConnect_OnRecvException(SimConnect sender, SIMCONNECT_RECV_EXCEPTION data)
    {
        OnError?.Invoke($"SimConnect Exception: {data.dwException}");
    }

    private void SimConnect_OnRecvEvent(SimConnect sender, SIMCONNECT_RECV_EVENT data)
    {
        switch ((EVENTS)data.uEventID)
        {
            case EVENTS.PAUSE_STATE:
            case EVENTS.PAUSE_EX1:
                bool wasPaused = _isPaused;
                _isPaused = data.dwData != 0;
                if (wasPaused != _isPaused)
                {
                    Console.WriteLine($"[SIM] {(_isPaused ? "Pausiert" : "Fortgesetzt")}");
                }
                break;
        }
    }

    private void SimConnect_OnRecvSimobjectData(SimConnect sender, SIMCONNECT_RECV_SIMOBJECT_DATA data)
    {
        if (data.dwRequestID == (uint)REQUESTS.SimData)
        {
            try
            {
                var simData = (SimDataStruct)data.dwData[0];

                bool currentOnGround = simData.SimOnGround > 0;
                double currentVerticalSpeed = Math.Round(simData.VerticalSpeed, 0);
                double currentGForce = Math.Round(simData.GForce, 2);
                double currentGroundSpeed = Math.Round(simData.GroundSpeed, 0);

                // Landing Detection: War in der Luft, jetzt am Boden
                if (!_wasOnGround && currentOnGround)
                {
                    // Verhindere mehrfache Landungen in kurzer Zeit (z.B. Bouncing)
                    if ((DateTime.Now - _lastLandingTime).TotalSeconds > 5)
                    {
                        var (rating, score) = LandingInfo.CalculateRating(_lastVerticalSpeed);
                        var landingInfo = new LandingInfo
                        {
                            Timestamp = DateTime.Now,
                            VerticalSpeed = _lastVerticalSpeed,
                            GForce = _lastGForce,
                            GroundSpeed = _lastGroundSpeed,
                            Rating = rating,
                            RatingScore = score,
                            AircraftTitle = simData.AircraftTitle,
                            Airport = IsValidIcao(simData.GpsApproachAirportId) ? simData.GpsApproachAirportId?.Trim().ToUpper() : null
                        };

                        Console.WriteLine($"[LANDING] {rating} ({score}/5) - VS: {_lastVerticalSpeed:F0} ft/min, G: {_lastGForce:F2}");
                        OnLandingDetected?.Invoke(landingInfo);
                        _lastLandingTime = DateTime.Now;
                    }
                }

                // State für nächsten Durchlauf speichern
                _wasOnGround = currentOnGround;
                _lastVerticalSpeed = currentVerticalSpeed;
                _lastGForce = currentGForce;
                _lastGroundSpeed = currentGroundSpeed;

                var result = new SimData
                {
                    Connected = true,
                    SimRate = Math.Round(simData.SimulationRate, 1),
                    Paused = _isPaused,
                    OnGround = currentOnGround,
                    Altitude = Math.Round(simData.Altitude, 0),
                    GroundSpeed = currentGroundSpeed,
                    Heading = Math.Round(simData.Heading, 0),
                    Latitude = simData.Latitude,
                    Longitude = simData.Longitude,
                    VerticalSpeed = currentVerticalSpeed,
                    GForce = currentGForce,
                    EnginesRunning = simData.EngCombustion1 > 0 || simData.EngCombustion2 > 0,
                    FlapsPosition = (int)Math.Round(simData.FlapsPosition),
                    GearDown = simData.GearPosition > 0,
                    AircraftTitle = simData.AircraftTitle,

                    // Parkbremse
                    ParkingBrake = simData.ParkingBrake > 0,

                    // Lichter
                    LightNav = simData.LightNav > 0,
                    LightBeacon = simData.LightBeacon > 0,
                    LightLanding = simData.LightLanding > 0,
                    LightTaxi = simData.LightTaxi > 0,
                    LightStrobe = simData.LightStrobe > 0,
                    LightRecognition = simData.LightRecognition > 0,
                    LightWing = simData.LightWing > 0,
                    LightLogo = simData.LightLogo > 0,
                    LightPanel = simData.LightPanel > 0,

                    // Elektrisch
                    Battery1 = simData.Battery1 > 0,
                    Battery2 = simData.Battery2 > 0,
                    ExternalPower = simData.ExternalPower > 0,
                    AvionicsMaster = simData.AvionicsMaster > 0,

                    // APU
                    ApuMaster = simData.ApuSwitch > 0,
                    ApuRunning = simData.ApuPctRpm > 90,
                    ApuPctRpm = Math.Round(simData.ApuPctRpm, 0),

                    // Triebwerke
                    EngineMaster1 = simData.EngCombustion1 > 0,
                    EngineMaster2 = simData.EngCombustion2 > 0,
                    Engine1N1 = Math.Round(simData.Engine1N1, 1),
                    Engine1N2 = Math.Round(simData.Engine1N2, 1),
                    Engine2N1 = Math.Round(simData.Engine2N1, 1),
                    Engine2N2 = Math.Round(simData.Engine2N2, 1),
                    Throttle1 = Math.Round(simData.Throttle1, 0),
                    Throttle2 = Math.Round(simData.Throttle2, 0),

                    // Flugsteuerung
                    SpoilersArmed = simData.SpoilersArmed > 0,
                    SpoilersPosition = Math.Round(simData.SpoilersPosition, 0),
                    AutopilotMaster = simData.AutopilotMaster > 0,
                    AutothrottleArmed = simData.AutothrottleArmed > 0,

                    // Kabine
                    SeatbeltSign = simData.SeatbeltSign > 0,
                    NoSmokingSign = simData.NoSmokingSign > 0,

                    // Transponder (0=Off, 1=Standby, 2=Test, 3=On, 4=Alt)
                    TransponderState = (int)simData.TransponderState,

                    // Anti-Ice
                    AntiIceEng1 = simData.AntiIceEng1 > 0,
                    AntiIceEng2 = simData.AntiIceEng2 > 0,
                    AntiIceStructural = simData.AntiIceStructural > 0,
                    PitotHeat = simData.PitotHeat > 0,

                    // Treibstoffpumpen
                    FuelPump1 = simData.FuelPump1 > 0,
                    FuelPump2 = simData.FuelPump2 > 0,

                    // Hydraulik - deaktiviert
                    // HydraulicPump1 = simData.HydraulicPump1 > 0,
                    // HydraulicPump2 = simData.HydraulicPump2 > 0,

                    // ATC-Daten für Flugnummer
                    AtcId = IsValidString(simData.AtcId) ? simData.AtcId?.Trim() : null,
                    AtcAirline = IsValidString(simData.AtcAirline) ? simData.AtcAirline?.Trim() : null,
                    AtcFlightNumber = IsValidString(simData.AtcFlightNumber) ? simData.AtcFlightNumber?.Trim() : null,

                    // GPS Flugplan
                    GpsIsActiveFlightPlan = simData.GpsIsActiveFlightPlan > 0,
                    GpsFlightPlanWpCount = (int)simData.GpsFlightPlanWpCount,
                    GpsFlightPlanWpIndex = (int)simData.GpsFlightPlanWpIndex,
                    GpsWpDistance = Math.Round(simData.GpsWpDistance / 1852.0, 1),  // Meter zu NM
                    GpsWpEte = Math.Round(simData.GpsWpEte, 0),
                    GpsEte = Math.Round(simData.GpsEte, 0),

                    // GPS Waypoints
                    GpsWpNextId = IsValidString(simData.GpsWpNextId) ? simData.GpsWpNextId?.Trim() : null,
                    GpsWpPrevId = IsValidString(simData.GpsWpPrevId) ? simData.GpsWpPrevId?.Trim() : null,
                    GpsApproachAirportId = IsValidIcao(simData.GpsApproachAirportId) ? simData.GpsApproachAirportId?.Trim().ToUpper() : null
                };

                OnDataReceived?.Invoke(result);
            }
            catch (Exception ex)
            {
                OnError?.Invoke($"Daten-Parsing-Fehler: {ex.Message}");
            }
        }
    }

    #endregion

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;

        Disconnect();
        GC.SuppressFinalize(this);
    }
}
