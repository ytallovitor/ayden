import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: 'db.rcbyigozsiinfnlmefcd.supabase.co', // Resolved host for new project
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Ytallo@1211',
  ssl: { rejectUnauthorized: false }
});

async function initDB() {
  try {
    console.log("Conectando ao banco de dados Supabase (Ayden) via IPv6 Nativo...");
    await client.connect();

    const settingsSql = `
      CREATE TABLE IF NOT EXISTS ayden_settings (
        id integer PRIMARY KEY DEFAULT 1,
        groq_key text,
        gemini_key text,
        updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
        CONSTRAINT ayden_settings_single_row CHECK (id = 1)
      );

      INSERT INTO ayden_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
    `;

    const contextLogsSql = `
      CREATE TABLE IF NOT EXISTS context_logs (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        text_command text NOT NULL,
        response text,
        created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_context_logs_created_at ON context_logs(created_at);
    `;

    console.log("⏳ Executando DDL: ayden_settings...");
    await client.query(settingsSql);

    console.log("⏳ Executando DDL: context_logs...");
    await client.query(contextLogsSql);

    console.log("✅ Banco de dados Ayden inicializado com sucesso!");
  } catch (error) {
    console.error("❌ Falha na inicialização do banco:", error);
  } finally {
    await client.end();
  }
}

initDB();
