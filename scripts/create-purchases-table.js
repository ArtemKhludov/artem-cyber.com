const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://mcexzjzowwanxawbiizd.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZXh6anpvd3dhbnhhd2JpaXpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNzg4MjQsImV4cCI6MjA3MDk1NDgyNH0.-sAXcSK2crzmBULuPxRSfI9fNde9aQZxNvag2qkmZUs'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function createPurchasesTable() {
  try {
    console.log('🔨 Создаем таблицу purchases...')
    
    // Выполняем SQL запрос для создания таблицы
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Создаем таблицу purchases, если её ещё нет
        CREATE TABLE IF NOT EXISTS public.purchases (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          user_email TEXT,
          document_id UUID NOT NULL REFERENCES public.documents(id),
          payment_method TEXT NOT NULL CHECK (payment_method IN ('stripe', 'cryptomus')),
          payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
          stripe_payment_intent_id TEXT,
          cryptomus_order_id TEXT,
          amount_paid INTEGER NOT NULL,
          currency TEXT NOT NULL DEFAULT 'RUB',
          user_country TEXT,
          user_ip TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Создаем индексы
        CREATE INDEX IF NOT EXISTS purchases_document_id_idx ON public.purchases(document_id);
        CREATE INDEX IF NOT EXISTS purchases_payment_status_idx ON public.purchases(payment_status);
        CREATE INDEX IF NOT EXISTS purchases_stripe_payment_intent_id_idx ON public.purchases(stripe_payment_intent_id);
        CREATE INDEX IF NOT EXISTS purchases_cryptomus_order_id_idx ON public.purchases(cryptomus_order_id);

        -- Включаем RLS
        ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
      `
    })

    if (error) {
      // Если функция exec_sql недоступна, попробуем другой способ
      console.log('ℹ️ Функция exec_sql недоступна, создание таблицы должно быть выполнено через SQL Editor в Supabase Dashboard')
      console.log('📋 Скопируйте и выполните следующий SQL в Supabase Dashboard:')
      console.log(`
-- Purchases table for tracking PDF sales
CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_email TEXT,
    document_id UUID NOT NULL REFERENCES public.documents(id),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('stripe', 'cryptomus')),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    stripe_payment_intent_id TEXT,
    cryptomus_order_id TEXT,
    amount_paid INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'RUB',
    user_country TEXT,
    user_ip TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for purchases table
CREATE INDEX IF NOT EXISTS purchases_document_id_idx ON public.purchases(document_id);
CREATE INDEX IF NOT EXISTS purchases_payment_status_idx ON public.purchases(payment_status);
CREATE INDEX IF NOT EXISTS purchases_stripe_payment_intent_id_idx ON public.purchases(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS purchases_cryptomus_order_id_idx ON public.purchases(cryptomus_order_id);

-- Enable RLS for purchases
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Purchases policies (allow inserts for all, reads for owners)
CREATE POLICY "Allow public inserts on purchases" ON public.purchases
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own purchases by email" ON public.purchases
    FOR SELECT USING (auth.jwt() ->> 'email' = user_email OR user_email IS NULL);

-- Add trigger for purchases table
CREATE TRIGGER set_purchases_updated_at
    BEFORE UPDATE ON public.purchases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
      `)
      return
    }

    console.log('✅ Таблица purchases успешно создана!')
    
  } catch (error) {
    console.error('❌ Ошибка при создании таблицы purchases:', error)
  }
}

createPurchasesTable()
