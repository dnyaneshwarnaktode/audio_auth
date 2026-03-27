# Saksi AI Audio Detector: Project Workflow & Information

This document outlines the architecture, technology stack, and operational workflows of the **Saksi AI Audio Detector** project, built to identify deepfakes and synthesized voices.

## Project Structure
The project is split into two straightforward directories:
* **`frontend/`**: Contains raw HTML, CSS, and Vanilla JavaScript for the user interface.
* **`backend/`**: Contains the Python FastAPI application, the machine learning training script, and feature extraction utilities.

## Technology Stack
### Frontend
* **HTML5**: Structure of the landing page/dashboard (`index.html`).
* **Vanilla CSS**: Custom styling, implementing modern aesthetics and drag-and-drop feedback states (`styles.css`).
* **Vanilla JavaScript**: DOM manipulation, file handling, Base64 encoding, and API integration (`script.js`).

### Backend (Machine Learning & API)
* **Python**: Core programming language.
* **FastAPI**: High-performance API framework for serving the model (`app.py`).
* **Librosa**: Processing and extracting audio features (`utils.py`).
* **Scikit-Learn**: Machine learning framework, specifically utilizing a `LogisticRegression` model (`train.py`).
* **Joblib**: Used for saving and loading the trained machine learning model (`model.pkl`).

---

## Complete Operational Workflow

The application handles everything from client-side audio selection to server-side AI evaluation. Let's break down the process step-by-step:

### 1. User Interaction (Frontend)
1. **Selection:** The user visits the frontend dashboard and uploads an audio file (`.wav`, `.mp3`, etc.) using either the file input click or by dragging and dropping the file into the designated `upload-area`.
2. **File Conversion:** Upon clicking the "Analyze Audio" button, the frontend JavaScript converts the selected binary audio file into a raw **Base64 encoded string** using the browser's native `FileReader` API.
3. **API Call:** A `POST` request is sent to the backend hosted on Render (`https://audio-auth.onrender.com/predict`). The payload is a JSON object containing the string: `{"base64_audio": "..."}`.

### 2. Audio Processing & Prediction (Backend)
1. **Receiving Data:** The FastAPI endpoint (`/predict`) receives the JSON request payload.
2. **Decoding:** The server strips any data URL metadata (e.g., `data:audio/wav;base64,`) if present, repairs padding if needed, and decodes the Base64 string back into raw byte format.
3. **Temporary Storage:** The byte string is securely saved to a temporary `.wav` file on the server using Python's `tempfile` module.
4. **Feature Extraction:** The `extract_features` function from `utils.py` processes the temporary file. It uses `librosa` to load the first 5 seconds of the audio and extracts **13 MFCC (Mel-frequency cepstral coefficients) features**, taking the mean across the duration to create a 1D numerical array.
5. **AI Inference:** The pre-trained Scikit-Learn `LogisticRegression` model (`model.pkl`) evaluates the numerical features to predict a binary class (0 for "real", 1 for "fake") and calculates a confidence probability.
6. **Cleanup:** The temporary `.wav` file is immediately deleted from the server to ensure no user data is persistently stored.
7. **Response:** The backend returns a JSON response to the client: `{"prediction": "real" | "fake", "confidence": <float>}`.

### 3. Displaying Results (Frontend)
1. **Parsing:** The frontend receives the JSON response.
2. **DOM Update:** The UI updates smoothly (removing the loading state). 
3. **Render:** It conditionally alters the result badge to read **"Authentic human"** for real audio or **"AI Generated"** for fake audio, scaling the `<float>` confidence probability to a percentage string (e.g., `99.9%`).

---

## Machine Learning Training Workflow (`train.py`)
If you decide to retrain your model in the future, the backend includes a `train.py` script that acts as follows:
1. Loops through the `backend/data/real` and `backend/data/fake` directories.
2. Extracts MFCC features for every audio file.
3. Splits the dataset into 80% Training Data and 20% Testing Data.
4. Trains a `LogisticRegression(max_iter=1000)` model.
5. Evaluates model accuracy.
6. Dumps the trained model back into `backend/model.pkl` using `joblib`.
