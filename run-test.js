import handler from './api/keep-alive.js';

// Mock global fetch para falhar instantaneamente ao invés de tentar o localhost:54321
const originalFetch = global.fetch;
global.fetch = async (...args) => {
    if (args[0].includes('54321')) {
        throw new Error('fetch failed immediately for test (Supabase Local is offline)');
    }
    return originalFetch(...args);
};

console.log("Executando teste local da rota /api/keep-alive...\n");

const req = { method: 'GET' };
const res = {
    status: (code) => {
        console.log(`[Response Status]: ${code}`);
        return res;
    },
    json: (data) => {
        console.log(`[Response JSON]:`);
        console.log(JSON.stringify(data, null, 2));
    }
};

await handler(req, res);
