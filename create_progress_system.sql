-- Система отслеживания прогресса курса
-- Создание таблиц для прогресса, достижений и баллов

-- 1. Таблица прогресса курса
CREATE TABLE IF NOT EXISTS course_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    course_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    material_type VARCHAR(50) NOT NULL, -- 'main_pdf', 'workbook', 'video', 'audio'
    material_id UUID NOT NULL, -- ID конкретного материала
    material_title VARCHAR(500) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed'
    completed_at TIMESTAMP WITH TIME ZONE,
    time_spent INTEGER DEFAULT 0, -- время в секундах
    progress_percentage INTEGER DEFAULT 0, -- процент выполнения материала (0-100)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_email, course_id, material_type, material_id)
);

-- 2. Таблица достижений пользователей
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    achievement_type VARCHAR(100) NOT NULL, -- 'course_completed', 'first_lesson', 'streak_3_days', etc.
    achievement_title VARCHAR(200) NOT NULL,
    achievement_description TEXT,
    points_awarded INTEGER DEFAULT 0,
    icon VARCHAR(100), -- emoji или название иконки
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_email, achievement_type)
);

-- 3. Таблица баллов пользователей
CREATE TABLE IF NOT EXISTS user_points (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL UNIQUE,
    total_points INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    points_to_next_level INTEGER DEFAULT 100,
    streak_days INTEGER DEFAULT 0,
    last_activity_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Таблица статистики курса
CREATE TABLE IF NOT EXISTS course_statistics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    course_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    total_materials INTEGER DEFAULT 0,
    completed_materials INTEGER DEFAULT 0,
    total_time_spent INTEGER DEFAULT 0, -- в секундах
    completion_percentage INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_email, course_id)
);

-- 5. Таблица уведомлений о достижениях
CREATE TABLE IF NOT EXISTS achievement_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    achievement_id UUID NOT NULL REFERENCES user_achievements(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL DEFAULT 'achievement', -- 'achievement', 'level_up', 'streak'
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_course_progress_user_course ON course_progress(user_email, course_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_status ON course_progress(status);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_email);
CREATE INDEX IF NOT EXISTS idx_user_points_user ON user_points(user_email);
CREATE INDEX IF NOT EXISTS idx_course_statistics_user_course ON course_statistics(user_email, course_id);
CREATE INDEX IF NOT EXISTS idx_achievement_notifications_user ON achievement_notifications(user_email, is_read);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_course_progress_updated_at BEFORE UPDATE ON course_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_points_updated_at BEFORE UPDATE ON user_points FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_course_statistics_updated_at BEFORE UPDATE ON course_statistics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Функция для автоматического создания записи user_points при регистрации пользователя
CREATE OR REPLACE FUNCTION create_user_points()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_points (user_email, total_points, current_level, points_to_next_level, streak_days, last_activity_date)
    VALUES (NEW.email, 0, 1, 100, 0, CURRENT_DATE)
    ON CONFLICT (user_email) DO NOTHING;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического создания user_points при создании пользователя
CREATE TRIGGER create_user_points_trigger 
    AFTER INSERT ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION create_user_points();

-- Функция для автоматического обновления статистики курса
CREATE OR REPLACE FUNCTION update_course_statistics()
RETURNS TRIGGER AS $$
DECLARE
    total_mats INTEGER;
    completed_mats INTEGER;
    completion_perc INTEGER;
    total_time INTEGER;
BEGIN
    -- Подсчитываем общее количество материалов курса
    SELECT COUNT(*) INTO total_mats
    FROM course_progress 
    WHERE user_email = NEW.user_email AND course_id = NEW.course_id;
    
    -- Подсчитываем завершенные материалы
    SELECT COUNT(*) INTO completed_mats
    FROM course_progress 
    WHERE user_email = NEW.user_email AND course_id = NEW.course_id AND status = 'completed';
    
    -- Подсчитываем общее время
    SELECT COALESCE(SUM(time_spent), 0) INTO total_time
    FROM course_progress 
    WHERE user_email = NEW.user_email AND course_id = NEW.course_id;
    
    -- Вычисляем процент завершения
    IF total_mats > 0 THEN
        completion_perc := (completed_mats * 100) / total_mats;
    ELSE
        completion_perc := 0;
    END IF;
    
    -- Обновляем или создаем статистику
    INSERT INTO course_statistics (
        user_email, course_id, total_materials, completed_materials, 
        total_time_spent, completion_percentage, last_activity_at
    )
    VALUES (
        NEW.user_email, NEW.course_id, total_mats, completed_mats, 
        total_time, completion_perc, NOW()
    )
    ON CONFLICT (user_email, course_id) 
    DO UPDATE SET
        total_materials = EXCLUDED.total_materials,
        completed_materials = EXCLUDED.completed_materials,
        total_time_spent = EXCLUDED.total_time_spent,
        completion_percentage = EXCLUDED.completion_percentage,
        last_activity_at = NOW(),
        completed_at = CASE 
            WHEN EXCLUDED.completion_percentage = 100 THEN NOW() 
            ELSE course_statistics.completed_at 
        END;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления статистики при изменении прогресса
CREATE TRIGGER update_course_statistics_trigger 
    AFTER INSERT OR UPDATE ON course_progress 
    FOR EACH ROW 
    EXECUTE FUNCTION update_course_statistics();

-- Функция для начисления баллов и проверки достижений
CREATE OR REPLACE FUNCTION award_points_and_achievements()
RETURNS TRIGGER AS $$
DECLARE
    points_to_award INTEGER;
    new_total_points INTEGER;
    new_level INTEGER;
    points_for_next_level INTEGER;
    streak_days INTEGER;
    last_activity_date DATE;
BEGIN
    -- Определяем количество баллов за завершение материала
    points_to_award := 10; -- Базовые баллы за материал
    
    -- Если это первое завершение материала в курсе
    IF NOT EXISTS (
        SELECT 1 FROM course_progress 
        WHERE user_email = NEW.user_email 
        AND course_id = NEW.course_id 
        AND status = 'completed'
        AND id != NEW.id
    ) THEN
        points_to_award := points_to_award + 20; -- Бонус за первое завершение
    END IF;
    
    -- Если курс завершен полностью
    IF NEW.status = 'completed' AND (
        SELECT completion_percentage 
        FROM course_statistics 
        WHERE user_email = NEW.user_email AND course_id = NEW.course_id
    ) = 100 THEN
        points_to_award := points_to_award + 50; -- Бонус за завершение курса
    END IF;
    
    -- Обновляем баллы пользователя
    INSERT INTO user_points (user_email, total_points, last_activity_date)
    VALUES (NEW.user_email, points_to_award, CURRENT_DATE)
    ON CONFLICT (user_email) 
    DO UPDATE SET
        total_points = user_points.total_points + points_to_award,
        last_activity_date = CURRENT_DATE,
        streak_days = CASE 
            WHEN user_points.last_activity_date = CURRENT_DATE - INTERVAL '1 day' 
            THEN user_points.streak_days + 1
            WHEN user_points.last_activity_date < CURRENT_DATE - INTERVAL '1 day'
            THEN 1
            ELSE user_points.streak_days
        END;
    
    -- Получаем обновленные данные пользователя
    SELECT total_points, current_level, points_to_next_level, streak_days
    INTO new_total_points, new_level, points_for_next_level, streak_days
    FROM user_points 
    WHERE user_email = NEW.user_email;
    
    -- Проверяем повышение уровня (каждые 100 баллов)
    new_level := (new_total_points / 100) + 1;
    points_for_next_level := 100 - (new_total_points % 100);
    
    UPDATE user_points 
    SET current_level = new_level, points_to_next_level = points_for_next_level
    WHERE user_email = NEW.user_email;
    
    -- Создаем достижения
    IF NEW.status = 'completed' THEN
        -- Достижение за завершение первого материала
        INSERT INTO user_achievements (user_email, achievement_type, achievement_title, achievement_description, points_awarded, icon)
        VALUES (NEW.user_email, 'first_material_completed', 'Первый шаг!', 'Вы завершили свой первый материал курса', 20, '🎯')
        ON CONFLICT (user_email, achievement_type) DO NOTHING;
        
        -- Достижение за завершение курса
        IF (
            SELECT completion_percentage 
            FROM course_statistics 
            WHERE user_email = NEW.user_email AND course_id = NEW.course_id
        ) = 100 THEN
            INSERT INTO user_achievements (user_email, achievement_type, achievement_title, achievement_description, points_awarded, icon)
            VALUES (NEW.user_email, 'course_completed', 'Курс завершен!', 'Поздравляем! Вы успешно завершили курс', 50, '🏆')
            ON CONFLICT (user_email, achievement_type) DO NOTHING;
        END IF;
        
        -- Достижение за серию дней
        IF streak_days = 3 THEN
            INSERT INTO user_achievements (user_email, achievement_type, achievement_title, achievement_description, points_awarded, icon)
            VALUES (NEW.user_email, 'streak_3_days', 'Три дня подряд!', 'Вы занимались 3 дня подряд', 30, '🔥')
            ON CONFLICT (user_email, achievement_type) DO NOTHING;
        END IF;
        
        IF streak_days = 7 THEN
            INSERT INTO user_achievements (user_email, achievement_type, achievement_title, achievement_description, points_awarded, icon)
            VALUES (NEW.user_email, 'streak_7_days', 'Неделя обучения!', 'Невероятно! 7 дней подряд', 100, '⭐')
            ON CONFLICT (user_email, achievement_type) DO NOTHING;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для начисления баллов при завершении материала
CREATE TRIGGER award_points_trigger 
    AFTER UPDATE OF status ON course_progress 
    FOR EACH ROW 
    WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
    EXECUTE FUNCTION award_points_and_achievements();

-- Создание представления для удобного получения статистики пользователя
CREATE OR REPLACE VIEW user_progress_summary AS
SELECT 
    up.user_email,
    up.total_points,
    up.current_level,
    up.points_to_next_level,
    up.streak_days,
    COUNT(DISTINCT cs.course_id) as courses_started,
    COUNT(DISTINCT CASE WHEN cs.completion_percentage = 100 THEN cs.course_id END) as courses_completed,
    COALESCE(SUM(cs.total_time_spent), 0) as total_study_time,
    COUNT(DISTINCT ua.id) as total_achievements
FROM user_points up
LEFT JOIN course_statistics cs ON up.user_email = cs.user_email
LEFT JOIN user_achievements ua ON up.user_email = ua.user_email
GROUP BY up.user_email, up.total_points, up.current_level, up.points_to_next_level, up.streak_days;

-- Создание представления для прогресса конкретного курса
CREATE OR REPLACE VIEW course_progress_details AS
SELECT 
    cp.user_email,
    cp.course_id,
    d.title as course_title,
    cp.material_type,
    cp.material_title,
    cp.status,
    cp.progress_percentage,
    cp.time_spent,
    cp.completed_at,
    cs.total_materials,
    cs.completed_materials,
    cs.completion_percentage,
    cs.total_time_spent as course_total_time
FROM course_progress cp
JOIN documents d ON cp.course_id = d.id
LEFT JOIN course_statistics cs ON cp.user_email = cs.user_email AND cp.course_id = cs.course_id;
