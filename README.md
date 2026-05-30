<p align="center">
  <h1 align="center">🚗 CarGuard</h1>
  <p align="center"><strong>Smart IoT Vehicle Safety &amp; Monitoring System</strong></p>
  <p align="center">
    Driver identity verification · Real-time drowsiness detection · Parked-vehicle anomaly alerts
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-ESP32-blue?logo=espressif" alt="ESP32"/>
  <img src="https://img.shields.io/badge/backend-Python%203.9+-3776AB?logo=python&logoColor=white" alt="Python"/>
  <img src="https://img.shields.io/badge/frontend-Next.js-black?logo=next.js" alt="Next.js"/>
  <img src="https://img.shields.io/badge/database-Firebase-FFCA28?logo=firebase&logoColor=black" alt="Firebase"/>
  <img src="https://img.shields.io/badge/ML-OpenCV%20%7C%20face__recognition-5C3EE8?logo=opencv" alt="ML"/>
  <img src="https://img.shields.io/badge/containerized-Docker-2496ED?logo=docker&logoColor=white" alt="Docker"/>
</p>

---

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [How It Works](#how-it-works)
- [Components](#components)
  - [Hardware](#1-hardware)
  - [Firebase ](#2-firebase)
  - [Python Backend](#3-python-backend)
  - [Next.js Frontend](#4-nextjs-frontend)
  - [Simulator](#5-simulator)
- [State Machine](#state-machine)
- [Alert Types](#alert-types)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
  - [Prerequisites](#prerequisites)
  - [Firebase Setup](#firebase-setup)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Hardware (ESP32) Setup](#hardware-esp32-setup)
- [Running & Testing](#running--testing)
- [Simulation Without Hardware](#simulation-without-hardware)
- [Deployment Notes](#deployment-notes)
- [Tech Stack](#tech-stack)

---

## Overview

**CarGuard** is a modular, cloud-connected vehicle safety system that tackles two distinct problems in one unified platform:

| Scenario | What CarGuard Does |
|---|---|
| 🚀 **Car just started** | Captures and verifies the driver's face before the vehicle moves. Unknown driver? Alert fires immediately. |
| 🛣️ **Driving above 20 km/h** | Continuously monitors for drowsiness   eye closure rate, eye aspect ratio, head pose. Pauses at traffic stops, resumes when speed rises. |
| 🅿️ **Car parked** | Independently watches for physical disturbances   sound spikes, vibrations, pressure anomalies   that indicate a break-in or tampering attempt. |

All four system components   both ESP32 devices, the Python ML backend, and the Next.js dashboard   communicate exclusively through **Firebase Realtime Database**, creating a fully decoupled architecture where any single part can go offline and recover without disrupting the others.

> **No vehicle? No problem.**
> Ignition state and vehicle speed are simulated as Firebase-controlled variables from the frontend. The ESP32 hardware reads these exactly as it would read real ignition no firmware changes required to switch to real inputs.

---

## System Architecture

```
┌─────────────────────┐        ┌──────────────────────┐
│     ESP32-CAM       │        │   ESP32 Dev Module   │
│                     │        │                      │
│  • Face recognition │        │  • Sound sensor      │
│  • Drowsiness mon.  │        │  • Vibration sensor  │
│  • 3-state machine  │        │  • Pressure sensor   │
│                     │        │  • Buzzer / actuator │
└──────────┬──────────┘        └──────────┬───────────┘
           │  state + image triggers       │  sensor readings
           │                               │  <- buzzer commands
           └───────────────┬───────────────┘
                           ▼
                ┌──────────────────────┐
                │       Firebase       │
                │  Realtime DB ──────► │<── Frontend simulation controls
                │  Storage (images)    │    (ignition / speed)
                └──────────┬───────────┘
                           │  triggers backend
                           ▼
                ┌──────────────────────┐
                │    Python Backend    │
                │                     │
                │  • Face recognition  │
                │  • Drowsiness ML     │
                │  • Intrusion logic   │
                └──────────┬───────────┘
                           │  alerts + image URLs
                           │  buzzer commands
                           ▼
                ┌──────────────────────┐
                │   Next.js Dashboard  │
                │                     │
                │  Live push, no poll  │
                │  Unified alert feed  │
                └──────────────────────┘
```

---
## How It Works  

```
1. Driver enters vehicle → ignition ON
        │
        ▼
2. ESP32-CAM wakes up → captures image → sends trigger to Firebase
        │
        ▼
3. Python backend wakes up → runs face recognition
        ├── Unknown face?  → alert fires BEFORE car moves
        └── Known face?    → system arms itself
               │
               ▼ (speed > 20 km/h)
4. Drowsiness monitoring begins
        ├── Eyes closing / head drooping? → drowsiness alert
        └── Speed drops below 20?         → monitoring pauses (no false alarms)
               │
               ▼ (ignition OFF)
5. ESP32-CAM resets to dormant state

───── Running when ignition OFF ─────

6. ESP32 Dev Module listens for sound / vibration / pressure anomalies
        └── Pattern matches intrusion? → alert fires + buzzer sounds
```

---

## Components

### 1. Hardware

#### ESP32-CAM 

The **visual intelligence node** of the system.

- **Dormant** while ignition is off  zero unnecessary power draw, no uploads.
- **Ignition ON** → immediately captures an image and fires a face-recognition trigger.
  - Face **unrecognised**: alert raised before the vehicle moves a metre.
  - Face **recognised**: system arms and waits for the speed threshold.
- **Speed > 20 km/h** → enters continuous drowsiness monitoring.
  - **Pauses** below the threshold (slow traffic, junctions) to eliminate false positives.
  - **Resumes** automatically when speed climbs again.
- **Ignition OFF** → full reset to `OFF` state.


#### ESP32 Dev Module 
 
The **physical sensing node** active only when the ignition is **off** (vehicle parked).
 
- Activates when ignition is off; goes dormant while the car is on to avoid false alerts from normal driving vibrations, engine noise, and door events.
- Runs a continuous loop reading sound, vibration, and pressure sensors while parked.
- Writes raw sensor bursts to Firebase for backend evaluation.
- Listens for buzzer/actuator commands written back by the backend and physically executes them (e.g. sounding the alarm on confirmed intrusion).
---

### 2. Firebase

Firebase is the **nervous system** of CarGuard. Every component speaks only to Firebase  never directly to each other. This single-hub design guarantees resilience: any component can crash and recover without losing state.

| Data | Location |
|---|---|
| Car state (on/off, speed) | Realtime Database |
| Image capture triggers | Realtime Database |
| Sensor readings (sound, vibration, pressure) | Realtime Database |
| Buzzer / actuator commands | Realtime Database |
| Structured alert records | Realtime Database |
| Captured images | Firebase Storage |

**Why this matters:**
- The backend can restart without data loss.
- ESP32s can lose Wi-Fi temporarily and reconnect without desyncing.
- The dashboard receives push updates instantly  zero polling, zero delay.

---

### 3. Python Backend  

**Entry point:** `Backend/main.py` | **Risk scoring:** `Backend/risk.py`

The backend is the **intelligence layer**. It holds a persistent listener on Firebase and runs one of three analysis pipelines depending on the incoming trigger:

| Trigger | Analysis | Output |
|---|---|---|
| Image capture  ignition | Face recognition against known-face database | Unknown-face alert if confidence < threshold |
| Image capture  driving | Drowsiness detection (eye closure rate, eye aspect ratio, head pose) | Drowsiness alert with confidence score |
| Sensor burst | Intrusion classification (sound spike + vibration pattern) | Intrusion alert if pattern matches tampering profile |

**After any analysis the backend:**
1. Uploads the captured image to **Firebase Storage**.
2. Writes a structured alert record to **Firebase Realtime DB**: alert type, confidence, timestamp, device ID, image URL, system status.
3. Optionally writes a **buzzer command** to Firebase for the ESP32 Dev Module to physically execute.

---

### 4. Next.js Frontend  

**Location:** `frontend/` | **Firebase config:** `frontend/services/firebase.ts`

The frontend is a **live monitoring dashboard** with zero-poll updates.

- Holds a realtime listener on Firebase Realtime DB  no page refreshes, no polling intervals.
- The moment the backend writes a new alert, Firebase pushes it instantly to the dashboard.
- Fetches the associated image from Firebase Storage and renders it inline.
- Displays a unified, chronological alert feed across both devices:

| Field | Description |
|---|---|
| Alert type & severity | What happened and how serious |
| Confidence score | ML model certainty (%) |
| Timestamp | Exact time of the event |
| Source device | Which ESP32 generated the trigger |
| System status | Current state of both devices |
| Image preview | Captured frame (where applicable) |

The frontend also hosts the **simulation controls**  ignition toggle and speed slider  for full end-to-end testing without hardware.

---

### 5. Simulator

**Location:** `Simulator/`

Two lightweight browser-based tools for exercising the full system without ESP32 boards:

| File | Simulates |
|---|---|
| `Simulator/carSim.html` | Ignition on/off and vehicle speed via Firebase writes |
| `Simulator/sensorSim.html` | Sound, vibration, and pressure sensor readings via Firebase writes |

The backend and frontend respond identically to simulated and real hardware inputs  they only read from Firebase and have no knowledge of the data source.

---

## State Machine  

The ESP32-CAM operates as a strict three-state machine. Transitions are driven entirely by Firebase values (ignition key and speed), not internal timers.

```
          ┌─────────────────────────────────────────────────────────┐
          │  ignition ON                                            │
  ┌───────▼──────┐                ┌──────────────────┐             │
  │     OFF      │ ─────────────► │  VERIFY_FACE     │             │
  │              │                │                  │             │
  │  Dormant.    │                │  Single capture. │             │
  │  No uploads. │ ◄─────────────│  Face check.     │             │
  └──────────────┘  ignition OFF  └────────┬─────────┘             │
          ▲                                │                        │
          │  ignition OFF                  │  face OK +             │
          │                                │  speed > 20 km/h       │
          │                                ▼                        │
          │                     ┌──────────────────────┐           │
          └─────────────────────│  DROWSINESS_MONITOR  │           │
                                │                      │◄──────────┘
                                │  Continuous frames.  │  speed drops below 20
                                │  Eye / head analysis.│  ──────────► (paused,
                                │                      │              not reset)
                                └──────────────────────┘
```

| State | Behaviour |
|---|---|
| `OFF` | Camera dormant. No captures, no uploads. Minimum power draw. |
| `VERIFY_FACE` | Single capture on ignition. Backend checks identity. Alert fires immediately for unknown faces. |
| `DROWSINESS_MONITORING` | Continuous frame analysis. Pauses below 20 km/h; resumes above it automatically. |

All state resets to `OFF` on ignition off.

---

## Alert Types

| Alert | Source Device | Trigger Condition |
|---|---|---|
| 🔴 **Unknown Face** | ESP32-CAM | Face confidence below threshold at ignition |
| 🟠 **Drowsiness Detected** | ESP32-CAM | Eye aspect ratio / head pose indicates fatigue while driving |
| 🔵 **Intrusion Detected** | ESP32 Dev Module | Sound + vibration pattern classified as tampering while parked |

Each alert record stored in Firebase:

```json
{
  "alertType":    "DROWSINESS | UNKNOWN_FACE | INTRUSION",
  "confidence":   0.87,
  "timestamp":    "2025-06-12T14:32:01Z",
  "deviceId":     "ESP32-CAM-01",
  "imageUrl":     "gs://your-bucket/captures/abc123.jpg",
  "systemStatus": "DRIVING | PARKED | OFF"
}
```

---

## Project Structure

```
CarGuard/
├── ArduinoCode/
│   ├── ESP32CAM.ino          # Camera node: face recognition + drowsiness monitoring
│   └── ESP32DEV.ino          # Sensor node: sound / vibration / pressure + buzzer
│
├── Backend/
│   ├── main.py               # Entry point: Firebase listener + ML orchestration
│   ├── risk.py               # Risk scoring and alert threshold logic
│   ├── requirements.txt      # Python dependencies
│   ├── firebase_key.json     # ⚠️  Replace with your own service account key
│   ├── Dockerfile            # Container setup for the backend service
│   └── docker-compose.yml    # Compose config for containerised deployment
│
├── frontend/
│   ├── services/
│   │   └── firebase.ts       # Firebase SDK config and realtime listener setup
│   ├── pages/                # Next.js pages (alert dashboard)
│   ├── components/           # UI components: alert cards, image previews, status bar
│   ├── package.json
│   └── ...
│
└── Simulator/
    ├── carSim.html           # Simulates ignition and speed via Firebase writes
    └── sensorSim.html        # Simulates sensor readings via Firebase writes
```

---

## Setup & Installation

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Arduino IDE or PlatformIO | Latest | Flash ESP32 firmware |
| Python | 3.9+ | Backend ML service |
| Node.js | 18+ | Frontend |
| pnpm or npm | Latest | Frontend package manager |
| Firebase project |  | Realtime DB + Storage enabled |
| Docker *(optional)* | Latest | Containerised backend deployment |

---

### Firebase Setup

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. Enable **Realtime Database** and **Firebase Storage** in your project.
3. Download your **service account JSON key**: Project Settings → Service Accounts → Generate new private key.
4. Place the downloaded key at `Backend/firebase_key.json`.
5. Set database rules  open rules are fine for local development; see [Deployment Notes](#deployment-notes) before going public.

---

### Backend Setup

**Option A  Python virtual environment (local):**

```bash
# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate          # macOS / Linux
# .\.venv\Scripts\Activate         # Windows PowerShell

# Install dependencies
pip install -r Backend/requirements.txt

# (Optional) Review the CONFIG section at the top of Backend/main.py
# to adjust Firebase DB paths or alert thresholds

# Start the backend listener
python Backend/main.py
```

**Option B  Docker:**

```bash
cd Backend
docker-compose up --build
```

---

### Frontend Setup

```bash
cd frontend
pnpm install        # or: npm install
pnpm dev            # or: npm run dev
```

Before running, update `frontend/services/firebase.ts` with your Firebase project credentials (API key, database URL, storage bucket, etc.).

---

### Hardware (ESP32) Setup

1. Open `ArduinoCode/ESP32CAM.ino` and `ArduinoCode/ESP32DEV.ino` in the Arduino IDE (or PlatformIO).
2. Near the top of each sketch, fill in the configuration constants:
   - Wi-Fi SSID and password
   - Firebase project URL and authentication credentials
3. Select the correct board target:
   - `ESP32CAM.ino` → **AI Thinker ESP32-CAM** (or equivalent)
   - `ESP32DEV.ino` → **ESP32 Dev Module**
4. Flash each sketch to its respective board.

Once flashed, both devices connect to Wi-Fi, authenticate with Firebase, and begin operating in their roles automatically.

---

## Running & Testing

Recommended startup order:

```
1. Start the backend     →  ensures it is listening before any triggers are generated
2. Start the frontend    →  gives you the dashboard + simulation controls
3. Power the ESP32s      →  or open the Simulator tools if no hardware is available
```

**Quick end-to-end test (no hardware required):**

1. Open the frontend dashboard.
2. Toggle ignition **ON** → watch the face-recognition trigger appear in the alert feed.
3. Slide vehicle speed above **20 km/h** → drowsiness monitoring begins.
4. Open `Simulator/sensorSim.html`, push a high sound/vibration reading → observe an intrusion alert appear on the dashboard.

All alert records and images persist in Firebase  historical alerts are reviewable even after restarting the frontend.

---

## Simulation Without Hardware

CarGuard is fully testable without physical ESP32 boards or a vehicle.

| Signal | How to Simulate | Tool |
|---|---|---|
| Ignition on/off | Toggle writes to Firebase | Frontend dashboard or `carSim.html` |
| Vehicle speed | Slider writes to Firebase | Frontend dashboard or `carSim.html` |
| Sound / vibration / pressure | Sliders write sensor values to Firebase | `sensorSim.html` |
| Camera image capture | Upload an image to the Firebase trigger path | Firebase console or `carSim.html` |

The backend responds identically to simulated and real inputs  it only reads from Firebase and has no knowledge of the data source.

---

## Deployment Notes

> ⚠️ **Review these before exposing CarGuard to the internet.**

- **Firebase security rules:** Restrict Realtime Database read/write to authenticated service accounts and signed-in users. Restrict Storage access to the backend service account only.
- **Never commit secrets:** Keep `firebase_key.json` and Firebase SDK credentials out of version control. Add them to `.gitignore`.
- **Environment variables:** Move all credentials (currently hardcoded in `firebase.ts` and `firebase_key.json`) into `.env` files or a cloud secrets manager.
- **Serverless alternative:** Consider replacing `Backend/main.py` with Firebase-triggered Cloud Functions for fully managed, auto-scaling, zero-maintenance execution  no persistent server required.
- **Reproducible deploys:** Use the provided `Dockerfile` and `docker-compose.yml` for consistent backend deployment across environments.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Hardware | ESP32-CAM, ESP32 Dev Module, Arduino C++ |
| Communication | Firebase Realtime Database |
| Image Storage | Firebase Storage |
| ML Backend | Python 3.9+, OpenCV, face_recognition, Firebase Admin SDK |
| Frontend | Next.js, TypeScript, Firebase JS SDK |
| Containerisation | Docker, Docker Compose |
| Simulation | Vanilla HTML + JavaScript |

---

<p align="center">
  Built with ESP32 · Firebase · Python · Next.js
</p>
