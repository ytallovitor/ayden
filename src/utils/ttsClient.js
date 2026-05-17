import { EdgeTTS } from 'node-edge-tts';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export const ttsService = {
  generateTTSBase64: async (text) => {
    try {
      const tts = new EdgeTTS({
        voice: 'pt-BR-AntonioNeural',
        lang: 'pt-BR',
        outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
      });
      
      // Restrição Serverless: gravando em /tmp
      const tmpFile = path.join(os.tmpdir(), `tts-${Date.now()}.mp3`);
      
      await tts.ttsPromise(text, tmpFile);
      
      // Converte para base64
      const audioBuffer = await fs.readFile(tmpFile);
      const audioBase64 = audioBuffer.toString('base64');
      
      // Cleanup de memória
      await fs.unlink(tmpFile).catch(console.error);
      
      return audioBase64;
    } catch (error) {
      console.error('Erro na geração de TTS (EdgeTTS):', error);
      throw error;
    }
  }
};
