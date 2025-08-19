-- Сначала удаляем дубликаты, оставляя только самые новые версии
WITH duplicates AS (
  SELECT id,
         title,
         created_at,
         ROW_NUMBER() OVER (PARTITION BY title ORDER BY created_at DESC) as rn
  FROM documents
)
DELETE FROM documents 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Создаем уникальный индекс по названию документа
CREATE UNIQUE INDEX IF NOT EXISTS unique_document_title 
ON documents (title);

-- Проверяем результат
SELECT title, COUNT(*) as count, MAX(created_at) as latest
FROM documents 
GROUP BY title 
ORDER BY latest DESC;
