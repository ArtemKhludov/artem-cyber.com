-- Исправление таблицы users для поддержки аутентификации и callback системы
-- Добавляем недостающие поля в таблицу users

-- Добавляем поля для аутентификации
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
ADD COLUMN IF NOT EXISTS temp_password TEXT,
ADD COLUMN IF NOT EXISTS created_from_callback BOOLEAN DEFAULT false;

-- Добавляем поля для Telegram интеграции
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(255),
ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS notify_email_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_telegram_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notify_policy JSONB DEFAULT '{}';

-- Добавляем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_telegram_chat_id ON users(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_users_telegram_username ON users(telegram_username);
CREATE INDEX IF NOT EXISTS idx_users_created_from_callback ON users(created_from_callback);

-- Обновляем существующие записи, устанавливая значения по умолчанию
UPDATE users 
SET 
    email_verified = false,
    role = 'user',
    created_from_callback = false,
    notify_email_enabled = true,
    notify_telegram_enabled = false,
    notify_policy = '{}'
WHERE 
    email_verified IS NULL 
    OR role IS NULL 
    OR created_from_callback IS NULL
    OR notify_email_enabled IS NULL 
    OR notify_telegram_enabled IS NULL 
    OR notify_policy IS NULL;
