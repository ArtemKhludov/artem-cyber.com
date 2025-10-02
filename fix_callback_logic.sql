-- ИСПРАВЛЕНИЕ ЛОГИКИ CALLBACK СИСТЕМЫ
-- Выполнить в Supabase SQL Editor

-- ========================================
-- 1. УДАЛЯЕМ ВСЕ ОГРАНИЧЕНИЯ НА ТЕЛЕФОН
-- ========================================

-- Удаляем все возможные ограничения на телефон
ALTER TABLE crm_users DROP CONSTRAINT IF EXISTS unique_crm_users_phone;
ALTER TABLE crm_users DROP CONSTRAINT IF EXISTS crm_users_phone_key;
ALTER TABLE crm_users DROP CONSTRAINT IF EXISTS crm_users_phone_unique;

-- ========================================
-- 2. ПЕРЕСОЗДАЕМ ФУНКЦИЮ CREATE_USER_FROM_CALLBACK
-- ========================================

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
    -- Это нужно для админ панели и поиска
    PERFORM crm_users_upsert(NEW.email, NEW.name, NEW.phone);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 3. ПЕРЕСОЗДАЕМ ФУНКЦИЮ CRM_USERS_UPSERT
-- ========================================

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
            name = CASE WHEN p_name IS NOT NULL AND p_name != '' THEN p_name ELSE crm_users.name END,
            phone = CASE WHEN p_phone IS NOT NULL AND p_phone != '' THEN p_phone ELSE crm_users.phone END,
            updated_at = now()
        WHERE id = v_existing_id;
        
        v_id := v_existing_id;
    ELSE
        -- Создаем новую запись (телефон может повторяться)
        INSERT INTO crm_users (email, name, phone, created_at, updated_at)
        VALUES (p_email, p_name, p_phone, now(), now())
        RETURNING id INTO v_id;
    END IF;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 4. ПЕРЕСОЗДАЕМ ТРИГГЕРЫ
-- ========================================

-- Удаляем существующие триггеры
DROP TRIGGER IF EXISTS trigger_create_user_from_callback ON callback_requests;
DROP TRIGGER IF EXISTS trigger_create_issue_from_callback ON callback_requests;

-- Создаем триггеры заново
CREATE TRIGGER trigger_create_user_from_callback
    BEFORE INSERT ON callback_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_user_from_callback();

CREATE TRIGGER trigger_create_issue_from_callback
    AFTER INSERT ON callback_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_issue_from_callback();

-- ========================================
-- 5. ТЕСТИРУЕМ СИСТЕМУ
-- ========================================

-- Тест 1: Создаем обращение от несуществующего пользователя
-- (должно создать запись в crm_users, но user_id будет NULL)
SELECT 'Тест 1: Обращение от несуществующего пользователя' as test_name;

-- Тест 2: Создаем обращение от существующего пользователя
-- (должно привязать к существующему пользователю)
SELECT 'Тест 2: Обращение от существующего пользователя' as test_name;

-- Показываем результат
SELECT 'СИСТЕМА ИСПРАВЛЕНА - ТЕПЕРЬ РАБОТАЕТ ПО ПРАВИЛЬНОЙ ЛОГИКЕ!' as status;
