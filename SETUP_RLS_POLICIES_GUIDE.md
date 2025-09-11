# Инструкция по настройке RLS политик через Supabase Dashboard

## 🚨 Проблема
Ошибка `ERROR: 42501: must be owner of table objects` возникает потому, что таблица `storage.objects` принадлежит системной схеме Supabase.

## ✅ Решение: Настройка через Dashboard

### Шаг 1: Откройте Supabase Dashboard
1. Перейдите на [supabase.com/dashboard](https://supabase.com/dashboard)
2. Выберите ваш проект

### Шаг 2: Перейдите в Storage
1. В боковом меню нажмите **"Storage"**
2. Найдите бакет **"course-materials-private"**

### Шаг 3: Управление RLS политиками
1. Нажмите на **три точки** (⋮) рядом с бакетом `course-materials-private`
2. Выберите **"Manage RLS policies"**

### Шаг 4: Добавьте первую политику
1. Нажмите **"New Policy"**
2. Выберите **"For full customization"**
3. Заполните поля:
   - **Policy name**: `Allow access to purchased course materials`
   - **Allowed operation**: `SELECT`
   - **Target roles**: `authenticated`
   - **USING expression**:
   ```sql
   bucket_id = 'course-materials-private' 
   AND EXISTS (
     SELECT 1 FROM purchases p
     JOIN documents d ON p.document_id = d.id
     WHERE p.user_email = auth.email()
     AND p.payment_status = 'completed'
     AND (
       d.file_url LIKE '%' || name || '%' 
       OR d.audio_url LIKE '%' || name || '%'
       OR EXISTS (
         SELECT 1 FROM jsonb_array_elements_text(d.video_urls) AS video_url
         WHERE video_url LIKE '%' || name || '%'
       )
       OR EXISTS (
         SELECT 1 FROM course_workbooks cw
         WHERE cw.document_id = d.id
         AND cw.file_url LIKE '%' || name || '%'
       )
     )
   )
   ```
4. Нажмите **"Save policy"**

### Шаг 5: Добавьте вторую политику
1. Нажмите **"New Policy"** снова
2. Выберите **"For full customization"**
3. Заполните поля:
   - **Policy name**: `Allow service role access`
   - **Allowed operation**: `SELECT`
   - **Target roles**: `service_role`
   - **USING expression**:
   ```sql
   bucket_id = 'course-materials-private'
   ```
4. Нажмите **"Save policy"**

### Шаг 6: Проверьте результат
После создания политик вы должны увидеть:
- ✅ `Allow access to purchased course materials` (authenticated)
- ✅ `Allow service role access` (service_role)

## 🧪 Тестирование

После настройки политик запустите тесты:

```bash
# Проверка системы ролей
node verify-roles-system.js

# Тест флоу покупателя
node test-customer-flow.js

# Тест изоляции пользователей
node test-course-isolation.js
```

## 🔍 Проверка через SQL

Можете проверить созданные политики через SQL Editor:

```sql
SELECT schemaname, tablename, policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%course-materials%';
```

## ❌ Если что-то не работает

1. **Проверьте синтаксис** политик в Dashboard
2. **Убедитесь**, что таблицы `purchases`, `documents`, `course_workbooks` существуют
3. **Проверьте**, что бакет `course-materials-private` существует
4. **Посмотрите логи** в Supabase Dashboard → Logs

## 🎯 Ожидаемый результат

После настройки:
- ✅ Приватные файлы доступны только авторизованным пользователям с покупками
- ✅ API (service_role) имеет доступ ко всем файлам
- ✅ Публичные файлы остаются доступными всем
- ✅ Система безопасности работает корректно
