-- Создание системы ролей пользователей
-- Этот скрипт нужно выполнить в SQL редакторе Supabase

-- Создаем таблицу профилей пользователей с ролями
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Включаем RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи могут видеть только свой профиль
CREATE POLICY "Users can view own profile" 
ON user_profiles 
FOR SELECT 
TO authenticated 
USING (email = auth.email());

-- Политика: service role может делать все
CREATE POLICY "Service role full access" 
ON user_profiles 
FOR ALL 
TO service_role 
USING (true);

-- Функция для автоматического создания профиля при регистрации
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (email, role)
    VALUES (NEW.email, 'customer')
    ON CONFLICT (email) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для автоматического создания профиля
-- (Этот триггер будет срабатывать при создании пользователя в auth.users)
-- Но поскольку мы используем Supabase Auth, создадим профили вручную

-- Создаем профили для существующих пользователей
INSERT INTO user_profiles (email, role) VALUES 
    ('admin@energylogic.ru', 'admin'),
    ('admin@energylogic.com', 'admin'),
    ('user@test.com', 'customer')
ON CONFLICT (email) DO UPDATE SET 
    role = EXCLUDED.role,
    updated_at = NOW();

-- Функция для проверки роли пользователя
CREATE OR REPLACE FUNCTION is_admin(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE email = user_email 
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для получения роли пользователя
CREATE OR REPLACE FUNCTION get_user_role(user_email TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT role FROM user_profiles 
        WHERE email = user_email
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Обновляем updated_at при изменении
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Проверяем созданные профили
SELECT email, role, created_at FROM user_profiles ORDER BY role, email;
