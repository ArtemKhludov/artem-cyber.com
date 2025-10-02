-- =====================================================
-- ENHANCED CALLBACK SYSTEM MIGRATION
-- Полная интеграция системы обратной связи
-- =====================================================

-- 1. Добавляем поля в callback_requests для интеграции с пользователями
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

-- 2. Создаем таблицу для ответов на заявки (аналог issue_replies)
CREATE TABLE IF NOT EXISTS callback_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    callback_request_id UUID NOT NULL REFERENCES callback_requests(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    author_email VARCHAR(255),
    author_type VARCHAR(20) NOT NULL CHECK (author_type IN ('user', 'admin', 'system')),
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false, -- Внутренние заметки админа
    delivery_status JSONB DEFAULT '{}', -- Статус доставки уведомлений
    read_by TEXT[] DEFAULT '{}', -- Кто прочитал сообщение
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Создаем таблицу для отслеживания уведомлений
CREATE TABLE IF NOT EXISTS callback_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    callback_request_id UUID NOT NULL REFERENCES callback_requests(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL, -- 'new_reply', 'status_change', 'assigned', 'reminder'
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'telegram', 'sms')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Создаем таблицу для шаблонов ответов
CREATE TABLE IF NOT EXISTS callback_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    content TEXT NOT NULL,
    template_type VARCHAR(50) NOT NULL, -- 'welcome', 'status_update', 'reminder', 'escalation'
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Создаем таблицу для SLA и метрик
CREATE TABLE IF NOT EXISTS callback_sla_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    callback_request_id UUID NOT NULL REFERENCES callback_requests(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL, -- 'first_response', 'resolution', 'contact_attempt'
    target_time INTERVAL,
    actual_time INTERVAL,
    is_met BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ИНДЕКСЫ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ
-- =====================================================

-- Индексы для callback_requests
CREATE INDEX IF NOT EXISTS idx_callback_requests_user_id ON callback_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_callback_requests_issue_id ON callback_requests(issue_id);
CREATE INDEX IF NOT EXISTS idx_callback_requests_status ON callback_requests(status);
CREATE INDEX IF NOT EXISTS idx_callback_requests_priority ON callback_requests(priority);
CREATE INDEX IF NOT EXISTS idx_callback_requests_assigned_admin ON callback_requests(assigned_admin_id);
CREATE INDEX IF NOT EXISTS idx_callback_requests_created_at ON callback_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_callback_requests_auto_created_user ON callback_requests(auto_created_user);

-- Индексы для callback_replies
CREATE INDEX IF NOT EXISTS idx_callback_replies_callback_id ON callback_replies(callback_request_id);
CREATE INDEX IF NOT EXISTS idx_callback_replies_author_id ON callback_replies(author_id);
CREATE INDEX IF NOT EXISTS idx_callback_replies_created_at ON callback_replies(created_at);

-- Индексы для callback_notifications
CREATE INDEX IF NOT EXISTS idx_callback_notifications_callback_id ON callback_notifications(callback_request_id);
CREATE INDEX IF NOT EXISTS idx_callback_notifications_user_id ON callback_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_callback_notifications_status ON callback_notifications(status);
CREATE INDEX IF NOT EXISTS idx_callback_notifications_created_at ON callback_notifications(created_at);

-- =====================================================
-- ФУНКЦИИ ДЛЯ АВТОМАТИЗАЦИИ
-- =====================================================

-- Функция для автоматического создания пользователя при заявке
CREATE OR REPLACE FUNCTION create_user_from_callback()
RETURNS TRIGGER AS $$
DECLARE
    new_user_id UUID;
    temp_password TEXT;
    user_exists BOOLEAN;
BEGIN
    -- Проверяем, есть ли уже пользователь с таким email или телефоном
    SELECT EXISTS(
        SELECT 1 FROM users 
        WHERE email = NEW.email 
        OR phone = NEW.phone
    ) INTO user_exists;
    
    -- Если пользователь не существует и есть email, создаем его
    IF NOT user_exists AND NEW.email IS NOT NULL AND NEW.email != '' THEN
        -- Генерируем временный пароль
        temp_password := 'temp_' || substr(md5(random()::text), 1, 8);
        
        -- Создаем пользователя
        INSERT INTO users (
            email, 
            name, 
            phone, 
            password_hash, 
            email_verified, 
            role
        ) VALUES (
            NEW.email,
            NEW.name,
            NEW.phone,
            crypt(temp_password, gen_salt('bf')),
            false,
            'user'
        ) RETURNING id INTO new_user_id;
        
        -- Обновляем заявку
        NEW.user_id := new_user_id;
        NEW.auto_created_user := true;
        NEW.user_credentials_sent := false;
        
        -- Создаем запись в audit_logs
        INSERT INTO audit_logs (
            actor_id,
            actor_email,
            action,
            target_table,
            target_id,
            metadata,
            ip_address,
            user_agent
        ) VALUES (
            new_user_id,
            NEW.email,
            'user_created_from_callback',
            'users',
            new_user_id,
            jsonb_build_object(
                'callback_request_id', NEW.id,
                'source', 'callback_form',
                'temp_password', temp_password
            ),
            NULL,
            NULL
        );
        
    ELSIF user_exists THEN
        -- Если пользователь существует, связываем заявку с ним
        SELECT id INTO new_user_id FROM users 
        WHERE email = NEW.email OR phone = NEW.phone
        LIMIT 1;
        
        NEW.user_id := new_user_id;
        NEW.auto_created_user := false;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического создания пользователя
DROP TRIGGER IF EXISTS trigger_create_user_from_callback ON callback_requests;
CREATE TRIGGER trigger_create_user_from_callback
    BEFORE INSERT ON callback_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_user_from_callback();

-- Функция для создания issue_reports из callback_requests
CREATE OR REPLACE FUNCTION create_issue_from_callback()
RETURNS TRIGGER AS $$
DECLARE
    new_issue_id UUID;
BEGIN
    -- Создаем обращение в issue_reports только если есть user_id
    IF NEW.user_id IS NOT NULL THEN
        INSERT INTO issue_reports (
            user_id,
            user_email,
            title,
            description,
            type,
            severity,
            status,
            context_json,
            source
        ) VALUES (
            NEW.user_id,
            NEW.email,
            COALESCE(NEW.product_name, 'Заявка на обратный звонок'),
            COALESCE(NEW.message, 'Пользователь оставил заявку на обратный звонок'),
            'other',
            CASE 
                WHEN NEW.priority = 'urgent' THEN 'urgent'
                WHEN NEW.priority = 'high' THEN 'high'
                ELSE 'normal'
            END,
            'open',
            jsonb_build_object(
                'callback_request_id', NEW.id,
                'source_page', NEW.source_page,
                'product_type', NEW.product_type,
                'preferred_time', NEW.preferred_time,
                'original_message', NEW.message
            ),
            'callback_form'
        ) RETURNING id INTO new_issue_id;
        
        -- Обновляем заявку с ID обращения
        NEW.issue_id := new_issue_id;
        
        -- Создаем запись в audit_logs
        INSERT INTO audit_logs (
            actor_id,
            actor_email,
            action,
            target_table,
            target_id,
            metadata,
            ip_address,
            user_agent
        ) VALUES (
            NEW.user_id,
            NEW.email,
            'issue_created_from_callback',
            'issue_reports',
            new_issue_id,
            jsonb_build_object(
                'callback_request_id', NEW.id,
                'source', 'callback_form'
            ),
            NULL,
            NULL
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для создания issue_reports
DROP TRIGGER IF EXISTS trigger_create_issue_from_callback ON callback_requests;
CREATE TRIGGER trigger_create_issue_from_callback
    AFTER INSERT ON callback_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_issue_from_callback();

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для обновления updated_at
DROP TRIGGER IF EXISTS trigger_update_callback_replies_updated_at ON callback_replies;
CREATE TRIGGER trigger_update_callback_replies_updated_at
    BEFORE UPDATE ON callback_replies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_callback_templates_updated_at ON callback_templates;
CREATE TRIGGER trigger_update_callback_templates_updated_at
    BEFORE UPDATE ON callback_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ВСТАВКА БАЗОВЫХ ШАБЛОНОВ
-- =====================================================

INSERT INTO callback_templates (name, subject, content, template_type, is_active) VALUES
(
    'Добро пожаловать',
    'Добро пожаловать в EnergyLogic!',
    'Здравствуйте, {{name}}!

Спасибо за ваш интерес к нашим программам. Мы получили вашу заявку и свяжемся с вами в ближайшее время.

Ваши данные для входа в личный кабинет:
Email: {{email}}
Временный пароль: {{temp_password}}

Пожалуйста, смените пароль при первом входе.

С уважением,
Команда EnergyLogic',
    'welcome',
    true
),
(
    'Статус обновлен',
    'Обновление по вашей заявке',
    'Здравствуйте, {{name}}!

Статус вашей заявки обновлен: {{status}}

{{#if message}}
Сообщение: {{message}}
{{/if}}

С уважением,
Команда EnergyLogic',
    'status_update',
    true
),
(
    'Напоминание',
    'Напоминание о вашей заявке',
    'Здравствуйте, {{name}}!

Напоминаем, что у вас есть открытая заявка в нашей системе поддержки.

Если у вас есть дополнительные вопросы, пожалуйста, свяжитесь с нами.

С уважением,
Команда EnergyLogic',
    'reminder',
    true
);

-- =====================================================
-- ОБНОВЛЕНИЕ СУЩЕСТВУЮЩИХ ЗАПИСЕЙ
-- =====================================================

-- Обновляем существующие заявки, устанавливая значения по умолчанию
UPDATE callback_requests 
SET 
    priority = 'medium',
    contact_attempts = 0,
    tags = '{}',
    metadata = '{}'
WHERE 
    priority IS NULL 
    OR contact_attempts IS NULL 
    OR tags IS NULL 
    OR metadata IS NULL;

-- =====================================================
-- ПРАВА ДОСТУПА
-- =====================================================

-- Предоставляем права на новые таблицы
GRANT SELECT, INSERT, UPDATE, DELETE ON callback_replies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON callback_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON callback_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON callback_sla_metrics TO authenticated;

-- Предоставляем права на последовательности
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- КОММЕНТАРИИ К ТАБЛИЦАМ
-- =====================================================

COMMENT ON TABLE callback_replies IS 'Ответы на заявки обратной связи';
COMMENT ON TABLE callback_notifications IS 'Уведомления по заявкам';
COMMENT ON TABLE callback_templates IS 'Шаблоны ответов';
COMMENT ON TABLE callback_sla_metrics IS 'Метрики SLA для заявок';

COMMENT ON COLUMN callback_requests.user_id IS 'ID пользователя (создается автоматически)';
COMMENT ON COLUMN callback_requests.issue_id IS 'ID связанного обращения в issue_reports';
COMMENT ON COLUMN callback_requests.auto_created_user IS 'Был ли пользователь создан автоматически';
COMMENT ON COLUMN callback_requests.user_credentials_sent IS 'Отправлены ли данные для входа';
COMMENT ON COLUMN callback_requests.contact_attempts IS 'Количество попыток связаться';
COMMENT ON COLUMN callback_requests.assigned_admin_id IS 'ID назначенного администратора';
