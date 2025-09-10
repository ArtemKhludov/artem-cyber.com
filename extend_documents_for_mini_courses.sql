-- Расширение таблицы documents для поддержки мини-курсов
-- Этот скрипт добавляет новые поля для видео, аудио и рабочих тетрадей

-- Добавляем новые поля для мини-курсов
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS course_type TEXT DEFAULT 'pdf' CHECK (course_type IN ('pdf', 'mini_course')),
ADD COLUMN IF NOT EXISTS workbook_url TEXT,
ADD COLUMN IF NOT EXISTS video_urls JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS video_preview_url TEXT,
ADD COLUMN IF NOT EXISTS course_duration_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS video_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS has_workbook BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_audio BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_videos BOOLEAN DEFAULT false;

-- Добавляем комментарии к новым полям
COMMENT ON COLUMN documents.course_type IS 'Тип контента: pdf или mini_course';
COMMENT ON COLUMN documents.workbook_url IS 'URL рабочей тетради (PDF)';
COMMENT ON COLUMN documents.video_urls IS 'JSON массив URL видеофайлов';
COMMENT ON COLUMN documents.audio_url IS 'URL аудио-настройки (MP3)';
COMMENT ON COLUMN documents.video_preview_url IS 'URL превью видео для отображения на странице';
COMMENT ON COLUMN documents.course_duration_minutes IS 'Общая продолжительность курса в минутах';
COMMENT ON COLUMN documents.video_count IS 'Количество видео в курсе';
COMMENT ON COLUMN documents.has_workbook IS 'Есть ли рабочая тетрадь';
COMMENT ON COLUMN documents.has_audio IS 'Есть ли аудио-настройка';
COMMENT ON COLUMN documents.has_videos IS 'Есть ли видео';

-- Создаем индекс для быстрого поиска по типу курса
CREATE INDEX IF NOT EXISTS idx_documents_course_type ON documents(course_type);

-- Обновляем существующие записи, устанавливая course_type = 'pdf'
UPDATE documents SET course_type = 'pdf' WHERE course_type IS NULL;

-- Пример обновления существующего документа в мини-курс:
-- UPDATE documents 
-- SET 
--   course_type = 'mini_course',
--   workbook_url = 'https://example.com/workbook.pdf',
--   video_urls = '["https://example.com/video1.mp4", "https://example.com/video2.mp4", "https://example.com/video3.mp4"]'::jsonb,
--   audio_url = 'https://example.com/audio.mp3',
--   video_preview_url = 'https://example.com/preview.mp4',
--   course_duration_minutes = 25,
--   video_count = 3,
--   has_workbook = true,
--   has_audio = true,
--   has_videos = true
-- WHERE id = 'your-document-id';
