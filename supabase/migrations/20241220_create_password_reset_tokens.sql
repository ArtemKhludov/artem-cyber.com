-- Создание таблицы для токенов восстановления пароля
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE NULL
);

-- Создание индексов для оптимизации
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- RLS политики
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Политика для service_role (полный доступ)
CREATE POLICY "Service role can manage password reset tokens" ON password_reset_tokens
  FOR ALL USING (auth.role() = 'service_role');

-- Политика для аутентифицированных пользователей (только свои токены)
CREATE POLICY "Users can view their own password reset tokens" ON password_reset_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- Функция для очистки истекших токенов
CREATE OR REPLACE FUNCTION cleanup_expired_password_reset_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM password_reset_tokens 
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создание триггера для автоматической очистки истекших токенов при создании новых
CREATE OR REPLACE FUNCTION trigger_cleanup_expired_tokens()
RETURNS TRIGGER AS $$
BEGIN
  -- Очищаем истекшие токены перед вставкой нового
  PERFORM cleanup_expired_password_reset_tokens();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER cleanup_expired_tokens_trigger
  BEFORE INSERT ON password_reset_tokens
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cleanup_expired_tokens();

-- Комментарии
COMMENT ON TABLE password_reset_tokens IS 'Токены для восстановления пароля пользователей';
COMMENT ON COLUMN password_reset_tokens.user_id IS 'ID пользователя, для которого создан токен';
COMMENT ON COLUMN password_reset_tokens.token IS 'Уникальный токен для восстановления пароля';
COMMENT ON COLUMN password_reset_tokens.expires_at IS 'Время истечения токена';
COMMENT ON COLUMN password_reset_tokens.used_at IS 'Время использования токена (NULL если не использован)';
