CREATE TABLE IF NOT EXISTS ayden_settings (
  id integer PRIMARY KEY DEFAULT 1,
  groq_key text,
  gemini_key text,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  -- Restringir para ter apenas uma linha de configuração global
  CONSTRAINT ayden_settings_single_row CHECK (id = 1)
);

-- Inserir a linha inicial vazia caso não exista
INSERT INTO ayden_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
