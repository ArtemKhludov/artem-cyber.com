# 🌟 EnergyLogic - Платформа энергетической диагностики

Современная веб-платформа для проведения персональных энергетических диагностик с интеграцией видеосвязи, онлайн-платежей и автоматической генерацией отчетов.

## ✨ Основные возможности

- 🏠 **Лендинговая страница** - современный дизайн с описанием услуг
- 📅 **Система бронирования** - интеграция с Cal.com для записи на сессии  
- 💳 **Онлайн-платежи** - безопасная оплата через Stripe
- 🎥 **Видеосессии** - аудио/видео встречи через Daily.co
- 📄 **PDF-отчеты** - автоматическая генерация персональных результатов
- 👤 **Личный кабинет** - управление заказами и историей
- 📊 **Аналитика** - отслеживание событий через PostHog

## 🛠 Технический стек

### Frontend
- **Next.js 15** - React фреймворк с App Router
- **TypeScript** - строгая типизация
- **Tailwind CSS** - утилитарные стили
- **Radix UI** - доступные компоненты

### Backend & Services
- **Supabase** - база данных и аутентификация
- **Stripe** - обработка платежей
- **Daily.co** - видеоконференции
- **Cal.com** - система бронирования
- **PostHog** - аналитика и трекинг

## 🚀 Быстрый старт

### 1. Клонирование и установка

```bash
git clone <repository-url>
cd energylogic-site
npm install
```

### 2. Настройка переменных окружения

Скопируйте `.env.example` в `.env.local` и заполните:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe  
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Daily.co
NEXT_PUBLIC_DAILY_DOMAIN=your_daily_domain
DAILY_API_KEY=your_daily_api_key

# Cal.com
NEXT_PUBLIC_CAL_COM_USERNAME=your_cal_username

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
JWT_SECRET=your_jwt_secret
```

### 3. Настройка базы данных

1. Создайте проект в [Supabase](https://supabase.com)
2. Выполните SQL-схему из файла ``
3. Настройте аутентификацию (Email/Password)

### 4. Запуск разработки

```bash
npm run dev
```

Приложение будет доступно по адресу [http://localhost:3000](http://localhost:3000)

## 📁 Структура проекта

```
energylogic-site/
├── app/                          # Next.js App Router
│   ├── (pages)/
│   │   ├── page.tsx             # Главная страница
│   │   ├── book/                # Бронирование
│   │   ├── checkout/            # Оплата
│   │   ├── session/[id]/        # Видеосессии
│   │   └── download/[orderId]/  # Скачивание PDF
│   ├── api/                     # API роуты
│   │   ├── create-payment-intent/
│   │   └── daily/
│   ├── globals.css              # Глобальные стили
│   └── layout.tsx               # Основной layout
├── components/                   # React компоненты
│   ├── layout/                  # Header, Footer
│   ├── providers/               # Context провайдеры
│   └── ui/                      # UI компоненты
├── lib/                         # Утилиты и конфигурация
│   ├── supabase.ts             # Supabase клиент
│   ├── stripe.ts               # Stripe конфигурация
│   ├── daily.ts                # Daily.co интеграция
│   ├── posthog.ts              # PostHog настройки
│   └── utils.ts                # Общие утилиты
├── types/                       # TypeScript типы
└── public/                      # Статические файлы
```

## 🔧 Доступные команды

```bash
# Разработка
npm run dev

# Сборка для продакшена
npm run build

# Запуск продакшен сервера
npm run start

# Линтинг
npm run lint
```

## 🎯 Основные страницы

### Главная страница (`/`)
- Hero секция с описанием услуг
- Процесс диагностики (4 шага)
- Преимущества и стоимость
- CTA для записи

### Бронирование (`/book`)
- Интеграция с Cal.com календарем
- Информация о сессии
- Переход к оплате

### Оплата (`/checkout`)
- Форма оплаты через Stripe
- Сводка заказа
- Безопасная обработка платежей

### Видеосессия (`/session/[id]`)
- Интеграция с Daily.co
- Аудио/видео связь
- Управление участниками

### Загрузка результатов (`/download/[orderId]`)
- Скачивание PDF-отчетов
- Просмотр статуса заказа
- Информация о содержании

## 🔑 Интеграции

### Supabase
- Аутентификация пользователей
- База данных заказов и сессий
- Row Level Security (RLS)
- Триггеры и функции

### Stripe
- Обработка платежей
- Webhook события
- Возвраты и споры

### Daily.co
- Создание видеокомнат
- Управление токенами
- Запись сессий

### Cal.com
- Календарь бронирования
- Iframe интеграция
- Webhook уведомления

### PostHog
- Трекинг событий
- Аналитика поведения
- A/B тестирование

## 🚀 Развертывание

Подробные инструкции по развертыванию см. в файле [DEPLOYMENT.md](./DEPLOYMENT.md)

### Vercel (рекомендуется)

```bash
npm i -g vercel
vercel login
vercel --prod
```

### Другие платформы
- Netlify
- Railway  
- AWS Amplify
- DigitalOcean App Platform

## 🔒 Безопасность

- ✅ HTTPS обязателен
- ✅ Environment variables для секретов
- ✅ Row Level Security в Supabase
- ✅ CORS настроен правильно
- ✅ Rate limiting на API
- ✅ Валидация данных

## 📊 Мониторинг

- **Sentry** - отслеживание ошибок
- **PostHog** - аналитика пользователей
- **Vercel Analytics** - производительность
- **Uptime Robot** - мониторинг доступности

## 🤝 Вклад в проект

1. Fork репозитория
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменений (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📄 Лицензия

Проект лицензирован под MIT License - см. файл [LICENSE](LICENSE) для деталей.

## 📞 Поддержка

- 📧 Email: support@energylogic.com
- 💬 Telegram: @energylogic_support
- 📱 Телефон: +7 (999) 123-45-67

---

**EnergyLogic** - Откройте свой энергетический потенциал! ⚡
