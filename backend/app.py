import base64
import joblib
import numpy as np
import os
import tempfile
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from utils import extract_features

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AudioRequest(BaseModel):
    base64_audio: str

# Resolve absolute paths so it runs perfectly from anywhere
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model.pkl")

# Load model
model = joblib.load(MODEL_PATH)

@app.post("/predict")
def predict_audio(request: AudioRequest):
    # Parse base64 string removing data URL scheme if present
    base64_str = request.base64_audio
    if "," in base64_str:
        base64_str = base64_str.split(",")[1]
    
    # Fix padding if missing
    padded_base64 = base64_str + '=' * (-len(base64_str) % 4)
    audio_bytes = base64.b64decode(padded_base64)
    
    # Store in the system temp folder to avoid creating a visible file in the project
    fd, path = tempfile.mkstemp(suffix=".wav")
    try:
        with os.fdopen(fd, 'wb') as f:
            f.write(audio_bytes)
            
        features = extract_features(path).reshape(1, -1)
    
        pred = model.predict(features)[0]
        prob = model.predict_proba(features).max()
    
        return {
            "prediction": "fake" if pred == 1 else "real",
            "confidence": float(prob)
        }
    finally:
        # Always delete the file so it completely vanishes after prediction
        if os.path.exists(path):
            os.remove(path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)