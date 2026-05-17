import { createGroqClient } from '../src/utils/groqClient.js';
import { createGeminiClient } from '../src/utils/geminiClient.js';
import { ttsService } from '../src/utils/ttsClient.js';
import { haService } from '../src/utils/haClient.js';
import { supabase } from '../src/utils/supabaseClient.js';
import { toFile } from 'groq-sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    let body;
    if (typeof req.body === 'string') {
      try { body = JSON.parse(req.body); } catch (e) { return res.status(400).json({ error: 'Body deve ser JSON válido' }); }
    } else {
      body = req.body || {};
    }

    const { audioBase64, audioName = 'audio.webm' } = body;
    if (!audioBase64) return res.status(400).json({ error: 'Campo audioBase64 ausente' });

    // Buscar chaves do Supabase
    console.log("[Settings] Puxando chaves ativas do banco...");
    const { data: settings, error: dbError } = await supabase
      .from('ayden_settings')
      .select('groq_key, gemini_key')
      .eq('user_id', user.id)
      .single();

    if (dbError && dbError.code !== 'PGRST116') {
      console.error('Erro de Banco:', dbError);
    }

    if (!settings || !settings.groq_key || !settings.gemini_key) {
      return res.status(400).json({ error: 'Chaves de API não configuradas. Acesse o painel de configurações.' });
    }

    // Inicialização Dinâmica
    const groq = createGroqClient(settings.groq_key);
    const geminiModel = createGeminiClient(settings.gemini_key);

    const base64Data = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;
    const audioBuffer = Buffer.from(base64Data, 'base64');
    const file = await toFile(audioBuffer, audioName);

    console.log("[STT] Transcrevendo áudio...");
    const transcriptionResponse = await groq.audio.transcriptions.create({
      file,
      model: 'whisper-large-v3',
      prompt: 'Responda sempre em português brasileiro.',
      response_format: 'json',
      language: 'pt',
    });

    const transcriptionText = transcriptionResponse.text;
    
    console.log("[LLM] Analisando intenção...");
    const geminiResult = await geminiModel.generateContent(transcriptionText);
    const geminiText = geminiResult.response.text();
    
    let parsedIntent;
    try {
        parsedIntent = JSON.parse(geminiText);
    } catch (e) {
        throw new Error('Gemini falhou ao retornar JSON.');
    }

    if (parsedIntent.type === 'command') {
      console.log(`[HA Webhook Disparando] Action: ${parsedIntent.action}, Device: ${parsedIntent.device}`);
      const haResult = await haService.sendHomeAssistantCommand(parsedIntent.action, parsedIntent.device);
      if (!haResult.success) {
        parsedIntent.speech = "Eu não consegui me comunicar com o controle central no momento.";
      } else {
        console.log("[HA Webhook Disparado] Sucesso.");
      }
    }

    console.log("[TTS Gerado] Criando áudio sintetizado...");
    const voiceBase64 = await ttsService.generateTTSBase64(parsedIntent.speech);

    console.log("[Resposta HTTP 200 com Base64] Retornando.");
    return res.status(200).json({
      intent: parsedIntent,
      audioBase64: voiceBase64
    });

  } catch (error) {
    console.error('Pipeline Error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: error.message
    });
  }
}
