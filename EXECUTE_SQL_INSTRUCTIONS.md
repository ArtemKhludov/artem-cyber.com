# 🔧 Инструкция по выполнению SQL скрипта

## 🎯 Цель
Исправить структуру таблицы `purchases` для корректной работы системы покупок курсов.

## 📋 Пошаговая инструкция

### 1. Откройте Supabase Dashboard
- Перейдите на https://supabase.com/dashboard
- Выберите ваш проект
- Перейдите в раздел **SQL Editor**

### 2. Выполните SQL скрипт
- Скопируйте **весь** содержимое файла `fix-purchases-table.sql`
- Вставьте в SQL Editor
- Нажмите **Run** или **Execute**

### 3. Проверьте результат
После выполнения вы должны увидеть:
- ✅ Таблица `purchases` пересоздана
- ✅ Все индексы созданы
- ✅ RLS включен
- ✅ Политики безопасности созданы
- ✅ Триггеры настроены

## ⚠️ Важные замечания

### Что делает скрипт:
1. **Удаляет** старую таблицу `purchases` (если она есть)
2. **Создает** новую таблицу с правильной структурой
3. **Добавляет** все необходимые колонки:
   - `user_email` - email покупателя
   - `payment_status` - статус платежа
   - `amount_paid` - сумма оплаты
   - И другие поля
4. **Создает** индексы для оптимизации
5. **Настраивает** безопасность (RLS)

### Структура новой таблицы:
```sql
purchases (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  user_email TEXT NOT NULL,
  payment_method TEXT DEFAULT 'stripe',
  payment_status TEXT DEFAULT 'pending',
  stripe_payment_intent_id TEXT,
  cryptomus_order_id TEXT,
  amount_paid INTEGER NOT NULL,
  currency TEXT DEFAULT 'RUB',
  user_country TEXT,
  user_ip TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
```

## 🧪 После выполнения

После успешного выполнения SQL скрипта:

1. **Запустим тестирование** системы покупок
2. **Создадим тестовые данные**
3. **Проверим API дашборда**
4. **Протестируем безопасность**

## ❌ Если возникли ошибки

### Ошибка "column does not exist":
- Убедитесь, что выполнили **весь** скрипт
- Проверьте, что команда `DROP TABLE` выполнилась

### Ошибка "table already exists":
- Это нормально, скрипт использует `DROP TABLE IF EXISTS`

### Ошибка "permission denied":
- Убедитесь, что используете права администратора
- Проверьте, что подключены к правильному проекту

## 🎉 Готово!

После выполнения скрипта сообщите, и я продолжу качественное тестирование системы!
