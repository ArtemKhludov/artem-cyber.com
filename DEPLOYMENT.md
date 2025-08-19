# 🚀 Руководство по развертыванию EnergyLogic

Это руководство поможет вам развернуть приложение EnergyLogic в продакшене.

## 📋 Предварительные требования

### 1. Supabase
- Создайте проект на [supabase.com](https://supabase.com)
- Выполните SQL-схему из файла `supabase-schema.sql` в SQL Editor
- Настройте аутентификацию (Email/Password)
- Получите URL проекта и API ключи

### 2. Stripe
- Создайте аккаунт на [stripe.com](https://stripe.com)
- Получите публичный и секретный ключи
- Настройте веб-хуки для обработки платежей

### 3. Daily.co
- Создайте аккаунт на [daily.co](https://daily.co)
- Получите API ключ и домен
- Настройте лимиты для видеоконференций

### 4. Cal.com
- Создайте аккаунт на [cal.com](https://cal.com)
- Настройте календарь бронирования
- Получите username для встраивания

### 5. PostHog
- Создайте проект на [posthog.com](https://posthog.com)
- Получите API ключ и хост

## ⚙️ Настройка переменных окружения

Создайте файл `.env.local` и заполните следующие переменные:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your-publishable-key
STRIPE_SECRET_KEY=sk_live_your-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Daily.co
NEXT_PUBLIC_DAILY_DOMAIN=your-domain.daily.co
DAILY_API_KEY=your-daily-api-key

# Cal.com
NEXT_PUBLIC_CAL_COM_USERNAME=your-username

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=phc_your-posthog-key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.com
JWT_SECRET=your-super-secret-jwt-key
```

## 🗄️ Настройка базы данных

1. Войдите в Supabase Dashboard
2. Перейдите в SQL Editor
3. Выполните содержимое файла `supabase-schema.sql`
4. Убедитесь, что все таблицы созданы корректно
5. Проверьте настройки RLS (Row Level Security)

## 💳 Настройка Stripe

### Создание продуктов
```bash
# Создайте продукт для диагностики
stripe products create \
  --name "Энергетическая диагностика" \
  --description "60-минутная персональная сессия с PDF-отчетом"

# Создайте цену
stripe prices create \
  --product prod_xxx \
  --unit-amount 499900 \
  --currency rub
```

### Настройка веб-хуков
1. Создайте endpoint: `https://your-domain.com/api/webhooks/stripe`
2. Добавьте события: `payment_intent.succeeded`, `payment_intent.payment_failed`
3. Скопируйте webhook secret в переменную `STRIPE_WEBHOOK_SECRET`

## 📹 Настройка Daily.co

1. Создайте домен в Dashboard
2. Настройте лимиты участников (рекомендуется: 2)
3. Включите запись сессий (опционально)
4. Скопируйте API ключ и домен

## 📅 Настройка Cal.com

1. Создайте event type "energy-diagnostic"
2. Настройте продолжительность: 60 минут
3. Укажите буферное время: 15 минут
4. Настройте уведомления
5. Получите username для встраивания

## 📊 Настройка PostHog

1. Создайте проект
2. Настройте трекинг событий:
   - `page_viewed`
   - `booking_started`
   - `payment_completed`
   - `session_joined`
   - `pdf_downloaded`
3. Создайте dashboards для аналитики

## 🚀 Развертывание

### Vercel (рекомендуется)
```bash
# Установите Vercel CLI
npm i -g vercel

# Логин
vercel login

# Развертывание
vercel --prod
```

### Ручная настройка переменных в Vercel
1. Перейдите в Project Settings
2. Добавьте все переменные из `.env.local`
3. Убедитесь, что переменные с префиксом `NEXT_PUBLIC_` видны в браузере

### Альтернативные платформы
- **Netlify**: Поддерживает Next.js с плагином
- **Railway**: Простое развертывание с автоматическим масштабированием
- **AWS**: Через Amplify или EC2 с PM2
- **DigitalOcean**: App Platform или Droplet

## 🔐 SSL и домен

1. Настройте собственный домен
2. Убедитесь, что SSL-сертификат активен
3. Обновите переменную `NEXT_PUBLIC_APP_URL`
4. Обновите redirect URLs в Stripe и Supabase

## 📈 Мониторинг и аналитика

### Настройка мониторинга
- **Sentry**: Для отслеживания ошибок
- **LogRocket**: Для записи пользовательских сессий
- **Uptime Robot**: Для мониторинга доступности

### Настройка бэкапов
- Автоматические бэкапы Supabase
- Экспорт данных Stripe
- Сохранение записей Daily.co

## 🧪 Тестирование

### Локальное тестирование
```bash
# Запуск в режиме разработки
npm run dev

# Билд и проверка
npm run build
npm run start

# Линтинг
npm run lint
```

### Тестирование интеграций
1. **Stripe**: Используйте тестовые карты
2. **Daily.co**: Создайте тестовую комнату
3. **Cal.com**: Протестируйте бронирование
4. **Supabase**: Проверьте RLS политики

## 🚨 Безопасность

### Обязательные настройки
- [ ] Включен HTTPS
- [ ] Настроены CORS политики
- [ ] Активированы RLS в Supabase
- [ ] Скрыты секретные ключи
- [ ] Настроена rate limiting

### Рекомендации
- Используйте environment-specific ключи
- Регулярно ротируйте API ключи
- Мониторьте подозрительную активность
- Настройте алерты для критических событий

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи в Vercel/Netlify
2. Убедитесь, что все переменные окружения заданы
3. Проверьте статус внешних сервисов
4. Обратитесь к документации соответствующих API

## 🔄 Обновления

### Регулярные задачи
- Обновление зависимостей
- Проверка security alerts
- Мониторинг производительности
- Обновление контента

### Процесс обновления
1. Тестирование в dev окружении
2. Создание бэкапа
3. Развертывание в staging
4. Тестирование staging
5. Развертывание в production
6. Мониторинг после деплоя

---

🎉 **Поздравляем! Ваше приложение EnergyLogic готово к работе!**
