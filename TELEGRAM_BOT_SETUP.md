# Инструкция по настройке Telegram бота для пользователей

## 1. Создание бота через @BotFather

### Шаги создания:
1. Откройте Telegram и найдите @BotFather
2. Отправьте команду `/newbot`
3. Введите имя бота: `EnergyLogic Support Bot`
4. Введите username бота: `energylogic_support_bot` (должен заканчиваться на _bot)
5. Скопируйте полученный токен

### Команды для настройки бота:
```
/setcommands
```
```
start - Подключить уведомления
help - Помощь
status - Статус подключения
unlink - Отключить уведомления
```

### Настройка описания:
```
/setdescription
```
```
🤖 Официальный бот поддержки EnergyLogic

Получайте уведомления о новых ответах на ваши обращения прямо в Telegram.

Команды:
/start - Подключить уведомления
/help - Помощь
/status - Проверить статус
/unlink - Отключить уведомления

⚠️ Внимание: Этот бот только отправляет уведомления. Для общения с поддержкой используйте личный кабинет.
```

### Настройка about:
```
/setabouttext
```
```
Официальный бот поддержки EnergyLogic. Отправляет уведомления о новых ответах на ваши обращения.
```

## 2. Настройка webhook

### Получение webhook URL:
- URL: `https://yourdomain.com/api/telegram/webhook`
- Метод: POST
- Секретный токен: `USER_TELEGRAM_WEBHOOK_SECRET`

### Команда для настройки webhook:
```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://yourdomain.com/api/telegram/webhook",
    "secret_token": "your_webhook_secret",
    "allowed_updates": ["message", "callback_query"]
  }'
```

## 3. Переменные окружения

Добавьте в `.env`:
```bash
# Telegram Bot для пользователей
USER_TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
USER_TELEGRAM_WEBHOOK_URL=https://yourdomain.com/api/telegram/webhook
USER_TELEGRAM_WEBHOOK_SECRET=your_secure_webhook_secret_here
```

## 4. Тестирование бота

### Проверка webhook:
```bash
curl -X GET "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

### Отправка тестового сообщения:
```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": "YOUR_CHAT_ID",
    "text": "🤖 Бот успешно настроен и готов к работе!"
  }'
```

## 5. Безопасность

### Рекомендации:
- Никогда не коммитьте токен бота в Git
- Используйте сильный секретный токен для webhook
- Регулярно ротируйте токены
- Мониторьте активность бота

### Проверка подписи webhook:
```typescript
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return signature === expectedSignature;
}
```

## 6. Мониторинг

### Метрики для отслеживания:
- Количество подключенных пользователей
- Количество отправленных уведомлений
- Процент доставленных сообщений
- Количество ошибок и блокировок

### Логирование:
```typescript
// Логируем все действия бота
console.log(`Bot action: ${action}, User: ${userId}, Chat: ${chatId}, Result: ${success}`);
```

## 7. Обработка ошибок

### Основные ошибки:
- `bot_blocked` - пользователь заблокировал бота
- `chat_not_found` - чат не найден
- `user_deactivated` - пользователь деактивирован
- `rate_limit` - превышен лимит запросов

### Стратегии обработки:
```typescript
const errorHandlers = {
  'bot_blocked': () => {
    // Отвязываем пользователя от бота
    // Отправляем email уведомление
    // Логируем событие
  },
  'rate_limit': () => {
    // Добавляем в очередь на повторную отправку
    // Увеличиваем задержку
  }
};
```

## 8. Готовые шаблоны сообщений

### Подтверждение подключения:
```
✅ Telegram успешно подключен!

🔔 Теперь вы будете получать уведомления о новых ответах на ваши обращения прямо в Telegram.

⚙️ Настройки уведомлений:
• Email: ✅ Включен
• Telegram: ✅ Включен

Для изменения настроек перейдите в личный кабинет.
```

### Новый ответ на обращение:
```
💬 Новый ответ на ваше обращение

🆔 Обращение: #{{issue_id}}
📝 Тема: {{issue_title}}
👤 Ответил: {{admin_name}}

💬 Ответ:
{{reply_preview}}

📊 Статус: {{status_label}}
⏰ Время ответа: {{reply_time}}

Для просмотра полного ответа и продолжения диалога перейдите в личный кабинет.
```

### Напоминание:
```
⏰ Напоминание об обращении

🆔 Обращение: #{{issue_id}}
📝 Тема: {{issue_title}}
⏰ Создано: {{created_at}}
📊 Статус: {{status_label}}

⏳ Ожидаем ответа от поддержки...

Если у вас есть дополнительные вопросы, вы можете ответить на это обращение в личном кабинете.
```

## 9. Следующие шаги

1. ✅ Создать бота через @BotFather
2. ✅ Настроить webhook
3. ✅ Добавить переменные в .env
4. ✅ Протестировать базовую функциональность
5. 🔄 Интегрировать с системой уведомлений
6. 🔄 Добавить обработку команд
7. 🔄 Реализовать связывание пользователей
8. 🔄 Настроить мониторинг

После выполнения этих шагов бот будет готов к интеграции с системой обращений.
