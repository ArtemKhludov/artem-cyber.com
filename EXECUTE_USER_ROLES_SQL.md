# Инструкции для выполнения SQL скрипта

## Шаг 1: Выполните SQL скрипт в Supabase Dashboard

1. Откройте Supabase Dashboard
2. Перейдите в раздел "SQL Editor"
3. Скопируйте и выполните содержимое файла `create-user-roles-system.sql`

## Шаг 2: Проверьте создание таблицы

После выполнения скрипта должны быть созданы:

1. **Таблица `user_profiles`** с полями:
   - `id` (UUID)
   - `email` (TEXT, UNIQUE)
   - `role` (TEXT: 'admin' или 'customer')
   - `created_at`, `updated_at`

2. **RLS политики** для безопасности

3. **Функции** для работы с ролями:
   - `is_admin(user_email TEXT)`
   - `get_user_role(user_email TEXT)`

4. **Профили пользователей**:
   - `admin@energylogic.ru` → роль `admin`
   - `admin@energylogic.com` → роль `admin`  
   - `user@test.com` → роль `customer`

## Шаг 3: Проверьте результат

После выполнения скрипта запустите:
```bash
node test-customer-flow.js
```

Это проверит правильность работы системы ролей.
