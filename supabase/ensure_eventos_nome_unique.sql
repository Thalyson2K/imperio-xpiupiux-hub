-- Required by scripts/sync_invasoes.py for PostgREST UPSERT on_conflict=nome.
-- Run this in the Supabase SQL Editor after reviewing any duplicate names.

DO $$
BEGIN
  IF EXISTS (
    SELECT nome
    FROM public.eventos
    GROUP BY nome
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot create unique index: public.eventos contains duplicate nome values.';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS eventos_nome_unique
  ON public.eventos (nome);
