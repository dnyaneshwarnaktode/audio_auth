import librosa
import numpy as np

def extract_features(file_path):
    # Only load first 5 seconds to prevent hanging on massive files (500MB+)
    y, sr = librosa.load(file_path, sr=16000, duration=5.0)
    
    # Extract MFCC features
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
    
    # Take mean (important)
    return np.mean(mfcc.T, axis=0)