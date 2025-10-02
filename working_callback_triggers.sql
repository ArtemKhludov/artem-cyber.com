-- Рабочий триггер для callback_requests без зависимостей от несуществующих колонок

-- Сначала проверим и создадим недостающие колонки в callback_requests
DO $$
BEGIN
    -- Добавляем колонки, если их нет
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'callback_requests' AND column_name = 'user_id') THEN
        ALTER TABLE callback_requests ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'callback_requests' AND column_name = 'auto_created_user') THEN
        ALTER TABLE callback_requests ADD COLUMN auto_created_user BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'callback_requests' AND column_name = 'user_credentials_sent') THEN
        ALTER TABLE callback_requests ADD COLUMN user_credentials_sent BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'callback_requests' AND column_name = 'issue_id') THEN
        ALTER TABLE callback_requests ADD COLUMN issue_id UUID REFERENCES issue_reports(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Создаем таблицу user_contact_audit, если её нет
CREATE TABLE IF NOT EXISTS user_contact_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем индексы для user_contact_audit
CREATE INDEX IF NOT EXISTS idx_user_contact_audit_user_id ON user_contact_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_user_contact_audit_created_at ON user_contact_audit(created_at);

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
            role
        ) VALUES (
            NEW.email,
            NEW.name,
            NEW.phone,
            crypt(temp_password, gen_salt('bf')),
            false,
            'user'
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
BEGIN
    -- Создаем обращение только если есть user_id и таблица issue_reports существует
    IF NEW.user_id IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'issue_reports') THEN
        INSERT INTO issue_reports (
            user_id,
            title,
            description,
            status,
            priority,
            source
        ) VALUES (
            NEW.user_id,
            'Заявка: ' || COALESCE(NEW.product_name, 'Обратная связь'),
            COALESCE(NEW.message, 'Заявка создана автоматически из формы обратной связи'),
            'open',
            'medium',
            'callback_form'
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
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для создания обращений
DROP TRIGGER IF EXISTS trigger_create_issue_from_callback ON callback_requests;
CREATE TRIGGER trigger_create_issue_from_callback
    AFTER INSERT ON callback_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_issue_from_callback();
