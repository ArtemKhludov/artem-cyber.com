-- Полное исправление RLS политик для user_sessions
-- Этот скрипт исправляет все проблемы с доступом к таблице user_sessions

-- 1. Удаляем все существующие политики
DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Admins can view all sessions" ON user_sessions;
DROP POLICY IF EXISTS "Admins can delete all sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can manage own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Service role can manage all sessions" ON user_sessions;

-- 2. Создаем новые политики с правильной логикой

-- Политика для service role - полный доступ
CREATE POLICY "Service role can manage all sessions" ON user_sessions
    FOR ALL
    TO public
    USING (auth.role() = 'service_role');

-- Политика для пользователей - просмотр своих сессий
CREATE POLICY "Users can view own sessions" ON user_sessions
    FOR SELECT
    TO public
    USING (user_id = auth.uid());

-- Политика для пользователей - удаление своих сессий
CREATE POLICY "Users can delete own sessions" ON user_sessions
    FOR DELETE
    TO public
    USING (user_id = auth.uid());

-- Политика для админов - просмотр всех сессий
CREATE POLICY "Admins can view all sessions" ON user_sessions
    FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Политика для админов - удаление всех сессий
CREATE POLICY "Admins can delete all sessions" ON user_sessions
    FOR DELETE
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- 3. Убеждаемся, что RLS включен
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- 4. Проверяем, что политики созданы
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'user_sessions';

-- 5. Проверяем, что RLS включен
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_sessions';
