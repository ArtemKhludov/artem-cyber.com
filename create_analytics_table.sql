м-- Создание таблицы для аналитических событий
CREATE TABLE IF NOT EXISTS user_analytics_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL,
    event_type TEXT NOT NULL,
    course_id UUID NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индексов для производительности
CREATE INDEX IF NOT EXISTS idx_analytics_user_email ON user_analytics_events(user_email);
CREATE INDEX IF NOT EXISTS idx_analytics_course_id ON user_analytics_events(course_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON user_analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON user_analytics_events(created_at);

-- Создание RLS политик
ALTER TABLE user_analytics_events ENABLE ROW LEVEL SECURITY;

-- Политика для чтения: пользователи могут видеть только свои события
CREATE POLICY "Users can view their own analytics events" ON user_analytics_events
    FOR SELECT USING (auth.email() = user_email);

-- Политика для записи: пользователи могут создавать только свои события
CREATE POLICY "Users can insert their own analytics events" ON user_analytics_events
    FOR INSERT WITH CHECK (auth.email() = user_email);

-- Политика для администраторов: полный доступ
CREATE POLICY "Admins have full access to analytics events" ON user_analytics_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.email = auth.email() 
            AND users.role = 'admin'
        )
    );

-- Комментарии
COMMENT ON TABLE user_analytics_events IS 'Таблица для хранения аналитических событий пользователей';
COMMENT ON COLUMN user_analytics_events.user_email IS 'Email пользователя, совершившего событие';
COMMENT ON COLUMN user_analytics_events.event_type IS 'Тип события (course_open, item_open, etc.)';
COMMENT ON COLUMN user_analytics_events.course_id IS 'ID курса, связанного с событием';
COMMENT ON COLUMN user_analytics_events.metadata IS 'Дополнительные данные события в формате JSON';
COMMENT ON COLUMN user_analytics_events.created_at IS 'Время создания события';
