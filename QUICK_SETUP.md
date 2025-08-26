# 🚀 Быстрая настройка: Telegram + Supabase

## ⚡ За 15 минут к работающей системе заявок!

### 1️⃣ **Настройка базы данных (3 минуты)**

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard)
2. Выберите ваш проект
3. Перейдите в **SQL Editor**
4. Вставьте и выполните этот код:

```sql
-- Создание таблицы заявок
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

-- Индексы для быстрого поиска
CREATE INDEX callback_requests_status_idx ON public.callback_requests(status);
CREATE INDEX callback_requests_created_at_idx ON public.callback_requests(created_at);
CREATE INDEX callback_requests_phone_idx ON public.callback_requests(phone);

-- Включение RLS
ALTER TABLE public.callback_requests ENABLE ROW LEVEL SECURITY;

-- Политики безопасности
CREATE POLICY "Anyone can create callback requests" ON public.callback_requests
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Only authenticated users can view callback requests" ON public.callback_requests
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only authenticated users can update callback requests" ON public.callback_requests
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Триггер для обновления времени
CREATE TRIGGER set_callback_requests_updated_at
    BEFORE UPDATE ON public.callback_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 2️⃣ **Создание Telegram бота (5 минут)**

1. **Создайте бота:**
   - Откройте Telegram
   - Найдите @BotFather
   - Отправьте `/newbot`
   - Следуйте инструкциям
   - Сохраните токен (например: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

2. **Получите Chat ID:**
   - Найдите @userinfobot
   - Отправьте любое сообщение
   - Сохраните ваш Chat ID (например: `123456789`)

3. **Добавьте бота в чат:**
   - Создайте группу или используйте личный чат
   - Добавьте бота в чат
   - Получите Chat ID группы (если используете группу)

### 3️⃣ **Настройка переменных окружения (2 минуты)**

Откройте файл `.env.local` и добавьте:

```bash
# Telegram Bot
TELEGRAM_BOT_TOKEN=ваш_токен_бота
TELEGRAM_CHAT_ID=ваш_chat_id
```

### 4️⃣ **Тестирование (5 минут)**

1. **Перезапустите сервер:**
   ```bash
   npm run dev
   ```

2. **Отправьте тестовую заявку:**
   - Откройте сайт
   - Нажмите "Заказать звонок"
   - Заполните форму
   - Отправьте

3. **Проверьте результат:**
   - ✅ Заявка появилась в админ-панели: `/admin/callbacks`
   - ✅ Пришло уведомление в Telegram
   - ✅ Данные сохранились в Supabase

## 🎯 **Готово!**

Теперь у вас есть:
- ✅ Формы заявок на всех страницах
- ✅ Сохранение в базу данных
- ✅ Мгновенные уведомления в Telegram
- ✅ Админ-панель для управления

## 📱 **Админ-панель**

Доступна по адресу: `http://localhost:3000/admin/callbacks`

Функции:
- Просмотр всех заявок
- Фильтрация по статусам
- Обновление статусов
- Прямой звонок клиенту

## 🔧 **Если что-то не работает:**

### Проверьте:
1. **База данных создана** - в Supabase Dashboard
2. **Переменные окружения** - в `.env.local`
3. **Telegram бот работает** - отправьте `/start` боту
4. **Сервер перезапущен** - после изменения `.env.local`

### Логи ошибок:
- Откройте консоль браузера (F12)
- Проверьте вкладку Network
- Посмотрите на ошибки в терминале

## 🚀 **Следующие шаги (опционально):**

1. **Настройте аутентификацию** для админ-панели
2. **Добавьте email уведомления**
3. **Интегрируйте с AmoCRM** (когда будете готовы)
4. **Настройте аналитику**

## 📞 **Нужна помощь?**

Если что-то не получается - пишите! Помогу настроить любой из шагов.
