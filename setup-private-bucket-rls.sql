-- Настройка RLS для приватного бакета course-materials-private
-- ВАЖНО: Этот скрипт нужно выполнить через Supabase Dashboard в разделе Authentication > Policies

-- Альтернативный способ: настройка через Supabase Dashboard
-- 1. Перейдите в Supabase Dashboard
-- 2. Выберите Storage в боковом меню
-- 3. Найдите бакет "course-materials-private"
-- 4. Нажмите на три точки рядом с бакетом
-- 5. Выберите "Manage RLS policies"
-- 6. Добавьте следующие политики:

/*
ПОЛИТИКА 1: Доступ для авторизованных пользователей с покупками
- Название: "Allow access to purchased course materials"
- Тип: SELECT
- Роль: authenticated
- Условие:
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

ПОЛИТИКА 2: Доступ для service role (для API)
- Название: "Allow service role access"
- Тип: SELECT  
- Роль: service_role
- Условие: bucket_id = 'course-materials-private'
*/

-- Проверяем текущие политики (этот запрос должен работать)
SELECT schemaname, tablename, policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%course-materials%';
