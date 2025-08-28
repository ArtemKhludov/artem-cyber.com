-- Расширение существующей таблицы callback_requests
ALTER TABLE callback_requests 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'completed', 'cancelled')),
ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(100),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'website' CHECK (source IN ('website', 'phone', 'manual', 'other')),
ADD COLUMN IF NOT EXISTS product_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS product_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS product_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS description TEXT;

-- Создание таблицы для заявок на PDF файлы
CREATE TABLE IF NOT EXISTS pdf_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    pdf_id UUID REFERENCES documents(id),
    pdf_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'completed', 'cancelled')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_to VARCHAR(100),
    notes TEXT,
    source VARCHAR(50) DEFAULT 'website' CHECK (source IN ('website', 'phone', 'manual', 'other'))
);

-- Создание таблицы для заявок на покупки
CREATE TABLE IF NOT EXISTS purchase_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    product_name VARCHAR(255),
    product_id VARCHAR(100),
    quantity INTEGER DEFAULT 1,
    budget DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'completed', 'cancelled')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_to VARCHAR(100),
    notes TEXT,
    source VARCHAR(50) DEFAULT 'website' CHECK (source IN ('website', 'phone', 'manual', 'other'))
);

-- Создание таблицы для общих заявок
CREATE TABLE IF NOT EXISTS general_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    request_type VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'completed', 'cancelled')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_to VARCHAR(100),
    notes TEXT,
    source VARCHAR(50) DEFAULT 'website' CHECK (source IN ('website', 'phone', 'manual', 'other'))
);

-- Создание таблицы для менеджеров
CREATE TABLE IF NOT EXISTS managers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(50) DEFAULT 'manager',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индексов для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_callback_requests_status ON callback_requests(status);
CREATE INDEX IF NOT EXISTS idx_callback_requests_created_at ON callback_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_pdf_requests_status ON pdf_requests(status);
CREATE INDEX IF NOT EXISTS idx_pdf_requests_created_at ON pdf_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_status ON purchase_requests(status);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_created_at ON purchase_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_general_requests_status ON general_requests(status);
CREATE INDEX IF NOT EXISTS idx_general_requests_created_at ON general_requests(created_at);

-- Удаляем все существующие политики для callback_requests
DROP POLICY IF EXISTS "Only authenticated users can view callback requests" ON callback_requests;
DROP POLICY IF EXISTS "Only authenticated users can update callback requests" ON callback_requests;
DROP POLICY IF EXISTS "Authenticated users can view callback requests" ON callback_requests;
DROP POLICY IF EXISTS "Authenticated users can update callback requests" ON callback_requests;
DROP POLICY IF EXISTS "Authenticated users can insert callback requests" ON callback_requests;

-- Создаем новые политики для callback_requests
CREATE POLICY "Authenticated users can view callback requests" ON callback_requests
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can update callback requests" ON callback_requests
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert callback requests" ON callback_requests
    FOR INSERT TO authenticated WITH CHECK (true);

-- Удаляем существующие политики для pdf_requests
DROP POLICY IF EXISTS "Authenticated users can view pdf requests" ON pdf_requests;
DROP POLICY IF EXISTS "Authenticated users can update pdf requests" ON pdf_requests;
DROP POLICY IF EXISTS "Authenticated users can insert pdf requests" ON pdf_requests;

-- Создаем политики для pdf_requests
CREATE POLICY "Authenticated users can view pdf requests" ON pdf_requests
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can update pdf requests" ON pdf_requests
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert pdf requests" ON pdf_requests
    FOR INSERT TO authenticated WITH CHECK (true);

-- Удаляем существующие политики для purchase_requests
DROP POLICY IF EXISTS "Authenticated users can view purchase requests" ON purchase_requests;
DROP POLICY IF EXISTS "Authenticated users can update purchase requests" ON purchase_requests;
DROP POLICY IF EXISTS "Authenticated users can insert purchase requests" ON purchase_requests;

-- Создаем политики для purchase_requests
CREATE POLICY "Authenticated users can view purchase requests" ON purchase_requests
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can update purchase requests" ON purchase_requests
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert purchase requests" ON purchase_requests
    FOR INSERT TO authenticated WITH CHECK (true);

-- Удаляем существующие политики для general_requests
DROP POLICY IF EXISTS "Authenticated users can view general requests" ON general_requests;
DROP POLICY IF EXISTS "Authenticated users can update general requests" ON general_requests;
DROP POLICY IF EXISTS "Authenticated users can insert general requests" ON general_requests;

-- Создаем политики для general_requests
CREATE POLICY "Authenticated users can view general requests" ON general_requests
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can update general requests" ON general_requests
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert general requests" ON general_requests
    FOR INSERT TO authenticated WITH CHECK (true);

-- Удаляем существующие политики для managers
DROP POLICY IF EXISTS "Authenticated users can view managers" ON managers;
DROP POLICY IF EXISTS "Authenticated users can update managers" ON managers;
DROP POLICY IF EXISTS "Authenticated users can insert managers" ON managers;

-- Создаем политики для managers
CREATE POLICY "Authenticated users can view managers" ON managers
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can update managers" ON managers
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert managers" ON managers
    FOR INSERT TO authenticated WITH CHECK (true);

-- Включение RLS для всех таблиц
ALTER TABLE callback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE general_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE managers ENABLE ROW LEVEL SECURITY;

-- Обновляем существующие записи
UPDATE callback_requests 
SET 
  product_type = 'callback',
  product_name = 'Заказ звонка',
  source = COALESCE(source, 'website')
WHERE product_type IS NULL;
