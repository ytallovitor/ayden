const micBtn = document.getElementById('micBtn');
const statusText = document.getElementById('statusText');
const responseText = document.getElementById('responseText');

// Modal Elements
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const groqKeyInput = document.getElementById('groqKey');
const geminiKeyInput = document.getElementById('geminiKey');
const settingsFeedback = document.getElementById('settingsFeedback');

let mediaRecorder;
let audioChunks = [];
let isRecording = false;

// Configurações e UI
settingsBtn.addEventListener('click', async () => {
    settingsModal.classList.add('show');
    settingsFeedback.innerText = '';
    try {
        const res = await fetch('/api/settings');
        if (res.ok) {
            const data = await res.json();
            if (data) {
                groqKeyInput.value = data.groq_key || '';
                geminiKeyInput.value = data.gemini_key || '';
            }
        }
    } catch(e) { console.error("Erro ao carregar configurações", e); }
});

closeModalBtn.addEventListener('click', () => { settingsModal.classList.remove('show'); });

saveSettingsBtn.addEventListener('click', async () => {
    saveSettingsBtn.innerText = "Salvando...";
    try {
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                groq_key: groqKeyInput.value,
                gemini_key: geminiKeyInput.value
            })
        });
        
        if (res.ok) {
            settingsFeedback.innerText = "Chaves salvas com sucesso!";
            settingsFeedback.style.color = "#4ade80";
            setTimeout(() => settingsModal.classList.remove('show'), 1500);
        } else {
            throw new Error("Erro ao salvar");
        }
    } catch(e) {
        settingsFeedback.innerText = "Falha ao salvar as chaves.";
        settingsFeedback.style.color = "#ef4444";
    } finally {
        saveSettingsBtn.innerText = "Salvar Chaves";
    }
});

// Gravação de Áudio
navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
        const options = { mimeType: 'audio/webm;codecs=opus' };
        
        if (!MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            console.warn("audio/webm;codecs=opus não suportado no navegador. Usando formato padrão.");
            mediaRecorder = new MediaRecorder(stream);
        } else {
            mediaRecorder = new MediaRecorder(stream, options);
        }

        mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
            audioChunks = []; 
            
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
                const base64data = reader.result;
                await sendVoiceCommand(base64data);
            };
        };
    })
    .catch(err => {
        console.error("Erro ao acessar microfone:", err);
        statusText.innerText = "Erro de Permissão do Microfone";
        statusText.style.color = "var(--recording)";
    });

micBtn.addEventListener('mousedown', startRecording);
micBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startRecording(); });

micBtn.addEventListener('mouseup', stopRecording);
micBtn.addEventListener('mouseleave', stopRecording);
micBtn.addEventListener('touchend', (e) => { e.preventDefault(); stopRecording(); });
micBtn.addEventListener('touchcancel', (e) => { e.preventDefault(); stopRecording(); });

function startRecording() {
    if (isRecording || !mediaRecorder) return;
    isRecording = true;
    audioChunks = [];
    mediaRecorder.start();
    
    micBtn.classList.add('recording');
    statusText.innerText = "Ouvindo...";
    statusText.classList.remove('processing');
    responseText.innerText = "";
}

function stopRecording() {
    if (!isRecording || !mediaRecorder) return;
    isRecording = false;
    mediaRecorder.stop();
    
    micBtn.classList.remove('recording');
    statusText.innerText = "Processando...";
    statusText.classList.add('processing');
}

async function sendVoiceCommand(base64Data) {
    try {
        const res = await fetch('/api/voice-command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioBase64: base64Data })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || `Erro HTTP: ${res.status}`);
        }
        
        statusText.innerText = "Pronto";
        statusText.classList.remove('processing');
        
        if (data.intent && data.intent.speech) {
            responseText.innerText = data.intent.speech;
        }

        if (data.audioBase64) {
            const audioSrc = `data:audio/mp3;base64,${data.audioBase64}`;
            const audio = new Audio(audioSrc);
            audio.play();
        }

    } catch (err) {
        console.error("Erro na comunicação:", err);
        statusText.innerText = "Falha";
        statusText.classList.remove('processing');
        responseText.innerText = err.message;
    }
}
