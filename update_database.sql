-- Добавляем недостающие колонки в таблицу callback_requests
ALTER TABLE callback_requests 
ADD COLUMN IF NOT EXISTS product_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS product_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS product_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS description TEXT;

-- Обновляем существующие записи
UPDATE callback_requests 
SET 
  product_type = 'callback',
  product_name = 'Заказ звонка',
  source = COALESCE(source, 'website')
WHERE product_type IS NULL;
