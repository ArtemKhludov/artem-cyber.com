-- Создание недостающих триггеров и проверка существующих
-- Выполнить в Supabase SQL Editor

-- 1. Проверяем существующие триггеры
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table IN ('callback_requests', 'callback_conversations')
ORDER BY trigger_name;

-- 2. Создаем недостающие триггеры для callback_requests
DO $$
BEGIN
    -- Триггер для обработки пользователей (BEFORE INSERT)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'trigger_create_user_from_callback'
        AND event_object_table = 'callback_requests'
    ) THEN
        CREATE TRIGGER trigger_create_user_from_callback
            BEFORE INSERT ON callback_requests
            FOR EACH ROW
            EXECUTE FUNCTION create_user_from_callback();
        RAISE NOTICE 'Создан триггер trigger_create_user_from_callback';
    ELSE
        RAISE NOTICE 'Триггер trigger_create_user_from_callback уже существует';
    END IF;

    -- Триггер для создания уведомлений (AFTER INSERT)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'trigger_create_issue_from_callback'
        AND event_object_table = 'callback_requests'
    ) THEN
        CREATE TRIGGER trigger_create_issue_from_callback
            AFTER INSERT ON callback_requests
            FOR EACH ROW
            EXECUTE FUNCTION create_issue_from_callback();
        RAISE NOTICE 'Создан триггер trigger_create_issue_from_callback';
    ELSE
        RAISE NOTICE 'Триггер trigger_create_issue_from_callback уже существует';
    END IF;
END $$;

-- 3. Создаем недостающие триггеры для callback_conversations
DO $$
BEGIN
    -- Триггер для обновления счетчиков переписки
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'trigger_update_conversation_count'
        AND event_object_table = 'callback_conversations'
    ) THEN
        CREATE TRIGGER trigger_update_conversation_count
            AFTER INSERT OR UPDATE OR DELETE ON callback_conversations
            FOR EACH ROW
            EXECUTE FUNCTION update_callback_conversation_count();
        RAISE NOTICE 'Создан триггер trigger_update_conversation_count';
    ELSE
        RAISE NOTICE 'Триггер trigger_update_conversation_count уже существует';
    END IF;
END $$;

-- 4. Проверяем RLS политики для callback_conversations
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'callback_conversations';

-- 5. Создаем недостающие RLS политики
DO $$
BEGIN
    -- Политика для пользователей - просмотр своих сообщений
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'callback_conversations' 
        AND policyname = 'Users can view own conversations'
    ) THEN
        CREATE POLICY "Users can view own conversations" ON callback_conversations
            FOR SELECT USING (
                user_id = auth.uid() OR 
                sender_type = 'system'
            );
        RAISE NOTICE 'Создана политика Users can view own conversations';
    ELSE
        RAISE NOTICE 'Политика Users can view own conversations уже существует';
    END IF;

    -- Политика для пользователей - создание своих сообщений
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'callback_conversations' 
        AND policyname = 'Users can create own messages'
    ) THEN
        CREATE POLICY "Users can create own messages" ON callback_conversations
            FOR INSERT WITH CHECK (
                user_id = auth.uid() AND 
                sender_type = 'user'
            );
        RAISE NOTICE 'Создана политика Users can create own messages';
    ELSE
        RAISE NOTICE 'Политика Users can create own messages уже существует';
    END IF;

    -- Политика для админов - полный доступ
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'callback_conversations' 
        AND policyname = 'Admins can view all conversations'
    ) THEN
        CREATE POLICY "Admins can view all conversations" ON callback_conversations
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM users 
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
        RAISE NOTICE 'Создана политика Admins can view all conversations';
    ELSE
        RAISE NOTICE 'Политика Admins can view all conversations уже существует';
    END IF;
END $$;

-- 6. Финальная проверка всех компонентов
SELECT 'Триггеры:' as component_type, count(*) as count
FROM information_schema.triggers 
WHERE event_object_table IN ('callback_requests', 'callback_conversations')
UNION ALL
SELECT 'RLS политики:', count(*)
FROM pg_policies 
WHERE tablename = 'callback_conversations'
UNION ALL
SELECT 'Функции:', count(*)
FROM pg_proc 
WHERE proname IN ('create_user_from_callback', 'create_issue_from_callback', 'update_callback_conversation_count', 'crm_users_upsert');
