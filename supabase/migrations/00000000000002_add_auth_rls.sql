TRUNCATE TABLE ayden_settings;
TRUNCATE TABLE context_logs;

ALTER TABLE ayden_settings DROP CONSTRAINT IF EXISTS ayden_settings_single_row;
ALTER TABLE ayden_settings DROP CONSTRAINT IF EXISTS ayden_settings_pkey CASCADE;
ALTER TABLE ayden_settings DROP COLUMN IF EXISTS id;
ALTER TABLE ayden_settings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ayden_settings ADD PRIMARY KEY (user_id);

ALTER TABLE context_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ayden_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own settings" ON ayden_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON ayden_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON ayden_settings;
CREATE POLICY "Users can view own settings" ON ayden_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON ayden_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON ayden_settings FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own logs" ON context_logs;
DROP POLICY IF EXISTS "Users can insert own logs" ON context_logs;
CREATE POLICY "Users can view own logs" ON context_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own logs" ON context_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
