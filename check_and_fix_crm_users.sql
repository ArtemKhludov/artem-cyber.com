-- Проверка и исправление таблицы crm_users
-- Выполнить в Supabase SQL Editor

-- 1. Проверяем структуру таблицы crm_users
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'crm_users' 
ORDER BY ordinal_position;

-- 2. Проверяем существующие ограничения
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'crm_users'::regclass;

-- 3. Проверяем, есть ли дубликаты email
SELECT email, COUNT(*) as count
FROM crm_users 
GROUP BY email 
HAVING COUNT(*) > 1;

-- 4. Если есть дубликаты, удаляем их (оставляем только первую запись)
DELETE FROM crm_users 
WHERE id NOT IN (
    SELECT MIN(id::text)::uuid 
    FROM crm_users 
    GROUP BY email
);

-- 5. Создаем уникальное ограничение на email
ALTER TABLE crm_users ADD CONSTRAINT unique_crm_users_email UNIQUE (email);

-- 6. Проверяем, что ограничение создано
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'crm_users'::regclass 
AND contype = 'u';
