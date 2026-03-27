// UI Elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileNameDisplay = document.getElementById('file-name');

const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

const recordBtn = document.getElementById('record-btn');
const recordingStatus = document.getElementById('recording-status');
const audioPreview = document.getElementById('audio-preview');

const analyzeBtn = document.getElementById('analyze-btn');
const btnText = document.getElementById('btn-text');
const loader = document.getElementById('loader');
const resultBox = document.getElementById('result-box');
const resultBadge = document.getElementById('result-badge');
const confidenceScore = document.getElementById('confidence-score');
const errorMsg = document.getElementById('error-msg');

// Application State
let selectedFile = null;
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

// 1. Tab Switching Logic
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Switch Active Tabs
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        const tabId = btn.getAttribute('data-tab');
        document.getElementById(`${tabId}-tab`).classList.add('active');

        resetAnalysisState();
    });
});

function resetAnalysisState() {
    selectedFile = null;
    analyzeBtn.disabled = true;
    resultBox.classList.remove('show');
    errorMsg.style.display = 'none';
    
    // Reset Upload Tab UI
    fileNameDisplay.textContent = 'Click or drag an audio file (.wav, .mp3)';
    fileInput.value = '';
    
    // Reset Record Tab UI
    audioPreview.classList.add('hidden');
    audioPreview.src = '';
    recordingStatus.textContent = 'Ready to record';
    recordingStatus.style.color = 'var(--text-muted)';
    if(isRecording) stopRecording();
}

// 2. Upload Logic
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileSelection(e.target.files[0]);
    }
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');

    if (e.dataTransfer.files.length > 0) {
        handleFileSelection(e.dataTransfer.files[0]);
    }
});

function handleFileSelection(file) {
    selectedFile = file;
    fileNameDisplay.textContent = selectedFile.name;
    analyzeBtn.disabled = false;
    resultBox.classList.remove('show');
    errorMsg.style.display = 'none';
}

// 3. Recording Logic
recordBtn.addEventListener('click', async () => {
    if (!isRecording) {
        await startRecording();
    } else {
        stopRecording();
    }
});

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            // Convert chunks to Blob
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' }); // Browsers generally record in webm or ogg
            
            // Generate pseudo-file to integrate with analysis logic
            selectedFile = new File([audioBlob], "recorded_audio.webm", { type: "audio/webm" });
            
            // Allow preview playback
            const audioUrl = URL.createObjectURL(audioBlob);
            audioPreview.src = audioUrl;
            audioPreview.classList.remove('hidden');
            
            analyzeBtn.disabled = false;
            recordingStatus.textContent = 'Recording complete. Ready to analyze.';
            recordingStatus.style.color = '#4ade80'; // Greenish success color
            
            // Release the microphone
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        isRecording = true;
        recordBtn.classList.add('recording');
        recordBtn.innerHTML = '<span class="record-icon">🛑</span>'; // Change to stop icon
        recordingStatus.textContent = 'Recording... click to stop';
        recordingStatus.style.color = '#ef4444'; // Red recording color
        
        audioPreview.classList.add('hidden');
        resultBox.classList.remove('show');
        errorMsg.style.display = 'none';
        analyzeBtn.disabled = true;

    } catch (err) {
        console.error("Error accessing microphone:", err);
        errorMsg.textContent = "Microphone access denied or not available.";
        errorMsg.style.display = 'block';
    }
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        recordBtn.classList.remove('recording');
        recordBtn.innerHTML = '<span class="record-icon">🎤</span>'; // Revert to mic icon
    }
}

// 4. Utility: Convert File to Base64
const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
};

// 5. Analysis Request
analyzeBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    // Set UI to loading mode
    analyzeBtn.disabled = true;
    btnText.style.display = 'none';
    loader.style.display = 'block';
    resultBox.classList.remove('show');
    errorMsg.style.display = 'none';

    try {
        const base64Audio = await fileToBase64(selectedFile);

        // Fetch prediction from backend
        // Update to point to the local or remote depending on user needs
        const response = await fetch('https://audio-auth.onrender.com/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                base64_audio: base64Audio
            })
        });

        if (!response.ok) throw new Error('Failed to analyze audio.');

        const data = await response.json();

        // Update UI with Results
        resultBadge.textContent = data.prediction === 'real' ? 'Authentic human' : 'AI Generated';
        resultBadge.className = `badge ${data.prediction}`;

        const percentage = (data.confidence * 100).toFixed(1);
        confidenceScore.innerHTML = `${percentage}% <span>Confidence</span>`;

        resultBox.classList.add('show');

    } catch (error) {
        console.error(error);
        errorMsg.textContent = "Error: Could not reach the API. Check your connection or the backend status.";
        errorMsg.style.display = 'block';
    } finally {
        // Reset loading mode
        analyzeBtn.disabled = false;
        btnText.style.display = 'block';
        loader.style.display = 'none';
    }
});
