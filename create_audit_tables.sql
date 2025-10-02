-- Создание таблиц для аудита и токенов

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
    action VARCHAR(50) NOT NULL, -- 'telegram_linked', 'telegram_unlinked', 'email_changed', 'phone_changed', 'user_created_from_callback', 'issue_created_from_callback'
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индекс для user_contact_audit
CREATE INDEX IF NOT EXISTS idx_user_contact_audit_user_id ON user_contact_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_user_contact_audit_created_at ON user_contact_audit(created_at);
CREATE INDEX IF NOT EXISTS idx_user_contact_audit_action ON user_contact_audit(action);

-- Создаем таблицу для callback replies
CREATE TABLE IF NOT EXISTS callback_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    callback_request_id UUID NOT NULL REFERENCES callback_requests(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    is_from_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для callback_replies
CREATE INDEX IF NOT EXISTS idx_callback_replies_callback_request_id ON callback_replies(callback_request_id);
CREATE INDEX IF NOT EXISTS idx_callback_replies_user_id ON callback_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_callback_replies_admin_id ON callback_replies(admin_id);
CREATE INDEX IF NOT EXISTS idx_callback_replies_created_at ON callback_replies(created_at);

-- Создаем таблицу для уведомлений
CREATE TABLE IF NOT EXISTS callback_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    callback_request_id UUID NOT NULL REFERENCES callback_requests(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL, -- 'new_reply', 'status_change', 'assigned', 'reminder'
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'telegram', 'sms')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для callback_notifications
CREATE INDEX IF NOT EXISTS idx_callback_notifications_callback_id ON callback_notifications(callback_request_id);
CREATE INDEX IF NOT EXISTS idx_callback_notifications_user_id ON callback_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_callback_notifications_status ON callback_notifications(status);
CREATE INDEX IF NOT EXISTS idx_callback_notifications_created_at ON callback_notifications(created_at);
