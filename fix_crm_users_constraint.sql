-- Исправление ограничения уникальности для crm_users
-- Выполнить в Supabase SQL Editor

-- 1. Проверяем существующие ограничения
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'crm_users'::regclass;

-- 2. Проверяем существующие ограничения уникальности
DO $$
DECLARE
    constraint_exists boolean;
BEGIN
    -- Проверяем, существует ли уже уникальное ограничение на email
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'crm_users'::regclass 
        AND contype = 'u' 
        AND pg_get_constraintdef(oid) LIKE '%email%'
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        RAISE NOTICE 'Уникальное ограничение на email уже существует';
    ELSE
        -- Создаем уникальное ограничение на email
        ALTER TABLE crm_users ADD CONSTRAINT unique_crm_users_email UNIQUE (email);
        RAISE NOTICE 'Создано уникальное ограничение на email в crm_users';
    END IF;
END $$;

-- 3. Пересоздаем функцию crm_users_upsert с правильным ON CONFLICT
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

-- 4. Тестируем функцию
SELECT crm_users_upsert('test@example.com', 'Тест Имя', '1234567890') as test_result;