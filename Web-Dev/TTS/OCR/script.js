const OCR_SPACE_URL = 'https://api.ocr.space/parse/image';
const OCR_SPACE_API_KEY = 'K89687391588957';

// Global state for TTS per file
const fileStates = {};

// Helper: Wait for voices to load
async function waitForVoices() {
    return new Promise((resolve) => {
        const voices = speechSynthesis.getVoices().filter(v => v.lang.includes('en'));
        if (voices.length > 0) {
            resolve(voices);
        } else {
            speechSynthesis.onvoiceschanged = () => {
                const updatedVoices = speechSynthesis.getVoices().filter(v => v.lang.includes('en'));
                resolve(updatedVoices);
            };
        }
    });
}

// Helper: Convert file to data URL
async function fileToDataURL(file) {
    try {
        console.log(`Converting ${file.name} to data URL...`);
        return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
            reader.readAsDataURL(file);
        });
    } catch (error) {
        console.error('File Read Error:', error);
        alert(`Error reading file ${file.name}: ${error.message}`);
        return null;
    }
}

// OCR.space: Extract text
async function extractTextFromImage(dataUrl, fileName) {
    try {
        console.log(`Trying OCR.space for ${fileName}...`);
        const formData = new FormData();
        formData.append('base64Image', dataUrl);
        formData.append('language', 'eng');
        formData.append('isOverlayRequired', 'false');
        formData.append('isCreateSearchablePdf', 'false');
        formData.append('isSearchablePdfHideTextLayer', 'false');
        formData.append('scale', 'true');
        formData.append('isTable', 'false');

        const response = await fetch(OCR_SPACE_URL, {
            method: 'POST',
            headers: { 'apikey': OCR_SPACE_API_KEY },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        if (data.IsErroredOnProcessing) {
            throw new Error(data.ErrorMessage?.join(' ') || 'OCR.space processing failed');
        }
        const text = data.ParsedResults?.[0]?.ParsedText || '';
        console.log(`OCR.space text from ${fileName}:`, text);
        return text.trim();
    } catch (error) {
        console.error(`OCR.space Error for ${fileName}:`, error);
        alert(`OCR failed for ${fileName}: ${error.message}. Try a different image or network.`);
        return '';
    }
}

// Web Speech API: Generate audio for a file
async function generateAndPlayAudio(fileId, text) {
    try {
        if (!('speechSynthesis' in window)) {
            throw new Error('Web Speech API not supported in this browser.');
        }

        fileStates[fileId] = {
            utterance: null,
            isPaused: false,
            text: text,
            startTime: 0,
            position: 0,
            voiceIndex: '',
            speed: 0.9
        };

        const state = fileStates[fileId];
        const voices = await waitForVoices();

        if (voices.length === 0) {
            throw new Error('No English voices available.');
        }

        state.utterance = new SpeechSynthesisUtterance(text);
        state.utterance.lang = 'en-US';
        state.utterance.rate = state.speed;
        state.utterance.pitch = 1;
        state.utterance.volume = 1;

        // Voice picker
        let voiceSelectHtml = `<select id="voiceSelect-${fileId}" class="form-select mb-2 tts-controls" onchange="updateVoice('${fileId}', this.value)">`;
        voiceSelectHtml += '<option value="">Select Voice</option>';
        voices.forEach((voice, index) => {
            voiceSelectHtml += `<option value="${index}">${voice.name} (${voice.lang})</option>`;
        });
        voiceSelectHtml += '</select>';

        // TTS controls
        const audioControls = document.getElementById(`audioControls-${fileId}`);
        audioControls.innerHTML = `
            <div class="tts-controls d-flex flex-column gap-2">
                ${voiceSelectHtml}
                <div>
                    <button id="playPauseBtn-${fileId}" class="btn btn-primary" onclick="togglePlayPause('${fileId}')">Play</button>
                    <button class="btn btn-secondary" onclick="stopSpeech('${fileId}')">Stop</button>
                    <button class="btn btn-success" disabled>Save as MP3</button>
                </div>
                <div>
                    <label for="speedControl-${fileId}" class="form-label">Speed: </label>
                    <input type="range" class="form-range w-100 tts-controls" id="speedControl-${fileId}" min="0.5" max="2" step="0.1" value="0.9"
                           oninput="updateSpeechSpeed('${fileId}', this.value)">
                </div>
            </div>
        `;

        // Start speech
        speechSynthesis.speak(state.utterance);
        state.startTime = Date.now();
        document.getElementById(`playPauseBtn-${fileId}`).textContent = 'Pause';
        console.log(`Audio playing for ${fileId}`);
    } catch (error) {
        console.error(`TTS Error for ${fileId}:`, error);
        alert(`Audio playback failed for ${fileId}: ${error.message}. Try Chrome/Edge or a different browser.`);
    }
}

// Toggle play/pause
function togglePlayPause(fileId) {
    const state = fileStates[fileId];
    if (!state) return;
    const btn = document.getElementById(`playPauseBtn-${fileId}`);
    if (speechSynthesis.paused || state.isPaused) {
        console.log(`Resuming speech for ${fileId}...`);
        if (!state.utterance) {
            state.utterance = new SpeechSynthesisUtterance(state.text);
            state.utterance.lang = 'en-US';
            state.utterance.rate = state.speed;
            state.utterance.pitch = 1;
            state.utterance.volume = 1;
            if (state.voiceIndex) {
                const voices = speechSynthesis.getVoices().filter(v => v.lang.includes('en'));
                state.utterance.voice = voices[state.voiceIndex];
            }
        }
        speechSynthesis.resume();
        btn.textContent = 'Pause';
        state.isPaused = false;
        state.startTime = Date.now() - state.position * 1000;
        console.log(`Speech resumed for ${fileId}`);
    } else if (speechSynthesis.speaking) {
        console.log(`Pausing speech for ${fileId}...`);
        speechSynthesis.pause();
        state.position = (Date.now() - state.startTime) / 1000;
        btn.textContent = 'Play';
        state.isPaused = true;
        console.log(`Speech paused for ${fileId}`);
    } else {
        speechSynthesis.cancel();
        generateAndPlayAudio(fileId, state.text);
    }
}

// Stop speech
function stopSpeech(fileId) {
    speechSynthesis.cancel();
    const state = fileStates[fileId];
    if (state) {
        state.isPaused = false;
        state.startTime = 0;
        state.position = 0;
        document.getElementById(`playPauseBtn-${fileId}`).textContent = 'Play';
        console.log(`Speech stopped for ${fileId}`);
    }
}

// Update voice
async function updateVoice(fileId, voiceIndex) {
    const state = fileStates[fileId];
    if (!state) return;
    const voices = await waitForVoices();
    if (voiceIndex && voices[voiceIndex]) {
        const wasPaused = state.isPaused;
        state.position = wasPaused ? state.position : (Date.now() - state.startTime) / 1000;
        speechSynthesis.cancel();
        state.utterance = new SpeechSynthesisUtterance(state.text);
        state.utterance.lang = 'en-US';
        state.utterance.rate = state.speed;
        state.utterance.voice = voices[voiceIndex];
        state.voiceIndex = voiceIndex;
        speechSynthesis.speak(state.utterance);
        if (wasPaused) {
            speechSynthesis.pause();
            document.getElementById(`playPauseBtn-${fileId}`).textContent = 'Play';
        } else {
            document.getElementById(`playPauseBtn-${fileId}`).textContent = 'Pause';
        }
        state.startTime = Date.now() - state.position * 1000;
        console.log(`Voice updated for ${fileId}:`, voices[voiceIndex].name);
    }
}

// Update speech speed
function updateSpeechSpeed(fileId, speed) {
    const state = fileStates[fileId];
    if (!state) return;
    const wasPaused = state.isPaused;
    state.position = wasPaused ? state.position : (Date.now() - state.startTime) / 1000;
    speechSynthesis.cancel();
    state.utterance = new SpeechSynthesisUtterance(state.text);
    state.utterance.lang = 'en-US';
    state.utterance.rate = parseFloat(speed);
    state.speed = parseFloat(speed);
    if (state.voiceIndex) {
        const voices = speechSynthesis.getVoices().filter(v => v.lang.includes('en'));
        state.utterance.voice = voices[state.voiceIndex];
    }
    speechSynthesis.speak(state.utterance);
    if (wasPaused) {
        speechSynthesis.pause();
        document.getElementById(`playPauseBtn-${fileId}`).textContent = 'Play';
    } else {
        document.getElementById(`playPauseBtn-${fileId}`).textContent = 'Pause';
    }
    state.startTime = Date.now() - state.position * 1000;
    console.log(`Speed updated for ${fileId}:`, speed);
}

// Process images
async function processImages() {
    const files = document.getElementById('imageInput').files;
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    const fileSections = document.getElementById('fileSections');
    
    if (files.length === 0) {
        alert('Please select at least one image.');
        return;
    }
    // Reset UI
    progressBar.classList.remove('d-none');
    progressFill.style.width = '0%';
    fileSections.innerHTML = '';
    Object.keys(fileStates).forEach(key => delete fileStates[key]);
    speechSynthesis.cancel();

    let hasText = false;
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileId = file.name.replace(/[^a-zA-Z0-9]/g, '_');
        progressFill.style.width = `${((i + 1) / files.length) * 100}%`;

        try {
            const dataUrl = await fileToDataURL(file);
            if (!dataUrl) continue;

            const text = await extractTextFromImage(dataUrl, file.name);
            if (!text) continue;

            hasText = true;
            const section = document.createElement('div');
            section.className = 'file-section row mb-3';
            section.innerHTML = `
                <div class="col-md-4">
                    <img src="${dataUrl}" alt="${file.name}">
                </div>
                <div class="col-md-4">
                    <h3>Text from ${file.name}</h3>
                </div>
                <div class="col-md-4" id="audioControls-${fileId}"></div>
            `;
            fileSections.appendChild(section);
            await generateAndPlayAudio(fileId, text);
        } catch (error) {
            console.error(`Error processing ${file.name}:`, error);
            continue;
        }
    }

    if (!hasText) {
        fileSections.innerHTML = '<p class="text-muted">No text found in any images.</p>';
        progressBar.classList.add('d-none');
        alert('No text was found. Try clearer images (e.g., black text on white).');
        return;
    }

    progressBar.classList.add('d-none');
}