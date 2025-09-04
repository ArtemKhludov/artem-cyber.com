-- Полностью удаляем все политики RLS
DROP POLICY IF EXISTS "Admins can manage users" ON users;
DROP POLICY IF EXISTS "Public read access to documents" ON documents;
DROP POLICY IF EXISTS "Admins can manage documents" ON documents;
DROP POLICY IF EXISTS "Users can view own purchases" ON purchases;
DROP POLICY IF EXISTS "Admins can manage purchases" ON purchases;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Admins can manage orders" ON orders;
DROP POLICY IF EXISTS "Users can view own sessions" ON sessions;
DROP POLICY IF EXISTS "Admins can manage sessions" ON sessions;
DROP POLICY IF EXISTS "Anyone can insert callback requests" ON callback_requests;
DROP POLICY IF EXISTS "Admins can view callback requests" ON callback_requests;
DROP POLICY IF EXISTS "Admins can manage callback requests" ON callback_requests;
DROP POLICY IF EXISTS "Anyone can insert purchase requests" ON purchase_requests;
DROP POLICY IF EXISTS "Admins can view purchase requests" ON purchase_requests;
DROP POLICY IF EXISTS "Admins can manage purchase requests" ON purchase_requests;
DROP POLICY IF EXISTS "Anyone can insert analytics events" ON analytics_events;
DROP POLICY IF EXISTS "Admins can view analytics events" ON analytics_events;
DROP POLICY IF EXISTS "Users can manage own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can manage own password resets" ON password_resets;

-- Создаем простые политики без рекурсии

-- Политики для users (только для админов, без рекурсии)
CREATE POLICY "Admins can manage users" ON users
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Политики для documents (публичный доступ)
CREATE POLICY "Public read access to documents" ON documents
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage documents" ON documents
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Политики для purchases
CREATE POLICY "Users can view own purchases" ON purchases
  FOR SELECT USING (
    user_id = auth.uid() OR
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Admins can manage purchases" ON purchases
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Политики для orders
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (
    user_id = auth.uid() OR
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Admins can manage orders" ON orders
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Политики для sessions
CREATE POLICY "Users can view own sessions" ON sessions
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders WHERE user_id = auth.uid()
    ) OR
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Admins can manage sessions" ON sessions
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Политики для callback_requests
CREATE POLICY "Anyone can insert callback requests" ON callback_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view callback requests" ON callback_requests
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Admins can manage callback requests" ON callback_requests
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Политики для purchase_requests
CREATE POLICY "Anyone can insert purchase requests" ON purchase_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view purchase requests" ON purchase_requests
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Admins can manage purchase requests" ON purchase_requests
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Политики для analytics_events
CREATE POLICY "Anyone can insert analytics events" ON analytics_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view analytics events" ON analytics_events
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Политики для user_sessions
CREATE POLICY "Users can manage own sessions" ON user_sessions
  FOR ALL USING (
    user_id = auth.uid() OR
    auth.jwt() ->> 'role' = 'admin'
  );

-- Политики для password_resets
CREATE POLICY "Users can manage own password resets" ON password_resets
  FOR ALL USING (
    user_id = auth.uid() OR
    auth.jwt() ->> 'role' = 'admin'
  );
