/*
 * ESP32 SENSOR NODE - V3
 * Version: 4.3.0
 * Revision: deterministic Wi-Fi state machine + complete reason diagnostics + scan hardening + Sonner-style UI
 * Hardware: DHT22 GPIO4 | MQ-2 GPIO34 | MQ-3 GPIO35 | LED GPIO2
 * Build target: esp32:esp32:esp32
 * Arduino-ESP32 core: 3.3.12
 */

#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Preferences.h>
#include <DHT.h>
#include "esp_wifi.h"

// ============================================================
// ESP32 SENSOR NODE
// DHT22 -> GPIO4
// MQ-2  -> GPIO34
// MQ-3  -> GPIO35
// LED   -> GPIO2
//
// AP is ALWAYS available for local configuration.
// STA Wi-Fi is optional and independently reported.
// Sensors work locally regardless of STA connectivity.
// ============================================================

#define DHT_PIN 4
#define MQ2_PIN 34
#define MQ3_PIN 35
#define GREEN_LED 26
#define YELLOW_LED 27
#define RED_LED 33
#define BUZZER_PIN 32
#define BUTTON_PIN 0  // EN is hardware-reset and cannot be used in code. Changed to 0 (the BOOT button).

const char* AP_SSID = "ESP32-Sensor";
const char* AP_PASSWORD = "esp32sensor";

WebServer server(80);
Preferences prefs;
uint8_t dhtType = DHT22;
String dhtModel = "DHT22";
DHT dht(DHT_PIN, DHT22);
int consecutiveDhtFails = 0;

void applyDHTConfig(String model, bool saveNVS = false);

String wifiSSID;
String wifiPassword;
String backendURL;

float temperatureC = NAN;
float humidity = NAN;
int mq2Raw = 0;
int mq3Raw = 0;
bool dhtOK = false;
float currentSpoilageScore = 0.0;
String currentStatus = "GOOD";

// ---------------------------------------------------------------------------
// Food-event / sensor-fusion state
// IMPORTANT: DHT22 measures AIR around the sensor, not food temperature.
// Hot food can therefore create a legitimate temperature/humidity spike.
// Those spikes must NOT be treated as spoilage by themselves.
//
// MQ-2/MQ-3 are broad-spectrum gas sensors. Their raw ADC values are NOT
// ppm and cannot be converted to a universal "spoilage" value without
// calibration. This firmware therefore uses relative-to-baseline changes,
// persistence, and cross-sensor agreement instead of fixed raw thresholds.
// ---------------------------------------------------------------------------
float baselineTempC = NAN;
float baselineHumidity = NAN;
float baselineMq2 = NAN;
float baselineMq3 = NAN;
float filteredMq2 = NAN;
float filteredMq3 = NAN;

unsigned long sensorWarmupStarted = 0;
unsigned long hotFoodStartedAt = 0;
unsigned long hotFoodLastSeenAt = 0;
unsigned long gasEvidenceStartedAt = 0;
unsigned long lastBaselineUpdate = 0;

bool hotFoodEvent = false;
bool gasEvidencePersistent = false;
bool sensorSystemReady = false;

const unsigned long SENSOR_WARMUP_MS = 120000UL;       // 2 min demo warm-up
const unsigned long HOT_FOOD_HOLD_MS = 900000UL;       // 15 min after hot-food detection
const unsigned long GAS_PERSIST_MS = 180000UL;         // gas evidence must persist 3 min
const unsigned long BASELINE_UPDATE_MS = 30000UL;

const float HOT_TEMP_RISE_C = 2.5f;                    // rapid air-temperature rise
const float HOT_TEMP_ABSOLUTE_C = 34.0f;               // strong hot-food indicator
const float HOT_HUMIDITY_RISE_PCT = 10.0f;

const float GAS_CAUTION_DELTA = 0.25f;                 // +25% vs baseline
const float GAS_SPOILED_DELTA = 0.60f;                 // +60% vs baseline
const float GAS_ABSOLUTE_MIN = 120.0f;                 // ignore tiny ADC noise

// Prevent one noisy sample from changing the verdict.
const int REQUIRED_BAD_SAMPLES = 6;
int badGasSamples = 0;
int goodGasSamples = 0;

// Hardware Configuration & Test Lock Mode
String buzzerType = "PASSIVE"; // "PASSIVE" (PWM tone) or "ACTIVE" (direct DC 3.3V/5V)
bool testLockMode = false;     // When true, manual hardware test states stay locked indefinitely

// Fast sensor sampling timers (MQ gas sampled every 200ms for zero latency)
unsigned long lastMqRead = 0;
unsigned long lastCautionBeepAt = 0;
unsigned long lastSpoiledAlarmCycleAt = 0;
int spoiledAlarmStep = 0;

// Thread-safe backend command transfer
volatile bool pendingBackendCommand = false;
String pendingServerStatus = "";

// Forward declarations
float gasAnomalyScore(float raw2, float raw3);
void setBuzzerHardware(bool on, int freq = 2000, int strength = 80);
void buzzBeep(int durationMs, int freq = 2000, int strength = 80);
float calculateSpoilageScore(float temp, float hum, int raw2, int raw3,
                              float &gasIdx, float &tempIdx, float &humIdx) {
  // Compatibility wrapper for the existing API/backend.
  // IMPORTANT: this is NOT a ppm calculation.
  gasIdx = gasAnomalyScore(raw2, raw3);

  // Context metrics are intentionally low-weight and can never independently
  // trigger a warning. During a hot-food event they are zeroed.
  if (hotFoodEvent) {
    tempIdx = 0.0f;
    humIdx = 0.0f;
    return min(gasIdx * 0.85f, 10.0f);
  }

  tempIdx = constrain((temp - 25.0f) * 1.5f, 0.0f, 15.0f);
  humIdx = constrain((hum - 65.0f) * 0.35f, 0.0f, 10.0f);

  float score = gasIdx * 0.85f + tempIdx * 0.10f + humIdx * 0.05f;

  if (!gasEvidencePersistent) score = min(score, 55.0f);
  return constrain(score, 0.0f, 100.0f);
}

void applyLedStates(String status);
void updateLEDsAndBuzzer(String status);
void runBootSelfTest();
void updateFoodClassification();
void updateSensorBaselines();
bool detectHotFoodEvent();
bool gasEvidenceIsStrong();

const String DEVICE_ID = "ESP32_FOOD_001";
unsigned long lastBackendSendTime = 0;
const unsigned long backendSendInterval = 5000;
unsigned long manualLedOverrideUntil = 0;
volatile bool backendTaskRunning = false;
String pendingBackendJson = "";

unsigned long lastSensorRead = 0;
unsigned long lastReconnect = 0;
unsigned long wifiConnectStarted = 0;
bool staAttempted = false;
bool wifiConnecting = false;
bool scanInProgress = false;
int16_t lastScanCount = -1;
String lastWiFiAction = "Booting";
String lastWiFiError = "";
volatile uint16_t pendingDisconnectReason = 0;
volatile bool pendingDisconnectEvent = false;
volatile bool pendingGotIPEvent = false;
volatile bool pendingConnectedEvent = false;
volatile bool ignoreIntentionalDisconnect = false;
volatile unsigned long ignoreIntentionalDisconnectUntil = 0;
uint16_t lastDisconnectReason = 0;
String lastDisconnectReasonName = "NO_DISCONNECT_EVENT";
unsigned long lastDisconnectAt = 0;
unsigned long lastGotIPAt = 0;
unsigned long connectAttemptCount = 0;
bool staAssociated = false;
int lastTargetScanCount = -1;
bool lastTargetVisible = false;

String wifiDisconnectReasonName(uint16_t reason) {
  switch (reason) {
    case 0: return "NO_REASON_REPORTED";
    case 1: return "UNSPECIFIED";
    case 2: return "AUTH_EXPIRE";
    case 3: return "AUTH_LEAVE";
    case 4: return "ASSOC_EXPIRE";
    case 5: return "ASSOC_TOOMANY";
    case 6: return "NOT_AUTHED";
    case 7: return "NOT_ASSOCED";
    case 8: return "ASSOC_LEAVE";
    case 15: return "4WAY_HANDSHAKE_TIMEOUT";
    case 23: return "IEEE802_1X_AUTH_FAILED";
    case 34: return "DISASSOC_LOW_ACK";
    case 36: return "ASSOC_COMEBACK_TIME_TOO_LONG";
    case 200: return "BEACON_TIMEOUT";
    case 201: return "NO_AP_FOUND";
    case 202: return "AUTH_FAIL";
    case 203: return "ASSOC_FAIL";
    case 204: return "HANDSHAKE_TIMEOUT";
    case 205: return "CONNECTION_FAIL";
    case 206: return "AP_TSF_RESET";
    case 207: return "ROAMING";
    case 208: return "ASSOC_COMEBACK_TIME_TOO_LONG_ESPIDF";
    case 209: return "SA_QUERY_TIMEOUT";
    case 210: return "NO_AP_FOUND_INCOMPATIBLE_SECURITY";
    case 211: return "NO_AP_FOUND_IN_AUTHMODE_THRESHOLD";
    case 212: return "NO_AP_FOUND_IN_RSSI_THRESHOLD";
    default: return "REASON_" + String(reason);
  }
}

String wifiActionHint(uint16_t reason) {
  switch (reason) {
    case 15:
    case 204: return "Likely WPA password/security handshake failure. Verify password and use WPA2/2.4 GHz compatibility mode.";
    case 201: return "SSID was not found. Verify hotspot is ON, visible, and 2.4 GHz.";
    case 202: return "Authentication failed. Check password and hotspot security mode.";
    case 203: return "Association failed. Try 2.4 GHz compatibility mode and WPA2.";
    case 210: return "AP was found but its security is incompatible with this ESP32 configuration.";
    case 211: return "AP security/authentication mode was rejected by the ESP32.";
    case 212: return "AP signal is below the configured RSSI threshold.";
    case 205: return "Generic connection failure. Check hotspot band, security and signal.";
    default: return "Check the raw disconnect reason, Wi-Fi status and hotspot configuration.";
  }
}

// Arduino-ESP32 invokes Wi-Fi callbacks from a separate FreeRTOS task.
// Only write small POD/volatile flags here; String/Serial/UI work happens in loop().
void wifiEvent(WiFiEvent_t event, WiFiEventInfo_t info) {
  if (event == ARDUINO_EVENT_WIFI_STA_CONNECTED) {
    pendingConnectedEvent = true;
  } else if (event == ARDUINO_EVENT_WIFI_STA_DISCONNECTED) {
    if (ignoreIntentionalDisconnect && millis() <= ignoreIntentionalDisconnectUntil) {
      ignoreIntentionalDisconnect = false;
      return;
    }
    ignoreIntentionalDisconnect = false;
    pendingDisconnectReason = info.wifi_sta_disconnected.reason;
    pendingDisconnectEvent = true;
  } else if (event == ARDUINO_EVENT_WIFI_STA_GOT_IP) {
    pendingGotIPEvent = true;
  }
}

void processWiFiEvents() {
  if (pendingConnectedEvent) {
    pendingConnectedEvent = false;
    staAssociated = true;
    lastWiFiAction = "Associated with AP; waiting for DHCP";
    Serial.println("[WiFi] STA associated; waiting for IP/DHCP...");
  }

  if (pendingGotIPEvent) {
    pendingGotIPEvent = false;
    wifiConnecting = false;
    wifiConnectStarted = 0;
    staAssociated = true;
    lastGotIPAt = millis();
    lastWiFiAction = "Connected / IP acquired";
    lastWiFiError = "";
    lastDisconnectReason = 0;
    lastDisconnectReasonName = "NONE";
    Serial.print("[WiFi] GOT IP: "); Serial.println(WiFi.localIP());
    Serial.print("[WiFi] RSSI: "); Serial.println(WiFi.RSSI());
    
  }

  if (pendingDisconnectEvent) {
    pendingDisconnectEvent = false;
    staAssociated = false;
    lastDisconnectReason = pendingDisconnectReason;
    lastDisconnectReasonName = wifiDisconnectReasonName(lastDisconnectReason);
    lastDisconnectAt = millis();
    lastWiFiAction = "Disconnected: " + lastDisconnectReasonName;
    lastWiFiError = "STA disconnected: " + lastDisconnectReasonName +
                    " (" + String(lastDisconnectReason) + "). " +
                    wifiActionHint(lastDisconnectReason);
    Serial.print("[WiFi] DISCONNECTED reason="); Serial.print(lastDisconnectReason);
    Serial.print(" / "); Serial.println(lastDisconnectReasonName);
    Serial.print("[WiFi] Hint: "); Serial.println(wifiActionHint(lastDisconnectReason));
    
  }
}

String jsonEscape(String s) {
  s.replace("\\", "\\\\");
  s.replace("\"", "\\\"");
  s.replace("\r", "\\r");
  s.replace("\n", "\\n");
  return s;
}

String wifiStatusName(wl_status_t s) {
  switch (s) {
    case WL_CONNECTED: return "CONNECTED";
    case WL_NO_SSID_AVAIL: return "SSID_NOT_FOUND";
    case WL_CONNECT_FAILED: return "AUTH_OR_CONNECT_FAILED";
    case WL_CONNECTION_LOST: return "CONNECTION_LOST";
    case WL_DISCONNECTED: return "DISCONNECTED";
    case WL_IDLE_STATUS: return "IDLE";
    default: return "STATUS_" + String((int)s);
  }
}

String wifiReason() {
  wl_status_t st = WiFi.status();
  if (!wifiSSID.length()) return "No station Wi-Fi credentials are configured.";
  if (st == WL_CONNECTED) return "Connected to the configured Wi-Fi network. IP: " + WiFi.localIP().toString();
  if (wifiConnecting) return staAssociated ? "Associated with the AP; waiting for DHCP/IP assignment." : "Connection attempt in progress for SSID '" + wifiSSID + "'.";
  if (lastDisconnectReason != 0) return "Last disconnect: " + lastDisconnectReasonName + " (" + String(lastDisconnectReason) + "). " + wifiActionHint(lastDisconnectReason);
  if (st == WL_NO_SSID_AVAIL) return "SSID was not found. The classic ESP32 only supports 2.4 GHz Wi-Fi; enable hotspot compatibility mode.";
  if (st == WL_CONNECT_FAILED) return "Connection failed. No disconnect event was captured; check hotspot band/security/password.";
  if (st == WL_CONNECTION_LOST) return "Station connection was lost. Automatic reconnect is enabled.";
  if (st == WL_DISCONNECTED) return "Station is disconnected. No Wi-Fi disconnect reason has been reported yet.";
  return "Wi-Fi status code: " + String((int)st) + ".";
}

void cors() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

void sendJSON(int code, const String& body) {
  cors();
  server.send(code, "application/json; charset=utf-8", body);
}

void applyDHTConfig(String model, bool saveNVS) {
  model.trim();
  model.toUpperCase();
  if (model == "DHT11" || model == "DHT33") {
    dhtType = DHT11;
    dhtModel = "DHT11";
  } else if (model == "DHT21" || model == "AM2301") {
    dhtType = DHT21;
    dhtModel = "DHT21";
  } else {
    dhtType = DHT22;
    dhtModel = "DHT22";
  }
  pinMode(DHT_PIN, INPUT_PULLUP);
  dht = DHT(DHT_PIN, dhtType);
  dht.begin();
  lastSensorRead = 0;
  if (saveNVS) {
    prefs.begin("sensor-node", false);
    prefs.putString("dht_type", dhtModel);
    prefs.end();
  }
  Serial.print("[DHT] Sensor model configured: ");
  Serial.println(dhtModel);
}

void saveConfig() {
  prefs.begin("sensor-node", false);
  prefs.putString("ssid", wifiSSID);
  prefs.putString("password", wifiPassword);
  prefs.putString("backend", backendURL);
  prefs.putString("dht_type", dhtModel);
  prefs.putString("buzzer_type", buzzerType);
  prefs.end();
}

void loadConfig() {
  prefs.begin("sensor-node", true);
  wifiSSID = prefs.getString("ssid", "");
  wifiPassword = prefs.getString("password", "");
  backendURL = prefs.getString("backend", "");
  String savedDht = prefs.getString("dht_type", "DHT22");
  buzzerType = prefs.getString("buzzer_type", "PASSIVE");
  prefs.end();

  wifiSSID.trim();
  backendURL.trim();

  applyDHTConfig(savedDht, false);

  Serial.println("Configuration loaded from NVS.");
  Serial.print("Configured SSID: ");
  Serial.println(wifiSSID.length() ? wifiSSID : "<none>");
  Serial.print("Password configured: ");
  Serial.println(wifiPassword.length() ? "yes" : "no/open network");
  Serial.print("Backend configured: ");
  Serial.println(backendURL.length() ? backendURL : "<none>");
  Serial.print("Sensor configured: ");
  Serial.println(dhtModel);
  Serial.print("Buzzer type configured: ");
  Serial.println(buzzerType);
}

void prepareWiFi() {
  WiFi.persistent(false);
  WiFi.mode(WIFI_AP_STA);
  WiFi.setAutoReconnect(false);
  WiFi.setSleep(false);

  // India: allow the full legal 2.4 GHz channel set instead of the
  // ESP-IDF world-safe default (channels 1-11). This matters for
  // phone hotspots that choose channel 12/13.
  esp_err_t countryResult = esp_wifi_set_country_code("IN", false);
  Serial.print("WiFi country IN: ");
  Serial.println(countryResult == ESP_OK ? "OK" : "FAILED");

  // Do not reject APs merely because of their advertised auth mode.
  // Actual authentication is still performed by WiFi.begin().
  WiFi.setMinSecurity(WIFI_AUTH_OPEN);
}

void startAP() {
  prepareWiFi();

  bool ok = WiFi.softAP(AP_SSID, AP_PASSWORD, 1, false, 4);

  Serial.print("Recovery AP start: ");
  Serial.println(ok ? "OK" : "FAILED");
  Serial.print("Recovery AP: ");
  Serial.println(AP_SSID);
  Serial.print("AP IP: ");
  Serial.println(WiFi.softAPIP());
}

bool findTargetAP(uint8_t &channel, uint8_t *bssidOut, int32_t &rssiOut) {
  channel = 0;
  rssiOut = -127;
  memset(bssidOut, 0, 6);

  if (!wifiSSID.length()) return false;

  Serial.println("[WiFi] Discovering configured SSID before connect...");
  int n = WiFi.scanNetworks(false, true, false, 500, 0);
  if (n < 0) {
    Serial.print("[WiFi] Discovery scan failed: ");
    Serial.println(n);
    WiFi.scanDelete();
    return false;
  }

  bool found = false;
  for (int i = 0; i < n; ++i) {
    String foundSSID = WiFi.SSID(i);
    if (foundSSID == wifiSSID) {
      int32_t rssi = WiFi.RSSI(i);
      if (!found || rssi > rssiOut) {
        channel = (uint8_t)WiFi.channel(i);
        rssiOut = rssi;
        uint8_t *b = WiFi.BSSID(i);
        if (b) memcpy(bssidOut, b, 6);
        found = true;
      }
    }
  }

  Serial.print("[WiFi] Target SSID: ");
  Serial.println(wifiSSID);
  Serial.print("[WiFi] Target visible: ");
  Serial.println(found ? "YES" : "NO");
  if (found) {
    Serial.print("[WiFi] Target channel: "); Serial.println(channel);
    Serial.print("[WiFi] Target RSSI: "); Serial.println(rssiOut);
    Serial.printf("[WiFi] Target BSSID: %02X:%02X:%02X:%02X:%02X:%02X\\n",
                  bssidOut[0], bssidOut[1], bssidOut[2], bssidOut[3], bssidOut[4], bssidOut[5]);
  }

  WiFi.scanDelete();
  return found;
}

bool beginSTAConnect() {
  if (!wifiSSID.length()) {
    wifiConnecting = false;
    wifiConnectStarted = 0;
    lastWiFiAction = "No SSID configured";
    lastWiFiError = "No station Wi-Fi credentials are configured.";
    return false;
  }

  if (wifiPassword.length() > 63 ||
      (wifiPassword.length() > 0 && wifiPassword.length() < 8)) {
    wifiConnecting = false;
    wifiConnectStarted = 0;
    lastWiFiAction = "Invalid password length";
    lastWiFiError = "Password must be empty or 8-63 characters.";
    return false;
  }

  prepareWiFi();

  // Abort an existing STA attempt without erasing saved credentials.
  // Only mark the resulting disconnect event as intentional when there is
  // actually an active/ongoing STA session to abort.
  wl_status_t previousStatus = WiFi.status();
  if (wifiConnecting || staAssociated || previousStatus == WL_CONNECTED) {
    ignoreIntentionalDisconnect = true;
    ignoreIntentionalDisconnectUntil = millis() + 1200;
    WiFi.disconnect(false, false);
  } else {
    ignoreIntentionalDisconnect = false;
    ignoreIntentionalDisconnectUntil = 0;
  }

  staAssociated = false;
  lastDisconnectReason = 0;
  lastDisconnectReasonName = "NO_DISCONNECT_EVENT";
  connectAttemptCount++;
  wifiConnecting = true;
  wifiConnectStarted = millis();
  lastWiFiAction = "Connecting to " + wifiSSID;
  lastWiFiError = "";

  Serial.println();
  Serial.println("=== STA CONNECT START ===");
  Serial.print("SSID: ");
  Serial.println(wifiSSID);

  uint8_t targetChannel = 0;
  uint8_t targetBSSID[6] = {0};
  int32_t targetRSSI = -127;
  bool targetFound = findTargetAP(targetChannel, targetBSSID, targetRSSI);

  if (targetFound && targetChannel >= 1 && targetChannel <= 14) {
    Serial.println("[WiFi] Starting targeted connection using discovered channel/BSSID.");
    WiFi.begin(wifiSSID.c_str(), wifiPassword.c_str(), targetChannel, targetBSSID, true);
  } else {
    Serial.println("[WiFi] Target SSID was not discovered. Starting normal association attempt for diagnostic purposes.");
    WiFi.begin(wifiSSID.c_str(), wifiPassword.c_str());
  }
  return true;
}

bool connectSTA(uint32_t timeoutMs) {
  // Kept as a compatibility wrapper. Connection is deliberately non-blocking.
  (void)timeoutMs;
  return beginSTAConnect();
}

void serviceSTAConnection() {
  if (ignoreIntentionalDisconnect && millis() > ignoreIntentionalDisconnectUntil) {
    ignoreIntentionalDisconnect = false;
  }

  if (!wifiConnecting) return;

  if (wifiConnectStarted == 0)
    wifiConnectStarted = millis();

  wl_status_t status = WiFi.status();

  if (status == WL_CONNECTED) {
    wifiConnecting = false;
    wifiConnectStarted = 0;
    lastWiFiAction = "Connected";
    lastWiFiError = "";

    Serial.print("STA connected. IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("Channel: ");
    Serial.println(WiFi.channel());
    Serial.print("RSSI: ");
    Serial.println(WiFi.RSSI());

    
    return;
  }

  if (millis() - wifiConnectStarted >= 15000) {
    wifiConnecting = false;
    wifiConnectStarted = 0;
    lastWiFiAction = "Connection timeout";
    lastWiFiError = "Connection timed out after 15s. Status: " + wifiStatusName(status) +
                    " (" + String((int)status) + "). " +
                    (lastDisconnectReason ? ("Last reason: " + lastDisconnectReasonName + " (" + String(lastDisconnectReason) + ").") : "No disconnect event was captured during this attempt.");

    Serial.print("STA timeout. Status: ");
    Serial.print((int)status);
    Serial.print(" / ");
    Serial.println(wifiStatusName(status));
    Serial.print("Reason: ");
    Serial.println(lastWiFiError);

    
    return;
  }
}

void readSensors() {
  unsigned long now = millis();
  bool updated = false;

  // MQ sensors: sample every 100 ms and use a small median-ish average.
  // Do NOT interpret ADC as ppm.
  if (now - lastMqRead >= 100) {
    lastMqRead = now;

    int q2[5], q3[5];
    for (int i = 0; i < 5; i++) {
      q2[i] = analogRead(MQ2_PIN);
      q3[i] = analogRead(MQ3_PIN);
    }

    // Simple sort for a robust median sample.
    for (int i = 0; i < 4; i++) {
      for (int j = i + 1; j < 5; j++) {
        if (q2[j] < q2[i]) { int t = q2[i]; q2[i] = q2[j]; q2[j] = t; }
        if (q3[j] < q3[i]) { int t = q3[i]; q3[i] = q3[j]; q3[j] = t; }
      }
    }

    mq2Raw = q2[2];
    mq3Raw = q3[2];

    // Fast EWMA filters remove single-sample spikes.
    if (isnan(filteredMq2)) filteredMq2 = mq2Raw;
    else filteredMq2 = filteredMq2 * 0.80f + mq2Raw * 0.20f;

    if (isnan(filteredMq3)) filteredMq3 = mq3Raw;
    else filteredMq3 = filteredMq3 * 0.80f + mq3Raw * 0.20f;

    updated = true;
  }

  // DHT22: never read faster than ~2 seconds.
  if (now - lastSensorRead >= 2000) {
    lastSensorRead = now;
    pinMode(DHT_PIN, INPUT_PULLUP);

    float h = dht.readHumidity();
    float t = dht.readTemperature();

    if (!isnan(h) && !isnan(t) &&
        h >= 0.0f && h <= 100.0f &&
        t >= -40.0f && t <= 80.0f) {

      // Reject physically implausible single-sample jumps from a noisy DHT.
      bool firstReading = isnan(temperatureC) || isnan(humidity);
      bool plausibleJump =
          firstReading ||
          fabsf(t - temperatureC) <= 8.0f ||
          (t >= 32.0f && t > temperatureC); // hot-food event may rise quickly

      if (plausibleJump) {
        temperatureC = t;
        humidity = h;
        dhtOK = true;
        consecutiveDhtFails = 0;
      }
    } else {
      dhtOK = false;
      consecutiveDhtFails++;

      if (consecutiveDhtFails == 4) {
        String alt = (dhtModel == "DHT22") ? "DHT11" : "DHT22";
        Serial.print("[DHT] Repeated failures. Probing alternate model: ");
        Serial.println(alt);
        applyDHTConfig(alt, false);
      } else if (consecutiveDhtFails >= 12 && consecutiveDhtFails % 6 == 0) {
        String alt = (dhtModel == "DHT22") ? "DHT11" : "DHT22";
        applyDHTConfig(alt, false);
      }
    }

    updated = true;
  }

  if (sensorWarmupStarted == 0) sensorWarmupStarted = now;

  if (updated) {
    updateSensorBaselines();
    updateFoodClassification();

    if (!testLockMode && millis() >= manualLedOverrideUntil) {
      // HOT_FOOD_EVENT is deliberately treated as GOOD for the alarm LEDs:
      // fresh hot food is not evidence of spoilage.
      String ledStatus = currentStatus;
      if (hotFoodEvent) ledStatus = "GOOD";

      if (ledStatus != currentStatus) {
        currentStatus = ledStatus;
        updateLEDsAndBuzzer(currentStatus);
      } else {
        applyLedStates(currentStatus);
      }
    }
  }
}

// Build a stable environmental baseline only while there is no obvious
// hot-food event and no sustained gas anomaly. This prevents the baseline
// from "learning" a spoiled state.
void updateSensorBaselines() {
  if (isnan(temperatureC) || isnan(humidity) ||
      isnan(filteredMq2) || isnan(filteredMq3)) return;

  unsigned long now = millis();

  // Establish the clean/environmental baseline only after the initial
  // stabilization period. For best results, keep the container empty during
  // this period so the baseline represents the environment, not food.
  if (now - sensorWarmupStarted < SENSOR_WARMUP_MS) return;

  // Initial baseline: robust exponential settling after warm-up.
  if (isnan(baselineTempC)) {
    baselineTempC = temperatureC;
    baselineHumidity = humidity;
    baselineMq2 = filteredMq2;
    baselineMq3 = filteredMq3;
    return;
  }

  if (now - lastBaselineUpdate < BASELINE_UPDATE_MS) return;
  lastBaselineUpdate = now;

  // During a thermal event or strong gas event, freeze baseline.
  if (hotFoodEvent || gasEvidencePersistent) return;

  const float a = 0.08f;
  baselineTempC = baselineTempC * (1.0f - a) + temperatureC * a;
  baselineHumidity = baselineHumidity * (1.0f - a) + humidity * a;
  baselineMq2 = baselineMq2 * (1.0f - a) + filteredMq2 * a;
  baselineMq3 = baselineMq3 * (1.0f - a) + filteredMq3 * a;
}

bool detectHotFoodEvent() {
  if (isnan(temperatureC) || isnan(humidity) ||
      isnan(baselineTempC) || isnan(baselineHumidity)) return false;

  float dT = temperatureC - baselineTempC;
  float dH = humidity - baselineHumidity;

  // A fresh hot dish typically creates a rapid thermal/humidity transient.
  // We classify this as an environmental event, not spoilage.
  bool rapidHeat = dT >= HOT_TEMP_RISE_C;
  bool highHeat = temperatureC >= HOT_TEMP_ABSOLUTE_C && dT >= 1.5f;
  bool steamRise = dH >= HOT_HUMIDITY_RISE_PCT && dT >= 1.5f;

  return rapidHeat || highHeat || steamRise;
}

float gasAnomalyScore(float raw2, float raw3) {
  if (isnan(baselineMq2) || isnan(baselineMq3)) return 0.0f;

  // Normalize each channel independently. This matters because MQ-2 and MQ-3
  // do not have the same clean-air resistance/sensitivity.
  float d2 = (raw2 - baselineMq2) / max(baselineMq2, GAS_ABSOLUTE_MIN);
  float d3 = (raw3 - baselineMq3) / max(baselineMq3, GAS_ABSOLUTE_MIN);

  d2 = max(0.0f, d2);
  d3 = max(0.0f, d3);

  // Both sensors must contribute; this reduces false positives from one
  // sensor reacting to cooking fumes/alcohol/cleaning chemicals.
  float combined = d2 * 0.45f + d3 * 0.55f;

  float score = (combined / GAS_SPOILED_DELTA) * 100.0f;
  return constrain(score, 0.0f, 100.0f);
}

bool gasEvidenceIsStrong() {
  if (isnan(baselineMq2) || isnan(baselineMq3)) return false;

  float d2 = max(0.0f, (filteredMq2 - baselineMq2) /
                          max(baselineMq2, GAS_ABSOLUTE_MIN));
  float d3 = max(0.0f, (filteredMq3 - baselineMq3) /
                          max(baselineMq3, GAS_ABSOLUTE_MIN));

  // Require both channels to be meaningfully elevated.
  bool mq2Elevated = d2 >= GAS_CAUTION_DELTA;
  bool mq3Elevated = d3 >= GAS_CAUTION_DELTA;

  return mq2Elevated && mq3Elevated;
}

void updateFoodClassification() {
  unsigned long now = millis();

  // Do not issue a food-quality verdict while the MQ heaters are stabilizing.
  if (now - sensorWarmupStarted < SENSOR_WARMUP_MS ||
      isnan(temperatureC) || isnan(humidity) ||
      isnan(baselineMq2) || isnan(baselineMq3)) {
    sensorSystemReady = false;
    hotFoodEvent = false;
    gasEvidencePersistent = false;
    currentSpoilageScore = 0.0f;
    currentStatus = "GOOD";
    return;
  }

  sensorSystemReady = true;

  bool hotNow = detectHotFoodEvent();

  if (hotNow) {
    if (!hotFoodEvent) {
      hotFoodStartedAt = now;
      Serial.println("[FOOD] Hot-food transient detected. Ignoring DHT temperature/humidity as spoilage evidence.");
    }
    hotFoodEvent = true;
    hotFoodLastSeenAt = now;
  } else if (hotFoodEvent) {
    // Keep the thermal-event suppression active after the peak.
    if (now - hotFoodLastSeenAt >= HOT_FOOD_HOLD_MS) {
      hotFoodEvent = false;
      Serial.println("[FOOD] Hot-food suppression window ended.");
    }
  }

  // Gas evidence must survive a persistence window. During a fresh hot-food
  // event, do not allow one gas spike to become a spoilage verdict.
  bool gasStrong = gasEvidenceIsStrong();

  if (!hotFoodEvent && gasStrong) {
    if (gasEvidenceStartedAt == 0) gasEvidenceStartedAt = now;
    if (now - gasEvidenceStartedAt >= GAS_PERSIST_MS) {
      gasEvidencePersistent = true;
    }
  } else if (!gasStrong) {
    gasEvidenceStartedAt = 0;
    gasEvidencePersistent = false;
  }

  float gasScore = gasAnomalyScore(filteredMq2, filteredMq3);

  // Temperature/humidity are context, NOT spoilage proof.
  // A DHT spike alone can never produce CAUTION/SPOILED.
  float tempContext = 0.0f;
  float humidityContext = 0.0f;

  if (!hotFoodEvent) {
    // Mild environmental context only.
    tempContext = constrain((temperatureC - 25.0f) * 1.5f, 0.0f, 15.0f);
    humidityContext = constrain((humidity - 65.0f) * 0.35f, 0.0f, 10.0f);
  }

  float score = gasScore * 0.85f +
                tempContext * 0.10f +
                humidityContext * 0.05f;

  // Never let the thermal event itself create a high score.
  if (hotFoodEvent) score = min(score, 10.0f);

  // Require persistence before "spoiled".
  if (!gasEvidencePersistent) {
    score = min(score, 55.0f);
  }

  currentSpoilageScore = constrain(score, 0.0f, 100.0f);

  if (hotFoodEvent) {
    // Fresh hot food / steam / temperature rise is explicitly NOT spoiled.
    currentStatus = "GOOD";
    return;
  }

  // Conservative decision thresholds:
  // CAUTION = sustained multi-sensor gas elevation.
  // SPOILED = stronger elevation + persistence.
  if (gasEvidencePersistent && gasScore >= 70.0f) {
    currentStatus = "SPOILED";
  } else if (gasEvidencePersistent && gasScore >= 30.0f) {
    currentStatus = "CAUTION";
  } else {
    currentStatus = "GOOD";
  }
}


String sensorJSON() {
  bool connected = WiFi.status() == WL_CONNECTED;

  String j = "{";
  j += "\"sensors_available\":true,";
  j += "\"temperature_c\":";
  j += isnan(temperatureC) ? "null" : String(temperatureC, 2);
  j += ",";
  j += "\"humidity\":";
  j += isnan(humidity) ? "null" : String(humidity, 2);
  j += ",";
  j += "\"dht_ok\":" + String(dhtOK ? "true" : "false") + ",";
  j += "\"dht_model\":\"" + dhtModel + "\",";
  j += "\"dht_fails\":" + String(consecutiveDhtFails) + ",";
  j += "\"pin_dht\":4,";
  j += "\"pin_dht_level\":" + String(digitalRead(DHT_PIN)) + ",";
  j += "\"pin_mq2\":34,";
  j += "\"mq2_raw\":" + String(mq2Raw) + ",";
  j += "\"mq2_voltage\":" + String((mq2Raw / 4095.0f) * 3.3f, 2) + ",";
  j += "\"mq2_signal_present\":" + String(mq2Raw > 40 ? "true" : "false") + ",";
  j += "\"mq2_heater_ok\":" + String(mq2Raw > 40 ? "true" : "false") + ",";
  j += "\"pin_mq3\":35,";
  j += "\"mq3_raw\":" + String(mq3Raw) + ",";
  j += "\"mq3_voltage\":" + String((mq3Raw / 4095.0f) * 3.3f, 2) + ",";
  j += "\"mq3_signal_present\":" + String(mq3Raw > 40 ? "true" : "false") + ",";
  j += "\"mq3_heater_ok\":" + String(mq3Raw > 40 ? "true" : "false") + ",";
  j += "\"mq_warmup\":" + String((millis() < 45000 && (mq2Raw < 40 || mq3Raw < 40)) ? "true" : "false") + ",";
  j += "\"pin_buzzer\":32,";
  j += "\"buzzer_level\":" + String(digitalRead(BUZZER_PIN)) + ",";
  j += "\"buzzer_type\":\"" + buzzerType + "\",";
  j += "\"pin_btn\":0,";
  j += "\"btn_pressed\":" + String(digitalRead(BUTTON_PIN) == LOW ? "true" : "false") + ",";
  j += "\"pin_led_green\":26,";
  j += "\"led_green_level\":" + String(digitalRead(GREEN_LED)) + ",";
  j += "\"pin_led_yellow\":27,";
  j += "\"led_yellow_level\":" + String(digitalRead(YELLOW_LED)) + ",";
  j += "\"pin_led_red\":33,";
  j += "\"led_red_level\":" + String(digitalRead(RED_LED)) + ",";
  j += "\"test_lock_mode\":" + String(testLockMode ? "true" : "false") + ",";
  j += "\"spoilage_score\":" + String(currentSpoilageScore, 1) + ",";
  j += "\"status\":\"" + currentStatus + "\",";
  j += "\"status_detail\":\"" + String(hotFoodEvent ? "HOT_FOOD_TRANSIENT" : currentStatus) + "\",";
  j += "\"sensor_system_ready\":" + String(sensorSystemReady ? "true" : "false") + ",";
  j += "\"hot_food_event\":" + String(hotFoodEvent ? "true" : "false") + ",";
  j += "\"hot_food_event_age_s\":" + String(hotFoodEvent ? (millis() - hotFoodStartedAt) / 1000UL : 0) + ",";
  j += "\"gas_evidence_persistent\":" + String(gasEvidencePersistent ? "true" : "false") + ",";
  j += "\"gas_anomaly_score\":" + String(gasAnomalyScore(filteredMq2, filteredMq3), 1) + ",";
  j += "\"baseline_mq2\":" + String(isnan(baselineMq2) ? 0 : baselineMq2, 1) + ",";
  j += "\"baseline_mq3\":" + String(isnan(baselineMq3) ? 0 : baselineMq3, 1) + ",";
  j += "\"baseline_temp_c\":" + String(isnan(baselineTempC) ? 0 : baselineTempC, 1) + ",";
  j += "\"baseline_humidity\":" + String(isnan(baselineHumidity) ? 0 : baselineHumidity, 1) + ",";

  wifi_mode_t mode = WiFi.getMode();
  bool apActive = (mode == WIFI_AP || mode == WIFI_AP_STA);

  j += "\"ap_active\":" + String(apActive ? "true" : "false") + ",";
  j += "\"ap_ip\":\"" + WiFi.softAPIP().toString() + "\",";
  j += "\"ap_clients\":" + String(WiFi.softAPgetStationNum()) + ",";
  j += "\"wifi_channel\":" + String(WiFi.channel()) + ",";

  j += "\"wifi_configured\":" + String(wifiSSID.length() ? "true" : "false") + ",";
  j += "\"wifi_connected\":" + String(connected ? "true" : "false") + ",";
  j += "\"wifi_status\":\"" + wifiStatusName(WiFi.status()) + "\",";
  j += "\"wifi_status_code\":" + String((int)WiFi.status()) + ",";
  j += "\"wifi_action\":\"" + jsonEscape(lastWiFiAction) + "\",";
  j += "\"wifi_error\":\"" + jsonEscape(lastWiFiError) + "\",";
  j += "\"wifi_disconnect_reason\":" + String(lastDisconnectReason) + ",";
  j += "\"wifi_disconnect_reason_name\":\"" + jsonEscape(lastDisconnectReasonName) + "\",";
  j += "\"wifi_reason_hint\":\"" + jsonEscape(wifiActionHint(lastDisconnectReason)) + "\",";
  j += "\"wifi_associated\":" + String(staAssociated ? "true" : "false") + ",";
  j += "\"wifi_connecting\":" + String(wifiConnecting ? "true" : "false") + ",";
  j += "\"wifi_attempts\":" + String(connectAttemptCount) + ",";
  j += "\"ssid\":\"" + jsonEscape(connected ? WiFi.SSID() : wifiSSID) + "\",";
  j += "\"station_ip\":\"" + WiFi.localIP().toString() + "\",";
  j += "\"rssi\":" + String(connected ? WiFi.RSSI() : 0) + ",";

  j += "\"backend_configured\":" + String(backendURL.length() ? "true" : "false") + ",";
  j += "\"backend_url\":\"" + jsonEscape(backendURL) + "\",";
  j += "\"uptime_s\":" + String(millis() / 1000) + ",";
  j += "\"free_heap\":" + String(ESP.getFreeHeap());
  j += "}";

  return j;
}

String scanJSON() {
  if (scanInProgress) {
    return "{\"success\":false,\"count\":0,\"error\":\"A Wi-Fi scan is already running.\"}";
  }

  bool resumeAfterScan = wifiConnecting;
  if (resumeAfterScan) {
    Serial.println("Wi-Fi scan requested while STA was connecting; temporarily pausing STA attempt.");
    wifiConnecting = false;
    WiFi.disconnect(false, false);
  }

  scanInProgress = true;
  lastScanCount = -1;
  lastTargetScanCount = 0;
  lastTargetVisible = false;
  lastWiFiAction = "Scanning Wi-Fi";
  Serial.println("Wi-Fi scan started.");

  // Synchronous full active scan. This can take a few seconds.
  int n = WiFi.scanNetworks(false, true, false, 500, 0);

  String j;

  if (n < 0) {
    lastWiFiError = "Wi-Fi scan failed with code " + String(n);
    j = "{\"success\":false,\"count\":0,\"error\":\"" +
        jsonEscape(lastWiFiError) + "\"}";
  } else {
    lastScanCount = n;
    j = "{\"success\":true,\"count\":" + String(n) + ",\"networks\":[";

    for (int i = 0; i < n; i++) {
      if (i) j += ",";

      j += "{";
      j += "\"ssid\":\"" + jsonEscape(WiFi.SSID(i)) + "\",";
      j += "\"rssi\":" + String(WiFi.RSSI(i)) + ",";
      j += "\"channel\":" + String(WiFi.channel(i)) + ",";
      j += "\"encryption\":" + String((int)WiFi.encryptionType(i));
      j += "}";
      if (wifiSSID.length() && WiFi.SSID(i) == wifiSSID) lastTargetVisible = true;
    }

    j += "]";
    j += ",\"target_ssid\":\"" + jsonEscape(wifiSSID) + "\",";
    j += "\"target_visible\":" + String(lastTargetVisible ? "true" : "false");
    j += "}";

    lastTargetScanCount = n;
    Serial.print("Wi-Fi scan complete. Networks: ");
    Serial.println(n);
    if (wifiSSID.length()) {
      Serial.print("Configured SSID visible: ");
      Serial.println(lastTargetVisible ? "YES" : "NO");
    }
  }

  WiFi.scanDelete();
  scanInProgress = false;

  if (resumeAfterScan && wifiSSID.length()) {
    lastReconnect = millis();
    beginSTAConnect();
  }

  return j;
}

bool backendURLValid(String url) {
  url.trim();

  if (!url.length()) return false;

  String lower = url;
  lower.toLowerCase();

  if (!lower.startsWith("http://") &&
      !lower.startsWith("https://")) {
    return false;
  }

  if (lower.indexOf("localhost") >= 0 ||
      lower.indexOf("127.0.0.1") >= 0 ||
      lower.indexOf("[::1]") >= 0 ||
      lower.indexOf("0.0.0.0") >= 0) {
    return false;
  }

  return true;
}

String normalizeBackendURL(String url) {
  url.trim();

  if (!url.length()) return "";

  // Replace accidental backslashes (often from terminal/shell/copy-paste escapes)
  url.replace("\\", "/");

  if (!url.startsWith("http://") &&
      !url.startsWith("https://")) {
    url = "https://" + url;
  }

  // Strip trailing slashes and spaces so base URL is clean
  while (url.endsWith("/") || url.endsWith(" ")) {
    url.remove(url.length() - 1);
  }

  return url;
}

String backendTest() {
  if (WiFi.status() != WL_CONNECTED) {
    return "{\"success\":false,\"stage\":\"wifi\",\"error\":\"ESP32 is not connected to station Wi-Fi.\"}";
  }

  if (!backendURLValid(backendURL)) {
    return "{\"success\":false,\"stage\":\"url\",\"error\":\"Backend URL is empty or invalid. Use http:// or https://.\"}";
  }

  // These addresses would refer to the ESP32 itself, not the user's PC/server.
  if (backendURL.indexOf("localhost") >= 0 ||
      backendURL.indexOf("127.0.0.1") >= 0 ||
      backendURL.indexOf("[::1]") >= 0) {
    return "{\"success\":false,\"stage\":\"url\",\"error\":\"Do not use localhost/127.0.0.1. From the ESP32, localhost means the ESP32 itself. Use the backend machine's LAN IP or public URL.\"}";
  }

  String testUrl = normalizeBackendURL(backendURL);
  // Ensure host has a trailing '/' for root HTTP GET requests
  int pathSlash = testUrl.indexOf('/', 8);
  if (pathSlash < 0) {
    testUrl += "/";
  }

  HTTPClient http;
  http.setConnectTimeout(10000);
  http.setTimeout(12000);
  http.setReuse(false);

  int code = -1;
  String response = "";

  if (testUrl.startsWith("https://")) {
    WiFiClientSecure client;
    client.setInsecure();

    if (!http.begin(client, testUrl)) {
      return "{\"success\":false,\"stage\":\"http_init\",\"error\":\"Could not initialize HTTPS connection.\"}";
    }

    code = http.GET();

    if (code > 0)
      response = http.getString();

    http.end();
  } else {
    WiFiClient client;

    if (!http.begin(client, testUrl)) {
      return "{\"success\":false,\"stage\":\"http_init\",\"error\":\"Could not initialize HTTP connection.\"}";
    }

    code = http.GET();

    if (code > 0)
      response = http.getString();

    http.end();
  }

  bool ok = (code >= 200 && code < 400);

  String j = "{";
  j += "\"success\":" + String(ok ? "true" : "false") + ",";
  j += "\"stage\":\"http\",";
  j += "\"http_code\":" + String(code) + ",";
  j += "\"url\":\"" + jsonEscape(testUrl) + "\",";

  if (ok) {
    j += "\"response\":\"" +
         jsonEscape(response.substring(0, 2000)) + "\"";
  } else if (code > 0) {
    j += "\"error\":\"HTTP " + String(code) +
         (code == 404 ? " Not Found (check route)" : " Request failed") + "\"";
  } else {
    j += "\"error\":\"" +
         jsonEscape(HTTPClient::errorToString(code)) + "\"";
  }

  j += "}";

  return j;
}

// ============================================================
// HTML
// ============================================================

const char INDEX_HTML[] PROGMEM =
"<!doctype html>\n"
"<html lang=\"en\">\n"
"<head>\n"
"<meta charset=\"utf-8\">\n"
"<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">\n"
"<meta name=\"theme-color\" content=\"#e7ebf1\">\n"
"<title>ESP32 Sensor Node</title>\n"
"\n"
"<style>\n"
":root{\n"
"  --bg:#e7ebf1;\n"
"  --surface:#e7ebf1;\n"
"  --text:#17202c;\n"
"  --muted:#687282;\n"
"  --ok:#087443;\n"
"  --bad:#b42318;\n"
"  --line:#0002;\n"
"}\n"
"\n"
"*{box-sizing:border-box}\n"
"\n"
"html,body{\n"
"  margin:0;\n"
"  min-height:100%;\n"
"  background:var(--bg);\n"
"  color:var(--text);\n"
"  font-family:system-ui,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;\n"
"}\n"
"\n"
"body.dark{\n"
"  --bg:#171a20;\n"
"  --surface:#171a20;\n"
"  --text:#f2f4f7;\n"
"  --muted:#9aa4b2;\n"
"  --line:#fff2;\n"
"}\n"
"\n"
"button,input{\n"
"  font:inherit;\n"
"}\n"
"\n"
"button{\n"
"  border:0;\n"
"  cursor:pointer;\n"
"  color:var(--text);\n"
"  background:var(--surface);\n"
"  border-radius:13px;\n"
"  padding:10px 13px;\n"
"  font-weight:700;\n"
"  box-shadow:5px 5px 12px #0002,-5px -5px 12px #fff7;\n"
"}\n"
"\n"
"body.dark button{\n"
"  box-shadow:5px 5px 12px #0008,-5px -5px 12px #fff1;\n"
"}\n"
"\n"
"button:active{\n"
"  transform:translateY(1px);\n"
"}\n"
"\n"
"main{\n"
"  width:min(940px,100%);\n"
"  margin:auto;\n"
"  padding:14px;\n"
"}\n"
"\n"
"header,.nav,.card{\n"
"  background:var(--surface);\n"
"  border-radius:20px;\n"
"  box-shadow:8px 8px 18px #0002,-8px -8px 18px #fff8;\n"
"}\n"
"\n"
"body.dark header,\n"
"body.dark .nav,\n"
"body.dark .card{\n"
"  box-shadow:8px 8px 18px #0008,-8px -8px 18px #fff1;\n"
"}\n"
"\n"
"header{\n"
"  display:flex;\n"
"  align-items:center;\n"
"  justify-content:space-between;\n"
"  gap:12px;\n"
"  padding:16px;\n"
"  margin-bottom:14px;\n"
"}\n"
"\n"
"h1,h2,h3,p{\n"
"  margin-top:0;\n"
"}\n"
"\n"
"h1{\n"
"  margin-bottom:4px;\n"
"  font-size:23px;\n"
"}\n"
"\n"
"h2{\n"
"  font-size:18px;\n"
"  margin-bottom:6px;\n"
"}\n"
"\n"
".muted{\n"
"  color:var(--muted);\n"
"}\n"
"\n"
".nav{\n"
"  display:flex;\n"
"  gap:7px;\n"
"  padding:8px;\n"
"  overflow:auto;\n"
"  margin-bottom:14px;\n"
"}\n"
"\n"
".nav button{\n"
"  flex:0 0 auto;\n"
"}\n"
"\n"
".nav button.active{\n"
"  box-shadow:inset 4px 4px 8px #0002,inset -4px -4px 8px #fff7;\n"
"}\n"
"\n"
".page{\n"
"  display:none;\n"
"}\n"
"\n"
".page.active{\n"
"  display:block;\n"
"}\n"
"\n"
".grid{\n"
"  display:grid;\n"
"  grid-template-columns:repeat(2,minmax(0,1fr));\n"
"  gap:12px;\n"
"}\n"
"\n"
".card{\n"
"  padding:16px;\n"
"  margin-bottom:12px;\n"
"}\n"
"\n"
".metric{\n"
"  min-height:130px;\n"
"}\n"
"\n"
".label{\n"
"  font-size:11px;\n"
"  color:var(--muted);\n"
"  text-transform:uppercase;\n"
"  letter-spacing:.08em;\n"
"}\n"
"\n"
".value{\n"
"  margin:8px 0 2px;\n"
"  font-size:30px;\n"
"  font-weight:850;\n"
"}\n"
"\n"
".row{\n"
"  display:flex;\n"
"  justify-content:space-between;\n"
"  align-items:center;\n"
"  gap:15px;\n"
"  padding:10px 0;\n"
"  border-bottom:1px solid var(--line);\n"
"}\n"
"\n"
".row:last-child{\n"
"  border-bottom:0;\n"
"}\n"
"\n"
".badge{\n"
"  display:inline-block;\n"
"  border-radius:999px;\n"
"  padding:5px 9px;\n"
"  background:#8882;\n"
"  font-size:12px;\n"
"  font-weight:800;\n"
"}\n"
"\n"
".badge.ok{\n"
"  color:var(--ok);\n"
"}\n"
"\n"
".badge.bad{\n"
"  color:var(--bad);\n"
"}\n"
"\n"
".field{\n"
"  margin:13px 0;\n"
"}\n"
"\n"
".field label{\n"
"  display:block;\n"
"  margin-bottom:6px;\n"
"  font-weight:700;\n"
"}\n"
"\n"
"input{\n"
"  width:100%;\n"
"  border:0;\n"
"  outline:0;\n"
"  padding:12px;\n"
"  border-radius:13px;\n"
"  color:var(--text);\n"
"  background:var(--bg);\n"
"  box-shadow:inset 4px 4px 9px #0002,inset -4px -4px 9px #fff7;\n"
"}\n"
"\n"
"body.dark input{\n"
"  box-shadow:inset 4px 4px 9px #0008,inset -4px -4px 9px #fff1;\n"
"}\n"
"\n"
".password{\n"
"  display:flex;\n"
"  gap:7px;\n"
"}\n"
"\n"
".password input{\n"
"  min-width:0;\n"
"}\n"
"\n"
".actions{\n"
"  display:flex;\n"
"  flex-wrap:wrap;\n"
"  gap:8px;\n"
"  margin-top:12px;\n"
"}\n"
"\n"
".notice{\n"
"  padding:12px;\n"
"  margin-top:12px;\n"
"  border-radius:13px;\n"
"  background:#8881;\n"
"  white-space:pre-wrap;\n"
"}\n"
"\n"
".notice.ok{\n"
"  color:var(--ok);\n"
"}\n"
"\n"
".notice.bad{\n"
"  color:var(--bad);\n"
"}\n"
"\n"
"pre{\n"
"  white-space:pre-wrap;\n"
"  word-break:break-word;\n"
"  max-height:330px;\n"
"  overflow:auto;\n"
"  padding:12px;\n"
"  border-radius:13px;\n"
"  background:#0001;\n"
"  font-size:12px;\n"
"}\n"
"\n"
".hidden{\n"
"  display:none!important;\n"
"}\n"
"\n"
".error-boundary{\n"
"  position:fixed;\n"
"  inset:12px;\n"
"  z-index:100;\n"
"  display:none;\n"
"  align-items:center;\n"
"  justify-content:center;\n"
"  padding:20px;\n"
"  background:#0009;\n"
"}\n"
"\n"
".error-boundary.on{\n"
"  display:flex;\n"
"}\n"
"\n"
".error-box{\n"
"  width:min(520px,100%);\n"
"  background:var(--surface);\n"
"  color:var(--text);\n"
"  border-radius:20px;\n"
"  padding:20px;\n"
"  box-shadow:0 20px 60px #0008;\n"
"}\n"
"\n"
"@media(max-width:620px){\n"
"  main{padding:10px}\n"
"  .grid{grid-template-columns:1fr}\n"
"  header{align-items:flex-start}\n"
"  .value{font-size:27px}\n"
"}\n"
"#toasts{position:fixed;right:16px;bottom:16px;z-index:9999;display:flex;flex-direction:column-reverse;gap:8px;max-width:320px;width:calc(100vw - 32px);max-height:220px;pointer-events:none}\n"
".toast{pointer-events:auto;cursor:pointer;background:rgba(24,24,28,.95);color:#fff;border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:9px 12px;box-shadow:0 8px 24px rgba(0,0,0,.35);display:flex;gap:8px;align-items:center;animation:toastIn .2s ease-out;font-size:13px;line-height:1.3;max-height:85px;overflow:hidden;transition:all .2s ease}\n"
".toast:hover{transform:translateY(-1px);background:rgba(34,34,40,.98)}\n"
".toast.success{border-color:rgba(80,220,130,.6);background:rgba(18,34,24,.95)}\n"
".toast.error{border-color:rgba(255,90,90,.6);background:rgba(36,18,20,.95)}\n"
".toast.warn{border-color:rgba(255,190,60,.6);background:rgba(36,28,16,.95)}\n"
".toast .toast-content{flex:1;min-width:0;overflow:hidden}\n"
".toast .toast-title{font-weight:600;font-size:12px;opacity:.9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n"
".toast .toast-msg{font-size:12px;opacity:.8;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word}\n"
".toast button{background:none;border:0;color:rgba(255,255,255,.5);cursor:pointer;font-size:16px;padding:2px 6px;line-height:1;border-radius:4px;flex-shrink:0}\n"
".toast button:hover{color:#fff;background:rgba(255,255,255,.1)}\n"
"@keyframes toastIn{from{opacity:0;transform:translateY(8px) scale(.96)}to{opacity:1;transform:none}}\n"
"@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.92)}}\n"
".pulse-dot{width:8px;height:8px;border-radius:50%;background:#22c55e;box-shadow:0 0 8px #22c55e;display:inline-block;animation:pulse 1.8s infinite ease-in-out}\n"
"table.pin-table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}\n"
"table.pin-table th{text-align:left;padding:7px 8px;border-bottom:1px solid rgba(255,255,255,.15);color:var(--muted);font-weight:600}\n"
"table.pin-table td{padding:7px 8px;border-bottom:1px solid rgba(255,255,255,.07)}\n"
"</style>\n"
"</head>\n"
"\n"
"<body>\n"
"<div id=\"toasts\" aria-live=\"polite\" aria-atomic=\"false\"></div>\n"
"\n"
"<div id=\"errorBoundary\" class=\"error-boundary\">\n"
"  <div class=\"error-box\">\n"
"    <h2>Dashboard error</h2>\n"
"    <p id=\"errorText\" class=\"muted\">An unexpected browser error occurred.</p>\n"
"    <div class=\"actions\">\n"
"      <button onclick=\"location.reload()\">Reload</button>\n"
"      <button onclick=\"closeError()\">Close</button>\n"
"    </div>\n"
"  </div>\n"
"</div>\n"
"\n"
"<main>\n"
"  <div class=\"card\" style=\"margin-bottom:14px;background:linear-gradient(135deg,rgba(30,41,59,.7),rgba(15,23,42,.85));border:1px solid rgba(255,255,255,.1);\">\n"
"    <div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;\">\n"
"      <div>\n"
"        <h2 style=\"margin:0;font-size:17px;\">Live Food Spoilage & Telemetry</h2>\n"
"        <div class=\"muted\" style=\"font-size:11px;margin-top:2px;\">Multi-sensor hardware matrix (DHT + MQ-2 + MQ-3)</div>\n"
"      </div>\n"
"      <span class=\"badge ok\" style=\"display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;\">\n"
"        <span class=\"pulse-dot\"></span> LIVE\n"
"      </span>\n"
"    </div>\n"
"    <div class=\"grid\" style=\"grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;\">\n"
"      <div class=\"box\"><p>Spoilage Score</p><h3 id=\"food_score\">--</h3><small id=\"food_score_sub\">/ 100</small></div>\n"
"      <div class=\"box\"><p>Status</p><h3 id=\"food_status\">--</h3><small id=\"food_status_sub\">Evaluation</small></div>\n"
"      <div class=\"box\"><p>Temperature</p><h3 id=\"top_temp\">--</h3><small id=\"top_temp_model\">DHT</small></div>\n"
"      <div class=\"box\"><p>Humidity</p><h3 id=\"top_hum\">--</h3><small>Relative %</small></div>\n"
"      <div class=\"box\"><p>MQ-2 Gas</p><h3 id=\"mq2_val\">--</h3><small id=\"mq2_volt\">raw ADC</small></div>\n"
"      <div class=\"box\"><p>MQ-3 VOC</p><h3 id=\"mq3_val\">--</h3><small id=\"mq3_volt\">raw ADC</small></div>\n"
"    </div>\n"
"  </div>\n"

"\n"
"<header>\n"
"  <div>\n"
"    <h1>ESP32 Sensor Node</h1>\n"
"    <div id=\"topStatus\" class=\"muted\">Starting...</div>\n"
"  </div>\n"
"  <button onclick=\"toggleDark()\" id=\"themeBtn\">Dark</button>\n"
"</header>\n"
"\n"
"<div class=\"nav\">\n"
"  <button data-page=\"home\" onclick=\"showPage('home')\">Home</button>\n"
"  <button data-page=\"wifi\" onclick=\"showPage('wifi')\">Wi-Fi</button>\n"
"  <button data-page=\"backend\" onclick=\"showPage('backend')\">Backend</button>\n"
"  <button data-page=\"sensors\" onclick=\"showPage('sensors')\">Sensors</button>\n"
"  <button data-page=\"test\" onclick=\"showPage('test')\">Test</button>\n"
"  <button data-page=\"system\" onclick=\"showPage('system')\">System</button>\n"
"</div>\n"
"\n"
"<!-- HOME -->\n"
"<section id=\"page-home\" class=\"page active\">\n"
"\n"
"  <div class=\"grid\">\n"
"    <div class=\"card metric\">\n"
"      <div class=\"label\">Temperature</div>\n"
"      <div id=\"temp\" class=\"value\">--</div>\n"
"      <div class=\"muted\" id=\"home_dht_temp_sub\">DHT °C</div>\n"
"    </div>\n"
"\n"
"    <div class=\"card metric\">\n"
"      <div class=\"label\">Humidity</div>\n"
"      <div id=\"hum\" class=\"value\">--</div>\n"
"      <div class=\"muted\" id=\"home_dht_hum_sub\">DHT %</div>\n"
"    </div>\n"
"\n"
"    <div class=\"card metric\">\n"
"      <div class=\"label\">MQ-2</div>\n"
"      <div id=\"mq2\" class=\"value\">--</div>\n"
"      <div class=\"muted\">ADC raw</div>\n"
"    </div>\n"
"\n"
"    <div class=\"card metric\">\n"
"      <div class=\"label\">MQ-3</div>\n"
"      <div id=\"mq3\" class=\"value\">--</div>\n"
"      <div class=\"muted\">ADC raw</div>\n"
"    </div>\n"
"  </div>\n"
"\n"
"  <div class=\"card\">\n"
"    <h2>Connectivity</h2>\n"
"\n"
"    <div class=\"row\">\n"
"      <span>Recovery AP</span>\n"
"      <span id=\"apState\" class=\"badge\">--</span>\n"
"    </div>\n"
"\n"
"    <div class=\"row\">\n"
"      <span>Station Wi-Fi</span>\n"
"      <span id=\"staState\" class=\"badge\">--</span>\n"
"    </div>\n"
"\n"
"    <div class=\"row\">\n"
"      <span>SSID</span>\n"
"      <b id=\"ssid\">--</b>\n"
"    </div>\n"
"\n"
"    <div class=\"row\">\n"
"      <span>Station IP</span>\n"
"      <b id=\"staIP\">--</b>\n"
"    </div>\n"
"\n"
"    <div class=\"row\">\n"
"      <span>AP IP</span>\n"
"      <b id=\"apIP\">--</b>\n"
"    </div>\n"
"\n"
"    <div class=\"row\">\n"
"      <span>RSSI</span>\n"
"      <b id=\"rssi\">--</b>\n"
"    </div>\n"
"\n"
"    <div id=\"wifiReason\" class=\"notice\">--</div>\n"
"  </div>\n"
"\n"
"  <div class=\"card\">\n"
"    <h2>Sensor state</h2>\n"
"    <div id=\"sensorState\" class=\"notice\">Reading sensors...</div>\n"
"  </div>\n"
"\n"
"</section>\n"
"\n"
"<!-- WIFI -->\n"
"<section id=\"page-wifi\" class=\"page\">\n"
"\n"
"  <div class=\"card\">\n"
"    <h2>Wi-Fi configuration</h2>\n"
"    <p class=\"muted\">\n"
"      Configure the ESP32's station connection. The recovery AP stays available.\n"
"      Sensor readings do not depend on station Wi-Fi.\n"
"    </p>\n"
"\n"
"    <div class=\"field\">\n"
"      <label for=\"wifiSSID\">SSID</label>\n"
"      <input id=\"wifiSSID\" autocomplete=\"off\" placeholder=\"Phone hotspot name\">\n"
"    </div>\n"
"\n"
"    <div class=\"field\">\n"
"      <label for=\"wifiPassword\">Password</label>\n"
"      <div class=\"password\">\n"
"        <input id=\"wifiPassword\" type=\"password\" autocomplete=\"new-password\" placeholder=\"Wi-Fi password\">\n"
"        <button onclick=\"togglePassword('wifiPassword',this)\">Show</button>\n"
"      </div>\n"
"      <small id=\"passwordState\" class=\"muted\">Password stored: no</small>\n"
"    </div>\n"
"\n"
"    <div class=\"actions\">\n"
"      <button onclick=\"saveWiFi()\">Save & Connect</button>\n"
"      <button onclick=\"scanWiFi()\">Scan Networks</button>\n"
"      <button onclick=\"loadConfig()\">Reload</button>\n"
"    </div>\n"
"\n"
"    <div id=\"wifiMessage\" class=\"notice\">--</div>\n"
"  </div>\n"
"\n"
"  <div class=\"card\">\n"
"    <h2>Recovery AP</h2>\n"
"    <div class=\"row\"><span>SSID</span><b>ESP32-Sensor</b></div>\n"
"    <div class=\"row\"><span>Password</span><b>esp32sensor</b></div>\n"
"    <div class=\"row\"><span>IP</span><b id=\"recoveryIP\">192.168.4.1</b></div>\n"
"  </div>\n"
"\n"
"  <div class=\"card\">\n"
"    <h2>Connection diagnostics</h2>\n"
"    <div id=\"wifiDiagnostics\" class=\"notice\">No connection attempt yet.</div>\n"
"  </div>\n"
"\n"
"  <div class=\"card\">\n"
"    <h2>Visible networks</h2>\n"
"    <p class=\"muted\">The classic ESP32 scans 2.4 GHz Wi-Fi networks.</p>\n"
"    <pre id=\"scanOutput\">No scan performed.</pre>\n"
"  </div>\n"
"\n"
"</section>\n"
"\n"
"<!-- BACKEND -->\n"
"<section id=\"page-backend\" class=\"page\">\n"
"\n"
"  <div class=\"card\">\n"
"    <h2>Backend</h2>\n"
"    <p class=\"muted\">\n"
"      Enter the address that the ESP32 itself must reach.\n"
"      Do not use localhost or 127.0.0.1.\n"
"    </p>\n"
"\n"
"    <div class=\"field\">\n"
"      <label for=\"backendURL\">Backend URL</label>\n"
"      <input id=\"backendURL\" autocomplete=\"off\"\n"
"             placeholder=\"http://192.168.1.10:3000/api/health\">\n"
"    </div>\n"
"\n"
"    <div class=\"actions\">\n"
"      <button onclick=\"saveBackend()\">Save URL</button>\n"
"      <button onclick=\"testBackend()\">Test From ESP32</button>\n"
"    </div>\n"
"\n"
"    <div id=\"backendMessage\" class=\"notice\">--</div>\n"
"    <pre id=\"backendOutput\"></pre>\n"
"  </div>\n"
"\n"
"</section>\n"
"\n"
"<!-- SENSORS -->\n"
"<section id=\"page-sensors\" class=\"page\">\n"
"\n"
"  <div class=\"card\">\n"
"    <h2>Live sensor data</h2>\n"
"    <div id=\"sensorPageState\" class=\"notice\">--</div>\n"
"    <pre id=\"sensorJSON\">{}</pre>\n"
"  </div>\n"
"\n"
"</section>\n"
"\n"
"<!-- SYSTEM -->\n"
"<section id=\"page-system\" class=\"page\">\n"
"\n"
"  <div class=\"card\">\n"
"    <h2>System</h2>\n"
"\n"
"    <div class=\"row\">\n"
"      <span>Uptime</span>\n"
"      <b id=\"uptime\">--</b>\n"
"    </div>\n"
"\n"
"    <div class=\"row\">\n"
"      <span>Free heap</span>\n"
"      <b id=\"heap\">--</b>\n"
"    </div>\n"
"\n"
"    <div class=\"row\">\n"
"      <span>Backend configured</span>\n"
"      <b id=\"backendState\">--</b>\n"
"    </div>\n"
"\n"
"    <div class=\"row\">\n"
"      <span>Firmware API</span>\n"
"      <b>/api/data</b>\n"
"    </div>\n"
"  </div>\n"
"\n"
"</section>\n"
"\n"
"<section id=\"page-test\" class=\"page\">\n"
"  <div class=\"card\">\n"
"    <h2>Hardware Test</h2>\n"
"    <p class=\"muted\" style=\"margin-bottom:14px\">Live sensor readings and direct hardware controls. Use these to verify each component is wired and working correctly.</p>\n"
"\n"
"    <!-- Test Lock Mode Control -->\n"
"    <div style=\"background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:12px 14px;margin-bottom:16px;\">\n"
"      <div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;\">\n"
"        <span style=\"font-size:13px;font-weight:700;\">Hardware Test Lock Mode</span>\n"
"        <span id=\"tst_lock_badge\" class=\"badge\">AUTO SENSOR MODE</span>\n"
"      </div>\n"
"      <p class=\"muted\" style=\"margin-bottom:10px;font-size:12px;\">When <b>LOCKED</b>, automatic sensor & backend LED/buzzer overwrites are paused so you can test components indefinitely. Long-press physical BOOT button for 1.5s to toggle.</p>\n"
"      <div style=\"display:flex;gap:8px;\">\n"
"        <button id=\"btnLockMode\" style=\"flex:1;background:#f59e0b;color:#000;font-weight:700;\" onclick=\"toggleTestLock(true)\">Lock Test Mode</button>\n"
"        <button id=\"btnUnlockMode\" style=\"flex:1;\" onclick=\"toggleTestLock(false)\">Unlock (Live Auto)</button>\n"
"      </div>\n"
"    </div>\n"
"\n"
"    <!-- Quick Diagnostics & Blink Test -->\n"
"    <div style=\"background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:12px 14px;margin-bottom:16px;\">\n"
"      <div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;\">\n"
"        <span style=\"font-size:13px;font-weight:700;\">Component Blink & Sensor Self-Test</span>\n"
"        <span id=\"tst_self_status\" class=\"badge ok\">Ready</span>\n"
"      </div>\n"
"      <p class=\"muted\" style=\"margin-bottom:10px;font-size:12px;\">Blinks Green, Yellow, Red LEDs, chirps buzzer, and checks MQ-2 & MQ-3 heating coils (5V VIN) and DHT bus.</p>\n"
"      <button style=\"width:100%;background:linear-gradient(90deg,#0284c7,#2563eb);color:#fff;font-weight:700;\" onclick=\"runBlinkTest()\">Run Hardware Blink & Sensor Test</button>\n"
"      <div id=\"selfTestReport\" style=\"display:none;margin-top:10px;padding:10px;border-radius:8px;background:rgba(0,0,0,.25);font-size:12px;line-height:1.5;\"></div>\n"
"    </div>\n"
"\n"
"    <!-- Sensor Readings -->\n"
"    <h3 style=\"margin-bottom:10px\">Sensor Readings</h3>\n"
"    <div class=\"grid\" style=\"margin-bottom:18px\">\n"
"      <div class=\"box\"><p>Temp (DHT)</p><h3 id=\"tst_temp\">--</h3><small>°C</small></div>\n"
"      <div class=\"box\"><p>Humidity (DHT)</p><h3 id=\"tst_hum\">--</h3><small>%</small></div>\n"
"      <div class=\"box\"><p>MQ-2 Gas</p><h3 id=\"tst_mq2\">--</h3><small id=\"tst_mq2_sub\">raw ADC</small></div>\n"
"      <div class=\"box\"><p>MQ-3 VOC</p><h3 id=\"tst_mq3\">--</h3><small id=\"tst_mq3_sub\">raw ADC</small></div>\n"
"    </div>\n"
"    <div class=\"row\">\n"
"      <span>DHT Sensor Status</span>\n"
"      <b id=\"tst_dht_ok\">--</b>\n"
"    </div>\n"
"    <div class=\"row\">\n"
"      <span>Spoilage Score</span>\n"
"      <b id=\"tst_score\">--</b>\n"
"    </div>\n"
"    <div class=\"row\">\n"
"      <span>Food Status</span>\n"
"      <b id=\"tst_status\">--</b>\n"
"    </div>\n"
"    <div class=\"row\">\n"
"      <span>MQ Sensor Heater Status</span>\n"
"      <b id=\"tst_mq_power\">Checking...</b>\n"
"    </div>\n"
"\n"
"    <div style=\"background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:12px 14px;margin:14px 0;\">\n"
"      <div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;\">\n"
"        <span style=\"font-size:13px;font-weight:600;\">Active DHT Protocol</span>\n"
"        <span id=\"tst_active_dht\" class=\"badge ok\">DHT22</span>\n"
"      </div>\n"
"      <p class=\"muted\" style=\"margin-bottom:10px;font-size:12px;\">If using blue 3-pin module (DHT11 / 'DHT33'), click DHT11. If white AM2302, click DHT22.</p>\n"
"      <div style=\"display:flex;gap:8px;\">\n"
"        <button style=\"flex:1;\" onclick=\"setDHTModel('DHT22')\">Set DHT22 (White)</button>\n"
"        <button style=\"flex:1;\" onclick=\"setDHTModel('DHT11')\">Set DHT11 (Blue / DHT33)</button>\n"
"      </div>\n"
"    </div>\n"
"\n"
"    <hr style=\"margin:18px 0;opacity:.2\">\n"
"\n"
"    <!-- LED Controls -->\n"
"    <h3 style=\"margin-bottom:10px\">LED Controls (Zero-Latency)</h3>\n"
"    <p class=\"muted\" style=\"margin-bottom:12px\">Toggle each LED independently to confirm wiring. (Tip: Use <b>Lock Mode</b> above to prevent live sensor override).</p>\n"
"    <div class=\"grid\" style=\"margin-bottom:16px\">\n"
"      <div class=\"box\">\n"
"        <p style=\"color:#22c55e;font-weight:700\">Green LED</p>\n"
"        <p class=\"muted\">GPIO 26</p>\n"
"        <div style=\"display:flex;gap:8px;margin-top:10px\">\n"
"          <button style=\"flex:1;background:#22c55e;color:#fff\" onclick=\"triggerLED('green','on')\">ON</button>\n"
"          <button style=\"flex:1\" onclick=\"triggerLED('green','off')\">OFF</button>\n"
"        </div>\n"
"      </div>\n"
"      <div class=\"box\">\n"
"        <p style=\"color:#eab308;font-weight:700\">Yellow LED</p>\n"
"        <p class=\"muted\">GPIO 27</p>\n"
"        <div style=\"display:flex;gap:8px;margin-top:10px\">\n"
"          <button style=\"flex:1;background:#eab308;color:#000\" onclick=\"triggerLED('yellow','on')\">ON</button>\n"
"          <button style=\"flex:1\" onclick=\"triggerLED('yellow','off')\">OFF</button>\n"
"        </div>\n"
"      </div>\n"
"      <div class=\"box\">\n"
"        <p style=\"color:#ef4444;font-weight:700\">Red LED</p>\n"
"        <p class=\"muted\">GPIO 33</p>\n"
"        <div style=\"display:flex;gap:8px;margin-top:10px\">\n"
"          <button style=\"flex:1;background:#ef4444;color:#fff\" onclick=\"triggerLED('red','on')\">ON</button>\n"
"          <button style=\"flex:1\" onclick=\"triggerLED('red','off')\">OFF</button>\n"
"        </div>\n"
"      </div>\n"
"    </div>\n"
"    <div style=\"display:flex;gap:8px;margin-bottom:16px;\">\n"
"      <button style=\"flex:1\" onclick=\"triggerLED('all','on')\">All LEDs ON</button>\n"
"      <button style=\"flex:1\" onclick=\"triggerLED('all','off')\">All LEDs OFF</button>\n"
"    </div>\n"
"\n"
"    <hr style=\"margin:18px 0;opacity:.2\">\n"
"\n"
"    <!-- Buzzer -->\n"
"    <h3 style=\"margin-bottom:10px\">Buzzer Configuration & Test</h3>\n"
"    <p class=\"muted\" style=\"margin-bottom:12px\">GPIO 32 — supports both Passive (PWM tone) and Active (direct DC) buzzers.</p>\n"
"    <div style=\"background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:12px 14px;margin-bottom:12px\">\n"
"      <div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:8px\">\n"
"        <span style=\"font-size:13px;font-weight:600\">Hardware Buzzer Mode</span>\n"
"        <span id=\"buzzerTypeBadge\" class=\"badge ok\">PASSIVE (TONE)</span>\n"
"      </div>\n"
"      <div style=\"display:flex;gap:8px;margin-bottom:10px;\">\n"
"        <button id=\"btnBuzzPassive\" style=\"flex:1\" onclick=\"setBuzzerType('PASSIVE')\">Passive (PWM Tone)</button>\n"
"        <button id=\"btnBuzzActive\" style=\"flex:1\" onclick=\"setBuzzerType('ACTIVE')\">Active (Direct DC 3.3V)</button>\n"
"      </div>\n"
"\n"
"      <div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:6px\">\n"
"        <span style=\"font-size:13px;font-weight:600\">Buzzer Strength / Volume</span>\n"
"        <span id=\"buzzerVal\" style=\"font-size:13px;font-weight:700;color:#38bdf8\">80%</span>\n"
"      </div>\n"
"      <input type=\"range\" id=\"buzzerStrength\" min=\"10\" max=\"100\" value=\"80\" step=\"5\" style=\"width:100%;accent-color:#38bdf8;cursor:pointer\" oninput=\"byId('buzzerVal').textContent=this.value+'%'\">\n"
"\n"
"      <div style=\"display:flex;gap:8px;margin-top:10px\">\n"
"        <button style=\"flex:1\" onclick=\"triggerBuzzer('beep')\">Short Beep</button>\n"
"        <button style=\"flex:1;background:#eab308;color:#000\" onclick=\"triggerBuzzer('warning')\">Warning Chirp (Yellow)</button>\n"
"        <button style=\"flex:1;background:#ef4444;color:#fff\" onclick=\"triggerBuzzer('alarm')\">Alarm Cadence (Red)</button>\n"
"      </div>\n"
"    </div>\n"
"  </div>\n"
"\n"
"  <!-- Pin Detection & Diagnostic Table -->\n"
"  <div class=\"card\" style=\"margin-top:16px;\">\n"
"    <h2>Hardware Pinout & Live Signal Detector</h2>\n"
"    <p class=\"muted\" style=\"margin-bottom:12px;font-size:12px\">Real-time status of each physical pin. Press the physical BOOT button on the ESP32 to test instant response.</p>\n"
"    <div style=\"overflow-x:auto;\">\n"
"      <table class=\"pin-table\">\n"
"        <thead>\n"
"          <tr>\n"
"            <th>Pin</th>\n"
"            <th>Component</th>\n"
"            <th>Expected Bus Level</th>\n"
"            <th>Live Value</th>\n"
"            <th>Signal Health / Status</th>\n"
"          </tr>\n"
"        </thead>\n"
"        <tbody>\n"
"          <tr>\n"
"            <td><b>GPIO 4</b></td>\n"
"            <td>DHT Data (<span id=\"pin_dht_type\">DHT</span>)</td>\n"
"            <td>Idle HIGH (3.3V)</td>\n"
"            <td id=\"pin_dht_bus\">--</td>\n"
"            <td id=\"pin_dht_diag\">--</td>\n"
"          </tr>\n"
"          <tr>\n"
"            <td><b>GPIO 34</b></td>\n"
"            <td>MQ-2 Gas (ADC1)</td>\n"
"            <td>0.2V - 3.0V</td>\n"
"            <td id=\"pin_mq2_raw\">--</td>\n"
"            <td id=\"pin_mq2_diag\">--</td>\n"
"          </tr>\n"
"          <tr>\n"
"            <td><b>GPIO 35</b></td>\n"
"            <td>MQ-3 VOC (ADC1)</td>\n"
"            <td>0.2V - 3.0V</td>\n"
"            <td id=\"pin_mq3_raw\">--</td>\n"
"            <td id=\"pin_mq3_diag\">--</td>\n"
"          </tr>\n"
"          <tr>\n"
"            <td><b>GPIO 0</b></td>\n"
"            <td>BOOT Button (Push)</td>\n"
"            <td>HIGH idle, LOW pressed</td>\n"
"            <td id=\"pin_btn_live\">--</td>\n"
"            <td><span id=\"pin_btn_badge\" class=\"badge\">--</span></td>\n"
"          </tr>\n"
"          <tr>\n"
"            <td><b>GPIO 32</b></td>\n"
"            <td>Buzzer (LEDC PWM)</td>\n"
"            <td>PWM Channel 0</td>\n"
"            <td>1.2 - 2.8 kHz</td>\n"
"            <td><button style=\"padding:3px 8px;font-size:11px\" onclick=\"triggerBuzzer()\">Test Beep</button></td>\n"
"          </tr>\n"
"          <tr>\n"
"            <td><b>GPIO 26</b></td>\n"
"            <td>Green LED (Score &lt; 30)</td>\n"
"            <td>Digital Output</td>\n"
"            <td id=\"pin_led_g\">--</td>\n"
"            <td><button style=\"padding:3px 8px;font-size:11px\" onclick=\"triggerLED('green','on')\">Test</button></td>\n"
"          </tr>\n"
"          <tr>\n"
"            <td><b>GPIO 27</b></td>\n"
"            <td>Yellow LED (Score 30-59)</td>\n"
"            <td>Digital Output</td>\n"
"            <td id=\"pin_led_y\">--</td>\n"
"            <td><button style=\"padding:3px 8px;font-size:11px\" onclick=\"triggerLED('yellow','on')\">Test</button></td>\n"
"          </tr>\n"
"          <tr>\n"
"            <td><b>GPIO 33</b></td>\n"
"            <td>Red LED (Score &ge; 60)</td>\n"
"            <td>Digital Output</td>\n"
"            <td id=\"pin_led_r\">--</td>\n"
"            <td><button style=\"padding:3px 8px;font-size:11px\" onclick=\"triggerLED('red','on')\">Test</button></td>\n"
"          </tr>\n"
"        </tbody>\n"
"      </table>\n"
"    </div>\n"
"  </div>\n"
"\n"
"  <!-- Pin Help & Wiring Guide Table -->\n"
"  <div class=\"card\" style=\"margin-top:16px;\">\n"
"    <h2>Pin Help & Wiring Guide</h2>\n"
"    <p class=\"muted\" style=\"margin-bottom:12px;font-size:12px\">Wiring reference for DHT11/22 and MQ gas sensors to avoid common voltage/pullup traps.</p>\n"
"    <div style=\"overflow-x:auto;\">\n"
"      <table class=\"pin-table\">\n"
"        <thead>\n"
"          <tr>\n"
"            <th>Sensor / Part</th>\n"
"            <th>Sensor Pin</th>\n"
"            <th>ESP32 Pin</th>\n"
"            <th>Power Rail</th>\n"
"            <th>Critical Tips & Timeframe</th>\n"
"          </tr>\n"
"        </thead>\n"
"        <tbody>\n"
"          <tr>\n"
"            <td><b>DHT11 / DHT22 ('DHT33')</b></td>\n"
"            <td>DATA / OUT</td>\n"
"            <td><b>GPIO 4</b></td>\n"
"            <td>3.3V (or 5V PCB module)</td>\n"
"            <td>• Read interval: min 1.5s (cannot poll faster)<br>• Add 10k pull-up if bare 4-pin sensor.<br>• Blue module = DHT11, White module = DHT22.</td>\n"
"          </tr>\n"
"          <tr>\n"
"            <td><b>MQ-2 (Smoke / Gas)</b></td>\n"
"            <td>A0 (Analog Out)</td>\n"
"            <td><b>GPIO 34</b> (ADC1_CH6)</td>\n"
"            <td><b>5V (VIN)</b></td>\n"
"            <td>• Heating coil MUST have 5V (from VIN). If on 3.3V, reads near 0.<br>• Requires 30–60s warmup time.</td>\n"
"          </tr>\n"
"          <tr>\n"
"            <td><b>MQ-3 (Alcohol / Ferment)</b></td>\n"
"            <td>A0 (Analog Out)</td>\n"
"            <td><b>GPIO 35</b> (ADC1_CH7)</td>\n"
"            <td><b>5V (VIN)</b></td>\n"
"            <td>• Heating coil MUST have 5V (from VIN). If on 3.3V, reads near 0.<br>• Requires 30–60s warmup time.</td>\n"
"          </tr>\n"
"          <tr>\n"
"            <td><b>Piezo Buzzer</b></td>\n"
"            <td>I/O or (+)</td>\n"
"            <td><b>GPIO 32</b></td>\n"
"            <td>GND on (-)</td>\n"
"            <td>• Uses ESP32 PWM channel 0.<br>• Adjustable duty & frequency via slider above.</td>\n"
"          </tr>\n"
"          <tr>\n"
"            <td><b>Status LEDs</b></td>\n"
"            <td>Anodes (+)</td>\n"
"            <td><b>GPIO 26, 27, 33</b></td>\n"
"            <td>Cathodes to GND via 220Ω</td>\n"
"            <td>• Green: GPIO 26 | Yellow: GPIO 27 | Red: GPIO 33.<br>• Current limiting 220Ω resistor required.</td>\n"
"          </tr>\n"
"        </tbody>\n"
"      </table>\n"
"    </div>\n"
"  </div>\n"
"</section>\n"
"\n"
"</main>\n"
"\n"
"<script>\n"
"\"use strict\";\n"
"\n"
"let refreshBusy = false;\n"
"let lastToastWifiState = null;\n"
"let lastToastMsg = \"\";\n"
"let lastToastTime = 0;\n"
"\n"
"function byId(id){\n"
"  return document.getElementById(id);\n"
"}\n"
"function setText(id,val){\n"
"  const el=document.getElementById(id);\n"
"  if(el) el.textContent=(val!==undefined && val!==null) ? val : \"--\";\n"
"}\n"
"\n"
"function toast(message,type=\"info\",title=\"ESP32\"){\n"
"  const host=byId(\"toasts\");\n"
"  if(!host) return;\n"
"  const msgStr = String(message).trim();\n"
"  const now = Date.now();\n"
"  if(msgStr === lastToastMsg && (now - lastToastTime) < 2000) return;\n"
"  lastToastMsg = msgStr;\n"
"  lastToastTime = now;\n"
"\n"
"  while(host.children.length >= 3){\n"
"    host.removeChild(host.firstElementChild);\n"
"  }\n"
"\n"
"  const el=document.createElement(\"div\");\n"
"  el.className=\"toast \"+(type||\"info\");\n"
"  const safeTitle=String(title);\n"
"\n"
"  el.innerHTML=\"<div class=\\\"toast-content\\\"><div class=\\\"toast-title\\\"></div><div class=\\\"toast-msg\\\"></div></div><button aria-label=\\\"Close\\\">×</button>\";\n"
"  el.querySelector(\".toast-title\").textContent=safeTitle;\n"
"  el.querySelector(\".toast-msg\").textContent=msgStr;\n"
"\n"
"  const closeBtn = el.querySelector(\"button\");\n"
"  closeBtn.onclick=(e)=>{ e.stopPropagation(); el.remove(); };\n"
"  el.onclick=()=>el.remove();\n"
"\n"
"  host.appendChild(el);\n"
"  const dur = type===\"error\" ? 4500 : 2800;\n"
"  setTimeout(()=>{ if(el.isConnected) el.remove(); }, dur);\n"
"}\n"
"function showBrowserError(message){\n"
"  console.error(message);\n"
"  const boundary=document.getElementById(\"errorBoundary\");\n"
"  const text=document.getElementById(\"errorText\");\n"
"  if(boundary && text){\n"
"    text.textContent=String(message);\n"
"    boundary.classList.add(\"on\");\n"
"  }\n"
"}\n"
"\n"
"window.onerror=function(message,source,line,column){\n"
"  showBrowserError(\"JavaScript error: \"+message+\" at line \"+line);\n"
"};\n"
"\n"
"window.onunhandledrejection=function(event){\n"
"  showBrowserError(\n"
"    \"Unhandled error: \"+\n"
"    (event.reason && event.reason.message ? event.reason.message : event.reason)\n"
"  );\n"
"};\n"
"\n"
"function closeError(){\n"
"  document.getElementById(\"errorBoundary\").classList.remove(\"on\");\n"
"}\n"
"\n"
"function toggleDark(){\n"
"  document.body.classList.toggle(\"dark\");\n"
"  localStorage.setItem(\n"
"    \"esp32-dark\",\n"
"    document.body.classList.contains(\"dark\") ? \"1\" : \"0\"\n"
"  );\n"
"}\n"
"\n"
"if(localStorage.getItem(\"esp32-dark\")===\"1\"){\n"
"  document.body.classList.add(\"dark\");\n"
"}\n"
"\n"
"function togglePassword(id,button){\n"
"  const input=byId(id);\n"
"\n"
"  if(input.type===\"password\"){\n"
"    input.type=\"text\";\n"
"    button.textContent=\"Hide\";\n"
"  }else{\n"
"    input.type=\"password\";\n"
"    button.textContent=\"Show\";\n"
"  }\n"
"}\n"
"\n"
"function showPage(name){\n"
"  document.querySelectorAll(\".page\").forEach(x=>x.classList.remove(\"active\"));\n"
"  document.querySelectorAll(\".nav button\").forEach(x=>x.classList.remove(\"active\"));\n"
"\n"
"  const page=document.getElementById(\"page-\"+name);\n"
"  const nav=document.querySelector('.nav button[data-page=\"'+name+'\"]');\n"
"\n"
"  if(!page) return;\n"
"\n"
"  page.classList.add(\"active\");\n"
"  if(nav) nav.classList.add(\"active\");\n"
"\n"
"  history.replaceState(null,\"\",\"#\"+name);\n"
"\n"
"  if(name===\"wifi\" || name===\"backend\"){\n"
"    loadConfig();\n"
"  }\n"
"}\n"
"\n"
"function initialPage(){\n"
"  const hash=location.hash.replace(\"#\",\"\");\n"
"  const valid=[\"home\",\"wifi\",\"backend\",\"sensors\",\"system\"];\n"
"  showPage(valid.includes(hash) ? hash : \"home\");\n"
"}\n"
"\n"
"async function api(path,options={}){\n"
"  const controller=new AbortController();\n"
"  const timer=setTimeout(()=>controller.abort(),15000);\n"
"  let response;\n"
"\n"
"  try{\n"
"    response=await fetch(path,{\n"
"      cache:\"no-store\",\n"
"      ...options,\n"
"      signal:controller.signal\n"
"    });\n"
"  }catch(e){\n"
"    if(e.name===\"AbortError\") throw new Error(\"Request timed out.\");\n"
"    throw e;\n"
"  }finally{\n"
"    clearTimeout(timer);\n"
"  }\n"
"\n"
"  const text=await response.text();\n"
"\n"
"  let data;\n"
"  try{\n"
"    data=JSON.parse(text);\n"
"  }catch(e){\n"
"    throw new Error(\"ESP32 returned invalid JSON: \"+text.slice(0,250));\n"
"  }\n"
"\n"
"  if(!response.ok){\n"
"    throw new Error(data.error || (\"HTTP \"+response.status));\n"
"  }\n"
"\n"
"  return data;\n"
"}\n"
"\n"
"async function loadConfig(){\n"
"  try{\n"
"    const d=await api(\"/api/config\");\n"
"\n"
"    byId(\"wifiSSID\").value=d.wifi_ssid || \"\";\n"
"    byId(\"passwordState\").textContent=\n"
"      d.wifi_password_set ? \"Password stored: yes\" : \"Password stored: no\";\n"
"\n"
"    byId(\"backendURL\").value=d.backend_url || \"\";\n"
"    byId(\"recoveryIP\").textContent=d.ap_ip || \"--\";\n"
"\n"
"    const state=d.wifi_connected ? \"Connected\" : \"Not connected\";\n"
"    byId(\"wifiMessage\").textContent=\n"
"      state+\"\\n\"+(d.wifi_reason || \"\");\n"
"  }catch(e){\n"
"    byId(\"wifiMessage\").textContent=e.message;\n"
"  }\n"
"}\n"
"\n"
"async function saveWiFi(){\n"
"  const ssid=byId(\"wifiSSID\").value.trim();\n"
"  const password=byId(\"wifiPassword\").value;\n"
"\n"
"  if(!ssid){\n"
"    byId(\"wifiMessage\").textContent=\"SSID is required.\";\n"
"    toast(\"Enter the hotspot SSID first.\",\"error\",\"Wi-Fi\");\n"
"    return;\n"
"  }\n"
"\n"
"  try{\n"
"    const body=\n"
"      \"ssid=\"+encodeURIComponent(ssid)+\n"
"      \"&password=\"+encodeURIComponent(password);\n"
"\n"
"    const d=await api(\"/api/wifi-config\",{\n"
"      method:\"POST\",\n"
"      headers:{\"Content-Type\":\"application/x-www-form-urlencoded\"},\n"
"      body\n"
"    });\n"
"\n"
"    let message=d.message+\n"
"      \"\\nStatus: \"+d.status_name+\" (\"+d.status_code+\")\"+\n"
"      \"\\nReason: \"+d.reason;\n"
"\n"
"    if(d.connected){\n"
"      message+=\n"
"        \"\\nStation IP: \"+d.station_ip+\n"
"        \"\\nRSSI: \"+d.rssi+\" dBm\";\n"
"    }\n"
"\n"
"    byId(\"wifiMessage\").textContent=message;\n"
"    byId(\"passwordState\").textContent=password.length ? \"Password stored: yes\" : \"Open network / no password\";\n"
"    if(d.connected){\n"
"      toast(\"Connected to \"+ssid+\". IP: \"+d.station_ip,\"success\",\"Wi-Fi connected\");\n"
"    }else{\n"
"      toast((d.reason || d.message || \"Connection did not complete\")+\"\\nStatus: \"+d.status_name+\" (\"+d.status_code+\")\\nLast reason: \"+(d.disconnect_reason_name || \"NO_DISCONNECT_EVENT\"), d.connecting ? \"warn\" : \"error\", d.connecting ? \"Connecting…\" : \"Wi-Fi connection failed\");\n"
"    }\n"
"    await refresh();\n"
"  }catch(e){\n"
"    byId(\"wifiMessage\").textContent=\"Save/connect error: \"+e.message;\n"
"    toast(e.message,\"error\",\"Wi-Fi request failed\");\n"
"  }\n"
"}\n"
"\n"
"async function triggerBuzzer(pattern=\"beep\"){\n"
"  const strEl = document.getElementById(\"buzzerStrength\");\n"
"  const str = strEl ? strEl.value : 80;\n"
"  try{\n"
"    const res = await api(\"/api/buzzer?strength=\"+encodeURIComponent(str)+\"&pattern=\"+encodeURIComponent(pattern), { method: \"POST\" });\n"
"    if (res.success) toast(res.message, \"success\", \"Buzzer Test\");\n"
"    else toast(res.error || \"Failed\", \"error\", \"Buzzer\");\n"
"  }catch(e){\n"
"    toast(e.message, \"error\", \"Buzzer\");\n"
"  }\n"
"}\n"
"\n"
"async function setBuzzerType(type){\n"
"  try{\n"
"    const res = await api(\"/api/buzzer-config?type=\"+encodeURIComponent(type), { method: \"POST\" });\n"
"    if (res.success) {\n"
"      toast(\"Buzzer hardware mode set to \" + res.buzzer_type, \"success\", \"Buzzer Config\");\n"
"      const bzBadge = byId(\"buzzerTypeBadge\");\n"
"      if(bzBadge) bzBadge.textContent = res.buzzer_type === \"ACTIVE\" ? \"ACTIVE (DIRECT DC)\" : \"PASSIVE (PWM TONE)\";\n"
"    } else toast(res.error || \"Failed\", \"error\", \"Buzzer Config\");\n"
"  }catch(e){\n"
"    toast(e.message, \"error\", \"Buzzer Config\");\n"
"  }\n"
"}\n"
"\n"
"async function toggleTestLock(lockVal){\n"
"  try{\n"
"    const valStr = lockVal ? \"1\" : \"0\";\n"
"    const res = await api(\"/api/test-lock?lock=\"+valStr, { method: \"POST\" });\n"
"    if (res.success){\n"
"      toast(res.message, res.locked ? \"warn\" : \"success\", \"Hardware Test Mode\");\n"
"      const badge = byId(\"tst_lock_badge\");\n"
"      if(badge){\n"
"        badge.textContent = res.locked ? \"[LOCKED] Sensors Paused\" : \"[AUTO] Live Sensors Active\";\n"
"        badge.className = \"badge \" + (res.locked ? \"bad\" : \"ok\");\n"
"      }\n"
"      await refresh();\n"
"    } else toast(res.error || \"Failed\", \"error\", \"Test Mode\");\n"
"  }catch(e){\n"
"    toast(e.message, \"error\", \"Test Mode\");\n"
"  }\n"
"}\n"
"\n"
"async function runBlinkTest(){\n"
"  const stEl = byId(\"tst_self_status\");\n"
"  const repEl = byId(\"selfTestReport\");\n"
"  if(stEl) { stEl.textContent = \"Testing...\"; stEl.className = \"badge bad\"; }\n"
"  toast(\"Running hardware blink test on ESP32...\", \"info\", \"Self-Test\");\n"
"  try{\n"
"    const res = await api(\"/api/blink-test\", { method: \"POST\" });\n"
"    if (res.success){\n"
"      if(stEl) { stEl.textContent = \"All Passed [OK]\"; stEl.className = \"badge ok\"; }\n"
"      if(repEl){\n"
"        repEl.style.display = \"block\";\n"
"        repEl.innerHTML = \"<b>Hardware Self-Test Results:</b><br>\"+\n"
"          \"• LEDs: \" + (res.leds_tested ? \"[OK] Green, Yellow, Red Tested\" : \"[FAIL] Check LEDs\") + \"<br>\"+\n"
"          \"• Buzzer: \" + (res.buzzer_tested ? \"[OK] Tested (\"+res.buzzer_type+\")\" : \"[FAIL] No Response\") + \"<br>\"+\n"
"          \"• MQ-2 Sensor: Raw \" + res.mq2_raw + \" (\" + res.mq2_voltage + \"V) — \" + (res.mq2_heater_ok ? \"[OK] 5V Coil Active\" : \"[WARN] Cold (<40 ADC)\") + \"<br>\"+\n"
"          \"• MQ-3 Sensor: Raw \" + res.mq3_raw + \" (\" + res.mq3_voltage + \"V) — \" + (res.mq3_heater_ok ? \"[OK] 5V Coil Active\" : \"[WARN] Cold (<40 ADC)\") + \"<br>\"+\n"
"          \"• DHT Sensor: \" + (res.dht_ok ? \"[OK] \" + res.dht_model + \" (\" + res.temperature_c + \"°C, \" + res.humidity + \"%)\" : \"[FAIL] Bus Error\") + \"<br>\"+\n"
"          \"• Free Heap: \" + res.free_heap + \" bytes\";\n"
"      }\n"
"      toast(\"Blink test complete! All components verified.\", \"success\", \"Self-Test OK\");\n"
"      await refresh();\n"
"    } else {\n"
"      if(stEl) { stEl.textContent = \"Fail\"; stEl.className = \"badge bad\"; }\n"
"      toast(res.error || \"Test failed\", \"error\", \"Self-Test Error\");\n"
"    }\n"
"  }catch(e){\n"
"    if(stEl) { stEl.textContent = \"Error\"; stEl.className = \"badge bad\"; }\n"
"    toast(e.message, \"error\", \"Self-Test Error\");\n"
"  }\n"
"}\n"
"\n"
"async function triggerLED(led, state){\n"
"  try{\n"
"    const res = await api(\"/api/led?led=\"+encodeURIComponent(led)+\"&state=\"+encodeURIComponent(state), { method: \"POST\" });\n"
"    if (res.success) {\n"
"      toast(res.message, \"success\", \"LED Control\");\n"
"      await refresh();\n"
"    } else toast(res.error || \"Failed\", \"error\", \"LED Control\");\n"
"  }catch(e){\n"
"    toast(e.message, \"error\", \"LED Control\");\n"
"  }\n"
"}\n"
"\n"
"async function scanWiFi(){\n"
"  byId(\"scanOutput\").textContent=\"Scanning 2.4 GHz networks...\";\n"
"\n"
"  try{\n"
"    const d=await api(\"/api/wifi-scan\");\n"
"\n"
"    if(!d.success){\n"
"      byId(\"scanOutput\").textContent=d.error || \"Scan failed.\";\n"
"      toast(d.error || \"Scan failed.\",\"error\",\"Wi-Fi scan\");\n"
"      return;\n"
"    }\n"
"\n"
"    if(!d.count){\n"
"      byId(\"scanOutput\").textContent=\n"
"        \"No visible 2.4 GHz networks found.\";\n"
"      toast(\"No visible 2.4 GHz networks found.\",\"warn\",\"Wi-Fi scan\");\n"
"      return;\n"
"    }\n"
"\n"
"    let out=\"Found \"+d.count+\" network(s):\\n\\n\";\n"
"\n"
"    d.networks.forEach((n,index)=>{\n"
"      out+=\n"
"        (index+1)+\". \"+\n"
"        (n.ssid || \"<hidden>\")+\n"
"        \" | CH \"+n.channel+\n"
"        \" | \"+n.rssi+\" dBm\"+\n"
"        \" | auth \"+n.encryption+\n"
"        \"\\n\";\n"
"    });\n"
"\n"
"    byId(\"scanOutput\").textContent=out;\n"
"    toast(\"Found \"+d.count+\" Wi-Fi network(s).\",\"success\",\"Wi-Fi scan complete\");\n"
"  }catch(e){\n"
"    byId(\"scanOutput\").textContent=\"Scan error: \"+e.message;\n"
"    toast(e.message,\"error\",\"Wi-Fi scan failed\");\n"
"  }\n"
"}\n"
"\n"
"async function saveBackend(){\n"
"  const url=byId(\"backendURL\").value.trim();\n"
"\n"
"  try{\n"
"    const d=await api(\"/api/backend-config\",{\n"
"      method:\"POST\",\n"
"      headers:{\"Content-Type\":\"application/x-www-form-urlencoded\"},\n"
"      body:\"url=\"+encodeURIComponent(url)\n"
"    });\n"
"\n"
"    byId(\"backendMessage\").textContent=\n"
"      d.message+\"\\nSaved URL: \"+(d.url || \"(empty)\");\n"
"  }catch(e){\n"
"    byId(\"backendMessage\").textContent=\"Save error: \"+e.message;\n"
"  }\n"
"}\n"
"\n"
"async function testBackend(){\n"
"  byId(\"backendMessage\").textContent=\"Testing from ESP32...\";\n"
"  byId(\"backendOutput\").textContent=\"\";\n"
"\n"
"  try{\n"
"    const d=await api(\"/api/test-backend\");\n"
"\n"
"    byId(\"backendMessage\").textContent=\n"
"      d.success\n"
"      ? \"Backend request completed. HTTP \"+d.http_code\n"
"      : \"Backend test failed at stage: \"+d.stage;\n"
"\n"
"    byId(\"backendOutput\").textContent=\n"
"      JSON.stringify(d,null,2);\n"
"  }catch(e){\n"
"    byId(\"backendMessage\").textContent=\n"
"      \"Backend test error: \"+e.message;\n"
"  }\n"
"}\n"
"\n"
"function setBadge(id,text,ok){\n"
"  const el=byId(id);\n"
"  el.textContent=text;\n"
"  el.className=\"badge \"+(ok ? \"ok\" : \"bad\");\n"
"}\n"
"\n"
"function render(data){\n"
"  const wifiState=data.wifi_connected ? \"connected\" : (data.wifi_status || \"offline\");\n"
"  if(lastToastWifiState!==null && lastToastWifiState!==wifiState){\n"
"    if(data.wifi_connected){\n"
"      toast(\"STA connected. IP: \"+data.station_ip,\"success\",\"Wi-Fi\");\n"
"    }else{\n"
"      toast((data.wifi_error || data.wifi_reason || \"Wi-Fi disconnected\")+\"\\nReason: \"+(data.wifi_disconnect_reason_name || \"NO_DISCONNECT_EVENT\"),\"error\",\"Wi-Fi\");\n"
"    }\n"
"  }\n"
"  lastToastWifiState=wifiState;\n"
"\n"
"  // Top Telemetry Card\n"
"  setText(\"food_score\", (data.spoilage_score !== undefined && data.spoilage_score !== null) ? Number(data.spoilage_score).toFixed(1) : \"--\");\n"
"  const stEl = byId(\"food_status\");\n"
"  const stSub = byId(\"food_status_sub\");\n"
"  if(stEl){\n"
"    const hot = data.hot_food_event === true;\n"
"    stEl.textContent = hot ? \"HOT FOOD / TRANSIENT\" : (data.status || \"--\");\n"
"    stEl.style.color = hot ? \"#38bdf8\" : (data.status === \"SPOILED\" ? \"#ef4444\" : (data.status === \"CAUTION\" ? \"#eab308\" : \"#22c55e\"));\n"
"    if(stSub) stSub.textContent = hot ? \"Thermal/steam event — not spoilage\" : (data.sensor_system_ready ? \"Evaluation active\" : \"Sensor warm-up / calibration\");\n"
"  }\n"
"  setText(\"top_temp\", (data.dht_ok && data.temperature_c !== null) ? Number(data.temperature_c).toFixed(1)+\" °C\" : \"--\");\n"
"  setText(\"top_hum\", (data.dht_ok && data.humidity !== null) ? Number(data.humidity).toFixed(1)+\" %\" : \"--\");\n"
"  setText(\"top_temp_model\", (data.dht_model || \"DHT\") + (data.dht_ok ? \" · OK\" : \" · Wait\"));\n"
"  setText(\"mq2_val\", data.sensors_available ? data.mq2_raw : \"--\");\n"
"  setText(\"mq3_val\", data.sensors_available ? data.mq3_raw : \"--\");\n"
"  if(data.mq2_voltage !== undefined) setText(\"mq2_volt\", data.mq2_voltage + \" V\");\n"
"  if(data.mq3_voltage !== undefined) setText(\"mq3_volt\", data.mq3_voltage + \" V\");\n"
"\n"
"  // Home Page Metrics\n"
"  setText(\"temp\", (data.dht_ok && data.temperature_c !== null) ? Number(data.temperature_c).toFixed(1)+\" °C\" : \"--\");\n"
"  setText(\"hum\", (data.dht_ok && data.humidity !== null) ? Number(data.humidity).toFixed(1)+\" %\" : \"--\");\n"
"  setText(\"mq2\", data.sensors_available ? data.mq2_raw : \"--\");\n"
"  setText(\"mq3\", data.sensors_available ? data.mq3_raw : \"--\");\n"
"  setText(\"home_dht_temp_sub\", (data.dht_model||\"DHT\") + \" °C \" + (data.dht_ok ? \"· OK\" : \"· Waiting\"));\n"
"  setText(\"home_dht_hum_sub\", (data.dht_model||\"DHT\") + \" % \" + (data.dht_ok ? \"· OK\" : \"· Waiting\"));\n"
"\n"
"  // Hardware Test Page\n"
"  setText(\"tst_temp\", (data.dht_ok && data.temperature_c !== null) ? Number(data.temperature_c).toFixed(1) : \"--\");\n"
"  setText(\"tst_hum\", (data.dht_ok && data.humidity !== null) ? Number(data.humidity).toFixed(1) : \"--\");\n"
"  setText(\"tst_mq2\", data.sensors_available ? data.mq2_raw : \"--\");\n"
"  setText(\"tst_mq3\", data.sensors_available ? data.mq3_raw : \"--\");\n"
"  setText(\"tst_dht_ok\", data.dht_ok ? \"Normal (Connected)\" : (\"Fail / Waiting (\" + (data.dht_fails||0) + \" tries)\"));\n"
"  setText(\"tst_score\", (data.spoilage_score !== undefined && data.spoilage_score !== null) ? Number(data.spoilage_score).toFixed(1) : \"--\");\n"
"  setText(\"tst_status\", data.hot_food_event ? \"HOT FOOD / TRANSIENT\" : (data.status || \"--\"));\n"
"  setText(\"tst_active_dht\", data.dht_model || \"DHT22\");\n"
"\n"
"  // Live Hardware Pin Diagnostics\n"
"  setText(\"pin_dht_type\", data.dht_model || \"DHT\");\n"
"  setText(\"pin_dht_bus\", data.pin_dht_level === 1 ? \"HIGH (3.3V pull-up OK)\" : \"LOW (Line pulled low)\");\n"
"  setText(\"pin_dht_diag\", data.dht_ok ? \"[OK] Active signal stream\" : \"[WARN] No frame (Check 10k pull-up & model)\");\n"
"  setText(\"pin_mq2_raw\", (data.mq2_raw !== undefined ? data.mq2_raw + \" (\" + (data.mq2_voltage||0) + \"V)\" : \"--\"));\n"
"  setText(\"pin_mq2_diag\", data.mq2_raw > 40 ? \"[OK] Active analog signal\" : \"[WARN] Low / Cold (Check 5V VIN heater)\");\n"
"  setText(\"pin_mq3_raw\", (data.mq3_raw !== undefined ? data.mq3_raw + \" (\" + (data.mq3_voltage||0) + \"V)\" : \"--\"));\n"
"  setText(\"pin_mq3_diag\", data.mq3_raw > 40 ? \"[OK] Active analog signal\" : \"[WARN] Low / Cold (Check 5V VIN heater)\");\n"
"  setText(\"pin_btn_live\", data.btn_pressed ? \"0 (LOW)\" : \"1 (HIGH)\");\n"
"  setBadge(\"pin_btn_badge\", data.btn_pressed ? \"PRESSED\" : \"RELEASED\", data.btn_pressed);\n"
"  setText(\"pin_led_g\", (data.led_green_level === 1 ? \"ON (Active)\" : \"OFF\"));\n"
"  setText(\"pin_led_y\", (data.led_yellow_level === 1 ? \"ON (Active)\" : \"OFF\"));\n"
"  setText(\"pin_led_r\", (data.led_red_level === 1 ? \"ON (Active)\" : \"OFF\"));\n"
"  setText(\"tst_mq_power\", (data.mq2_signal_present && data.mq3_signal_present) ? \"[OK] Analog signal present\" : (data.mq_warmup ? \"[WARN] Warming up (Coil heating...)\" : \"[WARN] Low signal / check MQ 5V supply\"));\n"
"  const lockEl = byId(\"tst_lock_badge\");\n"
"  if(lockEl){\n"
"    lockEl.textContent = data.test_lock_mode ? \"[LOCKED] Sensors Paused\" : \"[AUTO] Live Sensors Active\";\n"
"    lockEl.className = \"badge \" + (data.test_lock_mode ? \"bad\" : \"ok\");\n"
"  }\n"
"  const bzBadge = byId(\"buzzerTypeBadge\");\n"
"  if(bzBadge && data.buzzer_type){\n"
"    bzBadge.textContent = data.buzzer_type === \"ACTIVE\" ? \"ACTIVE (DIRECT DC)\" : \"PASSIVE (PWM TONE)\";\n"
"  }\n"
"\n"
"  setBadge(\"apState\",\n"
"    data.ap_active ? \"ACTIVE\" : \"OFF\",\n"
"    data.ap_active\n"
"  );\n"
"\n"
"  setBadge(\"staState\",\n"
"    data.wifi_connected ? \"CONNECTED\" : \"OFFLINE\",\n"
"    data.wifi_connected\n"
"  );\n"
"\n"
"  setText(\"ssid\", data.ssid || \"--\");\n"
"  setText(\"staIP\", data.wifi_connected ? data.station_ip : \"--\");\n"
"  setText(\"apIP\", data.ap_ip || \"--\");\n"
"  setText(\"rssi\", data.wifi_connected ? data.rssi+\" dBm\" : \"--\");\n"
"\n"
"  setText(\"wifiDiagnostics\",\n"
"    data.wifi_connected\n"
"    ? \"CONNECTED | SSID: \"+(data.ssid||\"--\")+\" | IP: \"+(data.station_ip||\"--\")+\" | RSSI: \"+(data.rssi||0)+\" dBm\"\n"
"    : \"STATE: \"+(data.wifi_connecting ? (data.wifi_associated ? \"ASSOCIATED / WAITING DHCP\" : \"CONNECTING\") : \"OFFLINE\")+\" | SSID: \"+(data.ssid||\"--\")+\" | Status: \"+(data.wifi_status||\"--\")+\" (\"+(data.wifi_status_code??\"--\")+\") | Disconnect: \"+(data.wifi_disconnect_reason_name||\"NO_DISCONNECT_EVENT\")+\" (\"+(data.wifi_disconnect_reason||0)+\") | Action: \"+(data.wifi_action||\"--\")+\" | Hint: \"+(data.wifi_reason_hint||data.wifi_error||\"--\"));\n"
"  setText(\"wifiReason\",\n"
"    data.wifi_connected\n"
"    ? \"Station Wi-Fi connected. Sensors operate locally and independently.\"\n"
"    : \"Station Wi-Fi is not connected. The recovery AP and local sensors remain available.\\n\"+wifiReasonFromData(data));\n"
"\n"
"  setText(\"sensorState\",\n"
"    data.dht_ok\n"
"    ? (data.dht_model||\"DHT\")+\" OK. MQ-2 and MQ-3 ADC channels active.\"\n"
"    : (data.dht_model||\"DHT\")+\" read failed or has not produced a valid reading yet. MQ ADC channels remain active.\");\n"
"\n"
"  setText(\"sensorJSON\", JSON.stringify(data,null,2));\n"
"\n"
"  setText(\"sensorPageState\",\n"
"    data.dht_ok\n"
"    ? \"Live readings active.\"\n"
"    : (data.dht_model||\"DHT\")+\" unavailable; check wiring/power. MQ readings are raw ADC values.\");\n"
"\n"
"  setText(\"uptime\", data.uptime_s+\" s\");\n"
"  setText(\"heap\", data.free_heap+\" bytes\");\n"
"  setText(\"backendState\", data.backend_configured ? \"Configured\" : \"Not configured\");\n"
"\n"
"  setText(\"topStatus\",\n"
"    data.wifi_connected\n"
"    ? \"STA connected · \"+data.station_ip\n"
"    : \"AP active · STA offline · sensors local\");\n"
"}\n"
"\n"
"async function setDHTModel(model){\n"
"  try{\n"
"    const d=await api(\"/api/sensor-config?dht=\"+encodeURIComponent(model),{method:\"POST\"});\n"
"    if(d.success){\n"
"      toast(\"DHT protocol set to \"+d.dht_model,\"success\",\"Sensors\");\n"
"      refresh();\n"
"    }else{\n"
"      toast(\"Error: \"+(d.error||\"failed\"),\"error\",\"Sensors\");\n"
"    }\n"
"  }catch(e){\n"
"    toast(e.message,\"error\",\"Sensor Config\");\n"
"  }\n"
"}\n"
"\n"
"function wifiReasonFromData(data){\n"
"  if(data.wifi_connected) return \"Connected to \"+(data.ssid||\"Wi-Fi\")+\" · \"+(data.station_ip||\"no IP\");\n"
"  const reason=(data.wifi_disconnect_reason_name||\"NO_DISCONNECT_EVENT\");\n"
"  const code=Number(data.wifi_disconnect_reason||0);\n"
"  const hint=data.wifi_reason_hint||data.wifi_error||\"No disconnect reason has been captured yet.\";\n"
"  if(data.wifi_connecting) return (data.wifi_associated?\"Associated; waiting for DHCP. \" : \"Connecting. \" )+hint;\n"
"  return reason+\" (\"+code+\") · \"+hint;\n"
"}\n"
"\n"
"async function refresh(){\n"
"  if(refreshBusy) return;\n"
"  refreshBusy=true;\n"
"\n"
"  try{\n"
"    const data=await api(\"/api/data\");\n"
"    render(data);\n"
"  }catch(e){\n"
"    byId(\"topStatus\").textContent=\"ESP32 API unavailable\";\n"
"    console.error(e);\n"
"  }finally{\n"
"    refreshBusy=false;\n"
"  }\n"
"}\n"
"\n"
"initialPage();\n"
"loadConfig();\n"
"refresh();\n"
"setInterval(refresh,500);\n"
"</script>\n"
"\n"
"</body>\n"
"</html>\n";

// ============================================================
// API
// ============================================================


// Non-blocking buzzer state
static unsigned long buzzerUntilMs = 0;
static int activeBuzzerStrength = 80;

void setBuzzerHardware(bool on, int freq, int strength) {
  if (!on) {
    #if defined(ESP32)
    analogWrite(BUZZER_PIN, 0);
    #endif
    noTone(BUZZER_PIN);
    pinMode(BUZZER_PIN, OUTPUT);
    digitalWrite(BUZZER_PIN, LOW);
    return;
  }

  pinMode(BUZZER_PIN, OUTPUT);
  if (buzzerType == "ACTIVE") {
    // Active buzzers have an internal oscillator: continuous DC HIGH produces loud, clear sound
    digitalWrite(BUZZER_PIN, HIGH);
  } else {
    // Passive buzzer: drive with tone or PWM
    #if defined(ESP32)
    analogWriteFrequency(BUZZER_PIN, freq);
    int duty = (strength * 128) / 100;
    if (duty < 20) duty = 20;
    analogWrite(BUZZER_PIN, duty);
    #else
    tone(BUZZER_PIN, freq);
    #endif
  }
}

void buzzBeep(int durationMs, int freq, int strength) {
  activeBuzzerStrength = strength;
  setBuzzerHardware(true, freq, strength);
  buzzerUntilMs = millis() + durationMs;
}

void handleBuzzer() {
  if (server.method() == HTTP_OPTIONS) {
    cors();
    server.send(204);
    return;
  }
  cors();

  int strength = server.hasArg("strength") ? server.arg("strength").toInt() : 80;
  if (strength < 10) strength = 10;
  if (strength > 100) strength = 100;
  activeBuzzerStrength = strength;

  String pattern = server.hasArg("pattern") ? server.arg("pattern") : "beep";
  pattern.toLowerCase();

  int freq = 1200 + ((strength * 1600) / 100);
  int durationMs = 150 + ((strength * 350) / 100);

  if (pattern == "warning") {
    // Test Caution / Warning cadence (180ms chirp)
    freq = 1900;
    durationMs = 200;
    buzzBeep(durationMs, freq, strength);
  } else if (pattern == "alarm") {
    // Test Emergency / Spoiled cadence (rapid pulse)
    freq = 2400;
    durationMs = 350;
    buzzBeep(durationMs, freq, 100);
  } else {
    buzzBeep(durationMs, freq, strength);
  }

  String resp = "{\"success\":true,\"message\":\"Buzzer (" + buzzerType + ") tested at " + String(strength) + "% strength (" + String(freq) + " Hz)\",\"strength\":" + String(strength) + ",\"buzzer_type\":\"" + buzzerType + "\"}";
  sendJSON(200, resp);
}

void handleBuzzerConfig() {
  if (server.method() == HTTP_OPTIONS) {
    cors();
    server.send(204);
    return;
  }
  cors();

  if (server.hasArg("type")) {
    String t = server.arg("type");
    t.toUpperCase();
    if (t == "ACTIVE" || t == "PASSIVE") {
      buzzerType = t;
      saveConfig();
      buzzBeep(120, 2000, 80);
      sendJSON(200, "{\"success\":true,\"buzzer_type\":\"" + buzzerType + "\",\"message\":\"Buzzer mode set to " + buzzerType + "\"}");
      return;
    }
  }

  sendJSON(400, "{\"success\":false,\"error\":\"Invalid type parameter. Use ACTIVE or PASSIVE.\"}");
}

void handleTestLock() {
  if (server.method() == HTTP_OPTIONS) {
    cors();
    server.send(204);
    return;
  }
  cors();

  if (server.hasArg("lock")) {
    String l = server.arg("lock");
    l.toLowerCase();
    if (l == "1" || l == "true" || l == "on") testLockMode = true;
    else if (l == "0" || l == "false" || l == "off") testLockMode = false;
    else if (l == "toggle") testLockMode = !testLockMode;
  } else {
    testLockMode = !testLockMode;
  }

  if (!testLockMode) {
    manualLedOverrideUntil = 0;
    updateLEDsAndBuzzer(currentStatus);
  } else {
    // Stop any active buzzer upon entering lock mode
    setBuzzerHardware(false);
    buzzerUntilMs = 0;
  }

  buzzBeep(80, 2200, 70);

  String resp = "{\"success\":true,\"locked\":" + String(testLockMode ? "true" : "false") +
                ",\"message\":\"Test Lock Mode is now " + String(testLockMode ? "ACTIVE (Live sensor override paused)" : "OFF (Live sensor mode resumed)") + "\"}";
  sendJSON(200, resp);
}

void handleBlinkTest() {
  if (server.method() == HTTP_OPTIONS) {
    cors();
    server.send(204);
    return;
  }
  cors();

  // Run visible LED blink & buzzer hardware test
  digitalWrite(GREEN_LED, HIGH);
  delay(120);
  digitalWrite(GREEN_LED, LOW);

  digitalWrite(YELLOW_LED, HIGH);
  delay(120);
  digitalWrite(YELLOW_LED, LOW);

  digitalWrite(RED_LED, HIGH);
  delay(120);
  digitalWrite(RED_LED, LOW);

  buzzBeep(100, 2200, 80);
  delay(120);
  setBuzzerHardware(false);

  // Blink all 3 together twice
  for (int i = 0; i < 2; i++) {
    digitalWrite(GREEN_LED, HIGH);
    digitalWrite(YELLOW_LED, HIGH);
    digitalWrite(RED_LED, HIGH);
    delay(90);
    digitalWrite(GREEN_LED, LOW);
    digitalWrite(YELLOW_LED, LOW);
    digitalWrite(RED_LED, LOW);
    delay(90);
  }

  // Refresh live readings
  mq2Raw = analogRead(MQ2_PIN);
  mq3Raw = analogRead(MQ3_PIN);
  float mq2V = (mq2Raw / 4095.0f) * 3.3f;
  float mq3V = (mq3Raw / 4095.0f) * 3.3f;

  // Restore current status LEDs unless locked
  if (!testLockMode) {
    applyLedStates(currentStatus);
  }

  String j = "{";
  j += "\"success\":true,";
  j += "\"message\":\"Hardware Blink & Sensor Self-Test complete\",";
  j += "\"leds_tested\":true,";
  j += "\"buzzer_tested\":true,";
  j += "\"buzzer_type\":\"" + buzzerType + "\",";
  j += "\"mq2_raw\":" + String(mq2Raw) + ",";
  j += "\"mq2_voltage\":" + String(mq2V, 2) + ",";
  j += "\"mq2_signal_present\":" + String(mq2Raw > 40 ? "true" : "false") + ",";
  j += "\"mq2_heater_ok\":" + String(mq2Raw > 40 ? "true" : "false") + ",";
  j += "\"mq3_raw\":" + String(mq3Raw) + ",";
  j += "\"mq3_voltage\":" + String(mq3V, 2) + ",";
  j += "\"mq3_signal_present\":" + String(mq3Raw > 40 ? "true" : "false") + ",";
  j += "\"mq3_heater_ok\":" + String(mq3Raw > 40 ? "true" : "false") + ",";
  j += "\"dht_ok\":" + String(dhtOK ? "true" : "false") + ",";
  j += "\"dht_model\":\"" + dhtModel + "\",";
  j += "\"temperature_c\":" + (isnan(temperatureC) ? "null" : String(temperatureC, 1)) + ",";
  j += "\"humidity\":" + (isnan(humidity) ? "null" : String(humidity, 1)) + ",";
  j += "\"free_heap\":" + String(ESP.getFreeHeap()) + ",";
  j += "\"test_lock_mode\":" + String(testLockMode ? "true" : "false");
  j += "}";

  sendJSON(200, j);
}

void handleLED() {
  if (server.method() == HTTP_OPTIONS) {
    cors();
    server.send(204);
    return;
  }
  cors();

  String led = server.hasArg("led") ? server.arg("led") : "";
  String state = server.hasArg("state") ? server.arg("state") : "";
  led.toLowerCase();
  state.toLowerCase();

  int val = (state == "on" || state == "1" || state == "high") ? HIGH : LOW;

  if (led == "green") {
    digitalWrite(GREEN_LED, val);
  } else if (led == "yellow") {
    digitalWrite(YELLOW_LED, val);
  } else if (led == "red") {
    digitalWrite(RED_LED, val);
  } else if (led == "all") {
    digitalWrite(GREEN_LED, val);
    digitalWrite(YELLOW_LED, val);
    digitalWrite(RED_LED, val);
  } else {
    sendJSON(400, "{\"success\":false,\"error\":\"Invalid led parameter. Use green, yellow, red, or all.\"}");
    return;
  }

  if (val == LOW) {
    manualLedOverrideUntil = 0; // resume automatic live sensor control immediately
    updateLEDsAndBuzzer(currentStatus);
  } else if (!testLockMode) {
    manualLedOverrideUntil = millis() + 4000; // retain manual test state for 4s, not 30s
  }

  String msg = "LED " + led + " set to " + (val == HIGH ? "ON" : "OFF");
  if (testLockMode) msg += " (Locked indefinitely in Test Lock Mode)";

  sendJSON(200, "{\"success\":true,\"message\":\"" + msg + "\",\"locked\":" + String(testLockMode ? "true" : "false") + "}");
}

void handleRoot() {
  server.send_P(200, "text/html; charset=utf-8", INDEX_HTML);
}

void handleData() {
  sendJSON(200, sensorJSON());
}

void handleHealth() {
  bool connected = WiFi.status() == WL_CONNECTED;

  String j = "{";
  j += "\"ok\":true,";
  j += "\"ap_active\":true,";
  j += "\"ap_ip\":\"" + WiFi.softAPIP().toString() + "\",";
  j += "\"wifi_configured\":" + String(wifiSSID.length() ? "true" : "false") + ",";
  j += "\"wifi_connected\":" + String(connected ? "true" : "false") + ",";
  j += "\"wifi_status\":\"" + wifiStatusName(WiFi.status()) + "\",";
  j += "\"wifi_status_code\":" + String((int)WiFi.status()) + ",";
  j += "\"wifi_reason\":\"" + jsonEscape(wifiReason()) + "\",";
  j += "\"wifi_action\":\"" + jsonEscape(lastWiFiAction) + "\",";
  j += "\"wifi_error\":\"" + jsonEscape(lastWiFiError) + "\",";
  j += "\"wifi_disconnect_reason\":" + String(lastDisconnectReason) + ",";
  j += "\"wifi_disconnect_reason_name\":\"" + jsonEscape(lastDisconnectReasonName) + "\",";
  j += "\"wifi_reason_hint\":\"" + jsonEscape(wifiActionHint(lastDisconnectReason)) + "\",";
  j += "\"wifi_associated\":" + String(staAssociated ? "true" : "false") + ",";
  j += "\"wifi_connecting\":" + String(wifiConnecting ? "true" : "false") + ",";
  j += "\"wifi_attempts\":" + String(connectAttemptCount) + ",";
  j += "\"wifi_channel\":" + String(WiFi.channel()) + ",";
  j += "\"scan_in_progress\":" + String(scanInProgress ? "true" : "false") + ",";
  j += "\"last_scan_count\":" + String(lastScanCount);
  j += "}";

  sendJSON(200, j);
}

void handleConfig() {
  // Do NOT send the actual password back to the browser.
  String j = "{";

  j += "\"wifi_ssid\":\"" + jsonEscape(wifiSSID) + "\",";
  j += "\"wifi_password_set\":" +
       String(wifiPassword.length() ? "true" : "false") + ",";

  j += "\"backend_url\":\"" + jsonEscape(backendURL) + "\",";
  j += "\"wifi_connected\":" +
       String(WiFi.status() == WL_CONNECTED ? "true" : "false") + ",";

  j += "\"wifi_status\":\"" + wifiStatusName(WiFi.status()) + "\",";
  j += "\"wifi_status_code\":" + String((int)WiFi.status()) + ",";
  j += "\"wifi_reason\":\"" + jsonEscape(wifiReason()) + "\",";
  j += "\"wifi_action\":\"" + jsonEscape(lastWiFiAction) + "\",";
  j += "\"wifi_error\":\"" + jsonEscape(lastWiFiError) + "\",";
  j += "\"wifi_disconnect_reason\":" + String(lastDisconnectReason) + ",";
  j += "\"wifi_disconnect_reason_name\":\"" + jsonEscape(lastDisconnectReasonName) + "\",";
  j += "\"wifi_reason_hint\":\"" + jsonEscape(wifiActionHint(lastDisconnectReason)) + "\",";
  j += "\"wifi_associated\":" + String(staAssociated ? "true" : "false") + ",";
  j += "\"wifi_connecting\":" + String(wifiConnecting ? "true" : "false") + ",";
  j += "\"wifi_attempts\":" + String(connectAttemptCount) + ",";
  j += "\"ap_ip\":\"" + WiFi.softAPIP().toString() + "\",";
  j += "\"ap_channel\":" + String(WiFi.channel()) + ",";
  j += "\"station_ip\":\"" + WiFi.localIP().toString() + "\",";
  j += "\"dht_model\":\"" + dhtModel + "\"";

  j += "}";

  sendJSON(200, j);
}

void handleWiFiConfig() {
  if (!server.hasArg("ssid")) {
    sendJSON(400,
      "{\"success\":false,\"error\":\"Missing SSID\"}");
    return;
  }

  String newSSID = server.arg("ssid");
  newSSID.trim();

  if (!newSSID.length()) {
    sendJSON(400,
      "{\"success\":false,\"error\":\"SSID cannot be empty\"}");
    return;
  }

  if (newSSID.length() > 32) {
    sendJSON(400,
      "{\"success\":false,\"error\":\"SSID is too long. Maximum is 32 characters.\"}");
    return;
  }

  String newPassword =
    server.hasArg("password") ? server.arg("password") : "";

  if (newPassword.length() != 0 &&
      (newPassword.length() < 8 || newPassword.length() > 63)) {
    sendJSON(400,
      "{\"success\":false,\"error\":\"Password must be empty or 8-63 characters.\"}");
    return;
  }

  wifiSSID = newSSID;
  wifiPassword = newPassword;

  saveConfig();

  bool started = beginSTAConnect();
  bool connected = WiFi.status() == WL_CONNECTED;

  String j = "{";
  j += "\"success\":" + String(connected ? "true" : "false") + ",";
  j += "\"connected\":" + String(connected ? "true" : "false") + ",";
  j += "\"message\":\"";

  if (connected)
    j += "Wi-Fi connected and credentials saved.";
  else if (started)
    j += "Credentials saved. ESP32 is attempting to connect; recovery AP remains available.";
  else
    j += "Credentials saved, but connection could not be started.";

  j += "\",";
  j += "\"connecting\":" + String(wifiConnecting ? "true" : "false") + ",";
  j += "\"status_code\":" + String((int)WiFi.status()) + ",";
  j += "\"status_name\":\"" + wifiStatusName(WiFi.status()) + "\",";
  j += "\"reason\":\"" + jsonEscape(wifiReason()) + "\",";
  j += "\"disconnect_reason\":" + String(lastDisconnectReason) + ",";
  j += "\"disconnect_reason_name\":\"" + jsonEscape(lastDisconnectReasonName) + "\",";
  j += "\"reason_hint\":\"" + jsonEscape(wifiActionHint(lastDisconnectReason)) + "\",";
  j += "\"associated\":" + String(staAssociated ? "true" : "false") + ",";
  j += "\"station_ip\":\"" + WiFi.localIP().toString() + "\",";
  j += "\"ap_ip\":\"" + WiFi.softAPIP().toString() + "\",";
  j += "\"rssi\":" +
       String(connected ? WiFi.RSSI() : 0);
  j += "}";

  sendJSON(200, j);
}

void handleWiFiScan() {
  sendJSON(200, scanJSON());
}

void handleBackendConfig() {
  if (!server.hasArg("url")) {
    sendJSON(400,
      "{\"success\":false,\"error\":\"Missing backend URL\"}");
    return;
  }

  backendURL = normalizeBackendURL(server.arg("url"));

  if (backendURL.length() &&
      !backendURLValid(backendURL)) {
    sendJSON(400,
      "{\"success\":false,\"error\":\"Invalid backend URL\"}");
    return;
  }

  saveConfig();

  String j = "{";
  j += "\"success\":true,";
  j += "\"message\":\"Backend URL saved.\",";
  j += "\"url\":\"" + jsonEscape(backendURL) + "\"";
  j += "}";

  sendJSON(200, j);
}

void handleBackendTest() {
  sendJSON(200, backendTest());
}

void handleSensorConfig() {
  String model = "";
  if (server.hasArg("dht")) {
    model = server.arg("dht");
  } else if (server.hasArg("plain")) {
    String body = server.arg("plain");
    int idx = body.indexOf("\"dht\"");
    if (idx >= 0) {
      int colon = body.indexOf(':', idx);
      int q1 = body.indexOf('"', colon);
      int q2 = body.indexOf('"', q1 + 1);
      if (q1 >= 0 && q2 > q1) model = body.substring(q1 + 1, q2);
    }
  }

  if (model.length()) {
    applyDHTConfig(model, true);
    sendJSON(200, "{\"success\":true,\"dht_model\":\"" + dhtModel + "\"}");
  } else {
    sendJSON(400, "{\"success\":false,\"error\":\"Missing dht parameter (e.g. DHT11 or DHT22)\"}");
  }
}

void handleOptions() {
  cors();
  server.send(204);
}

void handleNotFound() {
  sendJSON(404,
    "{\"success\":false,\"error\":\"API/page not found\"}");
}

// ============================================================
// SETUP
// ============================================================

void setup() {
  pinMode(GREEN_LED, OUTPUT);
  pinMode(YELLOW_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(DHT_PIN, INPUT_PULLUP);

  digitalWrite(GREEN_LED, LOW);
  digitalWrite(YELLOW_LED, LOW);
  digitalWrite(RED_LED, LOW);
  digitalWrite(BUZZER_PIN, LOW);

  Serial.begin(115200);
  delay(300);

  analogReadResolution(12);

  dht.begin();

  analogSetPinAttenuation(MQ2_PIN, ADC_11db);
  analogSetPinAttenuation(MQ3_PIN, ADC_11db);

  lastSensorRead = millis() - 2000;

  loadConfig();

  // Run hardware startup test for LEDs, buzzer, ESP pins & MQ sensors
  runBootSelfTest();

  WiFi.onEvent(wifiEvent);

  Serial.println();
  Serial.println("================================");
  Serial.println("ESP32 SENSOR NODE (ZERO-LATENCY)");
  Serial.println("================================");

  // AP is started BEFORE STA so the configuration UI is always reachable.
  startAP();

  if (wifiSSID.length()) {
    beginSTAConnect();
  } else {
    Serial.println("No STA credentials configured.");
  }

  server.on("/", HTTP_GET, handleRoot);

  server.on("/api/data", HTTP_GET, handleData);
  server.on("/api/health", HTTP_GET, handleHealth);
  server.on("/api/config", HTTP_GET, handleConfig);
  server.on("/api/sensor-config", HTTP_POST, handleSensorConfig);
  server.on("/api/sensor-config", HTTP_GET, handleSensorConfig);
  server.on("/api/sensor-config", HTTP_OPTIONS, handleOptions);

  server.on("/api/wifi-config", HTTP_POST, handleWiFiConfig);
  server.on("/api/wifi-scan", HTTP_GET, handleWiFiScan);

  server.on("/api/backend-config", HTTP_POST, handleBackendConfig);
  server.on("/api/test-backend", HTTP_GET, handleBackendTest);

  server.on("/api/data", HTTP_OPTIONS, handleOptions);
  server.on("/api/health", HTTP_OPTIONS, handleOptions);
  server.on("/api/config", HTTP_OPTIONS, handleOptions);
  server.on("/api/wifi-config", HTTP_OPTIONS, handleOptions);
  server.on("/api/wifi-scan", HTTP_OPTIONS, handleOptions);
  server.on("/api/backend-config", HTTP_OPTIONS, handleOptions);
  server.on("/api/test-backend", HTTP_OPTIONS, handleOptions);

  server.on("/api/buzzer", HTTP_POST, handleBuzzer);
  server.on("/api/buzzer", HTTP_GET, handleBuzzer);
  server.on("/api/buzzer", HTTP_OPTIONS, handleOptions);

  server.on("/api/buzzer-config", HTTP_POST, handleBuzzerConfig);
  server.on("/api/buzzer-config", HTTP_GET, handleBuzzerConfig);
  server.on("/api/buzzer-config", HTTP_OPTIONS, handleOptions);

  server.on("/api/test-lock", HTTP_POST, handleTestLock);
  server.on("/api/test-lock", HTTP_GET, handleTestLock);
  server.on("/api/test-lock", HTTP_OPTIONS, handleOptions);

  server.on("/api/self-test", HTTP_POST, handleBlinkTest);
  server.on("/api/self-test", HTTP_GET, handleBlinkTest);
  server.on("/api/self-test", HTTP_OPTIONS, handleOptions);
  server.on("/api/blink-test", HTTP_POST, handleBlinkTest);
  server.on("/api/blink-test", HTTP_GET, handleBlinkTest);
  server.on("/api/blink-test", HTTP_OPTIONS, handleOptions);

  server.on("/api/led", HTTP_POST, handleLED);
  server.on("/api/led", HTTP_OPTIONS, handleOptions);
  server.onNotFound(handleNotFound);

  server.begin();

  Serial.print("Dashboard AP: http://");
  Serial.println(WiFi.softAPIP());

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Dashboard STA: http://");
    Serial.println(WiFi.localIP());
  }
}

// calculateSpoilageScore() is defined above and now uses the enhanced sensor-fusion classifier.

void applyLedStates(String status) {
  if (status == "GOOD") {
    digitalWrite(GREEN_LED, HIGH);
    digitalWrite(YELLOW_LED, LOW);
    digitalWrite(RED_LED, LOW);
  } else if (status == "CAUTION") {
    digitalWrite(GREEN_LED, LOW);
    digitalWrite(YELLOW_LED, HIGH);
    digitalWrite(RED_LED, LOW);
  } else if (status == "SPOILED") {
    digitalWrite(GREEN_LED, LOW);
    digitalWrite(YELLOW_LED, LOW);
    digitalWrite(RED_LED, HIGH);
  }
}

void updateLEDsAndBuzzer(String status) {
  if (testLockMode || millis() < manualLedOverrideUntil) {
    return; // Don't wipe active manual test state
  }

  applyLedStates(status);

  if (status == "GOOD") {
    setBuzzerHardware(false);
    buzzerUntilMs = 0;
  } else if (status == "CAUTION") {
    lastCautionBeepAt = millis();
    buzzBeep(180, 1900, 80); // Warning chirp upon entering Caution
  } else if (status == "SPOILED") {
    lastSpoiledAlarmCycleAt = millis();
    spoiledAlarmStep = 1;
    buzzBeep(220, 2400, 100); // Alarm pulse upon entering Spoiled
  }
}

void serviceAlertBuzzer() {
  if (testLockMode || millis() < manualLedOverrideUntil) {
    return;
  }

  unsigned long now = millis();

  if (currentStatus == "CAUTION") {
    // Periodic gentle warning chirp for Yellow light: 140ms beep every 4 seconds
    if (now - lastCautionBeepAt >= 4000) {
      lastCautionBeepAt = now;
      buzzBeep(140, 1900, 75);
    }
  } else if (currentStatus == "SPOILED") {
    // Urgent alarm cadence for Red light: 160ms ON, 120ms gap, 160ms ON every 1.5s
    if (now - lastSpoiledAlarmCycleAt >= 1500) {
      lastSpoiledAlarmCycleAt = now;
      spoiledAlarmStep = 1;
      buzzBeep(160, 2400, 95);
    } else if (spoiledAlarmStep == 1 && now - lastSpoiledAlarmCycleAt >= 280) {
      spoiledAlarmStep = 0;
      buzzBeep(160, 2400, 95);
    }
  }
}

void runBootSelfTest() {
  Serial.println("[TEST] Starting Hardware Startup Blink Test...");
  // 1. Test Green
  digitalWrite(GREEN_LED, HIGH);
  delay(140);
  digitalWrite(GREEN_LED, LOW);
  // 2. Test Yellow
  digitalWrite(YELLOW_LED, HIGH);
  delay(140);
  digitalWrite(YELLOW_LED, LOW);
  // 3. Test Red
  digitalWrite(RED_LED, HIGH);
  delay(140);
  digitalWrite(RED_LED, LOW);
  // 4. Test Buzzer chirp
  buzzBeep(100, 2200, 80);
  delay(120);
  setBuzzerHardware(false);
  // 5. Blink all 3 together twice
  for (int i = 0; i < 2; i++) {
    digitalWrite(GREEN_LED, HIGH);
    digitalWrite(YELLOW_LED, HIGH);
    digitalWrite(RED_LED, HIGH);
    delay(100);
    digitalWrite(GREEN_LED, LOW);
    digitalWrite(YELLOW_LED, LOW);
    digitalWrite(RED_LED, LOW);
    delay(100);
  }
  // 6. Check MQ sensors heater line
  int q2 = analogRead(MQ2_PIN);
  int q3 = analogRead(MQ3_PIN);
  Serial.printf("[TEST] MQ-2 ADC: %d, MQ-3 ADC: %d\n", q2, q3);
  if (q2 > 40 && q3 > 40) {
    digitalWrite(GREEN_LED, HIGH);
    delay(150);
    digitalWrite(GREEN_LED, LOW);
  } else {
    digitalWrite(YELLOW_LED, HIGH);
    delay(250);
    digitalWrite(YELLOW_LED, LOW);
  }
  Serial.println("[TEST] Startup Blink Test Completed.");
}

// ─── Helper: extract a quoted string value from JSON without ArduinoJson ──────
// e.g. extractJsonString("{\"led\":\"RED\"}", "led")  →  "RED"
String extractJsonString(const String& json, const String& key) {
  String search = "\"" + key + "\":\"";
  int start = json.indexOf(search);
  if (start < 0) return "";
  start += search.length();
  int end = json.indexOf("\"", start);
  if (end < 0) return "";
  return json.substring(start, end);
}

// ─── Helper: extract value nested inside a JSON sub-object ─────────────────
// Finds the sub-object for 'obj' key first, then extracts 'key' within it.
// e.g. extractNestedJsonString(body, "command", "status")  →  "SPOILED"
String extractNestedJsonString(const String& json, const String& obj, const String& key) {
  String objSearch = "\"" + obj + "\":{";
  int objStart = json.indexOf(objSearch);
  if (objStart < 0) return "";
  objStart += objSearch.length() - 1; // point at '{'
  int depth = 0;
  int objEnd = objStart;
  for (int i = objStart; i < (int)json.length(); i++) {
    if (json[i] == '{') depth++;
    else if (json[i] == '}') { depth--; if (depth == 0) { objEnd = i; break; } }
  }
  if (objEnd <= objStart) return "";
  String sub = json.substring(objStart, objEnd + 1);
  return extractJsonString(sub, key);
}

void backendUploadTask(void* param) {
  String json = pendingBackendJson;
  HTTPClient http;
  String fullUrl = normalizeBackendURL(backendURL);
  if (!fullUrl.endsWith("/api/sensors/data") && !fullUrl.endsWith("/data")) {
    fullUrl += "/api/sensors/data";
  }

  int code = -1;
  String body = "";

  if (fullUrl.startsWith("https://")) {
    WiFiClientSecure client;
    client.setInsecure();
    client.setTimeout(6);
    if (http.begin(client, fullUrl)) {
      http.addHeader("Content-Type", "application/json");
      http.setConnectTimeout(6000);
      http.setTimeout(6000);
      code = http.POST(json);
      if (code > 0) body = http.getString();
      http.end();
    }
  } else {
    WiFiClient client;
    if (http.begin(client, fullUrl)) {
      http.addHeader("Content-Type", "application/json");
      http.setConnectTimeout(4000);
      http.setTimeout(4000);
      code = http.POST(json);
      if (code > 0) body = http.getString();
      http.end();
    }
  }

  if (code == HTTP_CODE_OK || code == HTTP_CODE_CREATED) {
    String serverStatus = extractNestedJsonString(body, "command", "status");
    if (serverStatus.length() == 0) serverStatus = extractJsonString(body, "status");
    if (serverStatus.length() > 0) {
      pendingServerStatus = serverStatus;
      pendingBackendCommand = true;
    }
  }

  backendTaskRunning = false;
  vTaskDelete(NULL);
}

void sendDataToBackend() {
  if (WiFi.status() != WL_CONNECTED || backendURL.length() == 0) return;
  if (backendTaskRunning) return; // Previous async task still running, don't pile up

  float t = temperatureC;
  float h = humidity;
  if (isnan(t)) t = 25.0;
  if (isnan(h)) h = 50.0;

  float mq2Mv = (mq2Raw / 4095.0) * 3300.0;
  float mq3Mv = (mq3Raw / 4095.0) * 3300.0;

  float gasIdx, tempIdx, humIdx;
  float spoilageScore = calculateSpoilageScore(t, h, mq2Raw, mq3Raw, gasIdx, tempIdx, humIdx);

  // Local determination — used as fallback if backend is unreachable.
  // Use the same classifier as the real-time loop; do NOT reintroduce raw
  // MQ thresholds here or the backend payload could disagree with the LEDs.
  String localStatus = currentStatus;

  if (!testLockMode && millis() >= manualLedOverrideUntil) {
    updateLEDsAndBuzzer(localStatus);
  }

  String json = "{";
  json += "\"device_id\":\"" + DEVICE_ID + "\",";
  json += "\"temperature_c\":" + String(t) + ",";
  json += "\"humidity_pct\":" + String(h) + ",";
  json += "\"mq2_raw\":" + String(mq2Raw) + ",";
  json += "\"mq2_mv\":" + String(mq2Mv) + ",";
  json += "\"mq3_raw\":" + String(mq3Raw) + ",";
  json += "\"mq3_mv\":" + String(mq3Mv) + ",";
  json += "\"gas_index\":" + String(gasIdx) + ",";
  json += "\"temperature_index\":" + String(tempIdx) + ",";
  json += "\"humidity_index\":" + String(humIdx) + ",";
  json += "\"spoilage_score\":" + String(spoilageScore) + ",";
  json += "\"status\":\"" + localStatus + "\",";
  json += "\"status_detail\":\"" + String(hotFoodEvent ? "HOT_FOOD_TRANSIENT" : localStatus) + "\",";
  json += "\"hot_food_event\":" + String(hotFoodEvent ? "true" : "false") + ",";
  json += "\"sensor_system_ready\":" + String(sensorSystemReady ? "true" : "false") + ",";
  json += "\"gas_evidence_persistent\":" + String(gasEvidencePersistent ? "true" : "false") + ",";
  json += "\"gas_anomaly_score\":" + String(gasAnomalyScore(filteredMq2, filteredMq3), 1);
  json += "}";

  pendingBackendJson = json;
  backendTaskRunning = true;

  // Run on Core 0 so Core 1 loop() / web server responds in 0ms without ANY latency
  xTaskCreatePinnedToCore(
    backendUploadTask,
    "bg_upload",
    10240,
    NULL,
    1,
    NULL,
    0
  );
}

// ============================================================
// LOOP
// ============================================================

void loop() {
  server.handleClient();

  // Non-blocking buzzer off — stop sound when scheduled duration expires
  if (buzzerUntilMs > 0 && millis() >= buzzerUntilMs) {
    setBuzzerHardware(false);
    buzzerUntilMs = 0;
  }

  // Service periodic acoustic alerts for Caution (yellow) and Spoiled (red)
  serviceAlertBuzzer();

  // Safely consume backend server response without letting stale network roundtrips
  // overwrite the fresh 50ms real-time sensor measurements
  if (pendingBackendCommand) {
    pendingBackendCommand = false;
  }

  processWiFiEvents();
  serviceSTAConnection();

  // Always sample sensors rapidly with 0ms reactive LED updates
  readSensors();

  if (millis() - lastBackendSendTime >= backendSendInterval) {
    lastBackendSendTime = millis();
    sendDataToBackend();
  }

  // Non-blocking Button Handler (physical BOOT button GPIO 0)
  // Short press: manual send to backend
  // Long press (>1.5s): toggle hardware Test Lock Mode!
  static int lastBtnVal = HIGH;
  static unsigned long btnPressStart = 0;
  int currentBtnVal = digitalRead(BUTTON_PIN);
  if (lastBtnVal == HIGH && currentBtnVal == LOW) {
    btnPressStart = millis();
  } else if (lastBtnVal == LOW && currentBtnVal == HIGH) {
    unsigned long pressDuration = millis() - btnPressStart;
    if (pressDuration >= 40 && pressDuration < 1500) {
      Serial.println("[BUTTON] Short press: manual send to backend");
      sendDataToBackend();
      buzzBeep(70, 2400, 75);
    } else if (pressDuration >= 1500) {
      testLockMode = !testLockMode;
      Serial.print("[BUTTON] Long press: Test Lock Mode toggled -> ");
      Serial.println(testLockMode ? "LOCKED" : "UNLOCKED");
      if (!testLockMode) {
        manualLedOverrideUntil = 0;
        updateLEDsAndBuzzer(currentStatus);
      }
      buzzBeep(180, 2200, 90);
    }
  }
  lastBtnVal = currentBtnVal;

  bool connected = WiFi.status() == WL_CONNECTED;

  // Reconnect STA without blocking the web server.
  if (!connected &&
      !wifiConnecting &&
      !scanInProgress &&
      wifiSSID.length() &&
      millis() - lastReconnect >= 15000) {

    lastReconnect = millis();
    lastWiFiAction = "Automatic reconnect";

    beginSTAConnect();
  }

  delay(2);
}
