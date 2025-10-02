-- ПРАВИЛЬНОЕ ИСПРАВЛЕНИЕ ОГРАНИЧЕНИЯ НА ТЕЛЕФОН
-- Выполнить в Supabase SQL Editor

-- ========================================
-- 1. УДАЛЯЕМ ОГРАНИЧЕНИЕ НА ТЕЛЕФОН
-- ========================================

-- Удаляем ограничение unique_crm_users_phone (один телефон может быть у нескольких записей)
ALTER TABLE crm_users DROP CONSTRAINT IF EXISTS unique_crm_users_phone;

-- ========================================
-- 2. ПЕРЕСОЗДАЕМ ФУНКЦИЮ CRM_USERS_UPSERT
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
        -- Создаем новую запись
        INSERT INTO crm_users (email, name, phone, created_at, updated_at)
        VALUES (p_email, p_name, p_phone, now(), now())
        RETURNING id INTO v_id;
    END IF;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 3. ТЕСТИРУЕМ ЛОГИКУ НАКОПЛЕНИЯ
-- ========================================

-- Тест 1: Создаем первое обращение
SELECT crm_users_upsert('user@example.com', 'Пользователь', '1234567890') as first_request;

-- Тест 2: Создаем второе обращение от того же пользователя (должно обновить существующую запись)
SELECT crm_users_upsert('user@example.com', 'Пользователь Обновленный', '1234567890') as second_request;

-- Тест 3: Создаем обращение с новым телефоном от того же email (должно обновить телефон)
SELECT crm_users_upsert('user@example.com', 'Пользователь', '0987654321') as third_request;

-- Проверяем результат
SELECT * FROM crm_users WHERE email = 'user@example.com';

-- Показываем результат
SELECT 'ОГРАНИЧЕНИЕ НА ТЕЛЕФОН УДАЛЕНО - ТЕПЕРЬ ОДИН ТЕЛЕФОН МОЖЕТ БЫТЬ У НЕСКОЛЬКИХ ЗАПИСЕЙ!' as status;
