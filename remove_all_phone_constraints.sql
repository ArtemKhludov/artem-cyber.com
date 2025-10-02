-- УДАЛЕНИЕ ВСЕХ ОГРАНИЧЕНИЙ НА ТЕЛЕФОН
-- Выполнить в Supabase SQL Editor

-- ========================================
-- 1. УДАЛЯЕМ ВСЕ ОГРАНИЧЕНИЯ НА ТЕЛЕФОН
-- ========================================

-- Удаляем все возможные ограничения на телефон
ALTER TABLE crm_users DROP CONSTRAINT IF EXISTS unique_crm_users_phone;
ALTER TABLE crm_users DROP CONSTRAINT IF EXISTS crm_users_phone_key;
ALTER TABLE crm_users DROP CONSTRAINT IF EXISTS crm_users_phone_unique;

-- ========================================
-- 2. ПРОВЕРЯЕМ РЕЗУЛЬТАТ
-- ========================================

-- Показываем все оставшиеся ограничения
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'crm_users'::regclass;

-- ========================================
-- 3. ТЕСТИРУЕМ ФУНКЦИЮ
-- ========================================

-- Тестируем создание новой записи
SELECT crm_users_upsert('test-no-phone-constraint@example.com', 'Тест Без Ограничений', '9999999999') as test_result;

-- Показываем результат
SELECT 'ВСЕ ОГРАНИЧЕНИЯ НА ТЕЛЕФОН УДАЛЕНЫ!' as status;
