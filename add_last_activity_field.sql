-- Добавляем поле last_activity в таблицу user_sessions
ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Обновляем существующие записи
UPDATE user_sessions 
SET last_activity = created_at 
WHERE last_activity IS NULL;

-- Создаем индекс для быстрого поиска по last_activity
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity 
ON user_sessions(last_activity);

-- Комментарий к полю
COMMENT ON COLUMN user_sessions.last_activity IS 'Время последней активности пользователя';
