import { createClient } from '@supabase/supabase-js';
import { supabase } from '../src/utils/supabaseClient.js';

export default async function handler(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    // Cria um client com o token do usuário para passar pelo RLS
    const userSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    if (req.method === 'GET') {
      const { data, error } = await userSupabase
        .from('ayden_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        throw error;
      }
      
      return res.status(200).json(data || {});
    } 
    
    if (req.method === 'POST') {
      let body;
      if (typeof req.body === 'string') {
        try { body = JSON.parse(req.body); } catch(e) { return res.status(400).json({error: 'Invalid JSON'}); }
      } else {
        body = req.body || {};
      }

      const { groq_key, gemini_key, elevenlabs_key } = body;

      if (!groq_key || !gemini_key) {
        return res.status(400).json({ error: "As chaves Groq e Gemini são obrigatórias." });
      }

      // Validar Chave Groq
      try {
        const groqCheck = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { 'Authorization': `Bearer ${groq_key}` }
        });
        if (!groqCheck.ok) {
          return res.status(400).json({ error: "A chave da Groq fornecida é inválida." });
        }
      } catch (e) {
        return res.status(400).json({ error: "Falha na comunicação ao validar chave da Groq." });
      }

      // Validar Chave Gemini
      try {
        const geminiCheck = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${gemini_key}`);
        if (!geminiCheck.ok) {
          return res.status(400).json({ error: "A chave do Gemini fornecida é inválida." });
        }
      } catch (e) {
        return res.status(400).json({ error: "Falha na comunicação ao validar chave do Gemini." });
      }
      
      // Salva todas as chaves, incluindo a nova elevenlabs_key
      const { data, error } = await userSupabase
        .from('ayden_settings')
        .upsert({ 
          user_id: user.id, 
          groq_key, 
          gemini_key, 
          elevenlabs_key, 
          updated_at: new Date().toISOString() 
        })
        .select()
        .single();
        
      if (error) throw error;
      
      return res.status(200).json({ success: true, settings: data });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error('Settings API Error Detail:', JSON.stringify(error, null, 2));
    return res.status(500).json({ 
      error: 'Internal Server Error', 
      details: error.message || error.details || JSON.stringify(error) 
    });
  }
}
