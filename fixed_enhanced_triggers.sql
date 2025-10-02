-- Исправленные триггеры с правильной логикой уведомлений

-- Удаляем старые триггеры
DROP TRIGGER IF EXISTS trigger_create_user_from_callback ON callback_requests;
DROP TRIGGER IF EXISTS trigger_create_issue_from_callback ON callback_requests;

-- Удаляем старые функции
DROP FUNCTION IF EXISTS create_user_from_callback();
DROP FUNCTION IF EXISTS create_issue_from_callback();

-- Функция для автоматического создания пользователя при заявке
CREATE OR REPLACE FUNCTION create_user_from_callback()
RETURNS TRIGGER AS $$
DECLARE
    new_user_id UUID;
    temp_password TEXT;
    user_exists BOOLEAN;
BEGIN
    -- Проверяем, существует ли пользователь с таким email
    SELECT EXISTS(
        SELECT 1 FROM users 
        WHERE email = NEW.email AND email IS NOT NULL AND email != ''
    ) INTO user_exists;
    
    -- Если пользователь не существует и есть email, создаем нового
    IF NOT user_exists AND NEW.email IS NOT NULL AND NEW.email != '' THEN
        -- Генерируем временный пароль
        temp_password := 'temp_' || substr(md5(random()::text), 1, 8);
        
        -- Создаем пользователя
        INSERT INTO users (
            email, 
            name, 
            phone, 
            password_hash, 
            email_verified, 
            role,
            temp_password
        ) VALUES (
            NEW.email,
            NEW.name,
            NEW.phone,
            crypt(temp_password, gen_salt('bf')),
            false,
            'user',
            temp_password
        ) RETURNING id INTO new_user_id;
        
        -- Обновляем заявку
        NEW.user_id := new_user_id;
        NEW.auto_created_user := true;
        NEW.user_credentials_sent := false;
        
        -- Логируем создание пользователя
        INSERT INTO user_contact_audit (
            user_id,
            action,
            new_value,
            old_value
        ) VALUES (
            new_user_id,
            'user_created_from_callback',
            NEW.email,
            NULL
        );
        
    ELSIF user_exists THEN
        -- Если пользователь существует, связываем заявку с ним
        SELECT id INTO new_user_id 
        FROM users 
        WHERE email = NEW.email;
        
        NEW.user_id := new_user_id;
        NEW.auto_created_user := false;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер
CREATE TRIGGER trigger_create_user_from_callback
    BEFORE INSERT ON callback_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_user_from_callback();

-- Функция для создания обращения из заявки И уведомлений
CREATE OR REPLACE FUNCTION create_issue_from_callback()
RETURNS TRIGGER AS $$
DECLARE
    new_issue_id UUID;
    temp_password TEXT;
BEGIN
    -- Создаем обращение только если есть user_id и таблица issue_reports существует
    IF NEW.user_id IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'issue_reports') THEN
        INSERT INTO issue_reports (
            user_id,
            user_email,
            title,
            description,
            status
        ) VALUES (
            NEW.user_id,
            NEW.email,
            'Заявка: ' || COALESCE(NEW.product_name, 'Обратная связь'),
            COALESCE(NEW.message, 'Заявка создана автоматически из формы обратной связи'),
            'open'
        ) RETURNING id INTO new_issue_id;
        
        -- Связываем заявку с обращением
        NEW.issue_id := new_issue_id;
        
        -- Логируем создание обращения
        INSERT INTO user_contact_audit (
            user_id,
            action,
            new_value,
            old_value
        ) VALUES (
            NEW.user_id,
            'issue_created_from_callback',
            new_issue_id::text,
            NULL
        );
    END IF;
    
    -- Создаем уведомление для приветственного email, если пользователь создан автоматически
    IF NEW.auto_created_user AND NEW.user_id IS NOT NULL AND NEW.email IS NOT NULL THEN
        -- Получаем временный пароль из users таблицы
        SELECT users.temp_password INTO temp_password 
        FROM users 
        WHERE users.id = NEW.user_id;
        
        -- Создаем уведомление
        INSERT INTO callback_notifications (
            callback_request_id,
            user_id,
            notification_type,
            channel,
            status,
            metadata
        ) VALUES (
            NEW.id, -- Теперь NEW.id уже существует в AFTER INSERT
            NEW.user_id,
            'welcome_email',
            'email',
            'pending',
            jsonb_build_object(
                'temp_password', COALESCE(temp_password, 'temp_password'),
                'user_name', NEW.name,
                'user_email', NEW.email
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для создания обращений и уведомлений
CREATE TRIGGER trigger_create_issue_from_callback
    AFTER INSERT ON callback_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_issue_from_callback();
