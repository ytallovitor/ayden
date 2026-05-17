import { GoogleGenerativeAI } from '@google/generative-ai';

const systemInstruction = `Você se chama Ayden, um assistente virtual de inteligência e automação residencial.
Você recebe textos do usuário e deve classificá-los em dois tipos: 'command' (para controlar luzes, ar-condicionado, TVs, etc.) ou 'chat' (para conversas e perguntas).
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
