# Интеграция с существующими Telegram ботами

## Анализ существующих ботов

### Текущие боты:
1. **Административный бот** (уже используется)
   - Токен: `TELEGRAM_BOT_TOKEN`
   - Чат: `TELEGRAM_CHAT_ID`
   - Назначение: уведомления админов о новых обращениях

2. **Второй бот** (в базе Local)
   - Требует получения токена из базы Local
   - Назначение: уведомления пользователей

## План интеграции существующих ботов

### 1. Получение токена второго бота
```bash
# Запрос к базе Local для получения токена
# Нужно узнать:
# - Токен бота
# - Username бота
# - Статус бота (активен/неактивен)
# - Настройки бота
```

### 2. Конфигурация для двух ботов
```bash
# Существующий админский бот
TELEGRAM_BOT_TOKEN=existing_admin_bot_token
TELEGRAM_CHAT_ID=existing_admin_chat_id

# Второй бот для пользователей (из Local базы)
USER_TELEGRAM_BOT_TOKEN=bot_token_from_local_db
USER_TELEGRAM_BOT_USERNAME=bot_username_from_local_db
```

### 3. Обновленная архитектура

#### Бот 1: Административные уведомления (существующий)
- **Назначение**: Только уведомления админов
- **Каналы**: 
  - Новые обращения → thread issues
  - Критичные обращения → thread urgent
  - Системные алерты → thread system

#### Бот 2: Пользовательские уведомления (из Local)
- **Назначение**: Только уведомления пользователей
- **Функции**:
  - Подтверждение подключения
  - Уведомления о новых ответах
  - Напоминания о неотвеченных обращениях

## Инструкции для получения токена из Local базы

### Вариант 1: Прямой запрос
```sql
-- Запрос к базе Local для получения информации о ботах
SELECT 
    bot_name,
    bot_token,
    bot_username,
    is_active,
    created_at,
    last_used
FROM telegram_bots 
WHERE bot_purpose = 'user_notifications'
   OR bot_name LIKE '%user%'
   OR bot_name LIKE '%support%';
```

### Вариант 2: Через API Local базы
```bash
# Если есть API для доступа к Local базе
curl -X GET "http://local-api/bots/user-support" \
  -H "Authorization: Bearer local_api_key"
```

### Вариант 3: Конфигурационный файл
```json
// local-bots-config.json
{
  "bots": [
    {
      "id": "admin_bot",
      "token": "existing_token",
      "purpose": "admin_notifications",
      "chat_id": "existing_chat_id"
    },
    {
      "id": "user_bot", 
      "token": "token_from_local",
      "purpose": "user_notifications",
      "username": "bot_username_from_local"
    }
  ]
}
```

## Обновленная схема уведомлений

### Административные уведомления (Бот 1)
```
🆕 Новое обращение пользователя

🆔 ID: #{{issue_id}}
👤 Пользователь: {{user_name}}
📧 Email: {{user_email}}
📞 Телефон: {{user_phone}}
📱 Telegram: {{user_telegram}}

📋 Тип: {{type_label}}
⚡ Приоритет: {{priority_label}}
📝 Тема: {{issue_title}}

📄 Описание:
{{issue_description}}

⏰ Создано: {{created_at}}
```

### Пользовательские уведомления (Бот 2)
```
💬 Новый ответ на ваше обращение

🆔 Обращение: #{{issue_id}}
📝 Тема: {{issue_title}}
👤 Ответил: {{admin_name}}

💬 Ответ:
{{reply_preview}}

📊 Статус: {{status_label}}
⏰ Время ответа: {{reply_time}}
```

## Интеграция с существующими ботами

### 1. Проверка доступности второго бота
```typescript
// Проверяем доступность бота из Local базы
async function checkBotAvailability(botToken: string) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const data = await response.json();
    
    return {
      available: data.ok,
      username: data.result?.username,
      name: data.result?.first_name
    };
  } catch (error) {
    return { available: false, error: error.message };
  }
}
```

### 2. Настройка webhook для второго бота
```typescript
// Настройка webhook для пользовательского бота
async function setupUserBotWebhook(botToken: string, webhookUrl: string, secret: string) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secret,
      allowed_updates: ['message', 'callback_query']
    })
  });
  
  return response.json();
}
```

### 3. Обновленные переменные окружения
```bash
# Существующий админский бот
TELEGRAM_BOT_TOKEN=existing_admin_token
TELEGRAM_CHAT_ID=existing_admin_chat_id
TELEGRAM_THREAD_ISSUES=123
TELEGRAM_THREAD_CALLBACKS=124
TELEGRAM_THREAD_PAYMENTS=125

# Второй бот из Local базы
USER_TELEGRAM_BOT_TOKEN=token_from_local_database
USER_TELEGRAM_BOT_USERNAME=username_from_local_database
USER_TELEGRAM_WEBHOOK_URL=https://yourdomain.com/api/telegram/webhook
USER_TELEGRAM_WEBHOOK_SECRET=secure_webhook_secret

# Флаги
TELEGRAM_ADMIN_BOT_ENABLED=true
TELEGRAM_USER_BOT_ENABLED=true
```

## Следующие шаги

### Немедленные действия:
1. **Получить токен второго бота** из Local базы
2. **Проверить доступность** бота через API
3. **Настроить webhook** для пользовательского бота
4. **Протестировать** отправку сообщений

### После получения токена:
1. Обновить конфигурацию проекта
2. Интегрировать с системой уведомлений
3. Реализовать связывание пользователей
4. Настроить мониторинг

## Запрос информации

**Мне нужно от вас:**
1. Токен второго бота из Local базы
2. Username бота (если доступен)
3. Статус бота (активен/неактивен)
4. Любые дополнительные настройки

**Как получить:**
- Через SQL запрос к Local базе
- Через API Local системы
- Через конфигурационные файлы
- Через административный интерфейс

После получения этой информации я смогу настроить интеграцию с существующими ботами без создания новых.
