-- Добавляем поля для grace period системы
-- Позволяет давать временный доступ на 30 минут после оплаты

-- Добавляем поля в таблицу purchases
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS grace_period_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS grace_period_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_attempts INTEGER DEFAULT 0;

-- Добавляем поля в таблицу user_course_access (если существует)
-- Если таблица не существует, создаем её
CREATE TABLE IF NOT EXISTS user_course_access (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    document_id UUID REFERENCES documents(id),
    access_type TEXT DEFAULT 'course',
    is_active BOOLEAN DEFAULT TRUE,
    granted_by UUID,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    purchase_id UUID REFERENCES purchases(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Добавляем поля grace period в user_course_access
ALTER TABLE user_course_access 
ADD COLUMN IF NOT EXISTS is_grace_period BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS grace_period_until TIMESTAMPTZ;

-- Создаем индекс для быстрого поиска grace period записей
CREATE INDEX IF NOT EXISTS idx_purchases_grace_period 
ON purchases(grace_period_until) 
WHERE grace_period_until IS NOT NULL AND grace_period_verified = FALSE;

CREATE INDEX IF NOT EXISTS idx_user_course_access_grace_period 
ON user_course_access(grace_period_until) 
WHERE is_grace_period = TRUE;

-- Добавляем комментарии для понимания
COMMENT ON COLUMN purchases.grace_period_until IS 'Время окончания grace period (30 минут после оплаты)';
COMMENT ON COLUMN purchases.grace_period_verified IS 'Был ли проверен реальный статус платежа';
COMMENT ON COLUMN purchases.verification_attempts IS 'Количество попыток проверки статуса';

COMMENT ON COLUMN user_course_access.is_grace_period IS 'Является ли этот доступ временным (grace period)';
COMMENT ON COLUMN user_course_access.grace_period_until IS 'Время окончания временного доступа';
