import { supabase } from '../src/utils/supabaseClient.js';

export default async function handler(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method === 'GET') {
      const { data, error } = await supabase
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

      const { groq_key, gemini_key } = body;
      
      const { data, error } = await supabase
        .from('ayden_settings')
        .upsert({ user_id: user.id, groq_key, gemini_key, updated_at: new Date().toISOString() })
        .select()
        .single();
        
      if (error) throw error;
      
      return res.status(200).json({ success: true, settings: data });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error('Settings API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
