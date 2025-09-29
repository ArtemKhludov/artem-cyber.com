# 🤖 Руководство по автоматизации EnergyLogic

## 📋 Обзор автоматизации

Проект настроен с полной автоматизацией для:
- ✅ Автоматические деплои
- ✅ Мониторинг здоровья сайта
- ✅ Очистка данных
- ✅ Уведомления в Telegram
- ✅ Webhooks для обновления контента

## 🚀 GitHub Actions

### 1. Автоматический деплой (`.github/workflows/deploy.yml`)
- **Триггер:** Push в ветку `main`
- **Действия:**
  - Запуск тестов
  - Проверка типов
  - Сборка проекта
  - Деплой на Vercel
  - Уведомления о статусе

### 2. Тестирование (`.github/workflows/test.yml`)
- **Триггер:** Push и Pull Request
- **Действия:**
  - ESLint проверка
  - TypeScript проверка
  - Сборка проекта
  - Аудит безопасности

### 3. Мониторинг (`.github/workflows/monitor.yml`)
- **Триггер:** Каждые 30 минут
- **Действия:**
  - Проверка доступности сайта
  - Проверка API endpoints
  - Мониторинг производительности
  - Уведомления о проблемах

## 🔗 Webhooks

### 1. Supabase Webhooks (`/api/webhooks/supabase`)
- **URL:** `https://energylogic-ai.com/api/webhooks/supabase`
- **События:**
  - Новые документы
  - Новые покупки
  - Новые пользователи
  - Новые обращения в поддержку
- **Действия:** Уведомления в Telegram

### 2. Stripe Webhooks (`/api/webhooks/stripe`)
- **URL:** `https://energylogic-ai.com/api/webhooks/stripe`
- **События:**
  - Успешные платежи
  - Неудачные платежи
  - Завершенные заказы
- **Действия:** Обновление статусов и уведомления

## ⏰ Cron Jobs

### 1. Очистка данных (`/api/cron/cleanup`)
- **Расписание:** Каждые 6 часов
- **Действия:**
  - Удаление истекших сессий
  - Очистка старых логов
  - Удаление временных файлов
  - Отправка ежедневного отчета

### 2. Проверка здоровья (`/api/cron/health-check`)
- **Расписание:** Каждые 30 минут
- **Действия:**
  - Проверка подключения к Supabase
  - Проверка доступности сайта
  - Проверка API endpoints
  - Уведомления о проблемах

## 🔧 Настройка

### 1. Переменные окружения в Vercel

Добавьте в Vercel Dashboard → Settings → Environment Variables:

```bash
# GitHub Actions
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_org_id
VERCEL_PROJECT_ID=your_project_id

# Cron Jobs
CRON_SECRET=your_random_secret

# Supabase Webhooks
SUPABASE_WEBHOOK_SECRET=your_webhook_secret

# Stripe Webhooks
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

### 2. Настройка webhooks в Supabase

1. Зайдите в Supabase Dashboard
2. Перейдите в Database → Webhooks
3. Создайте webhook:
   - **URL:** `https://energylogic-ai.com/api/webhooks/supabase`
   - **Events:** Insert, Update, Delete
   - **Tables:** documents, purchases, users, issue_reports

### 3. Настройка webhooks в Stripe

1. Зайдите в Stripe Dashboard
2. Перейдите в Developers → Webhooks
3. Создайте endpoint:
   - **URL:** `https://energylogic-ai.com/api/webhooks/stripe`
   - **Events:** payment_intent.succeeded, payment_intent.payment_failed, checkout.session.completed

### 4. Настройка cron jobs

#### Вариант 1: Через crontab (сервер)
```bash
# Запустите скрипт настройки
./scripts/setup-cron.sh

# Добавьте в crontab
crontab -e
```

#### Вариант 2: Через GitHub Actions (рекомендуется)
Уже настроено в `.github/workflows/monitor.yml`

## 📊 Мониторинг

### 1. Логи
- **Vercel Dashboard:** Логи деплоев и функций
- **GitHub Actions:** Логи автоматизации
- **Telegram:** Уведомления о событиях

### 2. Метрики
- Время отклика сайта
- Количество пользователей
- Количество покупок
- Количество обращений в поддержку

### 3. Алерты
- Недоступность сайта
- Ошибки в API
- Проблемы с базой данных
- Неудачные платежи

## 🛠️ Управление

### Запуск cron jobs вручную:
```bash
# Очистка
curl -X POST 'https://energylogic-ai.com/api/cron/cleanup' \
  -H 'Authorization: Bearer YOUR_CRON_SECRET'

# Проверка здоровья
curl -X POST 'https://energylogic-ai.com/api/cron/health-check' \
  -H 'Authorization: Bearer YOUR_CRON_SECRET'
```

### Отключение автоматизации:
1. Удалите webhooks в Supabase/Stripe
2. Отключите GitHub Actions
3. Удалите cron jobs

## 🔒 Безопасность

- Все webhooks проверяют подписи
- Cron jobs требуют авторизации
- Секретные ключи хранятся в переменных окружения
- Логи не содержат чувствительных данных

## 📈 Масштабирование

При росте проекта можно добавить:
- Мониторинг через Prometheus/Grafana
- Логирование через ELK Stack
- Уведомления через Slack/Discord
- Автоматическое масштабирование
- Балансировка нагрузки

## 🆘 Поддержка

При проблемах с автоматизацией:
1. Проверьте логи в Vercel Dashboard
2. Проверьте статус GitHub Actions
3. Проверьте настройки webhooks
4. Проверьте переменные окружения
5. Обратитесь к документации сервисов
