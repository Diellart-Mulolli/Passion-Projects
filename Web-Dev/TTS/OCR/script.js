const OCR_SPACE_URL = 'https://api.ocr.space/parse/image';
const OCR_SPACE_API_KEY = 'K89687391588957';

// Global state for TTS per file and global voice
const fileStates = {
    selectedVoiceIndex: '' // Store global voice index
};

// Helper: Wait for voices to load and populate navbar voice picker
async function waitForVoices() {
    return new Promise((resolve) => {
        const voices = speechSynthesis.getVoices().filter(v => v.lang.includes('en'));
        if (voices.length > 0) {
            populateVoiceSelect(voices);
            resolve(voices);
        } else {
            speechSynthesis.onvoiceschanged = () => {
                const updatedVoices = speechSynthesis.getVoices().filter(v => v.lang.includes('en'));
                populateVoiceSelect(updatedVoices);
                resolve(updatedVoices);
            };
        }
    });
}

// Populate voice picker in navbar
function populateVoiceSelect(voices) {
    const voiceSelect = document.getElementById('voiceSelect');
    if (!voiceSelect) return;
    voiceSelect.innerHTML = '<option value="">Select Voice</option>';
    let defaultVoiceIndex = '';
    voices.forEach((voice, index) => {
        voiceSelect.innerHTML += `<option value="${index}">${voice.name} (${voice.lang})</option>`;
        if (voice.name === 'Google UK English Female' && voice.lang === 'en-GB') {
            defaultVoiceIndex = index.toString();
        } else if (!defaultVoiceIndex && voice.lang === 'en-GB') {
            defaultVoiceIndex = index.toString(); // Fallback to any en-GB voice
        }
    });
    if (defaultVoiceIndex !== '') {
        voiceSelect.value = defaultVoiceIndex;
        fileStates.selectedVoiceIndex = defaultVoiceIndex;
        console.log(`Default voice set: ${voices[defaultVoiceIndex].name} (${voices[defaultVoiceIndex].lang})`);
    }
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

// OCR.space: Extract text with retry
async function extractTextFromImage(dataUrl, fileName, retries = 1) {
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
            body: formData,
            mode: 'cors',
            credentials: 'omit'
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
        if (retries > 0) {
            console.log(`Retrying OCR for ${fileName}... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
            return extractTextFromImage(dataUrl, fileName, retries - 1);
        }
        alert(`OCR failed for ${fileName}: ${error.message}. Ensure you're hosting the app (e.g., python -m http.server) and using a stable network or VPN.`);
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
        if (fileStates.selectedVoiceIndex !== '') {
            state.utterance.voice = voices[fileStates.selectedVoiceIndex];
        }

        // TTS controls (buttons and speed slider inline, no Save MP3)
        const audioControls = document.getElementById(`audioControls-${fileId}`);
        if (!audioControls) {
            throw new Error(`Audio controls element not found for ${fileId}`);
        }
        audioControls.innerHTML = `
            <div class="tts-controls d-flex align-items-center gap-2 flex-wrap">
                <button id="playPauseBtn-${fileId}" class="btn btn-primary btn-sm" onclick="togglePlayPause('${fileId}')">Play</button>
                <button class="btn btn-secondary btn-sm" onclick="stopSpeech('${fileId}')">Stop</button>
                <label for="speedControl-${fileId}" class="form-label mb-0">Speed:</label>
                <input type="range" class="form-range tts-controls" id="speedControl-${fileId}" min="0.5" max="2" step="0.1" value="0.9"
                       oninput="updateSpeechSpeed('${fileId}', this.value)">
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
            if (fileStates.selectedVoiceIndex !== '') {
                const voices = speechSynthesis.getVoices().filter(v => v.lang.includes('en'));
                state.utterance.voice = voices[fileStates.selectedVoiceIndex];
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

// Update voice (global)
async function updateVoice(voiceIndex) {
    fileStates.selectedVoiceIndex = voiceIndex;
    const voices = await waitForVoices();
    if (voiceIndex !== '' && voices[voiceIndex]) {
        console.log(`Global voice updated: ${voices[voiceIndex].name}`);
        // Update all active utterances
        Object.keys(fileStates).forEach(async (fileId) => {
            if (fileId === 'selectedVoiceIndex') return;
            const state = fileStates[fileId];
            if (!state) return;
            const wasPaused = state.isPaused;
            state.position = wasPaused ? state.position : (Date.now() - state.startTime) / 1000;
            speechSynthesis.cancel();
            state.utterance = new SpeechSynthesisUtterance(state.text);
            state.utterance.lang = 'en-US';
            state.utterance.rate = state.speed;
            state.utterance.pitch = 1;
            state.utterance.volume = 1;
            state.utterance.voice = voices[voiceIndex];
            speechSynthesis.speak(state.utterance);
            if (wasPaused) {
                speechSynthesis.pause();
                const btn = document.getElementById(`playPauseBtn-${fileId}`);
                if (btn) btn.textContent = 'Play';
            } else {
                const btn = document.getElementById(`playPauseBtn-${fileId}`);
                if (btn) btn.textContent = 'Pause';
            }
            state.startTime = Date.now() - state.position * 1000;
        });
    }
}

// Update speech speed
async function updateSpeechSpeed(fileId, speed) {
    const state = fileStates[fileId];
    if (!state) return;
    const wasPaused = state.isPaused;
    state.position = wasPaused ? state.position : (Date.now() - state.startTime) / 1000;
    speechSynthesis.cancel();
    state.utterance = new SpeechSynthesisUtterance(state.text);
    state.utterance.lang = 'en-US';
    state.utterance.rate = parseFloat(speed);
    state.utterance.pitch = 1;
    state.utterance.volume = 1;
    state.speed = parseFloat(speed);
    if (fileStates.selectedVoiceIndex !== '') {
        const voices = await waitForVoices();
        state.utterance.voice = voices[fileStates.selectedVoiceIndex];
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
    Object.keys(fileStates).forEach(key => {
        if (key !== 'selectedVoiceIndex') delete fileStates[key];
    });
    speechSynthesis.cancel();

    // Initialize voice picker
    await waitForVoices();

    let hasText = false;
    const fileArray = Array.from(files); // Convert FileList to Array
    const filePairs = [];
    for (let i = 0; i < fileArray.length; i += 2) {
        filePairs.push(fileArray.slice(i, i + 2));
    }

    for (let i = 0; i < filePairs.length; i++) {
        const pair = filePairs[i];
        const section = document.createElement('div');
        section.className = 'file-section mb-3';
        const row = document.createElement('div');
        row.className = 'row';
        let hasValidImage = false;

        for (let j = 0; j < pair.length; j++) {
            const file = pair[j];
            const fileId = file.name.replace(/[^a-zA-Z0-9]/g, '_');
            progressFill.style.width = `${((i * 2 + j + 1) / fileArray.length) * 100}%`;

            try {
                const dataUrl = await fileToDataURL(file);
                if (!dataUrl) continue;

                const text = await extractTextFromImage(dataUrl, file.name);
                if (!text) continue;

                hasText = true;
                hasValidImage = true;
                const col = document.createElement('div');
                col.className = 'col-md-6';
                col.innerHTML = `
                    <div class="card">
                        <img src="${dataUrl}" alt="${file.name}" class="card-img-top">
                        <div class="card-body" id="audioControls-${fileId}"></div>
                    </div>
                `;
                row.appendChild(col);
                section.appendChild(row);
                fileSections.appendChild(section); // Append to DOM before generateAndPlayAudio
                await generateAndPlayAudio(fileId, text);
            } catch (error) {
                console.error(`Error processing ${file.name}:`, error);
                continue;
            }
        }

        if (hasValidImage && !fileSections.contains(section)) {
            section.appendChild(row);
            const hr = document.createElement('hr');
            section.appendChild(hr);
            fileSections.appendChild(section);
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