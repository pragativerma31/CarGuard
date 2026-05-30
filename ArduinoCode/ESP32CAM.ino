
#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <FirebaseESP32.h>
#include "esp_camera.h"

// ─────────────────────────────────────────
//  WiFi & Device
// ─────────────────────────────────────────
const char* ssid     = 
const char* password = 

const char* DEVICE_ID = 

// ─────────────────────────────────────────
//  Firebase  (fill in your project values)
// ─────────────────────────────────────────
#define FIREBASE_HOST  =
#define FIREBASE_AUTH  =

// ─────────────────────────────────────────
//  Backend endpoints
// ─────────────────────────────────────────
// click        → your existing backend
const char* BACKEND_SEND   = 
// click_forface → face-verify endpoint
const char* BACKEND_FACE   =

// ─────────────────────────────────────────
//  Firebase paths
// ─────────────────────────────────────────
String PATH_CLICK      = "/commands/esp32cam/esp32-car-01/click";
String PATH_FACE       = "/commands/esp32cam/esp32-car-01/click_forface";

// ─────────────────────────────────────────
//  AI Thinker ESP32-CAM Pin Map
// ─────────────────────────────────────────
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// ─────────────────────────────────────────
//  Globals
// ─────────────────────────────────────────
FirebaseData  fbClick;
FirebaseData  fbFace;
FirebaseData  fbWriter;         // used only for resetting flags
FirebaseConfig fbConfig;
FirebaseAuth   fbAuth;

unsigned long lastPoll = 0;
const unsigned long POLL_MS = 1500;   // poll every 1.5 s

// ─────────────────────────────────────────────────────────────
//  Camera init
// ─────────────────────────────────────────────────────────────
void initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
  config.pin_d0       = Y2_GPIO_NUM;
  config.pin_d1       = Y3_GPIO_NUM;
  config.pin_d2       = Y4_GPIO_NUM;
  config.pin_d3       = Y5_GPIO_NUM;
  config.pin_d4       = Y6_GPIO_NUM;
  config.pin_d5       = Y7_GPIO_NUM;
  config.pin_d6       = Y8_GPIO_NUM;
  config.pin_d7       = Y9_GPIO_NUM;
  config.pin_xclk     = XCLK_GPIO_NUM;
  config.pin_pclk     = PCLK_GPIO_NUM;
  config.pin_vsync    = VSYNC_GPIO_NUM;
  config.pin_href     = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn     = PWDN_GPIO_NUM;
  config.pin_reset    = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size   = FRAMESIZE_VGA;
  config.jpeg_quality = 12;
  config.fb_count     = 1;

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("[CAM] Init failed: 0x%x\n", err);
    while (true) delay(1000);
  }
  Serial.println("[CAM] Ready");
}

// ─────────────────────────────────────────────────────────────
//  Capture a JPEG frame — caller must return the fb when done
// ─────────────────────────────────────────────────────────────
camera_fb_t* captureFrame() {
  // Flush stale frame
  camera_fb_t* fb = esp_camera_fb_get();
  if (fb) esp_camera_fb_return(fb);

  fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("[CAM] Capture failed");
    return nullptr;
  }
  Serial.printf("[CAM] Captured %u bytes\n", fb->len);
  return fb;
}

// ─────────────────────────────────────────────────────────────
//  POST raw JPEG to a URL
// ─────────────────────────────────────────────────────────────
bool postImage(const char* url, camera_fb_t* fb) {
  if (!fb) return false;

  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "image/jpeg");

  Serial.printf("[HTTP] POST → %s  (%u bytes)\n", url, fb->len);
  int code = http.POST(fb->buf, fb->len);
  String resp = http.getString();
  Serial.printf("[HTTP] Response %d: %s\n", code, resp.c_str());
  http.end();

  return (code == 200);
}

// ─────────────────────────────────────────────────────────────
//  Reset a Firebase boolean flag back to false
// ─────────────────────────────────────────────────────────────
void resetFlag(const String& path) {
  if (!Firebase.setBool(fbWriter, path, false)) {
    Serial.printf("[FB] Reset failed for %s: %s\n",
                  path.c_str(), fbWriter.errorReason().c_str());
  } else {
    Serial.printf("[FB] Flag reset: %s\n", path.c_str());
  }
}

// ─────────────────────────────────────────────────────────────
//  Handle /click trigger
// ─────────────────────────────────────────────────────────────
void handleClick() {
  Serial.println("[CLICK] Trigger received");

  camera_fb_t* fb = captureFrame();
  if (fb) {
    postImage(BACKEND_SEND, fb);
    esp_camera_fb_return(fb);
  }

  resetFlag(PATH_CLICK);
}

// ─────────────────────────────────────────────────────────────
//  Handle /click_forface trigger
// ─────────────────────────────────────────────────────────────
void handleFace() {
  Serial.println("[FACE] Trigger received");

  camera_fb_t* fb = captureFrame();
  if (fb) {
    postImage(BACKEND_FACE, fb);
    esp_camera_fb_return(fb);
  }

  resetFlag(PATH_FACE);
}

// ─────────────────────────────────────────────────────────────
//  Poll both Firebase paths
// ─────────────────────────────────────────────────────────────
void pollFirebase() {
  // ── /click ──────────────────────────────
  if (Firebase.getBool(fbClick, PATH_CLICK)) {
    if (fbClick.boolData() == true) {
      handleClick();
    }
  } else {
    Serial.printf("[FB] click read error: %s\n", fbClick.errorReason().c_str());
  }

  // ── /click_forface ───────────────────────
  if (Firebase.getBool(fbFace, PATH_FACE)) {
    if (fbFace.boolData() == true) {
      handleFace();
    }
  } else {
    Serial.printf("[FB] face read error: %s\n", fbFace.errorReason().c_str());
  }
}

// ─────────────────────────────────────────────────────────────
//  setup()
// ─────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  Serial.println("\n[BOOT] ESP32-CAM starting...");

  // 1. Camera
  initCamera();

  // 2. WiFi
  WiFi.begin(ssid, password);
  Serial.print("[WiFi] Connecting");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.printf("\n[WiFi] Connected — IP: %s\n", WiFi.localIP().toString().c_str());

  // 3. Firebase
  fbConfig.host           = FIREBASE_HOST;
  fbConfig.signer.tokens.legacy_token = FIREBASE_AUTH;

  Firebase.begin(&fbConfig, &fbAuth);
  Firebase.reconnectWiFi(true);

  // Optional: set read timeout
  fbClick.setResponseSize(1024);
  fbFace.setResponseSize(1024);
  fbWriter.setResponseSize(512);

  Serial.println("[FB] Firebase ready");
  Serial.println("[BOOT] Loop started — polling every 1500 ms");
}

// ─────────────────────────────────────────────────────────────
//  loop()
// ─────────────────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();

  if (now - lastPoll >= POLL_MS) {
    lastPoll = now;

    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("[WiFi] Reconnecting...");
      WiFi.reconnect();
      return;
    }

    pollFirebase();
  }
}
