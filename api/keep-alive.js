import { supabase } from '../src/utils/supabaseClient.js';

export default async function handler(req, res) {
  // Projeto Alvo: Ayden
  // Rota chamada a cada 12h por um cron job externo para evitar cold starts da Vercel
  // e evitar hibernação (7 dias) do Free Tier do Supabase.
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Requisição ultraleve para gerar tráfego mínimo no banco
    const { data, error } = await supabase
      .from('context_logs')
      .select('id')
      .limit(1);

    if (error) {
      // Se a tabela ainda não existir
      console.warn('Supabase Query falhou (Tabela possivelmente inexistente):', error.message);
      
      return res.status(200).json({ 
        status: 'alive', 
        note: 'Database connected, awaiting table creation' 
      });
    }

    return res.status(200).json({ status: 'alive' });

  } catch (err) {
    console.error('Keep-alive Error:', err);
    // Em caso de falha grave na execução, retornamos 200 para não quebrar cron jobs
    return res.status(200).json({ 
        status: 'alive', 
        note: 'Service alive but encountered an error during database check',
        details: err.message
    });
  }
}
