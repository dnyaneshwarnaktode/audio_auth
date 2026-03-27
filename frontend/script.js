const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileNameDisplay = document.getElementById('file-name');
const analyzeBtn = document.getElementById('analyze-btn');
const btnText = document.getElementById('btn-text');
const loader = document.getElementById('loader');
const resultBox = document.getElementById('result-box');
const resultBadge = document.getElementById('result-badge');
const confidenceScore = document.getElementById('confidence-score');
const errorMsg = document.getElementById('error-msg');

let selectedFile = null;

// Handle file selection
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        selectedFile = e.target.files[0];
        fileNameDisplay.textContent = selectedFile.name;
        analyzeBtn.disabled = false;
        resultBox.classList.remove('show');
        errorMsg.style.display = 'none';
    }
});

// Drag and drop styles
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
        selectedFile = e.dataTransfer.files[0];
        fileInput.files = e.dataTransfer.files;
        fileNameDisplay.textContent = selectedFile.name;
        analyzeBtn.disabled = false;
        resultBox.classList.remove('show');
        errorMsg.style.display = 'none';
    }
});

// Convert File to Base64
const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
};

// Handle Analysis
analyzeBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    // UI Loading state
    analyzeBtn.disabled = true;
    btnText.style.display = 'none';
    loader.style.display = 'block';
    resultBox.classList.remove('show');
    errorMsg.style.display = 'none';

    try {
        const base64Audio = await fileToBase64(selectedFile);

        // Fetch prediction from backend
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

        // Show Result
        resultBadge.textContent = data.prediction === 'real' ? 'Authentic human' : 'AI Generated';
        resultBadge.className = `badge ${data.prediction}`;

        const percentage = (data.confidence * 100).toFixed(1);
        confidenceScore.innerHTML = `${percentage}% <span>Confidence</span>`;

        resultBox.classList.add('show');

    } catch (error) {
        console.error(error);
        errorMsg.textContent = "Error: Could not reach the API. Make sure FastAPI is running on port 8000.";
        errorMsg.style.display = 'block';
    } finally {
        // UI Reset state
        analyzeBtn.disabled = false;
        btnText.style.display = 'block';
        loader.style.display = 'none';
    }
});
