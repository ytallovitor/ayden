const orb = document.getElementById('orb');
const statusText = document.getElementById('statusText');
const responseText = document.getElementById('responseText');

// Supabase Init
const supabaseUrl = "https://rcbyigozsiinfnlmefcd.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjYnlpZ296c2lpbmZubG1lZmNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NzM1NDYsImV4cCI6MjA5NDQ0OTU0Nn0.dRtqb0kzLxgUiPiADWT1ZTAlldB1lFsDtWxqmxM8Mcw";
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
let authToken = null;

// Auth Modal
const loginModal = document.getElementById('loginModal');
const loginBtn = document.getElementById('loginBtn');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginFeedback = document.getElementById('loginFeedback');

async function checkSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        authToken = session.access_token;
        loginModal.classList.remove('show');
    } else {
        loginModal.classList.add('show');
    }
}
checkSession();

loginBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const originalText = loginBtn.innerText;
    loginBtn.innerText = "Entrando...";
    loginFeedback.innerText = "";
    
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: loginEmail.value,
            password: loginPassword.value,
        });
        
        if (error) {
            loginFeedback.innerText = "Erro: " + error.message;
            loginFeedback.style.color = "#ef4444";
            alert("Falha no login: " + error.message);
        } else {
            authToken = data.session.access_token;
            loginModal.classList.remove('show');
            loginFeedback.innerText = "Sucesso!";
            loginFeedback.style.color = "#4ade80";
            setTimeout(startIfReady, 500); // Iniciar voz logo após o login
        }
    } catch (err) {
        loginFeedback.innerText = "Erro inesperado: " + err.message;
        loginFeedback.style.color = "#ef4444";
        alert("Erro inesperado: " + err.message);
    } finally {
        loginBtn.innerText = originalText;
    }
});

// Modal Elements
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const groqKeyInput = document.getElementById('groqKey');
const geminiKeyInput = document.getElementById('geminiKey');
const elevenlabsKeyInput = document.getElementById('elevenlabsKey');
const settingsFeedback = document.getElementById('settingsFeedback');

// Configurações e UI
settingsBtn.addEventListener('click', async () => {
    settingsModal.classList.add('show');
    settingsFeedback.innerText = '';
    try {
        const res = await fetch('/api/settings', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (res.ok) {
            const data = await res.json();
            if (data) {
                groqKeyInput.value = data.groq_key || '';
                geminiKeyInput.value = data.gemini_key || '';
                elevenlabsKeyInput.value = data.elevenlabs_key || '';
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
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                groq_key: groqKeyInput.value,
                gemini_key: geminiKeyInput.value,
                elevenlabs_key: elevenlabsKeyInput.value
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

let currentAudio = null;
let audioContext = null;
let analyser = null;
let microphone = null;
let mediaRecorder = null;
let audioChunks = [];
let isCallActive = false;
let isRecording = false;
let silenceTimeout = null;
let animationFrameId = null;

const VOLUME_THRESHOLD = 0.05; 
const SILENCE_DURATION = 1500; 

function setOrbState(state) {
    orb.className = 'energy-orb ' + state;
    if (state === 'idle') statusText.innerText = "Toque no orbe para iniciar chamada";
    if (state === 'listening') statusText.innerText = "Ouvindo...";
    if (state === 'thinking') statusText.innerText = "Processando...";
    if (state === 'speaking') statusText.innerText = "Ayden falando...";
}

async function initCallMode() {
    if (isCallActive) return;
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.2;
        
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        
        mediaRecorder.ondataavailable = e => {
            if (e.data.size > 0) audioChunks.push(e.data);
        };
        
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            audioChunks = [];
            
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
                const base64data = reader.result;
                setOrbState('thinking');
                responseText.innerText = "Processando sua voz...";
                await sendVoiceCommand(base64data);
            };
        };
        
        isCallActive = true;
        setOrbState('idle'); 
        listenLoop();
        
    } catch (err) {
        console.error("Erro ao acessar microfone:", err);
        statusText.innerText = "Erro ao acessar microfone. Verifique as permissões.";
        statusText.style.color = "#ef4444";
    }
}

function stopCallMode() {
    isCallActive = false;
    isRecording = false;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
    if (silenceTimeout) {
        clearTimeout(silenceTimeout);
        silenceTimeout = null;
    }
    setOrbState('idle');
}

function listenLoop() {
    if (!isCallActive) return;
    animationFrameId = requestAnimationFrame(listenLoop);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        const val = dataArray[i] / 255;
        sum += val * val;
    }
    const rms = Math.sqrt(sum / dataArray.length);

    const isAudioPlaying = currentAudio && !currentAudio.paused;

    if (isAudioPlaying) {
        // Barge-in check (higher threshold to avoid self-triggering)
        if (rms > VOLUME_THRESHOLD + 0.05) {
            console.log("Barge-in detectado!");
            currentAudio.pause();
            currentAudio.currentTime = 0;
        }
        return; 
    }

    if (rms > VOLUME_THRESHOLD) {
        if (silenceTimeout) {
            clearTimeout(silenceTimeout);
            silenceTimeout = null;
        }
        if (!isRecording) {
            isRecording = true;
            audioChunks = [];
            if (mediaRecorder && mediaRecorder.state === 'inactive') {
                mediaRecorder.start();
                console.log("Iniciou gravação (voz detectada).");
                setOrbState('listening');
            }
        }
    } else {
        if (isRecording && !silenceTimeout) {
            silenceTimeout = setTimeout(() => {
                console.log("Silêncio detectado. Parando gravação.");
                isRecording = false;
                silenceTimeout = null;
                if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                    mediaRecorder.stop();
                }
            }, SILENCE_DURATION);
        }
    }
}

orb.addEventListener('click', async () => {
    if (!authToken) return;
    
    if (isCallActive) {
        stopCallMode();
    } else {
        await initCallMode();
    }
});

// Inicializa a escuta quando logado
const originalCheckSession = checkSession;
checkSession = async () => {
    await originalCheckSession();
    if (authToken) {
        setOrbState('idle');
    }
};
checkSession();

function startIfReady() {
    if (authToken) {
        setOrbState('idle');
    }
}

async function sendVoiceCommand(audioBase64) {
    try {
        const res = await fetch('/api/voice-command', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ audioBase64: audioBase64 })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || `Erro HTTP: ${res.status}`);
        }
        
        if (data.intent && data.intent.speech) {
            responseText.innerText = data.intent.speech;
            
            if (data.audioBase64) {
                playAudioFromBase64(data.audioBase64);
            } else {
                setOrbState('idle');
            }
        } else {
            setOrbState('idle');
        }

    } catch (err) {
        console.error("Erro na comunicação:", err);
        setOrbState('idle');
        responseText.innerText = "Erro: " + err.message;
    }
}

function playAudioFromBase64(base64) {
    if (currentAudio) {
        currentAudio.pause();
    }
    
    const audioSrc = `data:audio/mp3;base64,${base64}`;
    currentAudio = new Audio(audioSrc);
    
    currentAudio.onplay = () => {
        setOrbState('speaking');
    };
    
    currentAudio.onended = () => {
        setOrbState('idle');
    };
    
    currentAudio.play().catch(e => {
        console.error("Erro ao tocar áudio:", e);
        setOrbState('idle');
    });
}

