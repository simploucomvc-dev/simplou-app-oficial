-- 1. Alterar o status padrão de 'free' para 'waiting'
--    Novos usuários ficam bloqueados até confirmar o pagamento
ALTER TABLE public.profiles
  ALTER COLUMN subscription_status SET DEFAULT 'waiting';

-- 2. Função helper que verifica se o usuário atual tem assinatura ativa
--    Usada nas políticas RLS para bloquear acesso a dados no backend
CREATE OR REPLACE FUNCTION public.is_active_subscriber()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND (subscription_status = 'active' OR role IN ('super_admin', 'partner'))
  );
$$;

-- 3. Atualizar políticas RLS da tabela transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;

CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id AND public.is_active_subscriber());

CREATE POLICY "Users can insert own transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_active_subscriber());

CREATE POLICY "Users can update own transactions"
  ON public.transactions FOR UPDATE
  USING (auth.uid() = user_id AND public.is_active_subscriber());

CREATE POLICY "Users can delete own transactions"
  ON public.transactions FOR DELETE
  USING (auth.uid() = user_id AND public.is_active_subscriber());

-- 4. Atualizar políticas RLS da tabela products
DROP POLICY IF EXISTS "Users can view own products" ON public.products;
DROP POLICY IF EXISTS "Users can insert own products" ON public.products;
DROP POLICY IF EXISTS "Users can update own products" ON public.products;
DROP POLICY IF EXISTS "Users can delete own products" ON public.products;

CREATE POLICY "Users can view own products"
  ON public.products FOR SELECT
  USING (auth.uid() = user_id AND public.is_active_subscriber());

CREATE POLICY "Users can insert own products"
  ON public.products FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_active_subscriber());

CREATE POLICY "Users can update own products"
  ON public.products FOR UPDATE
  USING (auth.uid() = user_id AND public.is_active_subscriber());

CREATE POLICY "Users can delete own products"
  ON public.products FOR DELETE
  USING (auth.uid() = user_id AND public.is_active_subscriber());

-- 5. Atualizar políticas RLS da tabela fixed_costs
DROP POLICY IF EXISTS "Users can view own fixed_costs" ON public.fixed_costs;
DROP POLICY IF EXISTS "Users can insert own fixed_costs" ON public.fixed_costs;
DROP POLICY IF EXISTS "Users can update own fixed_costs" ON public.fixed_costs;
DROP POLICY IF EXISTS "Users can delete own fixed_costs" ON public.fixed_costs;

CREATE POLICY "Users can view own fixed_costs"
  ON public.fixed_costs FOR SELECT
  USING (auth.uid() = user_id AND public.is_active_subscriber());

CREATE POLICY "Users can insert own fixed_costs"
  ON public.fixed_costs FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_active_subscriber());

CREATE POLICY "Users can update own fixed_costs"
  ON public.fixed_costs FOR UPDATE
  USING (auth.uid() = user_id AND public.is_active_subscriber());

CREATE POLICY "Users can delete own fixed_costs"
  ON public.fixed_costs FOR DELETE
  USING (auth.uid() = user_id AND public.is_active_subscriber());

-- Nota: a tabela profiles mantém as políticas originais (sem checar subscription_status)
-- pois o usuário sempre precisa ler o próprio perfil, inclusive para saber que precisa pagar.
