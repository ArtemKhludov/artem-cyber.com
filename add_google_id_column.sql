-- Добавляем колонку google_id в таблицу users
-- Это критически важно для Google OAuth

-- Проверяем, существует ли колонка
DO $$ 
BEGIN
    -- Добавляем колонку google_id если её нет
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'google_id'
    ) THEN
        ALTER TABLE users ADD COLUMN google_id TEXT;
        RAISE NOTICE 'Колонка google_id добавлена в таблицу users';
    ELSE
        RAISE NOTICE 'Колонка google_id уже существует в таблице users';
    END IF;
    
    -- Добавляем колонку avatar_url если её нет
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE users ADD COLUMN avatar_url TEXT;
        RAISE NOTICE 'Колонка avatar_url добавлена в таблицу users';
    ELSE
        RAISE NOTICE 'Колонка avatar_url уже существует в таблице users';
    END IF;
    
    -- Добавляем колонку email_verified если её нет
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'email_verified'
    ) THEN
        ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Колонка email_verified добавлена в таблицу users';
    ELSE
        RAISE NOTICE 'Колонка email_verified уже существует в таблице users';
    END IF;
    
    -- Добавляем колонку temp_password если её нет
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'temp_password'
    ) THEN
        ALTER TABLE users ADD COLUMN temp_password TEXT;
        RAISE NOTICE 'Колонка temp_password добавлена в таблицу users';
    ELSE
        RAISE NOTICE 'Колонка temp_password уже существует в таблице users';
    END IF;
    
    -- Добавляем колонку telegram_username если её нет
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'telegram_username'
    ) THEN
        ALTER TABLE users ADD COLUMN telegram_username TEXT;
        RAISE NOTICE 'Колонка telegram_username добавлена в таблицу users';
    ELSE
        RAISE NOTICE 'Колонка telegram_username уже существует в таблице users';
    END IF;
    
    -- Добавляем колонку telegram_chat_id если её нет
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'telegram_chat_id'
    ) THEN
        ALTER TABLE users ADD COLUMN telegram_chat_id TEXT;
        RAISE NOTICE 'Колонка telegram_chat_id добавлена в таблицу users';
    ELSE
        RAISE NOTICE 'Колонка telegram_chat_id уже существует в таблице users';
    END IF;
    
    -- Добавляем колонку auto_created_user если её нет
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'auto_created_user'
    ) THEN
        ALTER TABLE users ADD COLUMN auto_created_user BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Колонка auto_created_user добавлена в таблицу users';
    ELSE
        RAISE NOTICE 'Колонка auto_created_user уже существует в таблице users';
    END IF;
    
    -- Добавляем колонку user_credentials_sent если её нет
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'user_credentials_sent'
    ) THEN
        ALTER TABLE users ADD COLUMN user_credentials_sent BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Колонка user_credentials_sent добавлена в таблицу users';
    ELSE
        RAISE NOTICE 'Колонка user_credentials_sent уже существует в таблице users';
    END IF;
    
END $$;

-- Создаем индекс для google_id для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Создаем уникальный индекс для google_id (один Google ID = один пользователь)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id_unique ON users(google_id) WHERE google_id IS NOT NULL;

-- Проверяем структуру таблицы
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
