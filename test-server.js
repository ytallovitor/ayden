import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import keepAliveHandler from './api/keep-alive.js';
import voiceCommandHandler from './api/voice-command.js';
import settingsHandler from './api/settings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = http.createServer((req, res) => {
  res.status = (statusCode) => {
    res.statusCode = statusCode;
    return res;
  };
  res.json = (data) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  };

  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
        req.body = body;
        await routeRequest(req, res);
    });
  } else {
    routeRequest(req, res);
  }
});

async function routeRequest(req, res) {
  const url = req.url.split('?')[0];

  if (url === '/api/keep-alive' || url === '/api/keep-alive/') {
    try { await keepAliveHandler(req, res); } catch(e) { res.status(500).json({error: e.message}) }
    return;
  }
  
  if (url === '/api/voice-command' || url === '/api/voice-command/') {
    try { await voiceCommandHandler(req, res); } catch(e) { res.status(500).json({error: e.message}) }
    return;
  }

  if (url === '/api/settings' || url === '/api/settings/') {
    try { await settingsHandler(req, res); } catch(e) { res.status(500).json({error: e.message}) }
    return;
  }

  // Roteamento de arquivos estáticos
  try {
    let filePath = path.join(__dirname, 'public', url === '/' ? 'index.html' : url);
    const content = await fs.readFile(filePath);
    
    const ext = path.extname(filePath);
    const mimeTypes = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.ico': 'image/x-icon'
    };
    
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.statusCode = 200;
    res.end(content);
  } catch (err) {
    if (err.code === 'ENOENT') {
        res.status(404).json({ error: 'Not found' });
    } else {
        res.status(500).json({ error: 'Server error' });
    }
  }
}

server.listen(1717, () => {
  console.log('Servidor de teste completo rodando em http://localhost:1717');
  console.log('Acesse no navegador para testar a interface do Ayden!');
});
