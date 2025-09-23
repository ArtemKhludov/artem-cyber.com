# 🎯 Grace Period System - Система временного доступа

## 📋 Описание

Grace Period система позволяет давать пользователям **временный доступ на 30 минут** сразу после оплаты, а затем проверять реальный статус платежа. Это предотвращает отзыв денег и улучшает пользовательский опыт.

## 🔄 Логика работы

1. **Пользователь оплачивает** → получает доступ **сразу**
2. **Через 30 минут** → система проверяет реальный статус в Stripe
3. **Если платеж подтвержден** → доступ остается **постоянным**
4. **Если платеж не подтвержден** → доступ **отзывается** + уведомление

## 🛠 Настройка

### 1. Выполните SQL скрипт

```bash
# Добавляет поля grace_period в базу данных
psql -h your-host -U your-user -d your-db -f add_grace_period_fields.sql
```

### 2. Настройте переменные окружения

Добавьте в `.env.local`:

```env
# Для автоматической проверки grace period
ADMIN_SESSION_TOKEN=your_admin_session_token_here

# Stripe (уже должно быть)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email уведомления (уже должно быть)
RESEND_API_KEY=re_...
NOTIFY_SENDER_EMAIL=noreply@yourdomain.com
```

### 3. Настройте cron job

Добавьте в crontab для автоматической проверки каждые 30 минут:

```bash
# Проверка grace period каждые 30 минут
*/30 * * * * cd /path/to/energylogic-site && npm run grace-period:verify
```

## 🚀 API Endpoints

### 1. Выдача временного доступа

```bash
POST /api/admin/access/grant-temporary
```

**Параметры:**
```json
{
  "userId": "user-id",
  "courseId": "course-id", 
  "gracePeriodMinutes": 30
}
```

### 2. Выдача доступа с grace period

```bash
POST /api/admin/access/grant
```

**Параметры:**
```json
{
  "userId": "user-id",
  "documentId": "course-id",
  "useGracePeriod": true,
  "gracePeriodMinutes": 30,
  "amountPaid": 5000,
  "currency": "RUB"
}
```

### 3. Проверка grace period покупок

```bash
POST /api/admin/payments/verify-grace-period
```

### 4. Уведомление о pending статусе

```bash
POST /api/admin/notifications/pending-payment
```

**Параметры:**
```json
{
  "userId": "user-id",
  "customMessage": "Ваш платеж проверяется..."
}
```

## 🧪 Тестирование

### Тест всей системы

```bash
npm run grace-period:test
```

### Ручная проверка

```bash
npm run grace-period:verify
```

## 📊 Мониторинг

### Логи grace period

```sql
-- Просмотр grace period покупок
SELECT 
  id,
  user_email,
  product_name,
  grace_period_until,
  grace_period_verified,
  verification_attempts,
  status
FROM purchases 
WHERE grace_period_until IS NOT NULL
ORDER BY grace_period_until DESC;

-- Просмотр grace period доступов
SELECT 
  id,
  user_id,
  document_id,
  is_grace_period,
  grace_period_until,
  is_active
FROM user_access 
WHERE is_grace_period = TRUE
ORDER BY grace_period_until DESC;
```

### Audit logs

```sql
-- Действия с grace period
SELECT 
  action,
  target_type,
  created_at,
  metadata
FROM audit_logs 
WHERE action LIKE '%grace_period%'
ORDER BY created_at DESC;
```

## 🔧 Управление

### Ручная проверка конкретной покупки

```bash
curl -X POST http://localhost:3000/api/admin/payments/verify-grace-period \
  -H "Authorization: Bearer $ADMIN_SESSION_TOKEN" \
  -H "Content-Type: application/json"
```

### Отправка уведомления пользователю

```bash
curl -X POST http://localhost:3000/api/admin/notifications/pending-payment \
  -H "Authorization: Bearer $ADMIN_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-id",
    "customMessage": "Ваш платеж проверяется, доступ временно активен"
  }'
```

## ⚠️ Важные моменты

1. **Grace period по умолчанию: 30 минут** - можно настроить
2. **Максимум 3 попытки проверки** - предотвращает спам
3. **Автоматический отзыв доступа** если платеж не подтвержден
4. **Email уведомления** пользователям о pending статусе
5. **Audit logs** для отслеживания всех действий

## 🚨 Troubleshooting

### Grace period не работает

1. Проверьте, что SQL скрипт выполнен
2. Убедитесь, что поля добавлены в таблицы
3. Проверьте логи на ошибки

### Автоматическая проверка не запускается

1. Проверьте cron job: `crontab -l`
2. Проверьте ADMIN_SESSION_TOKEN в .env.local
3. Проверьте права доступа к скрипту

### Stripe проверка не работает

1. Проверьте STRIPE_SECRET_KEY
2. Убедитесь, что payment_intent_id сохраняется
3. Проверьте логи Stripe API

## 📈 Метрики

Отслеживайте:
- Количество grace period покупок
- Процент успешных проверок
- Время ответа Stripe API
- Количество отозванных доступов
- Удовлетворенность пользователей

---

**Система готова к использованию!** 🎉
