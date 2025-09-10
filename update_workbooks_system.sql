-- Обновление системы рабочих тетрадей для поддержки множественных тетрадей
-- Выполнить этот скрипт для обновления существующей базы данных

-- 1. Добавляем новые поля в таблицу documents
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS workbooks JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS workbook_count INTEGER DEFAULT 0;

-- 2. Создаем отдельную таблицу для рабочих тетрадей (альтернативный подход)
CREATE TABLE IF NOT EXISTS course_workbooks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Создаем индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_course_workbooks_document_id ON course_workbooks(document_id);
CREATE INDEX IF NOT EXISTS idx_course_workbooks_order ON course_workbooks(document_id, order_index);
CREATE INDEX IF NOT EXISTS idx_course_workbooks_active ON course_workbooks(document_id, is_active);

-- 4. Создаем функцию для автоматического обновления workbook_count
CREATE OR REPLACE FUNCTION update_workbook_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Обновляем счетчик в таблице documents
    UPDATE documents 
    SET workbook_count = (
        SELECT COUNT(*) 
        FROM course_workbooks 
        WHERE document_id = COALESCE(NEW.document_id, OLD.document_id)
        AND is_active = true
    ),
    updated_at = NOW()
    WHERE id = COALESCE(NEW.document_id, OLD.document_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 5. Создаем триггеры для автоматического обновления счетчика
DROP TRIGGER IF EXISTS trigger_update_workbook_count_insert ON course_workbooks;
DROP TRIGGER IF EXISTS trigger_update_workbook_count_update ON course_workbooks;
DROP TRIGGER IF EXISTS trigger_update_workbook_count_delete ON course_workbooks;

CREATE TRIGGER trigger_update_workbook_count_insert
    AFTER INSERT ON course_workbooks
    FOR EACH ROW
    EXECUTE FUNCTION update_workbook_count();

CREATE TRIGGER trigger_update_workbook_count_update
    AFTER UPDATE ON course_workbooks
    FOR EACH ROW
    EXECUTE FUNCTION update_workbook_count();

CREATE TRIGGER trigger_update_workbook_count_delete
    AFTER DELETE ON course_workbooks
    FOR EACH ROW
    EXECUTE FUNCTION update_workbook_count();

-- 6. Миграция существующих данных (если есть workbook_url)
-- Переносим существующие workbook_url в новую систему
INSERT INTO course_workbooks (document_id, title, file_url, order_index, is_active)
SELECT 
    id,
    title || ' - Рабочая тетрадь',
    workbook_url,
    1,
    true
FROM documents 
WHERE workbook_url IS NOT NULL 
AND workbook_url != ''
AND NOT EXISTS (
    SELECT 1 FROM course_workbooks 
    WHERE document_id = documents.id
);

-- 7. Обновляем workbook_count для всех документов
UPDATE documents 
SET workbook_count = (
    SELECT COUNT(*) 
    FROM course_workbooks 
    WHERE document_id = documents.id
    AND is_active = true
);

-- 8. Создаем представление для удобного получения курсов с рабочими тетрадями
CREATE OR REPLACE VIEW courses_with_workbooks AS
SELECT 
    d.*,
    COALESCE(
        json_agg(
            json_build_object(
                'id', w.id,
                'title', w.title,
                'description', w.description,
                'file_url', w.file_url,
                'order_index', w.order_index,
                'is_active', w.is_active
            ) ORDER BY w.order_index
        ) FILTER (WHERE w.id IS NOT NULL),
        '[]'::json
    ) as workbooks_array
FROM documents d
LEFT JOIN course_workbooks w ON d.id = w.document_id AND w.is_active = true
GROUP BY d.id;

-- 9. Создаем RLS политики для безопасности
ALTER TABLE course_workbooks ENABLE ROW LEVEL SECURITY;

-- Политика для чтения (все могут читать активные рабочие тетради)
CREATE POLICY "Anyone can read active workbooks" ON course_workbooks
    FOR SELECT USING (is_active = true);

-- Политика для управления (временно разрешаем всем для админ-панели)
-- TODO: Настроить правильные роли после настройки системы аутентификации
CREATE POLICY "Allow all operations for now" ON course_workbooks
    FOR ALL USING (true);

-- 10. Комментарии для документации
COMMENT ON TABLE course_workbooks IS 'Рабочие тетради для курсов';
COMMENT ON COLUMN course_workbooks.document_id IS 'ID курса (документа)';
COMMENT ON COLUMN course_workbooks.title IS 'Название рабочей тетради';
COMMENT ON COLUMN course_workbooks.description IS 'Описание рабочей тетради';
COMMENT ON COLUMN course_workbooks.file_url IS 'URL файла рабочей тетради';
COMMENT ON COLUMN course_workbooks.order_index IS 'Порядок отображения (1, 2, 3...)';
COMMENT ON COLUMN course_workbooks.is_active IS 'Активна ли рабочая тетрадь';

COMMENT ON COLUMN documents.workbooks IS 'JSON массив рабочих тетрадей (deprecated, используйте таблицу course_workbooks)';
COMMENT ON COLUMN documents.workbook_count IS 'Количество активных рабочих тетрадей';

-- Готово! Система множественных рабочих тетрадей настроена
