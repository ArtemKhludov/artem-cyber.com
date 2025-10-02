-- Исправление таблицы callback_requests для поддержки enhanced callback системы
-- Добавляем недостающие поля в таблицу callback_requests

-- Добавляем поля для интеграции с пользователями
ALTER TABLE callback_requests 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS issue_id UUID REFERENCES issue_reports(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS auto_created_user BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS user_credentials_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS contact_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS assigned_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Добавляем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_callback_requests_user_id ON callback_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_callback_requests_issue_id ON callback_requests(issue_id);
CREATE INDEX IF NOT EXISTS idx_callback_requests_priority ON callback_requests(priority);
CREATE INDEX IF NOT EXISTS idx_callback_requests_assigned_admin_id ON callback_requests(assigned_admin_id);
CREATE INDEX IF NOT EXISTS idx_callback_requests_auto_created_user ON callback_requests(auto_created_user);
CREATE INDEX IF NOT EXISTS idx_callback_requests_created_at ON callback_requests(created_at);

-- Обновляем существующие записи, устанавливая значения по умолчанию
UPDATE callback_requests 
SET 
    auto_created_user = false,
    user_credentials_sent = false,
    contact_attempts = 0,
    priority = 'medium',
    tags = '{}',
    metadata = '{}'
WHERE 
    auto_created_user IS NULL 
    OR user_credentials_sent IS NULL 
    OR contact_attempts IS NULL
    OR priority IS NULL 
    OR tags IS NULL 
    OR metadata IS NULL;
