import os
import io
import logging
import threading
import uuid
from datetime import datetime, timezone

import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.responses import JSONResponse
from PIL import Image
from dotenv import load_dotenv
import time
import firebase_admin
from firebase_admin import credentials, storage, firestore, db as rtdb

import face_recognition
from risk import calculate_risk, RiskLevel

# ── Setup ─────────────────────────────────────────────────────────────────────
load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Firebase init ──────────────────────────────────────────────────────────────
if not firebase_admin._apps:
    cred = credentials.Certificate("firebase_key.json")
    firebase_admin.initialize_app(cred, {
        'storageBucket': "car-intrusion-detection-f13de.firebasestorage.app",
        'databaseURL':   "https://car-intrusion-detection-f13de-default-rtdb.asia-southeast1.firebasedatabase.app/"
    })

firestore_db = firestore.client()
bucket       = storage.bucket()

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(title="Car Intrusion Backend", version="2.0.0")

# ── Known faces ────────────────────────────────────────────────────────────────
KNOWN_FACES_DIR = "known_faces"
TOLERANCE       = 0.5
known_encodings = []
known_names     = []


def load_known_faces():
    global known_encodings, known_names

    if not os.path.exists(KNOWN_FACES_DIR):
        os.makedirs(KNOWN_FACES_DIR)
        logger.info(f"Created '{KNOWN_FACES_DIR}/' folder.")
        return

    known_encodings = []
    known_names     = []

    for filename in os.listdir(KNOWN_FACES_DIR):
        if filename.lower().endswith((".jpg", ".jpeg", ".png")):
            path      = os.path.join(KNOWN_FACES_DIR, filename)
            image     = face_recognition.load_image_file(path)
            encodings = face_recognition.face_encodings(image)
            if encodings:
                known_encodings.append(encodings[0])
                known_names.append(os.path.splitext(filename)[0])
                logger.info(f"Loaded face: {os.path.splitext(filename)[0]}")
            else:
                logger.warning(f"No face found in {filename}, skipping.")

    logger.info(f"Total authorized users loaded: {len(known_names)}")


load_known_faces()


# ── Firebase helpers ───────────────────────────────────────────────────────────
def upload_to_firebase(image_bytes: bytes, blob_path: str) -> str:
    blob = bucket.blob(blob_path)
    blob.upload_from_string(image_bytes, content_type="image/jpeg")
    blob.make_public()
    return blob.public_url


def store_alert_rtdb(device_id: str, status: str, image_url: str, faces: list):
    alert_data = {
        "status":         status,
        "image_url":      image_url,
        "timestamp":      datetime.now(timezone.utc).isoformat(),
        "faces_detected": len(faces),
        "results":        faces
    }
    rtdb.reference(f"alerts/esp32cam/{device_id}").push(alert_data)
    logger.info(f"[Firebase RTDB] Alert stored → alerts/esp32cam/{device_id}/ : {status}")


# ── Sensor listener ────────────────────────────────────────────────────────────
def handle_sensor_data(event):
    if event.data is None:
        return

    try:
        sensors = rtdb.reference("data/sensors").get()
    except Exception as e:
        logger.error(f"Failed to read sensors node: {e}")
        return

    if not sensors or not isinstance(sensors, dict):
        logger.info("Sensors node empty or invalid, skipping...")
        return

    device_id = "esp32-car-01"
    sound     = sensors.get("sound")
    vibration = sensors.get("vibration")
    pressure  = sensors.get("pressure")

    logger.info(f"Sensors → sound={sound} vibration={vibration} pressure={pressure}")

    if sound is None and vibration is None and pressure is None:
        logger.info("No sensor values, skipping...")
        return

    result = calculate_risk(
        device_id = device_id,
        sound     = float(sound)     if sound     is not None else None,
        vibration = float(vibration) if vibration is not None else None,
        pressure  = float(pressure)  if pressure  is not None else None,
        now       = time.time(),
    )
    logger.info(f"Risk → {result.level} (score={result.score})")

    if result.level in (RiskLevel.HIGH, RiskLevel.CRITICAL):
        risk_type = "dog sitting or person leaning" if result.level == RiskLevel.HIGH else "suspicious activity"
        rtdb.reference(f"alerts/intrusion/{device_id}").push({
            "risk_type": risk_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        logger.warning(f"ALERT written for {device_id} — {result.level}")

        buzzer_ref = rtdb.reference(f"commands/esp32dev/{device_id}/buzzer")
        buzzer_ref.set("on")
        logger.warning(f"BUZZER ON for {device_id}")

        time.sleep(5)
        buzzer_ref.set("off")
        logger.info(f"BUZZER OFF for {device_id}")


def start_firebase_listener():
    logger.info("Starting Firebase sensor listener...")
    rtdb.reference("data/sensors").listen(handle_sensor_data)


# ── Startup ────────────────────────────────────────────────────────────────────
@app.on_event("startup")
def startup_event():
    thread = threading.Thread(target=start_firebase_listener, daemon=True)
    thread.start()
    logger.info("Firebase sensor listener started!")


# ── Routes ─────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/")
def root():
    return {
        "message":          "Car Intrusion Backend is running",
        "authorized_users": known_names,
        "total_authorized": len(known_names),
        "endpoints": {
            "POST /verify_raw":       "Send raw JPEG from ESP32-CAM to verify identity",
            "POST /send_to_firebase": "Send raw JPEG to Firebase Storage (random clicks)",
            "GET  /users":            "List authorized users",
            "POST /reload":           "Reload known faces from disk",
            "POST /add-face":         "Add a new authorized face",
            "GET  /health":           "Health check"
        }
    }


@app.get("/users")
def list_users():
    return {"authorized_users": known_names, "total": len(known_names)}


@app.post("/reload")
def reload_faces():
    load_known_faces()
    return {"message": "Faces reloaded", "authorized_users": known_names, "total": len(known_names)}


@app.post("/verify_raw")
async def verify_face_raw(request: Request):
    device_id = request.query_params.get("device_id", "unknown_device")

    contents = await request.body()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty body received")

    if not known_encodings:
        return JSONResponse(status_code=200, content={
            "status": "error", "message": "No authorized faces loaded on server"
        })

    try:
        pil_image   = Image.open(io.BytesIO(contents)).convert("RGB")
        image_array = np.array(pil_image)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image data — could not decode JPEG")

    face_locations      = face_recognition.face_locations(image_array)
    face_encodings_list = face_recognition.face_encodings(image_array, face_locations)

    timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

    if not face_encodings_list:
        image_url = upload_to_firebase(
            contents,
            f"alerts/esp32cam/{device_id}/{timestamp_str}_{uuid.uuid4().hex[:8]}.jpg"
        )
        store_alert_rtdb(device_id, "unauthorized", image_url, [])
        return {"status": "unauthorized", "faces_detected": 0, "reason": "No face detected", "image_url": image_url}

    results = []
    for i, face_encoding in enumerate(face_encodings_list):
        distances      = face_recognition.face_distance(known_encodings, face_encoding)
        best_match_idx = int(np.argmin(distances))
        best_distance  = float(distances[best_match_idx])
        is_match       = best_distance <= TOLERANCE
        results.append({
            "face_number": i + 1,
            "status":      "authorized" if is_match else "unauthorized",
            "name":        known_names[best_match_idx] if is_match else None,
            "confidence":  round((1 - best_distance) * 100, 2)
        })

    overall_status = "authorized" if any(r["status"] == "authorized" for r in results) else "unauthorized"

    image_url = upload_to_firebase(
        contents,
        f"alerts/esp32cam/{device_id}/{timestamp_str}_{uuid.uuid4().hex[:8]}.jpg"
    )
    store_alert_rtdb(device_id, overall_status, image_url, results)

    return {
        "status":         overall_status,
        "faces_detected": len(face_encodings_list),
        "image_url":      image_url,
        "results":        results
    }


@app.post("/send_to_firebase")
async def send_to_firebase(request: Request):
    device_id = request.query_params.get("device_id", "unknown_device")

    contents = await request.body()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty body received")

    timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    blob_path     = f"live_inspection_clicks/{device_id}/{timestamp_str}_{uuid.uuid4().hex[:8]}.jpg"

    image_url = upload_to_firebase(contents, blob_path)
    logger.info(f"[Firebase Storage] Saved → {blob_path}")

    rtdb_ref = rtdb.reference(f"data/esp32cam/{device_id}/lastCapture")
    rtdb_ref.set({
        "imageUrl":  image_url,
        "path":      blob_path,
        "timestamp": timestamp_str
    })

    return {"status": "saved", "image_url": image_url, "path": blob_path}


@app.post("/add-face")
async def add_face(name: str, file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    filename = f"{name}.{file.filename.split('.')[-1]}"
    path     = os.path.join(KNOWN_FACES_DIR, filename)

    contents = await file.read()
    with open(path, "wb") as f:
        f.write(contents)

    load_known_faces()
    return {"message": f"Face for '{name}' added", "authorized_users": known_names, "total": len(known_names)}