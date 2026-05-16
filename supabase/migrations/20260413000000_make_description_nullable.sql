-- description não é obrigatório na UI (campo colapsável opcional)
-- Remove a constraint NOT NULL para refletir corretamente o comportamento
ALTER TABLE public.transactions
  ALTER COLUMN description DROP NOT NULL;
