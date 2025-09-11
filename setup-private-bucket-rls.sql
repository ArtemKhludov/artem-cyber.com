-- Настройка RLS для приватного бакета course-materials-private
-- Этот скрипт нужно выполнить в SQL редакторе Supabase

-- Включаем RLS для storage.objects если еще не включено
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Удаляем существующую политику если есть
DROP POLICY IF EXISTS "Allow access to purchased course materials" ON storage.objects;

-- Создаем новую политику для доступа к приватным файлам курсов
CREATE POLICY "Allow access to purchased course materials" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (
  bucket_id = 'course-materials-private' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM purchases p
    JOIN documents d ON p.document_id = d.id
    WHERE p.user_email = auth.email()
    AND p.payment_status = 'completed'
    AND (
      -- Проверяем основной PDF
      d.file_url LIKE '%' || name || '%' 
      -- Проверяем аудио файл
      OR d.audio_url LIKE '%' || name || '%'
      -- Проверяем видео файлы
      OR EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(d.video_urls) AS video_url
        WHERE video_url LIKE '%' || name || '%'
      )
      -- Проверяем тетради из course_workbooks
      OR EXISTS (
        SELECT 1 FROM course_workbooks cw
        WHERE cw.document_id = d.id
        AND cw.file_url LIKE '%' || name || '%'
      )
    )
  )
);

-- Создаем политику для service role (для API)
CREATE POLICY "Allow service role access" 
ON storage.objects 
FOR SELECT 
TO service_role 
USING (bucket_id = 'course-materials-private');

-- Проверяем что политики созданы
SELECT schemaname, tablename, policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage';
