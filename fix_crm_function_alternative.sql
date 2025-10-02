-- Альтернативная версия функции crm_users_upsert без ON CONFLICT
-- Выполнить в Supabase SQL Editor

-- 1. Создаем функцию без ON CONFLICT (более безопасная)
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

-- 2. Тестируем функцию
SELECT crm_users_upsert('test-alternative@example.com', 'Тест Альтернативной Функции', '1234567890') as test_result;

-- 3. Проверяем, что функция работает с обновлением
SELECT crm_users_upsert('test-alternative@example.com', 'Тест Альтернативной Функции Обновленный', '0987654321') as test_result_update;

-- 4. Проверяем результат
SELECT * FROM crm_users WHERE email = 'test-alternative@example.com';
