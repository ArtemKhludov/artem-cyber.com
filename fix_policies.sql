-- Обновление политик для работы с анонимным ключом
DROP POLICY IF EXISTS "Only authenticated users can view callback requests" ON public.callback_requests;
DROP POLICY IF EXISTS "Only authenticated users can update callback requests" ON public.callback_requests;

-- Разрешаем всем просматривать и обновлять заявки (для демо)
CREATE POLICY "Anyone can view callback requests" ON public.callback_requests
    FOR SELECT USING (true);

CREATE POLICY "Anyone can update callback requests" ON public.callback_requests
    FOR UPDATE USING (true);
