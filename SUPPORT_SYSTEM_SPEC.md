# Спецификация системы обращений и поддержки

## 1. Архитектура данных (Data Model)

### 1.1 Таблица `users` (расширение существующей)
```sql
-- Дополнительные поля для системы поддержки
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_email_enabled BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_telegram_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_policy JSONB DEFAULT '{"email": true, "telegram": false, "urgent_only": false}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Europe/Moscow';
ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'ru';

-- Индексы
CREATE INDEX IF NOT EXISTS idx_users_telegram_chat_id ON users(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_users_notify_enabled ON users(notify_email_enabled, notify_telegram_enabled);
```

### 1.2 Таблица `issue_reports` (существующая, расширение)
```sql
-- Дополнительные поля
ALTER TABLE issue_reports ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal';
ALTER TABLE issue_reports ADD COLUMN IF NOT EXISTS channel_log JSONB DEFAULT '{}';
ALTER TABLE issue_reports ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMP WITH TIME ZONE;
ALTER TABLE issue_reports ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0;
ALTER TABLE issue_reports ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Индексы
CREATE INDEX IF NOT EXISTS idx_issue_reports_user_id ON issue_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_issue_reports_status ON issue_reports(status);
CREATE INDEX IF NOT EXISTS idx_issue_reports_priority ON issue_reports(priority);
CREATE INDEX IF NOT EXISTS idx_issue_reports_assignee ON issue_reports(assignee);
CREATE INDEX IF NOT EXISTS idx_issue_reports_created_at ON issue_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_issue_reports_sla_deadline ON issue_reports(sla_deadline);
```

### 1.3 Таблица `issue_replies` (существующая, расширение)
```sql
-- Дополнительные поля
ALTER TABLE issue_replies ADD COLUMN IF NOT EXISTS delivery_status JSONB DEFAULT '{}';
ALTER TABLE issue_replies ADD COLUMN IF NOT EXISTS read_by TEXT[] DEFAULT '{}';
ALTER TABLE issue_replies ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';
ALTER TABLE issue_replies ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT false;
ALTER TABLE issue_replies ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES issue_replies(id);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_issue_replies_issue_id ON issue_replies(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_replies_author_id ON issue_replies(author_id);
CREATE INDEX IF NOT EXISTS idx_issue_replies_created_at ON issue_replies(created_at);
CREATE INDEX IF NOT EXISTS idx_issue_replies_reply_to_id ON issue_replies(reply_to_id);
```

### 1.4 Новые таблицы

#### `telegram_link_tokens`
```sql
CREATE TABLE telegram_link_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(100) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_telegram_link_tokens_user_id ON telegram_link_tokens(user_id);
CREATE INDEX idx_telegram_link_tokens_token ON telegram_link_tokens(token);
CREATE INDEX idx_telegram_link_tokens_expires_at ON telegram_link_tokens(expires_at);
```

#### `user_contact_audit`
```sql
CREATE TABLE user_contact_audit (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    field_name VARCHAR(50) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason VARCHAR(100)
);

CREATE INDEX idx_user_contact_audit_user_id ON user_contact_audit(user_id);
CREATE INDEX idx_user_contact_audit_changed_at ON user_contact_audit(changed_at);
```

#### `notification_templates`
```sql
CREATE TABLE notification_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL, -- 'email', 'telegram'
    language VARCHAR(5) DEFAULT 'ru',
    subject VARCHAR(200),
    body TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 1.5 Справочники статусов и типов

#### Статусы обращений
```sql
-- Единый справочник статусов
CREATE TABLE IF NOT EXISTS issue_statuses (
    code VARCHAR(50) PRIMARY KEY,
    name_ru VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#6B7280',
    is_final BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0
);

INSERT INTO issue_statuses (code, name_ru, name_en, color, is_final, sort_order) VALUES
('open', 'Открыто', 'Open', '#3B82F6', false, 1),
('in_progress', 'В работе', 'In Progress', '#F59E0B', false, 2),
('waiting_user', 'Ожидает ответа', 'Waiting for User', '#8B5CF6', false, 3),
('resolved', 'Решено', 'Resolved', '#10B981', false, 4),
('closed', 'Закрыто', 'Closed', '#6B7280', true, 5)
ON CONFLICT (code) DO NOTHING;
```

#### Приоритеты
```sql
CREATE TABLE IF NOT EXISTS issue_priorities (
    code VARCHAR(20) PRIMARY KEY,
    name_ru VARCHAR(50) NOT NULL,
    name_en VARCHAR(50) NOT NULL,
    color VARCHAR(7) DEFAULT '#6B7280',
    sla_hours INTEGER DEFAULT 24,
    sort_order INTEGER DEFAULT 0
);

INSERT INTO issue_priorities (code, name_ru, name_en, color, sla_hours, sort_order) VALUES
('low', 'Низкий', 'Low', '#10B981', 72, 1),
('normal', 'Обычный', 'Normal', '#3B82F6', 24, 2),
('high', 'Высокий', 'High', '#F59E0B', 8, 3),
('urgent', 'Критичный', 'Urgent', '#EF4444', 2, 4)
ON CONFLICT (code) DO NOTHING;
```

## 2. API Спецификация

### 2.1 Пользовательские эндпоинты

#### `GET /api/user/issues`
```typescript
// Query params: page, limit, status, type
// Response:
{
  success: boolean;
  issues: Issue[];
  total: number;
  page: number;
  limit: number;
}

interface Issue {
  id: string;
  title: string;
  description: string;
  type: 'access' | 'payment' | 'content' | 'bug' | 'other';
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  first_reply_at: string | null;
  closed_at: string | null;
  issue_replies: IssueReply[];
  delivery_status: Record<string, any>;
}
```

#### `POST /api/user/issues`
```typescript
// Body:
{
  subject: string;
  description: string;
  issueType: 'access' | 'payment' | 'content' | 'bug' | 'other';
  severity: 'low' | 'normal' | 'high' | 'urgent';
  purchaseId?: string;
  documentId?: string;
  url?: string;
  context: Record<string, any>;
}

// Response:
{
  success: boolean;
  issue: Issue;
}
```

#### `POST /api/user/issues/:id/reply`
```typescript
// Body:
{
  message: string;
  attachments?: string[];
}

// Response:
{
  success: boolean;
  reply: IssueReply;
  issue: Issue;
}
```

#### `GET /api/user/issues/:id/stream` (SSE)
```typescript
// Server-Sent Events для real-time обновлений
// Events: new_message, status_changed, assignment_changed
```

#### `POST /api/user/contacts`
```typescript
// Body:
{
  phone?: string;
  telegram_username?: string;
  notify_email_enabled?: boolean;
  notify_telegram_enabled?: boolean;
  notify_policy?: Record<string, any>;
  timezone?: string;
  language?: string;
}

// Response:
{
  success: boolean;
  user: User;
}
```

#### `POST /api/telegram/link/start`
```typescript
// Response:
{
  success: boolean;
  link: string; // t.me/bot?start=token
  expires_at: string;
}
```

### 2.2 Административные эндпоинты

#### `GET /api/admin/issues`
```typescript
// Query params: page, limit, status, type, assignee, q, from, to, user_id
// Response:
{
  success: boolean;
  issues: AdminIssue[];
  total: number;
  page: number;
  limit: number;
  counters: Record<string, number>;
}

interface AdminIssue extends Issue {
  user_email: string;
  user_phone?: string;
  user_telegram_username?: string;
  assignee?: string;
  escalation_level: number;
  sla_deadline?: string;
  tags: string[];
}
```

#### `GET /api/admin/issues/:id`
```typescript
// Response:
{
  success: boolean;
  issue: AdminIssue;
  user: User;
  purchase?: Purchase;
  document?: Document;
}
```

#### `POST /api/admin/issues/:id/reply`
```typescript
// Body:
{
  message: string;
  status?: string;
  assignee?: string;
  priority?: string;
  tags?: string[];
  is_internal?: boolean;
  attachments?: string[];
}

// Response:
{
  success: boolean;
  reply: IssueReply;
  issue: AdminIssue;
  notifications_sent: {
    email: boolean;
    telegram: boolean;
  };
}
```

#### `POST /api/admin/issues/:id/status`
```typescript
// Body:
{
  status: string;
  assignee?: string;
  priority?: string;
  tags?: string[];
  note?: string;
}

// Response:
{
  success: boolean;
  issue: AdminIssue;
}
```

#### `GET /api/admin/issues/:id/stream` (SSE)
```typescript
// Server-Sent Events для real-time обновлений в админке
```

### 2.3 Системные эндпоинты

#### `POST /api/telegram/webhook` (для бота пользователей)
```typescript
// Обработка webhook от Telegram Bot API
// Валидация токенов, связывание пользователей
```

#### `POST /api/notifications/send`
```typescript
// Внутренний эндпоинт для отправки уведомлений
// Body:
{
  user_id: string;
  type: 'email' | 'telegram' | 'both';
  template: string;
  variables: Record<string, any>;
  issue_id?: string;
  reply_id?: string;
}
```

## 3. Диаграммы потоков

### 3.1 Создание обращения пользователем
```
Пользователь → Dashboard → ReportIssueDialog → POST /api/user/issues
    ↓
Валидация контактов → Создание в БД → Telegram админам → Email админам
    ↓
Ответ: success + issue_id → Обновление UI → SSE событие
```

### 3.2 Ответ администратора
```
Админ → AdminPanel → IssuesDashboard → POST /api/admin/issues/:id/reply
    ↓
Создание reply → Обновление статуса → Уведомления пользователю
    ↓
Email пользователю → Telegram пользователю → SSE события
    ↓
Обновление UI (Admin + User) → Логирование доставки
```

### 3.3 Связывание Telegram
```
Пользователь → Dashboard → "Подключить Telegram" → POST /api/telegram/link/start
    ↓
Генерация токена → Deep-link → Переход в Telegram
    ↓
Webhook от бота → Валидация токена → Связывание chat_id
    ↓
Подтверждение в UI → Настройка уведомлений
```

## 4. Критерии приёмки (DoD)

### 4.1 Базовый функционал
- [ ] Пользователь может создать обращение с контекстом покупки
- [ ] Администратор видит обращение в админке с полными данными пользователя
- [ ] Администратор может ответить на обращение
- [ ] Пользователь получает уведомления (email + telegram)
- [ ] История переписки сохраняется и отображается

### 4.2 Уведомления
- [ ] Telegram уведомления админам содержат читаемые данные пользователя
- [ ] Email уведомления пользователям работают
- [ ] Telegram уведомления пользователям работают
- [ ] При недоставке фиксируется статус и есть fallback

### 4.3 Real-time
- [ ] SSE работает для обновлений в реальном времени
- [ ] Fallback на поллинг при недоступности SSE
- [ ] Синхронизация между вкладками

### 4.4 Безопасность
- [ ] Валидация всех входных данных
- [ ] Защита от доступа к чужим обращениям
- [ ] Rate limiting на создание обращений
- [ ] Аудит всех действий

### 4.5 Производительность
- [ ] Индексы на все часто используемые поля
- [ ] Пагинация работает корректно
- [ ] SSE соединения не блокируют сервер
- [ ] Уведомления отправляются асинхронно

## 5. Переменные окружения

```bash
# Email провайдер
RESEND_API_KEY=re_xxx
NOTIFY_SENDER_EMAIL=support@energylogic.ru
NOTIFY_SENDER_NAME=EnergyLogic Support

# Telegram (админы)
TELEGRAM_BOT_TOKEN=xxx:xxx
TELEGRAM_CHAT_ID=-100xxx
TELEGRAM_THREAD_ISSUES=123
TELEGRAM_THREAD_CALLBACKS=124
TELEGRAM_THREAD_PAYMENTS=125

# Telegram (пользователи)
USER_TELEGRAM_BOT_TOKEN=xxx:xxx
USER_TELEGRAM_WEBHOOK_URL=https://domain.com/api/telegram/webhook
USER_TELEGRAM_WEBHOOK_SECRET=secret_key

# Флаги
NOTIFY_ISSUES_VIA_TELEGRAM=true
NOTIFY_USERS_VIA_EMAIL=true
NOTIFY_USERS_VIA_TELEGRAM=true
SSE_ENABLED=true
AUDIT_ENABLED=true

# SLA
ISSUE_SLA_FIRST_RESPONSE_HOURS=24
ISSUE_SLA_URGENT_HOURS=2
ISSUE_SLA_ESCALATION_HOURS=48
```

## 6. Вторичные и третичные проблемы

### 6.1 Несогласованность статусов
- **Проблема**: Разные значения статусов в разных частях системы
- **Решение**: Единый справочник `issue_statuses`, миграция существующих данных
- **Третичная**: Валидация статусов на уровне БД через CHECK constraints

### 6.2 Размер context_json
- **Проблема**: Неограниченный размер может замедлить запросы
- **Решение**: Лимит 10KB, усечение при превышении, сжатие
- **Третичная**: Архивация старых обращений с большим контекстом

### 6.3 Временные зоны
- **Проблема**: Разные временные зоны пользователей и сервера
- **Решение**: Хранение в UTC, конвертация в UI по timezone пользователя
- **Третичная**: Автоопределение timezone по IP/браузеру

### 6.4 Telegram rate limits
- **Проблема**: Ограничения API Telegram (30 сообщений/сек)
- **Решение**: Очередь с backoff, батчинг сообщений
- **Третичная**: Мониторинг лимитов, алерты при приближении

### 6.5 Утечки chat_id
- **Проблема**: Возможная утечка приватных данных
- **Решение**: Шифрование при хранении, маскирование в логах
- **Третичная**: Регулярная ротация ключей шифрования

### 6.6 Потеря SSE соединений
- **Проблема**: Мобильные браузеры закрывают соединения
- **Решение**: Автоматическое переподключение, fallback на поллинг
- **Третичная**: Service Worker для фоновых обновлений

### 6.7 Дублирование уведомлений
- **Проблема**: Повторная отправка при retry
- **Решение**: Idempotency ключи, дедупликация по времени
- **Третичная**: Хеширование содержимого для детекции дублей

### 6.8 Производительность больших тредов
- **Проблема**: Медленная загрузка обращений с множеством ответов
- **Решение**: Виртуализация списка, ленивая загрузка
- **Третичная**: Архивация старых ответов, сжатие

### 6.9 Конфликты параллельных правок
- **Проблема**: Два админа одновременно меняют статус
- **Решение**: Optimistic locking, перезагрузка при конфликте
- **Третичная**: WebSocket для мгновенных уведомлений о изменениях

### 6.10 Мониторинг и алерты
- **Проблема**: Отсутствие видимости в проблемы системы
- **Решение**: Метрики в PostHog, алерты на SLA нарушения
- **Третичная**: Дашборд с real-time метриками для админов
