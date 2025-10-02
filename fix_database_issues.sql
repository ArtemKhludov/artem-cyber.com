-- ИСПРАВЛЕНИЕ НАЙДЕННЫХ ПРОБЛЕМ В БАЗЕ ДАННЫХ
-- Выполнить в Supabase SQL Editor

-- ========================================
-- 1. ИСПРАВЛЯЕМ ФУНКЦИЮ CRM_USERS_UPSERT
-- ========================================

-- Удаляем ограничение на телефон (если оно мешает)
ALTER TABLE crm_users DROP CONSTRAINT IF EXISTS crm_users_phone_key;

-- Пересоздаем функцию crm_users_upsert без проблем с телефоном
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
        -- Обновляем существующую запись (только если данные не пустые)
        UPDATE crm_users 
        SET 
            name = CASE WHEN p_name IS NOT NULL AND p_name != '' THEN p_name ELSE crm_users.name END,
            phone = CASE WHEN p_phone IS NOT NULL AND p_phone != '' THEN p_phone ELSE crm_users.phone END,
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

-- ========================================
-- 2. ИСПРАВЛЯЕМ ТАБЛИЦУ CALLBACK_NOTIFICATIONS
-- ========================================

-- Добавляем недостающие поля в callback_notifications
ALTER TABLE callback_notifications 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ========================================
-- 3. ПЕРЕСОЗДАЕМ ТРИГГЕРЫ
-- ========================================

-- Удаляем существующие триггеры
DROP TRIGGER IF EXISTS trigger_create_user_from_callback ON callback_requests;
DROP TRIGGER IF EXISTS trigger_create_issue_from_callback ON callback_requests;
DROP TRIGGER IF EXISTS trigger_update_conversation_count ON callback_conversations;

-- Пересоздаем функцию create_issue_from_callback с правильными полями
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

    -- Создаем уведомление для админов (без updated_at если его нет)
    INSERT INTO callback_notifications (
        callback_request_id, user_id, notification_type, channel, status, 
        metadata, created_at
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
        now()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
-- 4. ТЕСТИРУЕМ ИСПРАВЛЕНИЯ
-- ========================================

-- Тестируем функцию crm_users_upsert
SELECT crm_users_upsert('test-fixed@example.com', 'Тест Исправленный', '1234567890') as test_result;

-- Показываем результат
SELECT 'ИСПРАВЛЕНИЯ ПРИМЕНЕНЫ!' as status;
