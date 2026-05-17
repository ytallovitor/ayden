import { createClient } from '@supabase/supabase-js';
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

    console.log("[CHECKPOINT 1] Token Validado e Usuário Identificado:", user.id);

    // Cria um client com o token do usuário para passar pelo RLS
    const userSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    let body;
    if (typeof req.body === 'string') {
      try { body = JSON.parse(req.body); } catch (e) { return res.status(400).json({ error: 'Body deve ser JSON válido' }); }
    } else {
      body = req.body || {};
    }

    const { audioBase64, audioName = 'audio.webm' } = body;
    if (!audioBase64) return res.status(400).json({ error: 'Campo audioBase64 ausente' });

    console.log("[CHECKPOINT 2] Tamanho original do Base64 recebido:", audioBase64.length);

    // Buscar chaves do Supabase
    console.log("[Settings] Puxando chaves ativas do banco...");
    const { data: settings, error: dbError } = await userSupabase
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

    const pureBase64 = audioBase64.includes('base64,') ? audioBase64.split('base64,')[1] : audioBase64;
    const audioBuffer = Buffer.from(pureBase64, 'base64');
    
    console.log("[CHECKPOINT 3] Buffer criado. Tamanho em bytes:", audioBuffer.length);
    if (audioBuffer.length < 100) {
      return res.status(400).json({ error: "Áudio muito curto ou vazio." });
    }

    const file = await toFile(audioBuffer, 'audio.webm', { type: 'audio/webm' });
    console.log("[CHECKPOINT 4] Arquivo 'toFile' da Groq montado com sucesso.");

    console.log("[STT] Transcrevendo áudio...");
    const transcriptionResponse = await groq.audio.transcriptions.create({
      file,
      model: 'whisper-large-v3',
      prompt: 'Responda sempre em português brasileiro.',
      response_format: 'json',
      language: 'pt',
    });

    console.log("[CHECKPOINT 5] Retorno da transcrição recebido da Groq.");
    const transcriptionText = transcriptionResponse.text;
    
    console.log("[LLM] Analisando intenção...");
    let llmText;
    try {
      const geminiResult = await geminiModel.generateContent(transcriptionText);
      llmText = geminiResult.response.text();
      console.log("[LLM] Resposta gerada com sucesso via Gemini.");
    } catch (geminiError) {
      console.error("[GEMINI ERROR] Falhou. Ativando fallback Groq Llama 3:", geminiError.message);
      
      const systemInstruction = `Você se chama Ayden, um assistente virtual de inteligência e automação residencial.
Você recebe textos do usuário e deve classificá-los em dois tipos: 'command' (para controlar luzes, ar-condicionado, TVs, etc.) ou 'chat' (para conversas e perguntas).
Formato de Saída Obrigatório (JSON válido): {"type": "command" ou "chat", "action": "comando_interno_do_hardware" (apenas se for command), "device": "entidade_do_hardware" (apenas se for command), "speech": "Frase curta e natural que você falará de volta ao usuário"}.`;

      const groqChatResult = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: transcriptionText }
        ],
        model: 'llama-3.3-70b-versatile',
        response_format: { type: "json_object" }
      });
      
      llmText = groqChatResult.choices[0].message.content;
      console.log("[LLM] Resposta gerada com sucesso via Groq (Llama 3 Fallback).");
    }
    
    let parsedIntent;
    try {
        parsedIntent = JSON.parse(llmText);
    } catch (e) {
        throw new Error('Falha ao processar a resposta do LLM (Não é um JSON válido).');
    }

    if (parsedIntent.type === 'command') {
      console.log(`[HA Webhook Disparando] Action: ${parsedIntent.action}, Device: ${parsedIntent.device}`);
      try {
        const haResult = await haService.sendHomeAssistantCommand(parsedIntent.action, parsedIntent.device);
        if (!haResult.success) {
          console.warn("[HA Webhook] Retornou falha, mas a voz continuará.");
        } else {
          console.log("[HA Webhook Disparado] Sucesso.");
        }
      } catch (haError) {
        console.error("[HA Webhook] Falhou catastroficamente (provavelmente localhost na Vercel):", haError.message);
      }
    }

    // Inserir log no banco de dados
    try {
      await userSupabase.from('context_logs').insert({
        user_id: user.id,
        text_command: transcriptionText,
        response: parsedIntent.speech
      });
      console.log("[DB] Log de contexto salvo com sucesso.");
    } catch (dbLogErr) {
      console.error("[DB] Falha ao salvar log de contexto:", dbLogErr.message);
    }

    console.log("[TTS Gerado] Criando áudio sintetizado...");
    const voiceBase64 = await ttsService.generateTTSBase64(parsedIntent.speech);

    console.log("[Resposta HTTP 200 com Base64] Retornando.");
    return res.status(200).json({
      intent: parsedIntent,
      audioBase64: voiceBase64
    });

  } catch (error) {
    console.error("[CRITICAL CRASH]:", error.message, error.stack);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: error.message || error.details || JSON.stringify(error)
    });
  }
}
