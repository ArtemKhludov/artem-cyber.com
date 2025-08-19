-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE order_status AS ENUM ('pending', 'completed', 'failed');
CREATE TYPE session_status AS ENUM ('scheduled', 'active', 'completed', 'cancelled');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    timezone TEXT DEFAULT 'Europe/Moscow',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE public.orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    stripe_payment_intent_id TEXT UNIQUE,
    amount INTEGER NOT NULL,
    status order_status DEFAULT 'pending',
    session_date TIMESTAMP WITH TIME ZONE,
    session_time TEXT,
    pdf_url TEXT,
    session_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions table
CREATE TABLE public.sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) NOT NULL,
    daily_room_name TEXT UNIQUE NOT NULL,
    daily_room_url TEXT NOT NULL,
    status session_status DEFAULT 'scheduled',
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    recording_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics table for tracking events
CREATE TABLE public.analytics_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id),
    event_name TEXT NOT NULL,
    event_data JSONB,
    session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table for PDF files
CREATE TABLE public.documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price_rub INTEGER NOT NULL,
    file_url TEXT NOT NULL,
    cover_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX orders_user_id_idx ON public.orders(user_id);
CREATE INDEX orders_stripe_payment_intent_id_idx ON public.orders(stripe_payment_intent_id);
CREATE INDEX orders_status_idx ON public.orders(status);
CREATE INDEX sessions_order_id_idx ON public.sessions(order_id);
CREATE INDEX sessions_status_idx ON public.sessions(status);
CREATE INDEX sessions_scheduled_at_idx ON public.sessions(scheduled_at);
CREATE INDEX analytics_events_user_id_idx ON public.analytics_events(user_id);
CREATE INDEX analytics_events_event_name_idx ON public.analytics_events(event_name);
CREATE INDEX analytics_events_created_at_idx ON public.analytics_events(created_at);

-- Update orders.session_id foreign key
ALTER TABLE public.orders 
ADD CONSTRAINT orders_session_id_fkey 
FOREIGN KEY (session_id) REFERENCES public.sessions(id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON public.sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Orders policies
CREATE POLICY "Users can view own orders" ON public.orders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders" ON public.orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders" ON public.orders
    FOR UPDATE USING (auth.uid() = user_id);

-- Sessions policies
CREATE POLICY "Users can view own sessions" ON public.sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = sessions.order_id 
            AND orders.user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage sessions" ON public.sessions
    FOR ALL USING (
        current_setting('role', true) = 'service_role'
    );

-- Analytics events policies
CREATE POLICY "Users can view own analytics" ON public.analytics_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert analytics" ON public.analytics_events
    FOR INSERT WITH CHECK (true);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update session reference in orders
CREATE OR REPLACE FUNCTION public.update_order_session_id()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.orders 
    SET session_id = NEW.id 
    WHERE id = NEW.order_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update order when session is created
CREATE TRIGGER update_order_session_id_trigger
    AFTER INSERT ON public.sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_order_session_id();

-- Documents policies (public read access)
CREATE POLICY "Anyone can view documents" ON public.documents
    FOR SELECT USING (true);

-- Only authenticated users can modify documents (admin functionality)
CREATE POLICY "Only authenticated users can insert documents" ON public.documents
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Only authenticated users can update documents" ON public.documents
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Only authenticated users can delete documents" ON public.documents
    FOR DELETE USING (auth.role() = 'authenticated');

-- Add triggers for documents table
CREATE TRIGGER set_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Purchases table for tracking PDF sales
CREATE TABLE public.purchases (
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
CREATE INDEX purchases_document_id_idx ON public.purchases(document_id);
CREATE INDEX purchases_payment_status_idx ON public.purchases(payment_status);
CREATE INDEX purchases_stripe_payment_intent_id_idx ON public.purchases(stripe_payment_intent_id);
CREATE INDEX purchases_cryptomus_order_id_idx ON public.purchases(cryptomus_order_id);

-- Enable RLS for purchases
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Purchases policies (users can view their own purchases, admins can view all)
CREATE POLICY "Users can view own purchases by email" ON public.purchases
    FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Only authenticated users can insert purchases" ON public.purchases
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Only authenticated users can update purchases" ON public.purchases
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Add trigger for purchases table
CREATE TRIGGER set_purchases_updated_at
    BEFORE UPDATE ON public.purchases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data (optional, for development)
-- This should be removed in production
/*
INSERT INTO public.profiles (id, email, full_name) VALUES 
    ('00000000-0000-0000-0000-000000000001', 'test@example.com', 'Test User');

INSERT INTO public.orders (id, user_id, amount, status, session_date, session_time) VALUES 
    ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 4999, 'completed', NOW() + INTERVAL '1 day', '10:00');
*/
