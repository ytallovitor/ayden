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

function setOrbState(state) {
    orb.className = 'energy-orb ' + state;
    if (state === 'listening') statusText.innerText = "Ouvindo...";
    if (state === 'thinking') statusText.innerText = "Processando...";
    if (state === 'speaking') statusText.innerText = "Ayden falando...";
}

// Voice Recognition & Synthesis Setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

if (!SpeechRecognition) {
    statusText.innerText = "Reconhecimento de voz não suportado neste navegador.";
    statusText.style.color = "#ef4444";
} else {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'pt-BR';

    let isProcessing = false;

    recognition.onresult = async (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript.trim();
        if (!transcript) return;

        // Lógica de Interrupção Real
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            console.log("Ayden interrompido pelo usuário!");
        }

        if (isProcessing) return; // Aguarda terminar processamento anterior
        
        isProcessing = true;
        setOrbState('thinking');
        responseText.innerText = `Você: "${transcript}"`;
        
        await sendTextCommand(transcript);
        
        isProcessing = false;
        if (!window.speechSynthesis.speaking) {
            setOrbState('listening');
        }
    };

    recognition.onend = () => {
        // Loop de reinicialização para garantir escuta contínua
        if (authToken) {
            try { recognition.start(); } catch(e) {}
        }
    };
    
    recognition.onerror = (e) => {
        console.warn("Erro no mic:", e.error);
        if (e.error === 'not-allowed') {
            statusText.innerText = "Microfone bloqueado. Permita o acesso.";
        }
    };
}

// Inicializa a escuta quando logado
const originalCheckSession = checkSession;
checkSession = async () => {
    await originalCheckSession();
    startIfReady();
};
checkSession();



function startIfReady() {
    if (authToken && recognition) {
        try { 
            recognition.start(); 
            setOrbState('listening');
        } catch(e) {}
    }
}

async function sendTextCommand(text) {
    try {
        const res = await fetch('/api/voice-command', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ textCommand: text })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || `Erro HTTP: ${res.status}`);
        }
        
        if (data.intent && data.intent.speech) {
            responseText.innerText = data.intent.speech;
            speak(data.intent.speech);
        }

    } catch (err) {
        console.error("Erro na comunicação:", err);
        setOrbState('listening');
        responseText.innerText = "Erro: " + err.message;
    }
}

function speak(text) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.onstart = () => setOrbState('speaking');
    utterance.onend = () => setOrbState('listening');

    const setBestVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        const ptVoices = voices.filter(v => v.lang.includes('pt-BR') || v.lang.includes('pt_BR'));
        
        // Caça à Voz Natural
        let bestVoice = ptVoices.find(v => v.name.includes('Google português do Brasil') || 
                                          v.name.includes('Microsoft Antonio') || 
                                          v.name.includes('Microsoft Francisca'));
        
        if (!bestVoice) {
            bestVoice = ptVoices.find(v => v.localService === false); // Premium / Cloud
        }
        
        if (!bestVoice) {
            bestVoice = ptVoices[0]; // Fallback
        }
        
        if (bestVoice) {
            utterance.voice = bestVoice;
            console.log("Voz escolhida:", bestVoice.name);
        }
        
        window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length > 0) {
        setBestVoice();
    } else {
        window.speechSynthesis.onvoiceschanged = setBestVoice;
    }
}

