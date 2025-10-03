# 🔧 Исправление Google OAuth 401 ошибки

## 🎯 Проблема
После Google OAuth входа пользователь получает 401 Unauthorized ошибку на `/api/auth/me`, что приводит к бесконечному циклу редиректов.

## 🔍 Диагностика

### 1. Запустите полную диагностику
```bash
# После деплоя выполните:
curl -s https://www.energylogic-ai.com/api/full-diagnosis | jq .
```

### 2. Проверьте локально
```bash
node check_production_env_complete.js
```

## 🛠️ Исправления

### 1. Исправьте RLS политики в Supabase

**Выполните в Supabase SQL Editor:**

```sql
-- Полное исправление RLS политик для user_sessions
-- Этот скрипт исправляет все проблемы с доступом к таблице user_sessions

-- 1. Удаляем все существующие политики
DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Admins can view all sessions" ON user_sessions;
DROP POLICY IF EXISTS "Admins can delete all sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can manage own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Service role can manage all sessions" ON user_sessions;

-- 2. Создаем новые политики с правильной логикой

-- Политика для service role - полный доступ
CREATE POLICY "Service role can manage all sessions" ON user_sessions
    FOR ALL
    TO public
    USING (auth.role() = 'service_role');

-- Политика для пользователей - просмотр своих сессий
CREATE POLICY "Users can view own sessions" ON user_sessions
    FOR SELECT
    TO public
    USING (user_id = auth.uid());

-- Политика для пользователей - удаление своих сессий
CREATE POLICY "Users can delete own sessions" ON user_sessions
    FOR DELETE
    TO public
    USING (user_id = auth.uid());

-- Политика для админов - просмотр всех сессий
CREATE POLICY "Admins can view all sessions" ON user_sessions
    FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Политика для админов - удаление всех сессий
CREATE POLICY "Admins can delete all sessions" ON user_sessions
    FOR DELETE
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- 3. Убеждаемся, что RLS включен
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
```

### 2. Проверьте переменные окружения в Vercel

**Обязательные переменные:**

```bash
# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_google_client_secret
GOOGLE_OAUTH_REDIRECT_URI=https://www.energylogic-ai.com/api/auth/oauth/google/callback

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Telegram
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id

# URLs
NEXT_PUBLIC_SITE_URL=https://www.energylogic-ai.com
NEXT_PUBLIC_APP_URL=https://www.energylogic-ai.com
APP_URL=https://www.energylogic-ai.com
```

### 3. Проверьте Google Cloud Console

**Настройки OAuth 2.0 Client ID:**

1. **Authorized JavaScript origins:**
   - `https://www.energylogic-ai.com`

2. **Authorized redirect URIs:**
   - `https://www.energylogic-ai.com/api/auth/oauth/google/callback`

## 🧪 Тестирование

### 1. После исправления RLS политик
```bash
curl -s https://www.energylogic-ai.com/api/full-diagnosis | jq '.tests.rls_policies'
```

### 2. После настройки переменных окружения
```bash
curl -s https://www.energylogic-ai.com/api/full-diagnosis | jq '.environment'
```

### 3. Полный тест Google OAuth
1. Откройте https://www.energylogic-ai.com
2. Нажмите "Войти через Google"
3. Выполните авторизацию
4. Проверьте, что нет 401 ошибок в консоли
5. Убедитесь, что вы попали на dashboard

## 📊 Мониторинг

### Логи для отслеживания:
- **Vercel Dashboard** → Functions → Logs
- **Supabase Dashboard** → Logs
- **Browser Console** → Network tab

### Ключевые моменты:
- Сессия должна создаваться в `user_sessions`
- Cookie должен устанавливаться с правильным доменом
- `/api/auth/me` должен возвращать 200, а не 401

## 🚨 Частые проблемы

### 1. RLS политики не применены
**Симптом:** `insert or update on table "user_sessions" violates row-level security policy`
**Решение:** Выполните SQL скрипт выше

### 2. Неправильный redirect URI
**Симптом:** Google OAuth возвращает ошибку
**Решение:** Проверьте Google Cloud Console настройки

### 3. Переменные окружения не установлены
**Симптом:** `Google OAuth не настроен`
**Решение:** Добавьте переменные в Vercel Dashboard

### 4. Cookie не устанавливается
**Симптом:** Сессия создается, но cookie не сохраняется
**Решение:** Проверьте настройки домена в cookie

## ✅ Чек-лист исправления

- [ ] RLS политики применены в Supabase
- [ ] Все переменные окружения установлены в Vercel
- [ ] Google Cloud Console настроен правильно
- [ ] Диагностика показывает 100% успешность
- [ ] Google OAuth работает без 401 ошибок
- [ ] Пользователь попадает на dashboard после входа

## 📞 Поддержка

Если проблема не решается:
1. Запустите полную диагностику
2. Проверьте логи в Vercel и Supabase
3. Убедитесь, что все шаги выполнены
4. Проверьте, что изменения задеплоились
