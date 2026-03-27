import os
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
import joblib
from utils import extract_features

# Absolute path resolution
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

X = []
y = []

# Load dataset
for label, folder in enumerate(["real", "fake"]):
    path = os.path.join(BASE_DIR, "data", folder)
    
    for file in os.listdir(path):
        file_path = os.path.join(path, file)
        
        print(f"Processing {file} ({os.path.getsize(file_path) / (1024*1024):.1f} MB)...")
        try:
            features = extract_features(file_path)
            X.append(features)
            y.append(label)
        except Exception as e:
            print(f"Error processing {file}: {e}")

X = np.array(X)
y = np.array(y)

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

# Train model
model = LogisticRegression(max_iter=1000)
model.fit(X_train, y_train)

# Accuracy
print("Accuracy:", model.score(X_test, y_test))

# Save model
joblib.dump(model, os.path.join(BASE_DIR, "model.pkl"))