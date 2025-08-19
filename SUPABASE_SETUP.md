# Настройка Supabase для EnergyLogic

## 1. Создание таблицы purchases

Выполните этот SQL в Supabase Dashboard (SQL Editor):

```sql
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

-- Add trigger for purchases table (если функция update_updated_at_column уже существует)
CREATE TRIGGER set_purchases_updated_at
    BEFORE UPDATE ON public.purchases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## 2. Настройка Stripe Webhook

1. Зайдите в Stripe Dashboard
2. Перейдите в Developers > Webhooks
3. Добавьте новый endpoint: `https://yourdomain.com/api/stripe/webhook`
4. Выберите события:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `payment_intent.payment_failed`
5. Скопируйте signing secret и добавьте в .env.local как `STRIPE_WEBHOOK_SECRET`

## 3. Настройка Cryptomus

1. Убедитесь, что у вас есть аккаунт Cryptomus
2. Получите API ключи в личном кабинете
3. Добавьте webhook URL: `https://yourdomain.com/api/cryptomus/callback`

## 4. Проверка интеграции

Запустите следующие проверки:

### Проверка основных страниц:
- ✅ Главная: http://localhost:3000/
- ✅ Каталог: http://localhost:3000/catalog  
- ✅ PDF превью: http://localhost:3000/pdf/[id]
- ✅ Checkout: http://localhost:3000/checkout/[id]

### Проверка оплаты:
1. Перейдите на страницу любого PDF
2. Нажмите "Купить сейчас"
3. Выберите способ оплаты
4. Проверьте создание платежа

### Проверка данных:
- ✅ Документы загружены из Supabase (6 файлов)
- ✅ Статистика покупок работает
- ✅ Геолокация определяется
- ✅ TypeScript ошибки исправлены

## 5. Переменные окружения

Убедитесь, что в .env.local есть все необходимые переменные:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://mcexzjzowwanxawbiizd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_... (получить из Stripe Dashboard)

# Cryptomus
CRYPTOMUS_MERCHANT_ID=...
CRYPTOMUS_API_KEY=...

# Прочее
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
