# 🎯 Grace Period System - Финальная настройка

## ⚠️ ВАЖНО: Исправлены ошибки!

### ✅ Что исправлено:
1. **Таблица `user_access` → `user_course_access`** - используется правильное название таблицы
2. **Импорт `@/lib/auth`** - заменен на встроенную функцию `requireAdmin`
3. **SQL скрипт обновлен** - создает таблицу `user_course_access` если её нет

## 🚀 Пошаговая настройка

### 1. Выполните SQL миграцию

```bash
# Подключитесь к вашей Supabase базе данных
psql -h your-host -U your-user -d your-db -f add_grace_period_fields.sql
```

**Что делает скрипт:**
- ✅ Добавляет поля `grace_period_until`, `grace_period_verified`, `verification_attempts` в таблицу `purchases`
- ✅ Создает таблицу `user_course_access` если её нет
- ✅ Добавляет поля `is_grace_period`, `grace_period_until` в таблицу `user_course_access`
- ✅ Создает индексы для быстрого поиска
- ✅ Добавляет комментарии к полям

### 2. Проверьте, что таблица создана

```sql
-- Проверьте, что таблица user_course_access существует
SELECT * FROM user_course_access LIMIT 1;

-- Проверьте, что поля grace_period добавлены
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'purchases' 
AND column_name LIKE 'grace_period%';
```

### 3. Настройте переменные окружения

Добавьте в `.env.local`:

```env
# Для автоматической проверки grace period (опционально)
ADMIN_SESSION_TOKEN=your_admin_session_token_here

# Stripe (должно быть уже настроено)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email уведомления (должно быть уже настроено)
RESEND_API_KEY=re_...
NOTIFY_SENDER_EMAIL=noreply@yourdomain.com
```

### 4. Перезапустите dev сервер

```bash
# Остановите текущий сервер (Ctrl+C)
# Затем запустите заново
npm run dev
```

## 🧪 Тестирование

### Тест API endpoints

```bash
# 1. Выдача временного доступа
curl -X POST http://localhost:3000/api/admin/access/grant-temporary \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "courseId": "test-course-id",
    "gracePeriodMinutes": 30
  }'

# 2. Проверка grace period
curl -X POST http://localhost:3000/api/admin/payments/verify-grace-period \
  -H "Content-Type: application/json"

# 3. Уведомление о pending статусе
curl -X POST http://localhost:3000/api/admin/notifications/pending-payment \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "customMessage": "Ваш платеж проверяется..."
  }'
```

### Тест скрипта проверки

```bash
# Запустите скрипт автоматической проверки
npm run grace-period:verify
```

## 📊 Мониторинг

### Проверка grace period записей

```sql
-- Просмотр всех grace period покупок
SELECT 
  id,
  user_email,
  product_name,
  grace_period_until,
  grace_period_verified,
  verification_attempts,
  status,
  created_at
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
  is_active,
  granted_at
FROM user_course_access 
WHERE is_grace_period = TRUE
ORDER BY grace_period_until DESC;
```

### Проверка логов

```sql
-- Действия с grace period
SELECT 
  action,
  target_type,
  created_at,
  metadata
FROM audit_logs 
WHERE action LIKE '%grace_period%'
ORDER BY created_at DESC
LIMIT 20;
```

## 🔧 Автоматизация

### Настройка cron job

Добавьте в crontab для автоматической проверки каждые 30 минут:

```bash
# Откройте crontab
crontab -e

# Добавьте строку (замените путь на ваш)
*/30 * * * * cd /path/to/energylogic-site && npm run grace-period:verify >> /var/log/grace-period.log 2>&1
```

### Мониторинг логов

```bash
# Просмотр логов cron job
tail -f /var/log/grace-period.log

# Просмотр логов приложения
tail -f logs/app.log
```

## 🚨 Troubleshooting

### Ошибка "relation user_course_access does not exist"

**Решение:** Выполните SQL скрипт `add_grace_period_fields.sql`

### Ошибка "Module not found: @/lib/auth"

**Решение:** ✅ Исправлено - теперь используется встроенная функция `requireAdmin`

### Grace period не работает

**Проверьте:**
1. ✅ SQL скрипт выполнен
2. ✅ Поля добавлены в таблицы
3. ✅ Dev сервер перезапущен
4. ✅ Нет ошибок в консоли

### Автоматическая проверка не запускается

**Проверьте:**
1. ✅ ADMIN_SESSION_TOKEN в .env.local
2. ✅ Cron job настроен
3. ✅ Права доступа к скрипту

## 📈 Метрики для отслеживания

- **Количество grace period покупок** в день
- **Процент успешных проверок** платежей
- **Время ответа Stripe API**
- **Количество отозванных доступов**
- **Удовлетворенность пользователей** (меньше жалоб на задержки)

## 🎉 Готово!

**Grace Period система полностью настроена и готова к использованию!**

**Логика работы:**
1. Пользователь оплачивает → получает доступ **сразу на 30 минут**
2. Через 30 минут → система проверяет реальный статус в Stripe
3. Если платеж подтвержден → доступ остается **постоянным**
4. Если платеж не подтвержден → доступ **отзывается** + email уведомление

**Преимущества:**
- ✅ Улучшенный UX - доступ сразу после оплаты
- ✅ Защита от отзыва денег - 30 минут для подтверждения
- ✅ Автоматизация - проверка без участия человека
- ✅ Мониторинг - полные логи всех действий

---

**Система готова к продакшену!** 🚀
