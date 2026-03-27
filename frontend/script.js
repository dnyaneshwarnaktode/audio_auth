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
const confidenceFill = document.getElementById('confidence-fill');
const errorMsg = document.getElementById('error-msg');

let selectedFile = null;
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

// Tab Switching
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`${btn.getAttribute('data-tab')}-tab`).classList.add('active');
        resetAnalysisState();
    });
});

function resetAnalysisState() {
    selectedFile = null;
    analyzeBtn.disabled = true;
    resultBox.classList.remove('show');
    errorMsg.style.display = 'none';
    fileNameDisplay.textContent = '';
    fileInput.value = '';
    audioPreview.classList.add('hidden');
    audioPreview.src = '';
    recordingStatus.textContent = 'ready to record';
    recordingStatus.style.color = '';
    if (isRecording) stopRecording();
}

// Upload Logic
fileInput.addEventListener('change', e => {
    if (e.target.files.length > 0) handleFileSelection(e.target.files[0]);
});

dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleFileSelection(e.dataTransfer.files[0]);
});

function handleFileSelection(file) {
    selectedFile = file;
    fileNameDisplay.textContent = `↳ ${file.name}`;
    analyzeBtn.disabled = false;
    resultBox.classList.remove('show');
    errorMsg.style.display = 'none';
}

// Recording Logic
recordBtn.addEventListener('click', async () => {
    if (!isRecording) await startRecording();
    else stopRecording();
});

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            selectedFile = new File([audioBlob], "recorded_audio.webm", { type: "audio/webm" });
            const audioUrl = URL.createObjectURL(audioBlob);
            audioPreview.src = audioUrl;
            audioPreview.classList.remove('hidden');
            analyzeBtn.disabled = false;
            recordingStatus.textContent = 'recording complete';
            recordingStatus.style.color = '#22c55e';
            stream.getTracks().forEach(track => track.stop());
        };
        mediaRecorder.start();
        isRecording = true;
        recordBtn.classList.add('recording');
        recordBtn.innerHTML = '<i class="fa-solid fa-stop"></i>';
        recordingStatus.textContent = 'recording... click to stop';
        recordingStatus.style.color = '#ff4d4d';
        audioPreview.classList.add('hidden');
        resultBox.classList.remove('show');
        errorMsg.style.display = 'none';
        analyzeBtn.disabled = true;
    } catch (err) {
        errorMsg.textContent = "Microphone access denied or not available.";
        errorMsg.style.display = 'block';
    }
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        recordBtn.classList.remove('recording');
        recordBtn.innerHTML = '<i class="fa-solid fa-microphone-lines"></i>';
    }
}

const fileToBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

// Analysis
analyzeBtn.addEventListener('click', async () => {
    if (!selectedFile) return;
    analyzeBtn.disabled = true;
    btnText.style.display = 'none';
    loader.style.display = 'block';
    resultBox.classList.remove('show');
    errorMsg.style.display = 'none';

    try {
        const base64Audio = await fileToBase64(selectedFile);
        const response = await fetch('https://audio-auth.onrender.com/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64_audio: base64Audio })
        });
        if (!response.ok) throw new Error('Failed to analyze audio.');
        const data = await response.json();

        resultBadge.textContent = data.prediction === 'real' ? 'Authentic Human' : 'AI Generated';
        resultBadge.className = `badge ${data.prediction}`;
        const pct = (data.confidence * 100).toFixed(1);
        confidenceScore.textContent = `${pct}%`;
        confidenceFill.style.width = `${pct}%`;
        confidenceFill.style.background = data.prediction === 'real' ? 'var(--green)' : 'var(--red)';
        resultBox.classList.add('show');
    } catch (error) {
        errorMsg.textContent = "Error: Could not reach the API. Check your connection or backend status.";
        errorMsg.style.display = 'block';
    } finally {
        analyzeBtn.disabled = false;
        btnText.style.display = 'block';
        loader.style.display = 'none';
    }
});

// Theme Toggle
const themeToggle = document.getElementById('theme-toggle');
const currentTheme = localStorage.getItem('theme') || 'dark';

if (currentTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
}

themeToggle.addEventListener('click', () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    if (isLight) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'dark');
        themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
        themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
});