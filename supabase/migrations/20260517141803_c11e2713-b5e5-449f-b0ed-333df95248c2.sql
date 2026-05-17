-- Flashcards do usuário
CREATE TABLE public.flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  frente TEXT NOT NULL,
  verso TEXT NOT NULL,
  materia TEXT,
  fonte_tipo TEXT NOT NULL DEFAULT 'manual' CHECK (fonte_tipo IN ('manual','resumo','questao','livro')),
  fonte_id TEXT,
  -- estado FSRS atual (denormalizado pra evitar join na fila)
  stability DOUBLE PRECISION NOT NULL DEFAULT 0,
  difficulty DOUBLE PRECISION NOT NULL DEFAULT 5,
  state TEXT NOT NULL DEFAULT 'new' CHECK (state IN ('new','learning','review','relearning')),
  due_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reps INTEGER NOT NULL DEFAULT 0,
  lapses INTEGER NOT NULL DEFAULT 0,
  last_review_at TIMESTAMPTZ,
  suspenso BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários gerenciam próprios flashcards"
  ON public.flashcards FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX flashcards_due_idx ON public.flashcards (user_id, suspenso, due_at);
CREATE INDEX flashcards_materia_idx ON public.flashcards (user_id, materia);
CREATE INDEX flashcards_fonte_idx ON public.flashcards (user_id, fonte_tipo, fonte_id);

CREATE TRIGGER flashcards_updated_at
  BEFORE UPDATE ON public.flashcards
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Histórico de revisões
CREATE TABLE public.flashcard_revisoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 4),
  -- snapshot do estado APÓS a revisão
  stability DOUBLE PRECISION NOT NULL,
  difficulty DOUBLE PRECISION NOT NULL,
  state TEXT NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  elapsed_days DOUBLE PRECISION NOT NULL DEFAULT 0,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.flashcard_revisoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem próprias revisões"
  ON public.flashcard_revisoes FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Usuários inserem próprias revisões"
  ON public.flashcard_revisoes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX flashcard_revisoes_card_idx ON public.flashcard_revisoes (card_id, reviewed_at DESC);
CREATE INDEX flashcard_revisoes_user_data_idx ON public.flashcard_revisoes (user_id, reviewed_at);