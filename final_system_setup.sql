-- ФИНАЛЬНАЯ НАСТРОЙКА СИСТЕМЫ (без проверки ограничений)
-- Выполнить в Supabase SQL Editor

-- ========================================
-- 1. СОЗДАНИЕ НЕДОСТАЮЩИХ ТАБЛИЦ И ПОЛЕЙ
-- ========================================

-- Создаем таблицу callback_conversations если не существует
CREATE TABLE IF NOT EXISTS callback_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    callback_request_id UUID REFERENCES callback_requests(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system')),
    sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('user', 'admin', 'system')),
    is_internal BOOLEAN DEFAULT false,
    file_url TEXT NULL,
    file_name TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Добавляем недостающие поля в callback_requests
ALTER TABLE callback_requests 
ADD COLUMN IF NOT EXISTS conversation_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_message_by VARCHAR(10) CHECK (last_message_by IN ('user', 'admin', 'system')),
ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Создаем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_callback_conversations_request_id ON callback_conversations(callback_request_id);
CREATE INDEX IF NOT EXISTS idx_callback_conversations_user_id ON callback_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_callback_conversations_created_at ON callback_conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_callback_requests_user_id ON callback_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_callback_requests_status ON callback_requests(status);
CREATE INDEX IF NOT EXISTS idx_callback_requests_created_at ON callback_requests(created_at);

-- ========================================
-- 2. СОЗДАНИЕ ФУНКЦИЙ
-- ========================================

-- Функция для безопасного upsert в crm_users
CREATE OR REPLACE FUNCTION crm_users_upsert(
    p_email text, 
    p_name text, 
    p_phone text
)
RETURNS uuid AS $$
DECLARE 
    v_id uuid;
    v_existing_id uuid;
BEGIN
    -- Если email пустой, возвращаем NULL
    IF p_email IS NULL OR p_email = '' THEN
        RETURN NULL;
    END IF;

    -- Нормализуем email
    p_email := lower(trim(p_email));

    -- Проверяем, существует ли уже запись с таким email
    SELECT id INTO v_existing_id 
    FROM crm_users 
    WHERE email = p_email;

    IF v_existing_id IS NOT NULL THEN
        -- Обновляем существующую запись
        UPDATE crm_users 
        SET 
            name = COALESCE(p_name, crm_users.name),
            phone = COALESCE(p_phone, crm_users.phone),
            updated_at = now()
        WHERE id = v_existing_id;
        
        v_id := v_existing_id;
    ELSE
        -- Создаем новую запись
        INSERT INTO crm_users (email, name, phone, created_at, updated_at)
        VALUES (p_email, p_name, p_phone, now(), now())
        RETURNING id INTO v_id;
    END IF;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Функция для обработки callback_requests (BEFORE INSERT)
CREATE OR REPLACE FUNCTION create_user_from_callback()
RETURNS TRIGGER AS $$
DECLARE 
    v_user_id uuid;
BEGIN
    -- Если есть email, ищем существующего пользователя
    IF NEW.email IS NOT NULL AND NEW.email != '' THEN
        SELECT id INTO v_user_id 
        FROM users 
        WHERE lower(email) = lower(trim(NEW.email));

        -- Привязываем к существующему пользователю или оставляем NULL
        NEW.user_id := v_user_id;
        NEW.auto_created_user := false;
    END IF;

    -- Синхронизируем crm_users через upsert (без дублей)
    PERFORM crm_users_upsert(NEW.email, NEW.name, NEW.phone);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Функция для создания уведомлений (AFTER INSERT)
CREATE OR REPLACE FUNCTION create_issue_from_callback()
RETURNS TRIGGER AS $$
DECLARE 
    v_issue_id uuid;
BEGIN
    -- Создаем обращение если таблица существует
    IF NEW.user_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'issue_reports'
    ) THEN
        INSERT INTO issue_reports (
            user_id, user_email, title, description, status, created_at, updated_at
        ) VALUES (
            NEW.user_id,
            NEW.email,
            'Заявка: ' || COALESCE(NEW.product_name, 'Обратная связь'),
            COALESCE(NEW.message, 'Заявка создана из формы обратной связи'),
            'open',
            now(),
            now()
        ) RETURNING id INTO v_issue_id;

        NEW.issue_id := v_issue_id;
    END IF;

    -- Создаем уведомление для админов
    INSERT INTO callback_notifications (
        callback_request_id, user_id, notification_type, channel, status, 
        metadata, created_at, updated_at
    ) VALUES (
        NEW.id,
        NEW.user_id,
        'new_callback_request',
        'telegram',
        'pending',
        jsonb_build_object(
            'user_name', NEW.name,
            'user_email', NEW.email,
            'user_phone', NEW.phone,
            'product_type', NEW.product_type,
            'message', NEW.message
        ),
        now(),
        now()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Функция для обновления счетчиков переписки
CREATE OR REPLACE FUNCTION update_callback_conversation_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Обновляем счетчик сообщений в callback_requests
    UPDATE callback_requests 
    SET 
        conversation_count = (
            SELECT COUNT(*) 
            FROM callback_conversations 
            WHERE callback_request_id = COALESCE(NEW.callback_request_id, OLD.callback_request_id)
            AND is_internal = false
        ),
        last_message_at = COALESCE(NEW.created_at, OLD.created_at),
        last_message_by = COALESCE(NEW.sender_type, OLD.sender_type)
    WHERE id = COALESCE(NEW.callback_request_id, OLD.callback_request_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Функция для получения обращений пользователя
CREATE OR REPLACE FUNCTION get_user_callbacks(user_uuid UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    phone TEXT,
    email TEXT,
    message TEXT,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    conversation_count INTEGER,
    last_message_at TIMESTAMP WITH TIME ZONE,
    conversation_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cr.id,
        cr.name,
        cr.phone,
        cr.email,
        cr.message,
        cr.status,
        cr.created_at,
        cr.conversation_count,
        cr.last_message_at,
        CASE 
            WHEN cr.last_message_by = 'user' THEN 'Ожидает ответа'
            WHEN cr.last_message_by = 'admin' THEN 'Отвечен'
            ELSE 'Новое обращение'
        END as conversation_status
    FROM callback_requests cr
    WHERE cr.user_id = user_uuid
    ORDER BY cr.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Функция для получения переписки по обращению
CREATE OR REPLACE FUNCTION get_callback_conversation(request_uuid UUID, user_uuid UUID)
RETURNS TABLE (
    id UUID,
    message TEXT,
    message_type TEXT,
    sender_type TEXT,
    is_internal BOOLEAN,
    file_url TEXT,
    file_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    admin_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cc.id,
        cc.message,
        cc.message_type,
        cc.sender_type,
        cc.is_internal,
        cc.file_url,
        cc.file_name,
        cc.created_at,
        CASE 
            WHEN cc.admin_id IS NOT NULL THEN u.name
            ELSE NULL
        END as admin_name
    FROM callback_conversations cc
    LEFT JOIN users u ON cc.admin_id = u.id
    WHERE cc.callback_request_id = request_uuid
    AND (cc.user_id = user_uuid OR EXISTS (
        SELECT 1 FROM users 
        WHERE id = user_uuid AND role = 'admin'
    ))
    AND (cc.is_internal = false OR EXISTS (
        SELECT 1 FROM users 
        WHERE id = user_uuid AND role = 'admin'
    ))
    ORDER BY cc.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 3. СОЗДАНИЕ ТРИГГЕРОВ
-- ========================================

-- Удаляем существующие триггеры
DROP TRIGGER IF EXISTS trigger_create_user_from_callback ON callback_requests;
DROP TRIGGER IF EXISTS trigger_create_issue_from_callback ON callback_requests;
DROP TRIGGER IF EXISTS trigger_update_conversation_count ON callback_conversations;

-- Создаем триггеры заново
CREATE TRIGGER trigger_create_user_from_callback
    BEFORE INSERT ON callback_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_user_from_callback();

CREATE TRIGGER trigger_create_issue_from_callback
    AFTER INSERT ON callback_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_issue_from_callback();

CREATE TRIGGER trigger_update_conversation_count
    AFTER INSERT OR UPDATE OR DELETE ON callback_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_callback_conversation_count();

-- ========================================
-- 4. СОЗДАНИЕ RLS ПОЛИТИК
-- ========================================

-- Включаем RLS для callback_conversations
ALTER TABLE callback_conversations ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики
DROP POLICY IF EXISTS "Users can view own conversations" ON callback_conversations;
DROP POLICY IF EXISTS "Users can create own messages" ON callback_conversations;
DROP POLICY IF EXISTS "Admins can view all conversations" ON callback_conversations;

-- Создаем новые политики
CREATE POLICY "Users can view own conversations" ON callback_conversations
    FOR SELECT USING (
        user_id = auth.uid() OR 
        sender_type = 'system'
    );

CREATE POLICY "Users can create own messages" ON callback_conversations
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND 
        sender_type = 'user'
    );

CREATE POLICY "Admins can view all conversations" ON callback_conversations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ========================================
-- 5. СОЗДАНИЕ ПРЕДСТАВЛЕНИЙ
-- ========================================

-- Создаем представление для удобного просмотра обращений с перепиской
DROP VIEW IF EXISTS callback_requests_with_conversations;
CREATE VIEW callback_requests_with_conversations AS
SELECT 
    cr.*,
    u.name as user_name,
    u.email as user_email,
    u.phone as user_phone,
    u.role as user_role,
    COUNT(cc.id) as total_messages,
    MAX(cc.created_at) as last_conversation_at,
    CASE 
        WHEN cr.last_message_by = 'user' THEN 'Ожидает ответа'
        WHEN cr.last_message_by = 'admin' THEN 'Отвечен'
        ELSE 'Новое обращение'
    END as conversation_status
FROM callback_requests cr
LEFT JOIN users u ON cr.user_id = u.id
LEFT JOIN callback_conversations cc ON cr.id = cc.callback_request_id AND cc.is_internal = false
GROUP BY cr.id, u.id;

-- ========================================
-- 6. ТЕСТИРОВАНИЕ
-- ========================================

-- Тестируем функцию crm_users_upsert
SELECT crm_users_upsert('test-final-system@example.com', 'Финальный Тест Системы', '1234567890') as test_result;

-- Показываем результат
SELECT 'СИСТЕМА ПОЛНОСТЬЮ ГОТОВА!' as status;
