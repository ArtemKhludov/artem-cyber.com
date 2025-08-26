# 🎯 Система заявок на обратный звонок

## 📋 Обзор

Система заявок на обратный звонок для сайта EnergyLogic включает:
- ✅ Формы заявок на всех страницах
- ✅ Сохранение в базу данных Supabase
- ✅ Интеграция с AmoCRM
- ✅ Уведомления (Telegram, Email, Webhook)
- ✅ Админ-панель для управления заявками

## 🗄️ База данных

### Таблица `callback_requests`

```sql
CREATE TABLE public.callback_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    preferred_time TEXT,
    message TEXT,
    source_page TEXT,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'completed', 'cancelled')),
    admin_notes TEXT,
    contacted_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔧 Настройка

### 1. Переменные окружения

Добавьте в `.env.local`:

```bash
# AmoCRM Integration
AMOCRM_DOMAIN=your-domain.amocrm.ru
AMOCRM_CLIENT_ID=your_client_id
AMOCRM_CLIENT_SECRET=your_client_secret
AMOCRM_REDIRECT_URI=http://localhost:3000/api/auth/amocrm/callback
AMOCRM_ACCESS_TOKEN=your_access_token
AMOCRM_REFRESH_TOKEN=your_refresh_token

# Notifications
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
WEBHOOK_URL=your_webhook_url

# Email (optional)
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
```

### 2. Настройка AmoCRM

#### Создание интеграции в AmoCRM:

1. Перейдите в **Настройки → Интеграции → API**
2. Создайте новую интеграцию
3. Получите `client_id` и `client_secret`
4. Настройте `redirect_uri`

#### Настройка полей в AmoCRM:

Обновите ID полей в `lib/amocrm.ts`:

```typescript
// Контакты
field_id: 123456, // ID поля телефона
field_id: 123457, // ID поля email

// Сделки
field_id: 123458, // ID поля источника
field_id: 123459, // ID поля UTM Source
field_id: 123460, // ID поля UTM Medium
field_id: 123461, // ID поля UTM Campaign
field_id: 123462, // ID поля "Удобное время"
field_id: 123463, // ID поля "Сообщение"

// Задачи
field_id: 123464, // ID поля "Приоритет"
```

### 3. Настройка Telegram бота

1. Создайте бота через @BotFather
2. Получите `TELEGRAM_BOT_TOKEN`
3. Добавьте бота в нужный чат
4. Получите `TELEGRAM_CHAT_ID` (можно через @userinfobot)

## 🚀 Использование

### API Endpoints

#### POST `/api/callback`
Создание новой заявки

```json
{
  "name": "Иван Иванов",
  "phone": "+7 (999) 123-45-67",
  "email": "ivan@example.com",
  "preferred_time": "после 18:00",
  "message": "Интересует программа трансформации",
  "source_page": "/book"
}
```

#### GET `/api/callbacks`
Получение списка заявок

Параметры:
- `status` - фильтр по статусу
- `page` - номер страницы
- `limit` - количество на странице

#### PATCH `/api/callbacks`
Обновление статуса заявки

```json
{
  "id": "uuid",
  "status": "contacted",
  "admin_notes": "Позвонили, договорились о встрече"
}
```

### Админ-панель

Доступна по адресу: `/admin/callbacks`

Функции:
- ✅ Просмотр всех заявок
- ✅ Фильтрация по статусу
- ✅ Обновление статусов
- ✅ Прямой звонок клиенту
- ✅ Пагинация

## 📊 Статусы заявок

- **new** - Новая заявка
- **contacted** - Связались с клиентом
- **completed** - Заявка завершена
- **cancelled** - Заявка отменена

## 🔄 Интеграция с AmoCRM

### Автоматические действия:

1. **Создание контакта** - при каждой заявке
2. **Создание сделки** - связанной с контактом
3. **Создание задачи** - на звонок клиенту
4. **Заполнение полей** - источник, UTM, сообщение

### Воронка продаж:

```
Новая заявка → Связались → Завершена
```

## 📱 Уведомления

### Telegram
- Мгновенные уведомления о новых заявках
- Информация о клиенте и AmoCRM ID

### Email (опционально)
- Настраивается через SMTP
- Шаблоны можно кастомизировать

### Webhook
- Отправка данных на внешние системы
- Полная информация о заявке и AmoCRM

## 🛠️ Разработка

### Добавление новых полей

1. Обновите схему базы данных
2. Добавьте поля в API
3. Обновите форму в `CallRequestModal`
4. Добавьте поля в AmoCRM интеграцию

### Кастомизация уведомлений

Редактируйте функции в `app/api/callback/route.ts`:
- `sendTelegramNotification()`
- `sendEmailNotification()`
- `sendWebhookNotification()`

## 🔒 Безопасность

- Валидация всех входных данных
- Rate limiting (можно добавить)
- Аутентификация для админ-панели
- Row Level Security в Supabase

## 📈 Аналитика

### Метрики для отслеживания:

- Количество заявок по дням/неделям
- Конверсия по страницам
- Время обработки заявок
- Статистика по статусам

### Интеграция с аналитикой:

Можно добавить отправку событий в:
- Google Analytics
- Yandex.Metrica
- PostHog
- Mixpanel

## 🚨 Мониторинг

### Логирование:

Все ошибки логируются в консоль:
- Ошибки API
- Проблемы с AmoCRM
- Ошибки уведомлений

### Алерты:

Настройте алерты на:
- Ошибки API
- Недоступность AmoCRM
- Высокую нагрузку

## 🔧 Поддержка

### Частые проблемы:

1. **AmoCRM не отвечает** - проверьте токены и настройки
2. **Telegram не отправляет** - проверьте токен бота и chat_id
3. **Форма не отправляется** - проверьте валидацию полей

### Контакты для поддержки:

- Техническая поддержка: [email]
- Документация: [ссылка на docs]
- Issues: [ссылка на GitHub]
