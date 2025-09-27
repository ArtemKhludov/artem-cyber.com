-- Добавляем поля для Telegram интеграции в таблицу users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(255),
ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS notify_email_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_telegram_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notify_policy JSONB DEFAULT '{}';

-- Добавляем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_users_telegram_chat_id ON users(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_users_telegram_username ON users(telegram_username);

-- Добавляем поля для отслеживания доставки уведомлений в issue_replies
ALTER TABLE issue_replies 
ADD COLUMN IF NOT EXISTS delivery_status JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS read_by TEXT[] DEFAULT '{}';

-- Создаем таблицу для токенов связывания Telegram
CREATE TABLE IF NOT EXISTS telegram_link_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для telegram_link_tokens
CREATE INDEX IF NOT EXISTS idx_telegram_link_tokens_user_id ON telegram_link_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_link_tokens_token ON telegram_link_tokens(token);
CREATE INDEX IF NOT EXISTS idx_telegram_link_tokens_expires_at ON telegram_link_tokens(expires_at);

-- Создаем таблицу для аудита контактов пользователей
CREATE TABLE IF NOT EXISTS user_contact_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'telegram_linked', 'telegram_unlinked', 'email_changed', 'phone_changed'
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индекс для user_contact_audit
CREATE INDEX IF NOT EXISTS idx_user_contact_audit_user_id ON user_contact_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_user_contact_audit_created_at ON user_contact_audit(created_at);

-- Обновляем существующие записи, устанавливая значения по умолчанию
UPDATE users 
SET 
    notify_email_enabled = true,
    notify_telegram_enabled = false,
    notify_policy = '{}'
WHERE 
    notify_email_enabled IS NULL 
    OR notify_telegram_enabled IS NULL 
    OR notify_policy IS NULL;
