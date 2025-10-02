-- Исправление только функции crm_users_upsert
-- Выполнить в Supabase SQL Editor

-- 1. Пересоздаем функцию crm_users_upsert с правильным ON CONFLICT
CREATE OR REPLACE FUNCTION crm_users_upsert(
    p_email text, 
    p_name text, 
    p_phone text
)
RETURNS uuid AS $$
DECLARE 
    v_id uuid;
BEGIN
    -- Если email пустой, возвращаем NULL
    IF p_email IS NULL OR p_email = '' THEN
        RETURN NULL;
    END IF;

    -- Upsert в crm_users с правильным ON CONFLICT
    INSERT INTO crm_users (email, name, phone, created_at, updated_at)
    VALUES (lower(trim(p_email)), p_name, p_phone, now(), now())
    ON CONFLICT (email) DO UPDATE SET
        name = COALESCE(EXCLUDED.name, crm_users.name),
        phone = COALESCE(EXCLUDED.phone, crm_users.phone),
        updated_at = now()
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- 2. Тестируем функцию
SELECT crm_users_upsert('test-function@example.com', 'Тест Функции', '1234567890') as test_result;

-- 3. Проверяем, что функция работает
SELECT crm_users_upsert('test-function@example.com', 'Тест Функции Обновленный', '0987654321') as test_result_update;
