# 🌟 EnergyLogic - Платформа продажи PDF-руководств

Современная веб-платформа для продажи цифровых PDF-руководств по личностному развитию с интеграцией онлайн-платежей, системой предпросмотра и красивыми каруселями.

## ✨ Основные возможности

- 🏠 **Лендинговая страница** - современный дизайн со звездным фоном
- 🎠 **Бесконечные карусели** - плавная прокрутка PDF-файлов с стрелками управления
- 📖 **Предпросмотр PDF** - просмотр первых страниц перед покупкой
- 💳 **Двойные платежи** - Stripe для международных платежей, Cryptomus для криптовалют
- 🌍 **Геолокация** - автоопределение страны для выбора платежной системы  
- 📊 **Статистика покупок** - динамическое отображение популярности
- 📱 **Адаптивный дизайн** - идеальная работа на всех устройствах
- 🔗 **SEO-оптимизация** - правильная структура ссылок и метаданные

## 🛠 Технический стек

### Frontend
- **Next.js 15** - React фреймворк с App Router
- **TypeScript** - строгая типизация
- **Tailwind CSS v4** - утилитарные стили
- **Lucide React** - иконки
- **React Hooks** - управление состоянием

### Backend & Платежи
- **Supabase** - база данных и аутентификация
- **Stripe** - международные платежи
- **Cryptomus** - криптовалютные платежи  
- **IPinfo.io** - геолокация пользователей

### Дизайн & UX
- **Адаптивный дизайн** - мобайл-ферст подход
- **Smooth анимации** - плавные переходы и эффекты
- **Бесконечные карусели** - без проблем с зацикливанием
- **Звездный фон** - динамические градиенты

## 🔧 Конфигурация

### Переменные окружения (.env.local)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://mcexzjzowwanxawbiizd.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZXh6anpvd3dhbnhawbiizdIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNzg4MjQsImV4cCI6MjA3MDk1NDgyNH0.-sAXcSK2crzmBULuPxRSfI9fNde9aQZxNvag2qkmZUs"

# Stripe (Тестовые ключи)
STRIPE_PUBLISHABLE_KEY="pk_test_51RwzjrJKXslR96bIz6j7XQrpz92U8YatoN0uj2dmVP1AtN9nJE3CHeSxWrmWg9pGdsX5obDcdPqsco5ccLW18Eyv00sImNc5Ii"
STRIPE_SECRET_KEY="sk_test_51RwzjrJKXslR96bIAUKh0Jzg18ZoJiqQ8KNJbqRHKah8k95Qz8hOOlethCrm6FDfb4NHZoWbKvVL1r9LE3Ep5OcG00xgfQVDX3"
STRIPE_WEBHOOK_SECRET="whsec_..." # Настроить при деплое

# Cryptomus
CRYPTOMUS_MERCHANT_ID="c2b099b4e7ccf66c5f0c3ea1085143da48ddfb63"
CRYPTOMUS_API_KEY="c2b099b4e7ccf66c5f0c3ea1085143da48ddfb63"

# Геолокация
IPINFO_API_KEY="YOUR_IPINFO_API_KEY" # Получить на ipinfo.io
```

### Схема базы данных Supabase

```sql
-- Таблица документов
CREATE TABLE documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL, -- цена в рублях
    price_rub INTEGER NOT NULL, -- дублирование для совместимости
    file_url TEXT NOT NULL,
    cover_url TEXT,
    page_count INTEGER DEFAULT 20,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица покупок
CREATE TABLE purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID REFERENCES documents(id),
    email TEXT,
    payment_method TEXT, -- 'stripe' или 'cryptomus'
    payment_status TEXT DEFAULT 'pending',
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'RUB',
    stripe_session_id TEXT,
    cryptomus_payment_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS политики
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Разрешить чтение документов всем
CREATE POLICY "Documents are viewable by everyone" ON documents
    FOR SELECT USING (true);

-- Разрешить создание покупок всем
CREATE POLICY "Anyone can create purchases" ON purchases
    FOR INSERT WITH CHECK (true);
```

## 🚀 Быстрый старт

### Установка
```bash
git clone https://github.com/ArtemKhludov/EnergyLogic.git
cd EnergyLogic
npm install
```

### Настройка
1. Создайте .env.local с переменными выше
2. Настройте Supabase проект и загрузите схему
3. Настройте Stripe webhook endpoints
4. Получите API ключ IPinfo.io

### Запуск
```bash
npm run dev
```

Сайт будет доступен на http://localhost:3000

## 🔗 Важные ссылки

- **GitHub**: https://github.com/ArtemKhludov/EnergyLogic.git
- **Supabase Dashboard**: https://supabase.com/dashboard/project/mcexzjzowwanxawbiizd
- **Stripe Dashboard**: https://dashboard.stripe.com/
- **Cryptomus Dashboard**: https://cryptomus.com/
- **IPinfo.io**: https://ipinfo.io/

## 📞 Контакты проекта

- **Email**: energylogic@project.ai
- **Phone**: +7 (999) 123-45-67
- **Поддержка**: Заказать звонок через сайт

---

**Версия**: 2.0.0  
**Последнее обновление**: Январь 2025  
**Статус**: ✅ Готов к продакшену
<!-- Trigger deployment Tue Sep 30 12:13:00 PDT 2025 -->
# Test deployment
