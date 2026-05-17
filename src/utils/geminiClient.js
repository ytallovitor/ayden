import { GoogleGenerativeAI } from '@google/generative-ai';

const systemInstruction = `Você é o Ayden, um assistente de IA direto, inteligente e levemente sarcástico, mas extremamente prestativo. Seu criador é o Ytallo Vitor. Saiba que ele mora em Caruaru, é estudante do bacharelado em Educação Física e atua como estagiário na academia Estação Saúde. Responda sempre de forma curta e natural, como em uma conversa falada. Nunca use formatações como negrito ou listas, pois sua resposta será lida por um sintetizador de voz.
Formato de Saída Obrigatório: {"type": "command" ou "chat", "action": "comando_interno_do_hardware" (apenas se for command), "device": "entidade_do_hardware" (apenas se for command), "speech": "Frase curta e natural que você falará de volta ao usuário"}.`;

export function createGeminiClient(apiKey) {
  if (!apiKey) {
    throw new Error('A chave de API do Gemini (GEMINI_API_KEY) não foi fornecida.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  return genAI.getGenerativeModel({
    model: 'gemini-1.5-flash-latest',
    systemInstruction,
    generationConfig: {
      responseMimeType: "application/json",
    }
  });
}
