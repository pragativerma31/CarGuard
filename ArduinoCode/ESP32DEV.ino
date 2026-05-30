#include <WiFi.h>
#include <FirebaseESP32.h>
#include <HX711.h>

// ──────────────────────────────────────────────────────
// WiFi Credentials
// ──────────────────────────────────────────────────────
const char* ssid     = "YOUR_WIFI_NAME";
const char* password = "YOUR_WIFI_PASSWORD";

// ──────────────────────────────────────────────────────
// Firebase Configuration
// ──────────────────────────────────────────────────────
#define FIREBASE_HOST "YOUR_FIREBASE_HOST"
#define FIREBASE_AUTH "YOUR_FIREBASE_AUTH"

// ──────────────────────────────────────────────────────
// Pin Definitions
// ──────────────────────────────────────────────────────
#define PIN_KY037_AO   34
#define PIN_SW420      13
#define PIN_BUZZER     14

#define HX711_DT       26
#define HX711_SCK      27

// ──────────────────────────────────────────────────────
// Thresholds
// ──────────────────────────────────────────────────────
#define SOUND_THRESHOLD      500
#define WEIGHT_THRESHOLD_G   200

#define SCALE_FACTOR         420.0
#define NUM_SAMPLES          10

// ──────────────────────────────────────────────────────
// Firebase Objects
// ──────────────────────────────────────────────────────
FirebaseData   fbBuzzer;
FirebaseData   fbStatus;
FirebaseData   fbSensor;

FirebaseConfig fbConfig;
FirebaseAuth   fbAuth;

// ──────────────────────────────────────────────────────
// HX711 Object
// ──────────────────────────────────────────────────────
HX711 scale;

// ──────────────────────────────────────────────────────
// Connect WiFi
// ──────────────────────────────────────────────────────
void connectWiFi() {

  Serial.print("[WiFi] Connecting");

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.print("[WiFi] Connected IP: ");
  Serial.println(WiFi.localIP());
}

// ──────────────────────────────────────────────────────
// Read Weight in Grams
// ──────────────────────────────────────────────────────
float readWeightGrams() {

  if (!scale.is_ready()) {
    Serial.println("[HX711] Not Ready");
    return 0.0;
  }

  float readings[NUM_SAMPLES];
  float sum = 0;

  // Collect samples
  for (int i = 0; i < NUM_SAMPLES; i++) {

    readings[i] = scale.get_units(1);

    sum += readings[i];

    delay(10);
  }

  // Mean
  float mean = sum / NUM_SAMPLES;

  // Standard deviation
  float varianceSum = 0;

  for (int i = 0; i < NUM_SAMPLES; i++) {
    varianceSum += pow(readings[i] - mean, 2);
  }

  float stddev = sqrt(varianceSum / NUM_SAMPLES);

  // Remove outliers
  float filteredSum = 0;
  int filteredCount = 0;

  for (int i = 0; i < NUM_SAMPLES; i++) {

    if (abs(readings[i] - mean) <= 2.0 * stddev) {

      filteredSum += readings[i];
      filteredCount++;
    }
  }

  float weightKg;

  if (filteredCount > 0) {
    weightKg = filteredSum / filteredCount;
  } else {
    weightKg = mean;
  }

  float weightGrams = weightKg * 1000.0;

  // Remove negative noise
  if (weightGrams < 0) {
    weightGrams = 0;
  }

  return weightGrams;
}

// ──────────────────────────────────────────────────────
// Setup
// ──────────────────────────────────────────────────────
void setup() {

  Serial.begin(115200);

  delay(1000);

  Serial.println();
  Serial.println("=================================");
  Serial.println(" CAR INTRUSION DETECTION SYSTEM ");
  Serial.println("=================================");

  // Pin setup
  pinMode(PIN_SW420, INPUT);

  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);

  // HX711 setup
  scale.begin(HX711_DT, HX711_SCK);

  scale.set_scale(SCALE_FACTOR);

  delay(500);

  scale.tare();

  Serial.println("[HX711] Load Cell Ready");

  // WiFi
  connectWiFi();

  // Firebase setup
  fbConfig.host = FIREBASE_HOST;

  fbConfig.signer.tokens.legacy_token = FIREBASE_AUTH;

  Firebase.begin(&fbConfig, &fbAuth);

  Firebase.reconnectWiFi(true);

  fbBuzzer.setResponseSize(512);
  fbStatus.setResponseSize(512);
  fbSensor.setResponseSize(1024);

  Serial.print("[Firebase] Connecting");

  int retries = 0;

  while (!Firebase.ready() && retries < 20) {

    delay(500);

    Serial.print(".");

    retries++;
  }

  Serial.println();

  if (Firebase.ready()) {
    Serial.println("[Firebase] Connected");
  } else {
    Serial.println("[Firebase] Connection Timeout");
  }

  Serial.println("[SYSTEM] Setup Complete");
}

// ──────────────────────────────────────────────────────
// Main Loop
// ──────────────────────────────────────────────────────
void loop() {

  // Check Firebase connection
  if (!Firebase.ready()) {

    Serial.println("[Firebase] Not Ready");

    delay(1000);

    return;
  }

  // ──────────────────────────────────────────────
  // STEP 1: Check Remote Buzzer Command
  // ──────────────────────────────────────────────
  Serial.println();
  Serial.println("[CHECK] Reading buzzer command");

  if (Firebase.getString(
        fbBuzzer,
        "/commands/esp32dev/esp32-car-01/buzzer")) {

    String buzzerVal = fbBuzzer.stringData();

    buzzerVal.trim();

    Serial.println("[BUZZER] Value: " + buzzerVal);

    if (buzzerVal == "on") {

      Serial.println("[BUZZER] Activated");

      digitalWrite(PIN_BUZZER, HIGH);

      delay(1500);

      digitalWrite(PIN_BUZZER, LOW);

      // Reset buzzer command
      if (Firebase.setString(
            fbBuzzer,
            "/commands/esp32dev/esp32-car-01/buzzer",
            "off")) {

        Serial.println("[BUZZER] Reset Successful");

      } else {

        Serial.println(
          "[BUZZER] Reset Failed: " +
          fbBuzzer.errorReason()
        );
      }
    }

  } else {

    Serial.println(
      "[BUZZER] Read Error: " +
      fbBuzzer.errorReason()
    );
  }

  // ──────────────────────────────────────────────
  // STEP 2: Read Car Status
  // ──────────────────────────────────────────────
  Serial.println("[CHECK] Reading car status");

  bool carOn = false;

  if (Firebase.getString(
        fbStatus,
        "/commands/esp32dev/esp32-car-01/car_status")) {

    String status = fbStatus.stringData();

    status.trim();

    carOn = (status == "on");

    Serial.println("[STATUS] Car: " + status);

  } else {

    Serial.println(
      "[STATUS] Read Error: " +
      fbStatus.errorReason()
    );
  }

  // ──────────────────────────────────────────────
  // STEP 3: Sensor Monitoring
  // ──────────────────────────────────────────────
  if (carOn) {

    Serial.println("[SYSTEM] Car ON - Sensors Disabled");

  } else {

    // Read sensors
    int soundAnalog = analogRead(PIN_KY037_AO);

    bool vibration = digitalRead(PIN_SW420);

    float weightGrams = readWeightGrams();

    // Print values
    Serial.printf(
      "[SENSORS] Sound: %d | Vib: %d | Weight: %.1fg\n",
      soundAnalog,
      (int)vibration,
      weightGrams
    );

    // Detection logic
    bool soundDetected =
      (soundAnalog > SOUND_THRESHOLD);

    bool vibrationDetected =
      (vibration == HIGH);

    bool pressureDetected =
      (weightGrams > WEIGHT_THRESHOLD_G);

    // If any sensor triggered
    if (soundDetected ||
        vibrationDetected ||
        pressureDetected) {

      Serial.println("[ALERT] Intrusion Detected");

      // Create JSON
      FirebaseJson json;

      json.set("sound", soundAnalog);

      json.set("vibration", (int)vibration);

      json.set("pressure", weightGrams);

      json.set("sound_detected", soundDetected);

      json.set("vibration_detected", vibrationDetected);

      json.set("pressure_detected", pressureDetected);

      json.set("timestamp", millis());

      // Upload to Firebase
      if (Firebase.setJSON(
            fbSensor,
            "/data/sensors",
            json)) {

        Serial.println("[Firebase] Data Uploaded");

      } else {

        Serial.println(
          "[Firebase] Upload Error: " +
          fbSensor.errorReason()
        );
      }

      // Trigger buzzer locally
      digitalWrite(PIN_BUZZER, HIGH);

      delay(500);

      digitalWrite(PIN_BUZZER, LOW);
    }
  }

  // Loop delay
  delay(1000);
}