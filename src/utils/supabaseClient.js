import { createClient } from '@supabase/supabase-js';

// Assistente Virtual Ayden - Conexão com o Banco de Dados Supabase (Projeto: Ayden)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Variáveis de ambiente SUPABASE_URL ou SUPABASE_ANON_KEY ausentes.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
