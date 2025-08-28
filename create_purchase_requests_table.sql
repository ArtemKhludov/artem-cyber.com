-- Create purchase_requests table for admin panel
CREATE TABLE public.purchase_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    product_type TEXT NOT NULL CHECK (product_type IN ('pdf', 'program', 'consultation', 'other')),
    product_name TEXT NOT NULL,
    product_id TEXT,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'RUB',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    payment_method TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for purchase_requests table
CREATE INDEX purchase_requests_status_idx ON public.purchase_requests(status);
CREATE INDEX purchase_requests_created_at_idx ON public.purchase_requests(created_at);
CREATE INDEX purchase_requests_product_type_idx ON public.purchase_requests(product_type);

-- Enable RLS for purchase_requests
ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;

-- Purchase requests policies (public can insert, admins can view all)
CREATE POLICY "Anyone can create purchase requests" ON public.purchase_requests
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Only authenticated users can view purchase requests" ON public.purchase_requests
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only authenticated users can update purchase requests" ON public.purchase_requests
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Add trigger for purchase_requests table
CREATE TRIGGER set_purchase_requests_updated_at
    BEFORE UPDATE ON public.purchase_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
