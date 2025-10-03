-- Обновляем schema cache в Supabase
-- Это решает проблему PGRST204 "Could not find the 'google_id' column of 'users' in the schema cache"

-- Принудительно обновляем schema cache
NOTIFY pgrst, 'reload schema';

-- Альтернативный способ - перезагружаем schema через системную функцию
SELECT pg_notify('pgrst', 'reload schema');

-- Проверяем, что колонка google_id доступна
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'google_id';

-- Тестируем простой запрос к таблице users с google_id
SELECT id, email, name, google_id, avatar_url, email_verified
FROM users 
LIMIT 1;
