-- Создание недостающих триггеров (упрощенная версия)
-- Выполнить в Supabase SQL Editor

-- 1. Создаем триггер для обработки пользователей (BEFORE INSERT)
DROP TRIGGER IF EXISTS trigger_create_user_from_callback ON callback_requests;
CREATE TRIGGER trigger_create_user_from_callback
    BEFORE INSERT ON callback_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_user_from_callback();

-- 2. Создаем триггер для создания уведомлений (AFTER INSERT)
DROP TRIGGER IF EXISTS trigger_create_issue_from_callback ON callback_requests;
CREATE TRIGGER trigger_create_issue_from_callback
    AFTER INSERT ON callback_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_issue_from_callback();

-- 3. Создаем триггер для обновления счетчиков переписки
DROP TRIGGER IF EXISTS trigger_update_conversation_count ON callback_conversations;
CREATE TRIGGER trigger_update_conversation_count
    AFTER INSERT OR UPDATE OR DELETE ON callback_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_callback_conversation_count();

-- 4. Создаем RLS политики для callback_conversations
ALTER TABLE callback_conversations ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики
DROP POLICY IF EXISTS "Users can view own conversations" ON callback_conversations;
DROP POLICY IF EXISTS "Users can create own messages" ON callback_conversations;
DROP POLICY IF EXISTS "Admins can view all conversations" ON callback_conversations;

-- Создаем новые политики
CREATE POLICY "Users can view own conversations" ON callback_conversations
    FOR SELECT USING (
        user_id = auth.uid() OR 
        sender_type = 'system'
    );

CREATE POLICY "Users can create own messages" ON callback_conversations
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND 
        sender_type = 'user'
    );

CREATE POLICY "Admins can view all conversations" ON callback_conversations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 5. Проверяем результат
SELECT 'Триггеры созданы успешно' as status;
