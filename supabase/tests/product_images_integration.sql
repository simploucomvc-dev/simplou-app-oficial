-- Teste de integração das fotos de produtos contra o banco real (regras de storage + sync_product_images).
-- Roda como um usuário assinante de verdade e DESFAZ TUDO no final (termina sempre com exceção).
-- Como rodar: SQL Editor do Supabase (ou MCP execute_sql) → colar → Run.
-- Resultado esperado na mensagem de erro final:
--   upload ok | 2 fotos, capa na posição 0 | remoção ok | produto alheio bloqueado | pasta alheia bloqueada | anon bloqueado
-- Qualquer "FALHOU" na mensagem indica regressão.

DO $$
DECLARE
  v_uid text;
  v_prod text;
  v_other_prod text;
  v_other_user text;
  i1 text := gen_random_uuid()::text;
  i2 text := gen_random_uuid()::text;
  v_removed text[];
  v_count integer;
  v_cover_ok boolean;
  v_kept uuid;
  v_res text := '';
BEGIN
  SELECT p.user_id::text, p.id::text INTO v_uid, v_prod
  FROM products p JOIN profiles pr ON pr.id = p.user_id
  WHERE pr.subscription_status IN ('active', 'trialing') OR pr.role IN ('super_admin', 'partner')
  LIMIT 1;
  SELECT id::text, user_id::text INTO v_other_prod, v_other_user FROM products WHERE user_id::text <> v_uid LIMIT 1;
  IF v_uid IS NULL OR v_other_prod IS NULL THEN RAISE EXCEPTION 'Sem dados suficientes para o teste'; END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  -- 1. Envio (passa pela política "product-images: dono envia")
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner_id, metadata) VALUES
      ('product-images', v_uid||'/'||v_prod||'/'||i1||'.webp', v_uid, '{"size":250000,"mimetype":"image/webp"}'),
      ('product-images', v_uid||'/'||v_prod||'/'||i1||'_thumb.webp', v_uid, '{"size":30000,"mimetype":"image/webp"}'),
      ('product-images', v_uid||'/'||v_prod||'/'||i2||'.webp', v_uid, '{"size":240000,"mimetype":"image/webp"}'),
      ('product-images', v_uid||'/'||v_prod||'/'||i2||'_thumb.webp', v_uid, '{"size":28000,"mimetype":"image/webp"}');
    v_res := v_res || ' | upload ok';
  EXCEPTION WHEN others THEN
    v_res := v_res || ' | upload FALHOU: ' || sqlerrm;
  END;

  -- 2. Gravação: segunda foto como capa
  v_removed := sync_product_images(v_prod::uuid, jsonb_build_array(
    jsonb_build_object('path', v_uid||'/'||v_prod||'/'||i2||'.webp', 'thumb_path', v_uid||'/'||v_prod||'/'||i2||'_thumb.webp', 'width', 1200, 'height', 1600),
    jsonb_build_object('path', v_uid||'/'||v_prod||'/'||i1||'.webp', 'thumb_path', v_uid||'/'||v_prod||'/'||i1||'_thumb.webp', 'width', 1600, 'height', 1200)));
  SELECT count(*), bool_or(position = 0 AND path LIKE '%'||i2||'%') INTO v_count, v_cover_ok
  FROM product_images WHERE product_id = v_prod::uuid AND (path LIKE '%'||i1||'%' OR path LIKE '%'||i2||'%');
  v_res := v_res || CASE WHEN v_count = 2 AND v_cover_ok THEN ' | 2 fotos, capa na posição 0' ELSE ' | gravação FALHOU' END;

  -- 3. Remoção da capa: devolve os 2 arquivos dela e a outra vira posição 0
  SELECT id INTO v_kept FROM product_images WHERE product_id = v_prod::uuid AND path LIKE '%'||i1||'%';
  v_removed := sync_product_images(v_prod::uuid, jsonb_build_array(jsonb_build_object('id', v_kept)));
  v_res := v_res || CASE
    WHEN array_length(v_removed, 1) = 2 AND (SELECT position FROM product_images WHERE id = v_kept) = 0
    THEN ' | remoção ok' ELSE ' | remoção FALHOU' END;

  -- 4. Produto de outra pessoa na própria pasta: bloqueado
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner_id, metadata)
    VALUES ('product-images', v_uid||'/'||v_other_prod||'/'||gen_random_uuid()||'.webp', v_uid, '{"size":1}');
    v_res := v_res || ' | produto alheio FALHOU (vazou)';
  EXCEPTION WHEN others THEN v_res := v_res || ' | produto alheio bloqueado';
  END;

  -- 5. Pasta de outro usuário: bloqueada
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner_id, metadata)
    VALUES ('product-images', v_other_user||'/'||v_other_prod||'/'||gen_random_uuid()||'.webp', v_uid, '{"size":1}');
    v_res := v_res || ' | pasta alheia FALHOU (vazou)';
  EXCEPTION WHEN others THEN v_res := v_res || ' | pasta alheia bloqueada';
  END;

  RESET ROLE;

  -- 6. Sem login: bloqueado
  SET LOCAL ROLE anon;
  BEGIN
    PERFORM sync_product_images(v_prod::uuid, '[]'::jsonb);
    v_res := v_res || ' | anon FALHOU (vazou)';
  EXCEPTION WHEN others THEN v_res := v_res || ' | anon bloqueado';
  END;
  RESET ROLE;

  RAISE EXCEPTION 'RESULTADO (tudo desfeito):%', v_res;
END $$;
