# risk.py

import time
import logging
from dataclasses import dataclass, field
from enum import Enum
# Add this import at the top
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


# ── Thresholds ────────────────────────────────────────────────────────────────
SOUND_THRESHOLD    = 500      # raw ADC value
PRESSURE_THRESHOLD = 500      # grams
VIBRATION_ACTIVE   = 1        # binary

REQUIRED_HITS      = 3        # consecutive readings above threshold
TIME_WINDOW        = 7.0      # seconds — all 3 hits must fall within this
COOLDOWN_SECONDS   = 10.0     # seconds between alerts



class RiskLevel(str, Enum):
    LOW      = "LOW"
    HIGH     = "HIGH"
    CRITICAL = "CRITICAL"


@dataclass
class RiskResult:
    score:   float
    level:   RiskLevel
    factors: dict = field(default_factory=dict)


# ── Per-sensor hit tracker ────────────────────────────────────────────────────
class SensorTracker:
    """
    Tracks consecutive hits for one sensor.
    A 'hit' = reading above threshold.
    Resets if a reading is below threshold OR if the time window expires.
    """
    def __init__(self, name: str):
        self.name      = name
        self.hits: List[float] = []

    def update(self, above_threshold: bool, now: float) -> int:
        if not above_threshold:
            if self.hits:
                logger.info(f"[{self.name}] below threshold — reset")
            self.hits = []
            return 0

        # Drop hits outside the time window
        self.hits = [t for t in self.hits if now - t <= TIME_WINDOW]
        self.hits.append(now)

        logger.info(f"[{self.name}] hit #{len(self.hits)}  (window={now - self.hits[0]:.1f}s)")
        return len(self.hits)

    def reset(self):
        self.hits = []


# ── Per-device state ──────────────────────────────────────────────────────────
class DeviceState:
    def __init__(self):
        self.sound     = SensorTracker("sound")
        self.vibration = SensorTracker("vibration")
        self.pressure  = SensorTracker("pressure")
        self.last_alert_time: Optional[float] = None

    def in_cooldown(self, now: float) -> bool:
        if self.last_alert_time is None:
            return False
        return (now - self.last_alert_time) < COOLDOWN_SECONDS

    def mark_alert(self, now: float):
        self.last_alert_time = now
        self.sound.reset()
        self.vibration.reset()
        self.pressure.reset()


_device_states: Dict[str, DeviceState] = {}

def get_device_state(device_id: str) -> DeviceState:
    if device_id not in _device_states:
        _device_states[device_id] = DeviceState()
    return _device_states[device_id]


# ── Main entry point ──────────────────────────────────────────────────────────
def calculate_risk(
    device_id: str,
    sound:     Optional[float],
    vibration: Optional[float],
    pressure:  Optional[float],
    now:       Optional[float] = None,
) -> RiskResult:

    if now is None:
        now = time.time()

    state = get_device_state(device_id)

    # ── Cooldown guard ────────────────────────────────────────────────────────
    if state.in_cooldown(now):
        remaining = COOLDOWN_SECONDS - (now - state.last_alert_time)
        logger.info(f"[{device_id}] cooldown — {remaining:.1f}s left")
        return RiskResult(score=0.0, level=RiskLevel.LOW, factors={"cooldown": True})

    # ── Update all 3 sensors simultaneously ──────────────────────────────────
    s_hits = state.sound.update(
        sound is not None and sound >= SOUND_THRESHOLD, now)

    v_hits = state.vibration.update(
        vibration is not None and vibration >= VIBRATION_ACTIVE, now)

    p_hits = state.pressure.update(
        pressure is not None and pressure >= PRESSURE_THRESHOLD, now)

    # Boolean: has this sensor reached required hits?
    s_ready = s_hits >= REQUIRED_HITS
    v_ready = v_hits >= REQUIRED_HITS
    p_ready = p_hits >= REQUIRED_HITS

    factors = {
        "sound_hits":     s_hits, "sound":     sound,
        "vibration_hits": v_hits, "vibration": vibration,
        "pressure_hits":  p_hits, "pressure":  pressure,
    }

    logger.info(f"[{device_id}] ready flags → sound={s_ready} vib={v_ready} pressure={p_ready}")

    # ── Alert conditions ──────────────────────────────────────────────────────

    # Pressure alone for 3 consecutive readings
    if p_ready:
        state.mark_alert(now)
        logger.warning(f"[{device_id}] ALERT — sustained pressure")
        return RiskResult(score=0.75, level=RiskLevel.HIGH, factors=factors)

    # Any 2 of 3 sensors ready
    two_of_three = (
        (s_ready and v_ready) or
        (s_ready and p_ready) or
        (v_ready and p_ready)
    )
    if two_of_three:
        level = RiskLevel.CRITICAL if (s_ready and v_ready) else RiskLevel.HIGH
        score = 1.0 if level == RiskLevel.CRITICAL else 0.75
        state.mark_alert(now)
        logger.warning(f"[{device_id}] ALERT — {level} (2-of-3 sensors)")
        return RiskResult(score=score, level=level, factors=factors)

    return RiskResult(score=0.0, level=RiskLevel.LOW, factors=factors)




# import time
# import logging
# import numpy as np
# from dataclasses import dataclass, field
# from enum import Enum
# from typing import Optional, Dict

# logger = logging.getLogger(__name__)

# COOLDOWN_SECONDS = 10.0


# # ── Exact same classes as risk.py ─────────────────────────────────────────────

# class RiskLevel(str, Enum):
#     LOW      = "LOW"
#     HIGH     = "HIGH"
#     CRITICAL = "CRITICAL"

# @dataclass
# class RiskResult:
#     score:   float
#     level:   RiskLevel
#     factors: dict = field(default_factory=dict)


# # ── Cooldown (identical to risk.py) ───────────────────────────────────────────

# class DeviceState:
#     def __init__(self):
#         self.last_alert_time: Optional[float] = None

#     def in_cooldown(self, now: float) -> bool:
#         if self.last_alert_time is None:
#             return False
#         return (now - self.last_alert_time) < COOLDOWN_SECONDS

#     def mark_alert(self, now: float):
#         self.last_alert_time = now

# _device_states: Dict[str, DeviceState] = {}

# def get_device_state(device_id: str) -> DeviceState:
#     if device_id not in _device_states:
#         _device_states[device_id] = DeviceState()
#     return _device_states[device_id]


# # ── Training data (mirrors risk.py rules) ─────────────────────────────────────

# def _make_data(n=500):
#     np.random.seed(42)
#     X, y = [], []
#     for _ in range(n):
#         s = np.random.uniform(0, 1023)
#         v = float(np.random.choice([0, 1]))
#         p = np.random.uniform(0, 1000)

#         if s >= 500 and v >= 1:                          label = 2  # CRITICAL
#         elif (s >= 500 and p >= 500) or \
#              (v >= 1   and p >= 500):                    label = 1  # HIGH
#         elif p >= 500:                                   label = 1  # HIGH
#         else:                                            label = 0  # LOW

#         X.append([s, v, p])
#         y.append(label)
#     return np.array(X, dtype=np.float32), np.array(y, dtype=np.int32)


# # ── Tiny neural net (3 → 8 → 3, pure numpy) ──────────────────────────────────

# def _relu(x):    return np.maximum(0, x)
# def _softmax(x): e = np.exp(x - x.max()); return e / e.sum()

# class _TinyNet:
#     def __init__(self):
#         np.random.seed(0)
#         self.W1 = np.random.randn(3, 8).astype(np.float32) * np.sqrt(2/3)
#         self.b1 = np.zeros(8,  dtype=np.float32)
#         self.W2 = np.random.randn(8, 3).astype(np.float32) * np.sqrt(2/8)
#         self.b2 = np.zeros(3,  dtype=np.float32)

#     def predict(self, x):
#         h      = _relu(x @ self.W1 + self.b1)
#         logits = h @ self.W2 + self.b2
#         probs  = _softmax(logits)
#         return int(np.argmax(probs)), probs

#     def train_step(self, X_b, y_b, lr=0.05):
#         n   = len(X_b)
#         H   = _relu(X_b @ self.W1 + self.b1)
#         OUT = H @ self.W2 + self.b2
#         e   = np.exp(OUT - OUT.max(axis=1, keepdims=True))
#         P   = e / e.sum(axis=1, keepdims=True)

#         loss       = -np.log(P[np.arange(n), y_b] + 1e-9).mean()
#         dOUT       = P.copy(); dOUT[np.arange(n), y_b] -= 1; dOUT /= n
#         dH         = dOUT @ self.W2.T; dH[H <= 0] = 0

#         self.W2 -= lr * H.T  @ dOUT
#         self.b2 -= lr * dOUT.sum(0)
#         self.W1 -= lr * X_b.T @ dH
#         self.b1 -= lr * dH.sum(0)
#         return loss


# # ── Train once at import time ─────────────────────────────────────────────────

# logger.info("tiny_ml_risk: training model...")

# _X, _y   = _make_data(500)
# _X_min   = _X.min(axis=0)
# _X_max   = _X.max(axis=0)
# _X_norm  = (_X - _X_min) / (_X_max - _X_min + 1e-9)

# _net = _TinyNet()
# for _ in range(300):
#     idx = np.random.permutation(len(_X_norm))
#     for i in range(0, len(_X_norm), 32):
#         b = idx[i:i+32]
#         _net.train_step(_X_norm[b], _y[b])

# _preds = [_net.predict(_X_norm[i])[0] for i in range(len(_X_norm))]
# _acc   = np.mean(np.array(_preds) == _y)
# logger.info(f"tiny_ml_risk: model ready — accuracy={_acc*100:.1f}%")

# _LEVEL_MAP = {0: RiskLevel.LOW, 1: RiskLevel.HIGH, 2: RiskLevel.CRITICAL}


# # ── calculate_risk — identical signature to risk.py ──────────────────────────

# def calculate_risk(
#     device_id: str,
#     sound:     Optional[float],
#     vibration: Optional[float],
#     pressure:  Optional[float],
#     now:       Optional[float] = None,
# ) -> RiskResult:

#     if now is None:
#         now = time.time()

#     state = get_device_state(device_id)

#     # cooldown — identical behaviour to risk.py
#     if state.in_cooldown(now):
#         remaining = COOLDOWN_SECONDS - (now - state.last_alert_time)
#         logger.info(f"[{device_id}] cooldown — {remaining:.1f}s left")
#         return RiskResult(score=0.0, level=RiskLevel.LOW, factors={"cooldown": True})

#     # replace None with 0.0
#     s = float(sound)     if sound     is not None else 0.0
#     v = float(vibration) if vibration is not None else 0.0
#     p = float(pressure)  if pressure  is not None else 0.0

#     # normalise
#     raw  = np.array([s, v, p], dtype=np.float32)
#     norm = (raw - _X_min) / (_X_max - _X_min + 1e-9)

#     # inference
#     cls, probs = _net.predict(norm)
#     level      = _LEVEL_MAP[cls]
#     score      = float(probs[cls])

#     # factors — same structure risk.py used
#     factors = {
#         "sound":         s,
#         "vibration":     v,
#         "pressure":      p,
#         "prob_low":      round(float(probs[0]), 3),
#         "prob_high":     round(float(probs[1]), 3),
#         "prob_critical": round(float(probs[2]), 3),
#     }

#     logger.info(f"[{device_id}] ML → {level} (score={score:.2f})")

#     if level in (RiskLevel.HIGH, RiskLevel.CRITICAL):
#         state.mark_alert(now)
#         logger.warning(f"[{device_id}] ALERT — {level}")

#     return RiskResult(score=score, level=level, factors=factors)


# # ── Quick test ────────────────────────────────────────────────────────────────

# if __name__ == "__main__":
#     logging.basicConfig(level=logging.INFO)

#     tests = [
#         ("All quiet",             100,  0,  50),
#         ("Sound + Vibration",     800,  1, 100),
#         ("Pressure only",          50,  0, 700),
#         ("Sound + Pressure",      600,  0, 600),
#         ("All sensors triggered", 900,  1, 900),
#     ]

#     print(f"\n{'─'*55}")
#     for name, s, v, p in tests:
#         r = calculate_risk("test-device", s, v, p, now=time.time() + 999)
#         print(f"  {name:<25} → level={r.level:<8}  score={r.score:.2f}  factors={r.factors}")
#     print(f"{'─'*55}")