-- ИСПРАВЛЕНИЕ ТАБЛИЦЫ CALLBACK_NOTIFICATIONS
-- Выполнить в Supabase SQL Editor

-- ========================================
-- 1. ДОБАВЛЯЕМ НЕДОСТАЮЩИЕ ПОЛЯ
-- ========================================

-- Добавляем недостающие поля в callback_notifications
ALTER TABLE callback_notifications 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ========================================
-- 2. ПЕРЕСОЗДАЕМ ФУНКЦИЮ CREATE_ISSUE_FROM_CALLBACK
-- ========================================

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

-- ========================================
-- 3. ПЕРЕСОЗДАЕМ ТРИГГЕР
-- ========================================

-- Удаляем существующий триггер
DROP TRIGGER IF EXISTS trigger_create_issue_from_callback ON callback_requests;

-- Создаем триггер заново
CREATE TRIGGER trigger_create_issue_from_callback
    AFTER INSERT ON callback_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_issue_from_callback();

-- ========================================
-- 4. ТЕСТИРУЕМ
-- ========================================

-- Показываем результат
SELECT 'ТАБЛИЦА CALLBACK_NOTIFICATIONS ИСПРАВЛЕНА!' as status;
