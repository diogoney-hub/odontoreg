-- 1. Adicionar restrição UNIQUE à coluna origem na tabela de eventos para evitar duplicidade concorrente
ALTER TABLE public.eventos_assinatura ADD CONSTRAINT unique_origem UNIQUE (origem);

-- 2. Criar função atômica para checagem de limites e incremento de cotas
CREATE OR REPLACE FUNCTION public.incrementar_consultas(
  user_id_arg UUID,
  limit_dia_arg INT,
  limit_mes_arg INT,
  today_arg DATE
) RETURNS BOOLEAN AS $$
DECLARE
  current_dia INT;
  current_mes INT;
  ref_dia DATE;
  ref_mes DATE;
BEGIN
  -- Bloqueia a linha do usuário para evitar concorrência simultânea
  SELECT consultas_dia, consultas_mes, data_ref_dia, data_ref_mes
  INTO current_dia, current_mes, ref_dia, ref_mes
  FROM public.usuarios
  WHERE id = user_id_arg
  FOR UPDATE;

  -- Se a data de referência diária for diferente, zera o contador diário
  IF ref_dia IS NULL OR ref_dia != today_arg THEN
    current_dia := 0;
  END IF;

  -- Se o mês de referência for diferente, zera o contador mensal
  IF ref_mes IS NULL OR substring(ref_mes::text from 1 for 7) != substring(today_arg::text from 1 for 7) THEN
    current_mes := 0;
  END IF;

  -- Verifica se ultrapassou os limites
  IF (limit_dia_arg IS NOT NULL AND current_dia >= limit_dia_arg) OR
     (limit_mes_arg IS NOT NULL AND current_mes >= limit_mes_arg) THEN
    RETURN FALSE;
  END IF;

  -- Incrementa e atualiza
  UPDATE public.usuarios
  SET 
    consultas_dia = current_dia + 1,
    data_ref_dia = today_arg,
    consultas_mes = current_mes + 1,
    data_ref_mes = today_arg,
    ultima_atividade_em = NOW(),
    primeira_consulta_em = COALESCE(primeira_consulta_em, NOW())
  WHERE id = user_id_arg;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Criar função para decremento (rollback em caso de falha da API)
CREATE OR REPLACE FUNCTION public.decrementar_consultas(
  user_id_arg UUID,
  today_arg DATE
) RETURNS VOID AS $$
BEGIN
  UPDATE public.usuarios
  SET 
    consultas_dia = GREATEST(0, consultas_dia - 1),
    consultas_mes = GREATEST(0, consultas_mes - 1)
  WHERE id = user_id_arg
    AND data_ref_dia = today_arg;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
