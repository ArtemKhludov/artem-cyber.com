-- Создание триггеров для автоматического создания пользователей из callback requests

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
            temp_password,
            created_from_callback
        ) VALUES (
            NEW.email,
            NEW.name,
            NEW.phone,
            crypt(temp_password, gen_salt('bf')),
            false,
            'user',
            temp_password,
            true
        ) RETURNING id INTO new_user_id;
        
        -- Обновляем заявку (только если колонка существует)
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'callback_requests' AND column_name = 'user_id') THEN
            NEW.user_id := new_user_id;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'callback_requests' AND column_name = 'auto_created_user') THEN
            NEW.auto_created_user := true;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'callback_requests' AND column_name = 'user_credentials_sent') THEN
            NEW.user_credentials_sent := false;
        END IF;
        
        -- Логируем создание пользователя (только если таблица существует)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_contact_audit') THEN
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
        END IF;
        
    ELSIF user_exists THEN
        -- Если пользователь существует, связываем заявку с ним
        SELECT id INTO new_user_id 
        FROM users 
        WHERE email = NEW.email;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'callback_requests' AND column_name = 'user_id') THEN
            NEW.user_id := new_user_id;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'callback_requests' AND column_name = 'auto_created_user') THEN
            NEW.auto_created_user := false;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер
DROP TRIGGER IF EXISTS trigger_create_user_from_callback ON callback_requests;
CREATE TRIGGER trigger_create_user_from_callback
    BEFORE INSERT ON callback_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_user_from_callback();

-- Функция для создания обращения из заявки
CREATE OR REPLACE FUNCTION create_issue_from_callback()
RETURNS TRIGGER AS $$
DECLARE
    new_issue_id UUID;
    user_id_value UUID;
BEGIN
    -- Получаем user_id из заявки (проверяем, существует ли колонка)
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'callback_requests' AND column_name = 'user_id') THEN
        user_id_value := NEW.user_id;
    ELSE
        user_id_value := NULL;
    END IF;
    
    -- Создаем обращение только если есть user_id и таблица issue_reports существует
    IF user_id_value IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'issue_reports') THEN
        INSERT INTO issue_reports (
            user_id,
            title,
            description,
            status,
            priority,
            source
        ) VALUES (
            user_id_value,
            'Заявка: ' || COALESCE(NEW.product_name, 'Обратная связь'),
            COALESCE(NEW.message, 'Заявка создана автоматически из формы обратной связи'),
            'open',
            COALESCE(NEW.priority, 'medium'),
            'callback_form'
        ) RETURNING id INTO new_issue_id;
        
        -- Связываем заявку с обращением (только если колонка существует)
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'callback_requests' AND column_name = 'issue_id') THEN
            NEW.issue_id := new_issue_id;
        END IF;
        
        -- Логируем создание обращения (только если таблица существует)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_contact_audit') THEN
            INSERT INTO user_contact_audit (
                user_id,
                action,
                new_value,
                old_value
            ) VALUES (
                user_id_value,
                'issue_created_from_callback',
                new_issue_id::text,
                NULL
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для создания обращений
DROP TRIGGER IF EXISTS trigger_create_issue_from_callback ON callback_requests;
CREATE TRIGGER trigger_create_issue_from_callback
    AFTER INSERT ON callback_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_issue_from_callback();
