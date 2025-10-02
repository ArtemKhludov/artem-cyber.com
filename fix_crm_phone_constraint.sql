-- ИСПРАВЛЕНИЕ ПРОБЛЕМЫ С ОГРАНИЧЕНИЕМ НА ТЕЛЕФОН
-- Выполнить в Supabase SQL Editor

-- ========================================
-- 1. УДАЛЯЕМ ОГРАНИЧЕНИЕ НА ТЕЛЕФОН
-- ========================================

-- Удаляем ограничение unique_crm_users_phone
ALTER TABLE crm_users DROP CONSTRAINT IF EXISTS unique_crm_users_phone;

-- ========================================
-- 2. ОЧИЩАЕМ ДУБЛИКАТЫ ТЕЛЕФОНОВ
-- ========================================

-- Удаляем дубликаты телефонов (оставляем только первую запись)
DELETE FROM crm_users 
WHERE id NOT IN (
    SELECT DISTINCT ON (phone) id 
    FROM crm_users 
    WHERE phone IS NOT NULL AND phone != ''
    ORDER BY phone, created_at ASC
);

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
        -- Создаем новую запись
        INSERT INTO crm_users (email, name, phone, created_at, updated_at)
        VALUES (p_email, p_name, p_phone, now(), now())
        RETURNING id INTO v_id;
    END IF;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 4. ТЕСТИРУЕМ ИСПРАВЛЕНИЯ
-- ========================================

-- Тестируем функцию crm_users_upsert
SELECT crm_users_upsert('test-phone-fixed@example.com', 'Тест Телефон Исправлен', '1234567890') as test_result;

-- Проверяем, что функция работает с обновлением
SELECT crm_users_upsert('test-phone-fixed@example.com', 'Тест Телефон Обновлен', '0987654321') as test_result_update;

-- Показываем результат
SELECT 'ОГРАНИЧЕНИЕ НА ТЕЛЕФОН УДАЛЕНО И ФУНКЦИЯ ИСПРАВЛЕНА!' as status;
