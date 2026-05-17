import handler from '../api/voice-command.js';
import { groq } from '../src/utils/groqClient.js';
import { geminiModel } from '../src/utils/geminiClient.js';
import { ttsService } from '../src/utils/ttsClient.js';
import { haService } from '../src/utils/haClient.js';

console.log("Iniciando autoteste COMPLETO (Fase 4) da rota /api/voice-command...\n");

// Mocks
const originalGroqCreate = groq.audio.transcriptions.create;
groq.audio.transcriptions.create = async () => {
    return { text: "Ayden, ligue o meu ar-condicionado LG Inverter" };
};

const originalGeminiGenerate = geminiModel.generateContent;
geminiModel.generateContent = async () => {
    return {
        response: {
            text: () => JSON.stringify({
                type: "command",
                action: "turn_on",
                device: "climate.lg_inverter",
                speech: "Comando recebido, LG Inverter ligado."
            })
        }
    };
};

const originalHaClient = haService.sendHomeAssistantCommand;
haService.sendHomeAssistantCommand = async (action, device) => {
    // Retorna sucesso imeditamente
    return { success: true };
};

const originalTtsClient = ttsService.generateTTSBase64;
ttsService.generateTTSBase64 = async (text) => {
    return "DUMMY_AUDIO_BASE64";
};

const dummyBase64 = Buffer.from("dummy").toString('base64');
const req = { method: 'POST', body: { audioBase64: dummyBase64 } };
const res = {
    status: (code) => res,
    json: (data) => {
        console.log(`\n[Resposta HTTP 200 com Base64]`);
        console.log(JSON.stringify(data, null, 2));
    }
};

(async () => {
    try {
        await handler(req, res);
    } catch (err) {
        console.error("Erro fatal no teste:", err);
    } finally {
        // Restore mocks
        groq.audio.transcriptions.create = originalGroqCreate;
        geminiModel.generateContent = originalGeminiGenerate;
        haService.sendHomeAssistantCommand = originalHaClient;
        ttsService.generateTTSBase64 = originalTtsClient;
    }
})();
