/*
 * =====================================================================
 * PROJECT: SMART DUSTBIN MONITORING SYSTEM
 * An IoT Based Smart Waste Management Solution
 * Subject: Internet of Things (IoT) - Project Based Learning (PBL)
 * Team Members: Tushar Hari [24], Priyanshu Gupta [20],
 *               Abhishek Kr Mandal [59], Sandeep Kumar [44]
 * Hardware: NodeMCU ESP8266, HC-SR04, IR Sensor, SG90 Servo, Buzzer, LEDs
 * =====================================================================
 */

#include <ESP8266WiFi.h>
#include <Servo.h>

// ================= PIN DEFINITIONS =================
// Note: NodeMCU GPIO mappings
#define PIN_TRIG        D1    // GPIO 5 - Ultrasonic Trigger
#define PIN_ECHO        D2    // GPIO 4 - Ultrasonic Echo
#define PIN_SERVO       D4    // GPIO 2 - SG90 Servo Signal
#define PIN_IR          D5    // GPIO 14 - IR Sensor Digital Output
#define PIN_BUZZER      D6    // GPIO 12 - Buzzer Positive Pin
#define PIN_LED_RED     D7    // GPIO 13 - Red Alert LED (Bin Full)
#define PIN_LED_GREEN   D8    // GPIO 15 - Green Status LED (Normal)

// ================= CONFIGURATION =================
const char* WIFI_SSID     = "Your_WiFi_SSID";
const char* WIFI_PASSWORD = "Your_WiFi_Password";

// ThingSpeak IoT Cloud Configuration (Optional)
const char* THINGSPEAK_HOST = "api.thingspeak.com";
const char* API_KEY         = "YOUR_THINGSPEAK_WRITE_API_KEY";

// Physical Dimensions of Dustbin (in centimeters)
const float BIN_HEIGHT_CM       = 30.0;  // Total height from sensor to bin bottom
const float SENSOR_OFFSET_CM    = 4.0;   // Minimum distance when 100% full
const float THRESHOLD_PERCENT   = 85.0;  // Alert trigger threshold (% full)

// Timing configurations (in milliseconds)
const unsigned long LID_OPEN_DURATION_MS = 3000;   // Keep lid open for 3 seconds
const unsigned long CLOUD_UPDATE_INTERVAL = 15000; // Push to cloud every 15s
const unsigned long SENSOR_READ_INTERVAL  = 1000;  // Measure waste level every 1s

// ================= GLOBAL OBJECTS & VARIABLES =================
Servo lidServo;

bool isLidOpen = false;
unsigned long lidOpenedTime = 0;

float measuredDistanceCm = 0.0;
float fillPercentage     = 0.0;
bool isBinFull           = false;

unsigned long lastSensorReadTime = 0;
unsigned long lastCloudUpdateTime = 0;

// ================= HELPER FUNCTIONS =================

// Measure distance using HC-SR04 Ultrasonic Sensor
float measureDistance() {
  // Clear the trigger pin
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);

  // Send 10 microsecond pulse
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);

  // Read the echo pin pulse duration (in microseconds)
  // Timeout set to 30000 microseconds (~5 meters)
  long duration = pulseIn(PIN_ECHO, HIGH, 30000);

  if (duration == 0) {
    // Timeout or out of range, return previous or safe distance
    return BIN_HEIGHT_CM;
  }

  // Speed of sound = 340 m/s = 0.034 cm/microsecond
  // Distance = (Duration * Speed of Sound) / 2 (round-trip)
  float distance = (duration * 0.0343) / 2.0;

  // Clamp within reasonable physical limits
  if (distance < SENSOR_OFFSET_CM) distance = SENSOR_OFFSET_CM;
  if (distance > BIN_HEIGHT_CM) distance = BIN_HEIGHT_CM;

  return distance;
}

// Calculate garbage fill percentage
float calculateFillPercentage(float distance) {
  // Effective measurable height
  float effectiveHeight = BIN_HEIGHT_CM - SENSOR_OFFSET_CM;
  // Filled height
  float filledHeight = BIN_HEIGHT_CM - distance;

  if (filledHeight <= 0) return 0.0;

  float percent = (filledHeight / effectiveHeight) * 100.0;
  if (percent > 100.0) percent = 100.0;
  if (percent < 0.0)   percent = 0.0;
  return percent;
}

// Open lid using SG90 Servo
void openLid() {
  if (!isLidOpen) {
    Serial.println(F("[SERVO] Obstacle/Hand detected. Opening Lid to 90 degrees..."));
    lidServo.write(90); // Turn to 90 degrees (Open position)
    isLidOpen = true;
    lidOpenedTime = millis();
  } else {
    // Reset timer if hand continues to be present
    lidOpenedTime = millis();
  }
}

// Close lid using SG90 Servo
void closeLid() {
  if (isLidOpen) {
    Serial.println(F("[SERVO] Timer expired. Closing Lid to 0 degrees..."));
    lidServo.write(0); // Return to 0 degrees (Closed position)
    isLidOpen = false;
  }
}

// Update Local Indicators (Buzzer & LEDs)
void updateAlertIndicators(bool full) {
  if (full) {
    // Alert State: Red LED ON, Green LED OFF, Pulsing Buzzer tone
    digitalWrite(PIN_LED_RED, HIGH);
    digitalWrite(PIN_LED_GREEN, LOW);

    // Pulse buzzer (tone frequency 2000Hz)
    tone(PIN_BUZZER, 2000, 200);
  } else {
    // Normal State: Red LED OFF, Green LED ON, Buzzer Silent
    digitalWrite(PIN_LED_RED, LOW);
    digitalWrite(PIN_LED_GREEN, HIGH);
    noTone(PIN_BUZZER);
    digitalWrite(PIN_BUZZER, LOW);
  }
}

// Push telemetry data to IoT Cloud (ThingSpeak / HTTP Server)
void sendDataToCloud(float levelPercent, float distance) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("[CLOUD] Wi-Fi not connected. Skipping upload."));
    return;
  }

  WiFiClient client;
  Serial.println(F("[CLOUD] Connecting to ThingSpeak IoT platform..."));

  if (client.connect(THINGSPEAK_HOST, 80)) {
    String postStr = "api_key=" + String(API_KEY) +
                     "&field1=" + String(levelPercent, 1) +
                     "&field2=" + String(distance, 1) +
                     "&field3=" + String(isBinFull ? 1 : 0);

    client.print("POST /update HTTP/1.1\n");
    client.print("Host: api.thingspeak.com\n");
    client.print("Connection: close\n");
    client.print("X-THINGSPEAKAPIKEY: " + String(API_KEY) + "\n");
    client.print("Content-Type: application/x-www-form-urlencoded\n");
    client.print("Content-Length: " + String(postStr.length()) + "\n\n");
    client.print(postStr);

    Serial.printf("[CLOUD] Data uploaded: Fill=%0.1f%%, Distance=%0.1fcm, Full=%d\n",
                  levelPercent, distance, isBinFull);
  } else {
    Serial.println(F("[CLOUD] Connection failed!"));
  }
  client.stop();
}

// ================= SETUP =================
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println(F("\n=========================================="));
  Serial.println(F("  SMART DUSTBIN MONITORING SYSTEM BOOTING  "));
  Serial.println(F("=========================================="));

  // Initialize Pin Modes
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_IR, INPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_LED_GREEN, OUTPUT);

  // Initial States
  digitalWrite(PIN_BUZZER, LOW);
  digitalWrite(PIN_LED_RED, LOW);
  digitalWrite(PIN_LED_GREEN, HIGH);

  // Attach and initialize Servo Motor
  lidServo.attach(PIN_SERVO);
  lidServo.write(0); // Start with lid closed (0 deg)
  delay(300);

  // Connect to Wi-Fi (Non-blocking attempt)
  Serial.print(F("[WIFI] Connecting to "));
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  // Wait briefly for connection (max 5 seconds to avoid freezing offline)
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 10) {
    delay(500);
    Serial.print(F("."));
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(F("\n[WIFI] Connected successfully!"));
    Serial.print(F("[WIFI] NodeMCU IP Address: "));
    Serial.println(WiFi.localIP());
  } else {
    Serial.println(F("\n[WIFI] Wi-Fi offline. Continuing in local standalone mode."));
  }

  Serial.println(F("[SYSTEM] Initialization complete. System active."));
}

// ================= MAIN LOOP =================
void loop() {
  unsigned long currentMillis = millis();

  // ---------------- TASK 1: IR TOUCH-FREE LID CONTROL ----------------
  // Note: Most IR obstacle sensors output LOW when an obstacle (hand) is detected.
  // If your sensor outputs HIGH on detection, change LOW to HIGH.
  int irState = digitalRead(PIN_IR);
  if (irState == LOW) {
    openLid();
  }

  // Auto-close lid after LID_OPEN_DURATION_MS has elapsed
  if (isLidOpen && (currentMillis - lidOpenedTime >= LID_OPEN_DURATION_MS)) {
    closeLid();
  }

  // ---------------- TASK 2: PERIODIC GARBAGE LEVEL MEASUREMENT ----------------
  if (currentMillis - lastSensorReadTime >= SENSOR_READ_INTERVAL) {
    lastSensorReadTime = currentMillis;

    measuredDistanceCm = measureDistance();
    fillPercentage = calculateFillPercentage(measuredDistanceCm);
    isBinFull = (fillPercentage >= THRESHOLD_PERCENT);

    Serial.printf("[SENSOR] Distance: %0.1f cm | Fill Level: %0.1f%% | Status: %s\n",
                  measuredDistanceCm, fillPercentage,
                  isBinFull ? "CRITICAL (FULL)" : "NORMAL");

    // Update Buzzer and LEDs
    updateAlertIndicators(isBinFull);
  }

  // ---------------- TASK 3: TELEMETRY TO CLOUD DASHBOARD ----------------
  if (currentMillis - lastCloudUpdateTime >= CLOUD_UPDATE_INTERVAL) {
    lastCloudUpdateTime = currentMillis;
    sendDataToCloud(fillPercentage, measuredDistanceCm);
  }

  delay(20); // Small loop delay for CPU stability
}
