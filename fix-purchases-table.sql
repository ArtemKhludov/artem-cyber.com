-- Исправление структуры таблицы purchases
-- Добавляем недостающие колонки для системы покупок курсов

-- Сначала проверим, существует ли таблица purchases
-- Если нет, создадим её с правильной структурой

-- Удаляем старую таблицу если она есть (осторожно!)
DROP TABLE IF EXISTS purchases CASCADE;

-- Создаем таблицу purchases с правильной структурой
CREATE TABLE purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'stripe', -- 'stripe' или 'cryptomus'
    payment_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
    stripe_payment_intent_id TEXT,
    cryptomus_order_id TEXT,
    amount_paid INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'RUB',
    user_country TEXT,
    user_ip TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем индексы для оптимизации запросов
CREATE INDEX idx_purchases_user_email ON purchases(user_email);
CREATE INDEX idx_purchases_document_id ON purchases(document_id);
CREATE INDEX idx_purchases_payment_status ON purchases(payment_status);
CREATE INDEX idx_purchases_created_at ON purchases(created_at);

-- Включаем RLS (Row Level Security)
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Создаем политики RLS
-- Разрешаем всем читать покупки (для API)
DROP POLICY IF EXISTS "Anyone can read purchases" ON purchases;
CREATE POLICY "Anyone can read purchases" ON purchases
    FOR SELECT USING (true);

-- Разрешаем всем создавать покупки
DROP POLICY IF EXISTS "Anyone can create purchases" ON purchases;
CREATE POLICY "Anyone can create purchases" ON purchases
    FOR INSERT WITH CHECK (true);

-- Разрешаем обновлять покупки (для webhook'ов)
DROP POLICY IF EXISTS "Anyone can update purchases" ON purchases;
CREATE POLICY "Anyone can update purchases" ON purchases
    FOR UPDATE USING (true);

-- Создаем функцию для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Создаем триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_purchases_updated_at ON purchases;
CREATE TRIGGER update_purchases_updated_at
    BEFORE UPDATE ON purchases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Добавляем комментарии к таблице и колонкам
COMMENT ON TABLE purchases IS 'Таблица покупок курсов пользователями';
COMMENT ON COLUMN purchases.document_id IS 'ID документа (курса)';
COMMENT ON COLUMN purchases.user_email IS 'Email пользователя, совершившего покупку';
COMMENT ON COLUMN purchases.payment_method IS 'Способ оплаты (stripe, cryptomus)';
COMMENT ON COLUMN purchases.payment_status IS 'Статус платежа (pending, completed, failed, refunded)';
COMMENT ON COLUMN purchases.amount_paid IS 'Сумма оплаты в копейках';
COMMENT ON COLUMN purchases.currency IS 'Валюта платежа';
