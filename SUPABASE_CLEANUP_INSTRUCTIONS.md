# Инструкции по очистке дубликатов в Supabase

## Что нужно сделать в Supabase Dashboard:

1. **Откройте Supabase Dashboard**: https://supabase.com/dashboard
2. **Перейдите в ваш проект**: `mcexzjzowwanxawbiizd`
3. **Откройте SQL Editor** (боковое меню)
4. **Выполните следующие команды по очереди:**

### Шаг 1: Проверьте текущее состояние
```sql
SELECT title, COUNT(*) as count, MIN(created_at) as first, MAX(created_at) as latest
FROM documents 
GROUP BY title 
ORDER BY count DESC;
```

### Шаг 2: Удалите дубликаты (оставив самые новые)
```sql
-- Создаем временную таблицу с ID документов для удаления
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
```

### Шаг 3: Создайте уникальный индекс (предотвратит будущие дубликаты)
```sql
-- Создаем уникальный индекс по названию документа
CREATE UNIQUE INDEX IF NOT EXISTS unique_document_title 
ON documents (title);
```

### Шаг 4: Проверьте результат
```sql
SELECT title, COUNT(*) as count, MAX(created_at) as latest
FROM documents 
GROUP BY title 
ORDER BY latest DESC;
```

## Ожидаемый результат:
- Каждый документ должен быть в единственном экземпляре
- Уникальный индекс предотвратит создание дубликатов в будущем

## Если команды не работают:
1. Проверьте права доступа (должны быть права на DDL операции)
2. Возможно, нужно отключить RLS временно
3. Используйте Service Role ключ вместо anon ключа

## После выполнения:
Перезагрузите сайт на http://localhost:3000 - дубликаты должны исчезнуть.
