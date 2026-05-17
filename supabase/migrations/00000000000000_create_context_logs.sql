-- Migration para criar a tabela context_logs no banco Ayden
CREATE TABLE IF NOT EXISTS context_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  text_command text NOT NULL,
  response text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Adicionar índice para acelerar consultas baseadas em data
CREATE INDEX IF NOT EXISTS idx_context_logs_created_at ON context_logs(created_at);
