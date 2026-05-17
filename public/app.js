const micBtn = document.getElementById('micBtn');
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

loginBtn.addEventListener('click', async () => {
    loginBtn.innerText = "Entrando...";
    loginFeedback.innerText = "";
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: loginEmail.value,
        password: loginPassword.value,
    });
    
    if (error) {
        loginFeedback.innerText = "Erro: " + error.message;
        loginFeedback.style.color = "#ef4444";
    } else {
        authToken = data.session.access_token;
        loginModal.classList.remove('show');
    }
    loginBtn.innerText = "Entrar";
});

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
        const res = await fetch('/api/settings', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
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
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
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

let currentBackendAudio = null;

micBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (isRecording) {
        stopRecording();
    } else {
        window.speechSynthesis.cancel();
        if (currentBackendAudio) {
            currentBackendAudio.pause();
        }
        startRecording();
    }
});

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
    
    setTimeout(() => {
        mediaRecorder.stop();
        micBtn.classList.remove('recording');
        statusText.innerText = "Processando...";
        statusText.classList.add('processing');
    }, 300);
}

async function sendVoiceCommand(base64Data) {
    try {
        const res = await fetch('/api/voice-command', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
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
            
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(data.intent.speech);
            
            const setBestVoice = () => {
                const voices = window.speechSynthesis.getVoices();
                const ptBrVoices = voices.filter(v => v.lang.includes('pt-BR') || v.lang.includes('pt_BR'));
                const bestVoice = ptBrVoices.find(v => v.name.toLowerCase().includes('google')) || 
                                  ptBrVoices.find(v => v.name.toLowerCase().includes('premium')) ||
                                  ptBrVoices.find(v => v.name.toLowerCase().includes('luciana')) ||
                                  ptBrVoices[0];
                if (bestVoice) {
                    utterance.voice = bestVoice;
                }
                window.speechSynthesis.speak(utterance);
            };
            
            if (window.speechSynthesis.getVoices().length > 0) {
                setBestVoice();
            } else {
                window.speechSynthesis.onvoiceschanged = setBestVoice;
            }
        }

        // Mantém suporte para áudio gerado no backend, se enviado.
        if (data.audioBase64 && false) { // Removido do play automático para usar o nativo
            const audioSrc = `data:audio/mp3;base64,${data.audioBase64}`;
            currentBackendAudio = new Audio(audioSrc);
            currentBackendAudio.play();
        }

    } catch (err) {
        console.error("Erro na comunicação:", err);
        statusText.innerText = "Falha";
        statusText.classList.remove('processing');
        responseText.innerText = err.message;
    }
}
