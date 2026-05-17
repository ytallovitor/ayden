import Groq from 'groq-sdk';

export function createGroqClient(apiKey) {
  if (!apiKey) {
    throw new Error('A chave de API da Groq (GROQ_API_KEY) não foi fornecida.');
  }

  return new Groq({
    apiKey: apiKey
  });
}
