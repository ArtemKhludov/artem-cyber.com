# Спецификация системы Telegram-уведомлений

## 1. Архитектура Telegram-системы

### 1.1 Два канала Telegram

#### Канал 1: Административные уведомления (существующий)
```typescript
// Конфигурация
const adminBotConfig = {
  token: process.env.TELEGRAM_BOT_TOKEN,
  chatId: process.env.TELEGRAM_CHAT_ID,
  threads: {
    issues: process.env.TELEGRAM_THREAD_ISSUES,
    callbacks: process.env.TELEGRAM_THREAD_CALLBACKS,
    payments: process.env.TELEGRAM_THREAD_PAYMENTS
  }
}

// Назначение
- Уведомления о новых обращениях
- Эскалация критичных обращений
- Статистика и метрики
- Системные алерты
```

#### Канал 2: Пользовательские уведомления (новый)
```typescript
// Конфигурация
const userBotConfig = {
  token: process.env.USER_TELEGRAM_BOT_TOKEN,
  webhookUrl: process.env.USER_TELEGRAM_WEBHOOK_URL,
  webhookSecret: process.env.USER_TELEGRAM_WEBHOOK_SECRET
}

// Назначение
- Уведомления о новых ответах на обращения
- Подтверждение подключения Telegram
- Напоминания о неотвеченных обращениях
- НЕ ведение диалогов (только уведомления)
```

### 1.2 Безопасная схема связывания

```typescript
// Процесс связывания пользователя с ботом
interface TelegramLinkProcess {
  // 1. Пользователь инициирует связывание
  startLink(userId: string): Promise<{ link: string; expiresAt: string }>;
  
  // 2. Генерация одноразового токена
  generateToken(userId: string): Promise<string>;
  
  // 3. Создание deep-link
  createDeepLink(token: string): string; // t.me/bot?start=token
  
  // 4. Валидация токена в webhook
  validateToken(token: string): Promise<{ valid: boolean; userId?: string }>;
  
  // 5. Связывание chat_id с пользователем
  linkUser(userId: string, chatId: string): Promise<void>;
}
```

## 2. API Telegram Bot

### 2.1 Команды бота для пользователей

```typescript
// Доступные команды
const userBotCommands = [
  { command: 'start', description: 'Подключить уведомления' },
  { command: 'help', description: 'Помощь' },
  { command: 'status', description: 'Статус подключения' },
  { command: 'unlink', description: 'Отключить уведомления' }
];

// Обработка команд
const commandHandlers = {
  '/start': async (chatId: string, token?: string) => {
    if (token) {
      // Связывание по токену
      return await linkUserByToken(chatId, token);
    } else {
      // Показ инструкций
      return await showLinkInstructions(chatId);
    }
  },
  
  '/help': async (chatId: string) => {
    return await sendHelpMessage(chatId);
  },
  
  '/status': async (chatId: string) => {
    return await sendConnectionStatus(chatId);
  },
  
  '/unlink': async (chatId: string) => {
    return await unlinkUser(chatId);
  }
};
```

### 2.2 Webhook обработчик

```typescript
// POST /api/telegram/webhook
interface TelegramWebhookPayload {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      type: 'private' | 'group' | 'supergroup' | 'channel';
    };
    date: number;
    text?: string;
  };
  callback_query?: {
    id: string;
    from: TelegramUser;
    message?: TelegramMessage;
    data?: string;
  };
}

// Обработка webhook
export async function handleTelegramWebhook(payload: TelegramWebhookPayload) {
  // Валидация подписи (если настроена)
  if (!validateWebhookSignature(payload)) {
    throw new Error('Invalid webhook signature');
  }

  if (payload.message) {
    await handleMessage(payload.message);
  }
  
  if (payload.callback_query) {
    await handleCallbackQuery(payload.callback_query);
  }
}
```

## 3. Шаблоны сообщений

### 3.1 Уведомление о новом ответе (пользователю)

```typescript
const newReplyTemplate = {
  text: `💬 Новый ответ на ваше обращение

🆔 Обращение: #{{issue_id}}
📝 Тема: {{issue_title}}
👤 Ответил: {{admin_name}}

💬 Ответ:
{{reply_preview}}

📊 Статус: {{status_label}}
⏰ Время ответа: {{reply_time}}

Для просмотра полного ответа и продолжения диалога перейдите в личный кабинет.`,

  reply_markup: {
    inline_keyboard: [[
      {
        text: '📱 Открыть в личном кабинете',
        url: '{{dashboard_url}}'
      }
    ]]
  }
};
```

### 3.2 Подтверждение подключения

```typescript
const linkConfirmationTemplate = {
  text: `✅ Telegram успешно подключен!

🔔 Теперь вы будете получать уведомления о новых ответах на ваши обращения прямо в Telegram.

⚙️ Настройки уведомлений:
• Email: {{email_enabled}}
• Telegram: {{telegram_enabled}}

Для изменения настроек перейдите в личный кабинет.`,

  reply_markup: {
    inline_keyboard: [[
      {
        text: '⚙️ Настроить уведомления',
        url: '{{dashboard_url}}'
      }
    ]]
  }
};
```

### 3.3 Напоминание о неотвеченном обращении

```typescript
const reminderTemplate = {
  text: `⏰ Напоминание об обращении

🆔 Обращение: #{{issue_id}}
📝 Тема: {{issue_title}}
⏰ Создано: {{created_at}}
📊 Статус: {{status_label}}

{{#if has_reply}}
💬 Последний ответ: {{last_reply_time}}
{{else}}
⏳ Ожидаем ответа от поддержки...
{{/if}}

Если у вас есть дополнительные вопросы, вы можете ответить на это обращение в личном кабинете.`,

  reply_markup: {
    inline_keyboard: [[
      {
        text: '📱 Открыть обращение',
        url: '{{issue_url}}'
      }
    ]]
  }
};
```

### 3.4 Уведомление админам (улучшенное)

```typescript
const adminNotificationTemplate = {
  text: `🆕 Новое обращение пользователя

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

{{#if purchase_info}}
🛒 Связанная покупка:
• Товар: {{purchase_name}}
• Сумма: {{purchase_amount}} {{purchase_currency}}
• Дата: {{purchase_date}}
{{/if}}

{{#if document_info}}
📄 Связанный документ: {{document_title}}
{{/if}}

⏰ Создано: {{created_at}}`,

  reply_markup: {
    inline_keyboard: [[
      {
        text: '📱 Открыть в админ-панели',
        url: '{{admin_url}}'
      }
    ]]
  }
};
```

## 4. Система отправки

### 4.1 Сервис отправки

```typescript
// lib/telegram-service.ts
interface TelegramService {
  // Отправка сообщения пользователю
  sendToUser(userId: string, message: TelegramMessage): Promise<TelegramResult>;
  
  // Отправка уведомления админам
  sendToAdmins(message: TelegramMessage, threadId?: string): Promise<TelegramResult>;
  
  // Отправка с шаблоном
  sendTemplate(templateId: string, chatId: string, variables: Record<string, any>): Promise<TelegramResult>;
  
  // Получение статуса сообщения
  getMessageStatus(messageId: string): Promise<TelegramStatus>;
}

interface TelegramMessage {
  text: string;
  parse_mode?: 'HTML' | 'Markdown';
  reply_markup?: {
    inline_keyboard?: Array<Array<{
      text: string;
      url?: string;
      callback_data?: string;
    }>>;
  };
  disable_web_page_preview?: boolean;
}

interface TelegramResult {
  success: boolean;
  messageId?: number;
  error?: string;
  chatId?: string;
}
```

### 4.2 Обработка ошибок

```typescript
// Стратегии обработки ошибок Telegram
const telegramErrorHandlers = {
  // Пользователь заблокировал бота
  'bot_blocked': {
    action: 'unlink_user',
    fallback: 'email_notification',
    log: true
  },
  
  // Чат не найден
  'chat_not_found': {
    action: 'unlink_user',
    fallback: 'email_notification',
    log: true
  },
  
  // Rate limit
  'rate_limit': {
    action: 'retry_with_backoff',
    maxRetries: 3,
    delay: 60000
  },
  
  // Неверный токен
  'unauthorized': {
    action: 'escalate_to_admin',
    log: true,
    notify: true
  }
};
```

### 4.3 Rate Limiting

```typescript
// Ограничения Telegram API
const telegramLimits = {
  // Лимиты бота
  messagesPerSecond: 30,
  messagesPerMinute: 20,
  messagesPerHour: 1000,
  
  // Лимиты на пользователя
  userMessagesPerHour: 10,
  userMessagesPerDay: 50,
  
  // Лимиты на группу
  groupMessagesPerHour: 20,
  groupMessagesPerDay: 100
};

// Очередь отправки
class TelegramQueue {
  private queue: Array<TelegramMessage> = [];
  private processing = false;
  
  async add(message: TelegramMessage, priority: 'low' | 'normal' | 'high' = 'normal') {
    this.queue.push({ ...message, priority });
    await this.process();
  }
  
  private async process() {
    if (this.processing) return;
    this.processing = true;
    
    while (this.queue.length > 0) {
      const message = this.queue.shift();
      if (message) {
        await this.sendMessage(message);
        await this.delay(1000 / telegramLimits.messagesPerSecond);
      }
    }
    
    this.processing = false;
  }
}
```

## 5. Безопасность

### 5.1 Валидация webhook

```typescript
// Проверка подписи webhook
function validateWebhookSignature(payload: any, signature: string): boolean {
  const secret = process.env.USER_TELEGRAM_WEBHOOK_SECRET;
  if (!secret) return true; // В dev режиме
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
    
  return signature === expectedSignature;
}
```

### 5.2 Защита токенов

```typescript
// Шифрование chat_id при хранении
function encryptChatId(chatId: string): string {
  const key = process.env.TELEGRAM_ENCRYPTION_KEY;
  const cipher = crypto.createCipher('aes-256-cbc', key);
  let encrypted = cipher.update(chatId, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decryptChatId(encryptedChatId: string): string {
  const key = process.env.TELEGRAM_ENCRYPTION_KEY;
  const decipher = crypto.createDecipher('aes-256-cbc', key);
  let decrypted = decipher.update(encryptedChatId, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

### 5.3 Аудит действий

```typescript
// Логирование всех действий
interface TelegramAuditLog {
  userId: string;
  action: 'link' | 'unlink' | 'send' | 'receive' | 'error';
  chatId?: string;
  messageId?: number;
  timestamp: string;
  ip?: string;
  userAgent?: string;
  success: boolean;
  error?: string;
}
```

## 6. Мониторинг и метрики

### 6.1 Метрики Telegram

```typescript
interface TelegramMetrics {
  // Отправка
  messagesSent: number;
  messagesDelivered: number;
  messagesFailed: number;
  
  // Пользователи
  linkedUsers: number;
  activeUsers: number;
  unlinkedUsers: number;
  
  // Ошибки
  botBlocked: number;
  chatNotFound: number;
  rateLimited: number;
  
  // Производительность
  averageDeliveryTime: number;
  queueSize: number;
  processingTime: number;
}
```

### 6.2 Алерты

```typescript
const telegramAlerts = {
  // Высокий процент блокировок
  highBlockRate: {
    threshold: 0.1, // 10%
    action: 'notify_admin'
  },
  
  // Длинная очередь
  longQueue: {
    threshold: 100,
    action: 'notify_admin'
  },
  
  // Ошибки API
  apiErrors: {
    threshold: 10,
    window: 300000, // 5 минут
    action: 'notify_admin'
  }
};
```

## 7. Интеграция с системой

### 7.1 API эндпоинты

```typescript
// POST /api/telegram/link/start
{
  success: boolean;
  link: string;
  expiresAt: string;
}

// POST /api/telegram/link/confirm
{
  success: boolean;
  linked: boolean;
  message?: string;
}

// POST /api/telegram/send
{
  userId: string;
  template: string;
  variables: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
}

// GET /api/telegram/status/:userId
{
  linked: boolean;
  chatId?: string;
  lastActivity?: string;
  notificationsEnabled: boolean;
}
```

### 7.2 Интеграция с уведомлениями

```typescript
// lib/notify.ts - расширение
export async function sendTelegramNotification(
  userId: string,
  template: string,
  variables: Record<string, any>
): Promise<NotificationResult> {
  const user = await getUserInfo(userId);
  if (!user?.telegram_chat_id || !user?.notify_telegram_enabled) {
    return { success: false, error: 'Telegram not linked or disabled' };
  }

  try {
    const result = await telegramService.sendToUser(userId, {
      text: renderTemplate(template, variables),
      parse_mode: 'HTML'
    });
    
    // Записываем статус доставки
    await recordDeliveryStatus('telegram', result.messageId, result.success);
    
    return result;
  } catch (error) {
    // Обрабатываем ошибки (блокировка бота и т.д.)
    await handleTelegramError(userId, error);
    return { success: false, error: error.message };
  }
}
```

## 8. Тестирование

### 8.1 Тестовые сценарии

```typescript
describe('Telegram Service', () => {
  test('should link user successfully', async () => {
    const { link } = await telegramService.startLink('user123');
    expect(link).toContain('t.me/');
    expect(link).toContain('start=');
  });

  test('should send notification to linked user', async () => {
    await telegramService.linkUser('user123', 'chat456');
    
    const result = await telegramService.sendToUser('user123', {
      text: 'Test message'
    });
    
    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });

  test('should handle blocked bot gracefully', async () => {
    mockTelegramAPI.mockRejectedValueOnce(new Error('bot_blocked'));
    
    const result = await telegramService.sendToUser('user123', {
      text: 'Test message'
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('blocked');
    
    // Проверяем, что пользователь отвязан
    const user = await getUserInfo('user123');
    expect(user.telegram_chat_id).toBeNull();
  });
});
```

### 8.2 Mock для разработки

```typescript
// Mock Telegram API для тестов
class MockTelegramAPI {
  private messages: Array<{ chatId: string; text: string }> = [];
  private blockedUsers = new Set<string>();
  
  async sendMessage(chatId: string, text: string) {
    if (this.blockedUsers.has(chatId)) {
      throw new Error('bot_blocked');
    }
    
    this.messages.push({ chatId, text });
    return { message_id: Math.random() };
  }
  
  blockUser(chatId: string) {
    this.blockedUsers.add(chatId);
  }
  
  getMessages() {
    return this.messages;
  }
}
```

## 9. Развертывание

### 9.1 Переменные окружения

```bash
# Telegram боты
TELEGRAM_BOT_TOKEN=xxx:xxx
TELEGRAM_CHAT_ID=-100xxx
TELEGRAM_THREAD_ISSUES=123
TELEGRAM_THREAD_CALLBACKS=124
TELEGRAM_THREAD_PAYMENTS=125

USER_TELEGRAM_BOT_TOKEN=xxx:xxx
USER_TELEGRAM_WEBHOOK_URL=https://domain.com/api/telegram/webhook
USER_TELEGRAM_WEBHOOK_SECRET=secret_key

# Безопасность
TELEGRAM_ENCRYPTION_KEY=32_byte_key_here
TELEGRAM_RATE_LIMIT_ENABLED=true

# Флаги
TELEGRAM_ENABLED=true
TELEGRAM_SANDBOX=false
TELEGRAM_METRICS_ENABLED=true
```

### 9.2 Настройка webhook

```typescript
// Скрипт настройки webhook
async function setupWebhook() {
  const webhookUrl = process.env.USER_TELEGRAM_WEBHOOK_URL;
  const botToken = process.env.USER_TELEGRAM_BOT_TOKEN;
  
  const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: process.env.USER_TELEGRAM_WEBHOOK_SECRET,
      allowed_updates: ['message', 'callback_query']
    })
  });
  
  const result = await response.json();
  console.log('Webhook setup result:', result);
}
```

## 10. Миграция и обновления

### 10.1 Миграция существующих данных

```sql
-- Добавление полей Telegram в таблицу users
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_telegram_enabled BOOLEAN DEFAULT false;

-- Создание таблицы токенов связывания
CREATE TABLE IF NOT EXISTS telegram_link_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(100) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_users_telegram_chat_id ON users(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_link_tokens_user_id ON telegram_link_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_link_tokens_token ON telegram_link_tokens(token);
```

### 10.2 Обратная совместимость

```typescript
// Поддержка старого формата уведомлений
function migrateOldNotifications() {
  // Конвертация старых уведомлений в новый формат
  // Обновление шаблонов
  // Миграция настроек пользователей
}
```

Эта спецификация обеспечивает полную интеграцию Telegram с системой обращений, включая безопасное связывание пользователей, надежную доставку уведомлений и обработку ошибок.
