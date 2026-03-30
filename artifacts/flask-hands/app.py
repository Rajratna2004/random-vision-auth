from flask import Flask, request, jsonify
from flask_cors import CORS
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import numpy as np
import base64
import io
import os
import urllib.request
from PIL import Image

app = Flask(__name__)
CORS(app)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "hand_landmarker.task")
MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/"
    "hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
)

if not os.path.exists(MODEL_PATH):
    print("Downloading hand landmarker model…", flush=True)
    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    print("Model ready.", flush=True)

_base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
_options = vision.HandLandmarkerOptions(
    base_options=_base_options,
    num_hands=1,
    min_hand_detection_confidence=0.65,
    min_hand_presence_confidence=0.65,
    min_tracking_confidence=0.5,
)
detector = vision.HandLandmarker.create_from_options(_options)


def classify_gesture(lms):
    tips = [8, 12, 16, 20]
    pips = [6, 10, 14, 18]

    fingers_up = [lms[tips[i]].y < lms[pips[i]].y for i in range(4)]
    up_count = sum(fingers_up)

    thumb_up = lms[4].x < lms[3].x

    pinch_dist = (
        (lms[4].x - lms[8].x) ** 2 + (lms[4].y - lms[8].y) ** 2
    ) ** 0.5
    pinch = pinch_dist < 0.065

    if fingers_up[0] and not fingers_up[1] and not fingers_up[2] and not fingers_up[3]:
        return "draw"

    if fingers_up[0] and fingers_up[1] and not fingers_up[2] and not fingers_up[3]:
        return "color-next"

    if up_count >= 4:
        return "clear"

    if up_count == 0 and not thumb_up:
        return "eraser"

    if pinch:
        return "penup"

    return "idle"


@app.route("/detect", methods=["POST"])
def detect():
    try:
        data = request.get_json(force=True)
        img_b64 = data.get("image", "")

        if "," in img_b64:
            img_b64 = img_b64.split(",", 1)[1]

        img_bytes = base64.b64decode(img_b64)
        pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        img_np = np.array(pil_img, dtype=np.uint8)

        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_np)
        result = detector.detect(mp_image)

        if not result.hand_landmarks:
            return jsonify({"gesture": "idle", "landmarks": None, "handDetected": False})

        lms = result.hand_landmarks[0]
        gesture = classify_gesture(lms)

        lm_list = [
            {"x": float(lm.x), "y": float(lm.y), "z": float(lm.z)}
            for lm in lms
        ]

        return jsonify({"gesture": gesture, "landmarks": lm_list, "handDetected": True})

    except Exception as e:
        print(f"detect error: {e}", flush=True)
        return jsonify({"error": str(e), "gesture": "idle", "handDetected": False}), 200


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "flask-hands"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)
