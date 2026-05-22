export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assistente_conversas: {
        Row: {
          created_at: string
          id: string
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          titulo?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      assistente_mensagens: {
        Row: {
          content: string
          conversa_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversa_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversa_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistente_mensagens_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "assistente_conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      aula_capitulo_aulas: {
        Row: {
          aula: Json
          created_at: string
          id: string
          ordem: number
          resumo_livro_id: string
        }
        Insert: {
          aula: Json
          created_at?: string
          id?: string
          ordem: number
          resumo_livro_id: string
        }
        Update: {
          aula?: Json
          created_at?: string
          id?: string
          ordem?: number
          resumo_livro_id?: string
        }
        Relationships: []
      }
      aula_capitulo_flashcards: {
        Row: {
          cards: Json
          created_at: string
          id: string
          ordem: number
          resumo_livro_id: string
        }
        Insert: {
          cards: Json
          created_at?: string
          id?: string
          ordem: number
          resumo_livro_id: string
        }
        Update: {
          cards?: Json
          created_at?: string
          id?: string
          ordem?: number
          resumo_livro_id?: string
        }
        Relationships: []
      }
      aula_capitulo_questoes: {
        Row: {
          created_at: string
          id: string
          ordem: number
          questoes: Json
          resumo_livro_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ordem: number
          questoes: Json
          resumo_livro_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ordem?: number
          questoes?: Json
          resumo_livro_id?: string
        }
        Relationships: []
      }
      aula_capitulo_respostas: {
        Row: {
          acertou: boolean
          alternativa_correta: string
          alternativa_escolhida: string
          alternativas_snapshot: Json
          created_at: string
          enunciado_snapshot: string
          id: string
          justificativa_snapshot: string | null
          materia: string | null
          ordem: number
          questao_idx: number
          resumo_livro_id: string
          user_id: string
        }
        Insert: {
          acertou: boolean
          alternativa_correta: string
          alternativa_escolhida: string
          alternativas_snapshot: Json
          created_at?: string
          enunciado_snapshot: string
          id?: string
          justificativa_snapshot?: string | null
          materia?: string | null
          ordem: number
          questao_idx: number
          resumo_livro_id: string
          user_id: string
        }
        Update: {
          acertou?: boolean
          alternativa_correta?: string
          alternativa_escolhida?: string
          alternativas_snapshot?: Json
          created_at?: string
          enunciado_snapshot?: string
          id?: string
          justificativa_snapshot?: string | null
          materia?: string | null
          ordem?: number
          questao_idx?: number
          resumo_livro_id?: string
          user_id?: string
        }
        Relationships: []
      }
      aula_capitulo_simulado: {
        Row: {
          created_at: string
          id: string
          ordem: number
          questoes: Json
          resumo_livro_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ordem: number
          questoes: Json
          resumo_livro_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ordem?: number
          questoes?: Json
          resumo_livro_id?: string
        }
        Relationships: []
      }
      aulas_progresso: {
        Row: {
          created_at: string
          id: string
          passo_atual: number
          passos_concluidos: Json
          subtema_slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          passo_atual?: number
          passos_concluidos?: Json
          subtema_slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          passo_atual?: number
          passos_concluidos?: Json
          subtema_slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      aulas_questoes_geradas: {
        Row: {
          alternativas: Json
          created_at: string
          enunciado: string
          id: string
          justificativa: string | null
          materia: string | null
          resposta_correta: string
          subtema_slug: string
          tipo: string
        }
        Insert: {
          alternativas: Json
          created_at?: string
          enunciado: string
          id?: string
          justificativa?: string | null
          materia?: string | null
          resposta_correta: string
          subtema_slug: string
          tipo?: string
        }
        Update: {
          alternativas?: Json
          created_at?: string
          enunciado?: string
          id?: string
          justificativa?: string | null
          materia?: string | null
          resposta_correta?: string
          subtema_slug?: string
          tipo?: string
        }
        Relationships: []
      }
      aulas_tentativas: {
        Row: {
          acertos: number
          concluido_em: string | null
          created_at: string
          id: string
          iniciado_em: string
          passo: string
          respostas: Json
          subtema_slug: string
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          acertos?: number
          concluido_em?: string | null
          created_at?: string
          id?: string
          iniciado_em?: string
          passo: string
          respostas?: Json
          subtema_slug: string
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          acertos?: number
          concluido_em?: string | null
          created_at?: string
          id?: string
          iniciado_em?: string
          passo?: string
          respostas?: Json
          subtema_slug?: string
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      "BIBLIOTECA-CLASSICOS": {
        Row: {
          analise_status: string | null
          area: string | null
          aula: string | null
          autor: string | null
          beneficios: string | null
          "Capa-area": string | null
          capitulos_gerados: number | null
          download: string | null
          id: number
          imagem: string | null
          link: string | null
          livro: string | null
          questoes_resumo: Json | null
          resumo_capitulos: Json | null
          resumo_gerado_em: string | null
          sobre: string | null
          total_capitulos: number | null
          total_paginas: number | null
          total_temas: number | null
          url_videoaula: string | null
        }
        Insert: {
          analise_status?: string | null
          area?: string | null
          aula?: string | null
          autor?: string | null
          beneficios?: string | null
          "Capa-area"?: string | null
          capitulos_gerados?: number | null
          download?: string | null
          id?: number
          imagem?: string | null
          link?: string | null
          livro?: string | null
          questoes_resumo?: Json | null
          resumo_capitulos?: Json | null
          resumo_gerado_em?: string | null
          sobre?: string | null
          total_capitulos?: number | null
          total_paginas?: number | null
          total_temas?: number | null
          url_videoaula?: string | null
        }
        Update: {
          analise_status?: string | null
          area?: string | null
          aula?: string | null
          autor?: string | null
          beneficios?: string | null
          "Capa-area"?: string | null
          capitulos_gerados?: number | null
          download?: string | null
          id?: number
          imagem?: string | null
          link?: string | null
          livro?: string | null
          questoes_resumo?: Json | null
          resumo_capitulos?: Json | null
          resumo_gerado_em?: string | null
          sobre?: string | null
          total_capitulos?: number | null
          total_paginas?: number | null
          total_temas?: number | null
          url_videoaula?: string | null
        }
        Relationships: []
      }
      "BIBLIOTECA-ESTUDOS": {
        Row: {
          Área: string | null
          aula: string | null
          "Capa-area": string | null
          "Capa-livro": string | null
          Download: string | null
          id: number
          Link: string | null
          Ordem: number | null
          Sobre: string | null
          Tema: string | null
          url_capa_gerada: string | null
        }
        Insert: {
          Área?: string | null
          aula?: string | null
          "Capa-area"?: string | null
          "Capa-livro"?: string | null
          Download?: string | null
          id?: number
          Link?: string | null
          Ordem?: number | null
          Sobre?: string | null
          Tema?: string | null
          url_capa_gerada?: string | null
        }
        Update: {
          Área?: string | null
          aula?: string | null
          "Capa-area"?: string | null
          "Capa-livro"?: string | null
          Download?: string | null
          id?: number
          Link?: string | null
          Ordem?: number | null
          Sobre?: string | null
          Tema?: string | null
          url_capa_gerada?: string | null
        }
        Relationships: []
      }
      "BIBLIOTECA-FORA-DA-TOGA": {
        Row: {
          area: string | null
          aula: string | null
          autor: string | null
          "capa-area": string | null
          "capa-livro": string | null
          download: string | null
          id: number
          link: string | null
          livro: string | null
          sobre: string | null
        }
        Insert: {
          area?: string | null
          aula?: string | null
          autor?: string | null
          "capa-area"?: string | null
          "capa-livro"?: string | null
          download?: string | null
          id?: number
          link?: string | null
          livro?: string | null
          sobre?: string | null
        }
        Update: {
          area?: string | null
          aula?: string | null
          autor?: string | null
          "capa-area"?: string | null
          "capa-livro"?: string | null
          download?: string | null
          id?: number
          link?: string | null
          livro?: string | null
          sobre?: string | null
        }
        Relationships: []
      }
      "BIBLIOTECA-LIDERANÇA": {
        Row: {
          area: string | null
          aula: string | null
          autor: string | null
          beneficios: string | null
          "Capa-area": string | null
          download: string | null
          id: number
          imagem: string | null
          link: string | null
          livro: string | null
          questoes_resumo: Json | null
          resumo_capitulos: Json | null
          resumo_gerado_em: string | null
          sobre: string | null
        }
        Insert: {
          area?: string | null
          aula?: string | null
          autor?: string | null
          beneficios?: string | null
          "Capa-area"?: string | null
          download?: string | null
          id?: number
          imagem?: string | null
          link?: string | null
          livro?: string | null
          questoes_resumo?: Json | null
          resumo_capitulos?: Json | null
          resumo_gerado_em?: string | null
          sobre?: string | null
        }
        Update: {
          area?: string | null
          aula?: string | null
          autor?: string | null
          beneficios?: string | null
          "Capa-area"?: string | null
          download?: string | null
          id?: number
          imagem?: string | null
          link?: string | null
          livro?: string | null
          questoes_resumo?: Json | null
          resumo_capitulos?: Json | null
          resumo_gerado_em?: string | null
          sobre?: string | null
        }
        Relationships: []
      }
      "BIBLIOTECA-ORATORIA": {
        Row: {
          area: string | null
          aula: string | null
          autor: string | null
          beneficios: string | null
          "Capa-area": string | null
          download: string | null
          id: number
          imagem: string | null
          link: string | null
          livro: string | null
          questoes_resumo: Json | null
          resumo_capitulos: Json | null
          resumo_gerado_em: string | null
          sobre: string | null
        }
        Insert: {
          area?: string | null
          aula?: string | null
          autor?: string | null
          beneficios?: string | null
          "Capa-area"?: string | null
          download?: string | null
          id?: number
          imagem?: string | null
          link?: string | null
          livro?: string | null
          questoes_resumo?: Json | null
          resumo_capitulos?: Json | null
          resumo_gerado_em?: string | null
          sobre?: string | null
        }
        Update: {
          area?: string | null
          aula?: string | null
          autor?: string | null
          beneficios?: string | null
          "Capa-area"?: string | null
          download?: string | null
          id?: number
          imagem?: string | null
          link?: string | null
          livro?: string | null
          questoes_resumo?: Json | null
          resumo_capitulos?: Json | null
          resumo_gerado_em?: string | null
          sobre?: string | null
        }
        Relationships: []
      }
      "BIBLIOTECA-POLITICA": {
        Row: {
          area: string | null
          aula: string | null
          autor: string | null
          beneficios: string | null
          "Capa-area": string | null
          capitulos_gerados: number | null
          download: string | null
          id: number
          imagem: string | null
          link: string | null
          livro: string | null
          questoes_resumo: Json | null
          resumo_capitulos: Json | null
          resumo_gerado_em: string | null
          sobre: string | null
          total_capitulos: number | null
        }
        Insert: {
          area?: string | null
          aula?: string | null
          autor?: string | null
          beneficios?: string | null
          "Capa-area"?: string | null
          capitulos_gerados?: number | null
          download?: string | null
          id?: number
          imagem?: string | null
          link?: string | null
          livro?: string | null
          questoes_resumo?: Json | null
          resumo_capitulos?: Json | null
          resumo_gerado_em?: string | null
          sobre?: string | null
          total_capitulos?: number | null
        }
        Update: {
          area?: string | null
          aula?: string | null
          autor?: string | null
          beneficios?: string | null
          "Capa-area"?: string | null
          capitulos_gerados?: number | null
          download?: string | null
          id?: number
          imagem?: string | null
          link?: string | null
          livro?: string | null
          questoes_resumo?: Json | null
          resumo_capitulos?: Json | null
          resumo_gerado_em?: string | null
          sobre?: string | null
          total_capitulos?: number | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          autor_id: string | null
          capa_url: string | null
          categoria: string
          conteudo_md: string
          created_at: string
          id: string
          publicado: boolean
          publicado_em: string | null
          resumo: string
          slug: string
          subtitulo: string | null
          tags: string[]
          tempo_leitura_min: number
          titulo: string
          updated_at: string
        }
        Insert: {
          autor_id?: string | null
          capa_url?: string | null
          categoria?: string
          conteudo_md?: string
          created_at?: string
          id?: string
          publicado?: boolean
          publicado_em?: string | null
          resumo?: string
          slug: string
          subtitulo?: string | null
          tags?: string[]
          tempo_leitura_min?: number
          titulo: string
          updated_at?: string
        }
        Update: {
          autor_id?: string | null
          capa_url?: string | null
          categoria?: string
          conteudo_md?: string
          created_at?: string
          id?: string
          publicado?: boolean
          publicado_em?: string | null
          resumo?: string
          slug?: string
          subtitulo?: string | null
          tags?: string[]
          tempo_leitura_min?: number
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      erros_questao: {
        Row: {
          alternativa_marcada: string | null
          aula_subtema_slug: string | null
          created_at: string
          flashcard_id: string | null
          id: string
          materia: string | null
          numero: number
          questao_id: string
          resposta_correta: string
          revisado_em: string | null
          simulado_id: string
          tentativa_em: string
          tentativa_id: string
          user_id: string
        }
        Insert: {
          alternativa_marcada?: string | null
          aula_subtema_slug?: string | null
          created_at?: string
          flashcard_id?: string | null
          id?: string
          materia?: string | null
          numero: number
          questao_id: string
          resposta_correta: string
          revisado_em?: string | null
          simulado_id: string
          tentativa_em?: string
          tentativa_id: string
          user_id: string
        }
        Update: {
          alternativa_marcada?: string | null
          aula_subtema_slug?: string | null
          created_at?: string
          flashcard_id?: string | null
          id?: string
          materia?: string | null
          numero?: number
          questao_id?: string
          resposta_correta?: string
          revisado_em?: string | null
          simulado_id?: string
          tentativa_em?: string
          tentativa_id?: string
          user_id?: string
        }
        Relationships: []
      }
      flashcard_revisoes: {
        Row: {
          card_id: string
          difficulty: number
          due_at: string
          elapsed_days: number
          id: string
          rating: number
          reviewed_at: string
          stability: number
          state: string
          user_id: string
        }
        Insert: {
          card_id: string
          difficulty: number
          due_at: string
          elapsed_days?: number
          id?: string
          rating: number
          reviewed_at?: string
          stability: number
          state: string
          user_id: string
        }
        Update: {
          card_id?: string
          difficulty?: number
          due_at?: string
          elapsed_days?: number
          id?: string
          rating?: number
          reviewed_at?: string
          stability?: number
          state?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_revisoes_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          created_at: string
          difficulty: number
          due_at: string
          fonte_id: string | null
          fonte_tipo: string
          frente: string
          id: string
          lapses: number
          last_review_at: string | null
          materia: string | null
          reps: number
          stability: number
          state: string
          suspenso: boolean
          updated_at: string
          user_id: string
          verso: string
        }
        Insert: {
          created_at?: string
          difficulty?: number
          due_at?: string
          fonte_id?: string | null
          fonte_tipo?: string
          frente: string
          id?: string
          lapses?: number
          last_review_at?: string | null
          materia?: string | null
          reps?: number
          stability?: number
          state?: string
          suspenso?: boolean
          updated_at?: string
          user_id: string
          verso: string
        }
        Update: {
          created_at?: string
          difficulty?: number
          due_at?: string
          fonte_id?: string | null
          fonte_tipo?: string
          frente?: string
          id?: string
          lapses?: number
          last_review_at?: string | null
          materia?: string | null
          reps?: number
          stability?: number
          state?: string
          suspenso?: boolean
          updated_at?: string
          user_id?: string
          verso?: string
        }
        Relationships: []
      }
      flashcards_curados: {
        Row: {
          area: string | null
          capitulo_titulo: string | null
          created_at: string
          dica: string | null
          exemplo: string | null
          explicacao: string | null
          frente: string
          id: string
          livro_titulo: string | null
          materia: string | null
          ordem: number
          resumo_capitulo_id: string
          resumo_livro_id: string
          updated_at: string
          verso: string
        }
        Insert: {
          area?: string | null
          capitulo_titulo?: string | null
          created_at?: string
          dica?: string | null
          exemplo?: string | null
          explicacao?: string | null
          frente: string
          id?: string
          livro_titulo?: string | null
          materia?: string | null
          ordem?: number
          resumo_capitulo_id: string
          resumo_livro_id: string
          updated_at?: string
          verso: string
        }
        Update: {
          area?: string | null
          capitulo_titulo?: string | null
          created_at?: string
          dica?: string | null
          exemplo?: string | null
          explicacao?: string | null
          frente?: string
          id?: string
          livro_titulo?: string | null
          materia?: string | null
          ordem?: number
          resumo_capitulo_id?: string
          resumo_livro_id?: string
          updated_at?: string
          verso?: string
        }
        Relationships: []
      }
      flashcards_curados_jobs: {
        Row: {
          capitulos_gerados: number
          created_at: string
          erro_msg: string | null
          gerado_por: string | null
          id: string
          resumo_livro_id: string
          status: string
          total_capitulos: number
          total_cards: number
          updated_at: string
        }
        Insert: {
          capitulos_gerados?: number
          created_at?: string
          erro_msg?: string | null
          gerado_por?: string | null
          id?: string
          resumo_livro_id: string
          status?: string
          total_capitulos?: number
          total_cards?: number
          updated_at?: string
        }
        Update: {
          capitulos_gerados?: number
          created_at?: string
          erro_msg?: string | null
          gerado_por?: string | null
          id?: string
          resumo_livro_id?: string
          status?: string
          total_capitulos?: number
          total_cards?: number
          updated_at?: string
        }
        Relationships: []
      }
      legis_atos: {
        Row: {
          created_at: string
          data_assinatura: string | null
          data_dou: string
          edicao_extra: boolean
          ementa: string
          hash: string
          id: string
          numero: string
          texto_importado: boolean
          tipo: string
          updated_at: string
          url: string
          vade_mecum_lei_id: string | null
        }
        Insert: {
          created_at?: string
          data_assinatura?: string | null
          data_dou: string
          edicao_extra?: boolean
          ementa?: string
          hash: string
          id?: string
          numero: string
          texto_importado?: boolean
          tipo: string
          updated_at?: string
          url: string
          vade_mecum_lei_id?: string | null
        }
        Update: {
          created_at?: string
          data_assinatura?: string | null
          data_dou?: string
          edicao_extra?: boolean
          ementa?: string
          hash?: string
          id?: string
          numero?: string
          texto_importado?: boolean
          tipo?: string
          updated_at?: string
          url?: string
          vade_mecum_lei_id?: string | null
        }
        Relationships: []
      }
      legis_resenha_dia: {
        Row: {
          data_dou: string
          edicao_extra: boolean
          extraido_em: string
          fonte_url: string
          mes_ref: string
          total_atos: number
        }
        Insert: {
          data_dou: string
          edicao_extra?: boolean
          extraido_em?: string
          fonte_url: string
          mes_ref: string
          total_atos?: number
        }
        Update: {
          data_dou?: string
          edicao_extra?: boolean
          extraido_em?: string
          fonte_url?: string
          mes_ref?: string
          total_atos?: number
        }
        Relationships: []
      }
      legis_sync_runs: {
        Row: {
          atualizados: number
          erro: string | null
          executado_em: string
          gatilho: string
          id: string
          mes_ref: string | null
          novos: number
        }
        Insert: {
          atualizados?: number
          erro?: string | null
          executado_em?: string
          gatilho: string
          id?: string
          mes_ref?: string | null
          novos?: number
        }
        Update: {
          atualizados?: number
          erro?: string | null
          executado_em?: string
          gatilho?: string
          id?: string
          mes_ref?: string | null
          novos?: number
        }
        Relationships: []
      }
      livros_favoritos: {
        Row: {
          created_at: string
          id: string
          livro_id: number
          slug: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          livro_id: number
          slug: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          livro_id?: number
          slug?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          dores: string[]
          dores_outro: string | null
          id: string
          objetivo: string
          onboarding_completo: boolean
          semestre: number | null
          status_academico:
            | Database["public"]["Enums"]["status_academico"]
            | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          dores?: string[]
          dores_outro?: string | null
          id: string
          objetivo?: string
          onboarding_completo?: boolean
          semestre?: number | null
          status_academico?:
            | Database["public"]["Enums"]["status_academico"]
            | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          dores?: string[]
          dores_outro?: string | null
          id?: string
          objetivo?: string
          onboarding_completo?: boolean
          semestre?: number | null
          status_academico?:
            | Database["public"]["Enums"]["status_academico"]
            | null
          updated_at?: string
        }
        Relationships: []
      }
      provas_oab: {
        Row: {
          ano: number | null
          edital_url: string | null
          gabarito_1fase_url: string | null
          id: number
          numero: number
          numero_romano: string | null
          oab_exame_id: string | null
          oab_source_url: string | null
          prova_1fase_url: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          ano?: number | null
          edital_url?: string | null
          gabarito_1fase_url?: string | null
          id?: number
          numero: number
          numero_romano?: string | null
          oab_exame_id?: string | null
          oab_source_url?: string | null
          prova_1fase_url?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          ano?: number | null
          edital_url?: string | null
          gabarito_1fase_url?: string | null
          id?: number
          numero?: number
          numero_romano?: string | null
          oab_exame_id?: string | null
          oab_source_url?: string | null
          prova_1fase_url?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      provas_oab_edital_resumo: {
        Row: {
          conteudo: Json
          gerado_em: string
          prova_numero: number
        }
        Insert: {
          conteudo: Json
          gerado_em?: string
          prova_numero: number
        }
        Update: {
          conteudo?: Json
          gerado_em?: string
          prova_numero?: number
        }
        Relationships: []
      }
      resumo_capitulos: {
        Row: {
          conteudo_markdown: string | null
          created_at: string
          erro_msg: string | null
          id: string
          imagens: Json
          ordem: number
          resumo_livro_id: string
          slug: string
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          conteudo_markdown?: string | null
          created_at?: string
          erro_msg?: string | null
          id?: string
          imagens?: Json
          ordem: number
          resumo_livro_id: string
          slug: string
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          conteudo_markdown?: string | null
          created_at?: string
          erro_msg?: string | null
          id?: string
          imagens?: Json
          ordem?: number
          resumo_livro_id?: string
          slug?: string
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resumo_capitulos_resumo_livro_id_fkey"
            columns: ["resumo_livro_id"]
            isOneToOne: false
            referencedRelation: "resumo_livros"
            referencedColumns: ["id"]
          },
        ]
      }
      resumo_livros: {
        Row: {
          area: string | null
          autor: string | null
          biblioteca_slug: string
          capa: string | null
          capitulos_gerados: number
          created_at: string
          erro_msg: string | null
          gerado_por: string | null
          id: string
          livro_id: number
          ocr_paginas: Json | null
          ocr_texto: string | null
          pdf_url: string | null
          previa: Json
          status: string
          titulo: string
          total_capitulos: number
          updated_at: string
        }
        Insert: {
          area?: string | null
          autor?: string | null
          biblioteca_slug: string
          capa?: string | null
          capitulos_gerados?: number
          created_at?: string
          erro_msg?: string | null
          gerado_por?: string | null
          id?: string
          livro_id: number
          ocr_paginas?: Json | null
          ocr_texto?: string | null
          pdf_url?: string | null
          previa?: Json
          status?: string
          titulo: string
          total_capitulos?: number
          updated_at?: string
        }
        Update: {
          area?: string | null
          autor?: string | null
          biblioteca_slug?: string
          capa?: string | null
          capitulos_gerados?: number
          created_at?: string
          erro_msg?: string | null
          gerado_por?: string | null
          id?: string
          livro_id?: number
          ocr_paginas?: Json | null
          ocr_texto?: string | null
          pdf_url?: string | null
          previa?: Json
          status?: string
          titulo?: string
          total_capitulos?: number
          updated_at?: string
        }
        Relationships: []
      }
      simulado_jobs: {
        Row: {
          batch_atual: number
          batches_total: number
          concluido_em: string | null
          created_at: string
          erro_msg: string | null
          etapa: string
          gabarito_oficial: Json
          gerado_por: string | null
          id: string
          iniciado_em: string | null
          logs: Json
          materias_detectadas: Json
          ocr_gabarito: string | null
          ocr_prova: string | null
          prova_numero: number
          questoes_processadas: number
          simulado_id: string | null
          total_estimado: number
          updated_at: string
        }
        Insert: {
          batch_atual?: number
          batches_total?: number
          concluido_em?: string | null
          created_at?: string
          erro_msg?: string | null
          etapa?: string
          gabarito_oficial?: Json
          gerado_por?: string | null
          id?: string
          iniciado_em?: string | null
          logs?: Json
          materias_detectadas?: Json
          ocr_gabarito?: string | null
          ocr_prova?: string | null
          prova_numero: number
          questoes_processadas?: number
          simulado_id?: string | null
          total_estimado?: number
          updated_at?: string
        }
        Update: {
          batch_atual?: number
          batches_total?: number
          concluido_em?: string | null
          created_at?: string
          erro_msg?: string | null
          etapa?: string
          gabarito_oficial?: Json
          gerado_por?: string | null
          id?: string
          iniciado_em?: string | null
          logs?: Json
          materias_detectadas?: Json
          ocr_gabarito?: string | null
          ocr_prova?: string | null
          prova_numero?: number
          questoes_processadas?: number
          simulado_id?: string | null
          total_estimado?: number
          updated_at?: string
        }
        Relationships: []
      }
      simulado_questoes: {
        Row: {
          alternativas: Json
          created_at: string
          enunciado: string
          id: string
          justificativa: string | null
          materia: string | null
          nota_oficial: string | null
          numero: number
          resposta_correta: string | null
          simulado_id: string
          status: string
        }
        Insert: {
          alternativas: Json
          created_at?: string
          enunciado: string
          id?: string
          justificativa?: string | null
          materia?: string | null
          nota_oficial?: string | null
          numero: number
          resposta_correta?: string | null
          simulado_id: string
          status?: string
        }
        Update: {
          alternativas?: Json
          created_at?: string
          enunciado?: string
          id?: string
          justificativa?: string | null
          materia?: string | null
          nota_oficial?: string | null
          numero?: number
          resposta_correta?: string | null
          simulado_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulado_questoes_simulado_id_fkey"
            columns: ["simulado_id"]
            isOneToOne: false
            referencedRelation: "simulados"
            referencedColumns: ["id"]
          },
        ]
      }
      simulado_tentativas: {
        Row: {
          acertos: number
          concluido_em: string | null
          created_at: string
          id: string
          iniciado_em: string
          por_materia: Json
          respostas: Json
          simulado_id: string
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          acertos?: number
          concluido_em?: string | null
          created_at?: string
          id?: string
          iniciado_em?: string
          por_materia?: Json
          respostas?: Json
          simulado_id: string
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          acertos?: number
          concluido_em?: string | null
          created_at?: string
          id?: string
          iniciado_em?: string
          por_materia?: Json
          respostas?: Json
          simulado_id?: string
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulado_tentativas_simulado_id_fkey"
            columns: ["simulado_id"]
            isOneToOne: false
            referencedRelation: "simulados"
            referencedColumns: ["id"]
          },
        ]
      }
      simulados: {
        Row: {
          ano: number | null
          created_at: string
          erro_msg: string | null
          gerado_por: string | null
          id: string
          prova_numero: number
          status: string
          titulo: string
          total_questoes: number
          updated_at: string
        }
        Insert: {
          ano?: number | null
          created_at?: string
          erro_msg?: string | null
          gerado_por?: string | null
          id?: string
          prova_numero: number
          status?: string
          titulo: string
          total_questoes?: number
          updated_at?: string
        }
        Update: {
          ano?: number | null
          created_at?: string
          erro_msg?: string | null
          gerado_por?: string | null
          id?: string
          prova_numero?: number
          status?: string
          titulo?: string
          total_questoes?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vade_mecum_anotacoes: {
        Row: {
          artigo_id: string
          conteudo: string
          created_at: string
          id: string
          lei_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          artigo_id: string
          conteudo: string
          created_at?: string
          id?: string
          lei_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          artigo_id?: string
          conteudo?: string
          created_at?: string
          id?: string
          lei_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vade_mecum_artigos: {
        Row: {
          alteracoes: Json | null
          aula: string | null
          comentario: string | null
          created_at: string
          data_aprovacao: string | null
          exemplo: string | null
          explicacao_resumido: string | null
          explicacao_simples_maior16: string | null
          explicacao_simples_menor16: string | null
          explicacao_tecnico: string | null
          flashcards: Json | null
          id: string
          lei_id: string
          narracao_url: string | null
          numero: string | null
          ordem: number
          questoes: Json | null
          relevancia: string | null
          relevancia_fontes: Json | null
          relevancia_nota: string | null
          revogado: boolean
          source_id: number | null
          termos: Json | null
          termos_aprofundados: Json | null
          texto: string
          ult_alteracao_em: string | null
          updated_at: string
        }
        Insert: {
          alteracoes?: Json | null
          aula?: string | null
          comentario?: string | null
          created_at?: string
          data_aprovacao?: string | null
          exemplo?: string | null
          explicacao_resumido?: string | null
          explicacao_simples_maior16?: string | null
          explicacao_simples_menor16?: string | null
          explicacao_tecnico?: string | null
          flashcards?: Json | null
          id?: string
          lei_id: string
          narracao_url?: string | null
          numero?: string | null
          ordem?: number
          questoes?: Json | null
          relevancia?: string | null
          relevancia_fontes?: Json | null
          relevancia_nota?: string | null
          revogado?: boolean
          source_id?: number | null
          termos?: Json | null
          termos_aprofundados?: Json | null
          texto: string
          ult_alteracao_em?: string | null
          updated_at?: string
        }
        Update: {
          alteracoes?: Json | null
          aula?: string | null
          comentario?: string | null
          created_at?: string
          data_aprovacao?: string | null
          exemplo?: string | null
          explicacao_resumido?: string | null
          explicacao_simples_maior16?: string | null
          explicacao_simples_menor16?: string | null
          explicacao_tecnico?: string | null
          flashcards?: Json | null
          id?: string
          lei_id?: string
          narracao_url?: string | null
          numero?: string | null
          ordem?: number
          questoes?: Json | null
          relevancia?: string | null
          relevancia_fontes?: Json | null
          relevancia_nota?: string | null
          revogado?: boolean
          source_id?: number | null
          termos?: Json | null
          termos_aprofundados?: Json | null
          texto?: string
          ult_alteracao_em?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vade_mecum_artigos_lei_id_fkey"
            columns: ["lei_id"]
            isOneToOne: false
            referencedRelation: "vade_mecum_leis"
            referencedColumns: ["id"]
          },
        ]
      }
      vade_mecum_favoritos: {
        Row: {
          artigo_id: string
          created_at: string
          id: string
          lei_id: string
          user_id: string
        }
        Insert: {
          artigo_id: string
          created_at?: string
          id?: string
          lei_id: string
          user_id: string
        }
        Update: {
          artigo_id?: string
          created_at?: string
          id?: string
          lei_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vade_mecum_favoritos_artigo_id_fkey"
            columns: ["artigo_id"]
            isOneToOne: false
            referencedRelation: "vade_mecum_artigos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vade_mecum_favoritos_lei_id_fkey"
            columns: ["lei_id"]
            isOneToOne: false
            referencedRelation: "vade_mecum_leis"
            referencedColumns: ["id"]
          },
        ]
      }
      vade_mecum_leis: {
        Row: {
          categoria: string
          created_at: string
          id: string
          nome: string
          nome_curto: string | null
          ordem: number
          slug: string
          total_artigos: number
          updated_at: string
        }
        Insert: {
          categoria: string
          created_at?: string
          id?: string
          nome: string
          nome_curto?: string | null
          ordem?: number
          slug: string
          total_artigos?: number
          updated_at?: string
        }
        Update: {
          categoria?: string
          created_at?: string
          id?: string
          nome?: string
          nome_curto?: string | null
          ordem?: number
          slug?: string
          total_artigos?: number
          updated_at?: string
        }
        Relationships: []
      }
      vade_mecum_narracoes: {
        Row: {
          artigo_id: string
          audio_path: string
          created_at: string
          duracao_ms: number | null
          gerado_por: string | null
          id: string
          lei_id: string
          texto_narrado: string
          updated_at: string
          voz: string
        }
        Insert: {
          artigo_id: string
          audio_path: string
          created_at?: string
          duracao_ms?: number | null
          gerado_por?: string | null
          id?: string
          lei_id: string
          texto_narrado: string
          updated_at?: string
          voz?: string
        }
        Update: {
          artigo_id?: string
          audio_path?: string
          created_at?: string
          duracao_ms?: number | null
          gerado_por?: string | null
          id?: string
          lei_id?: string
          texto_narrado?: string
          updated_at?: string
          voz?: string
        }
        Relationships: [
          {
            foreignKeyName: "vade_mecum_narracoes_artigo_id_fkey"
            columns: ["artigo_id"]
            isOneToOne: true
            referencedRelation: "vade_mecum_artigos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vade_mecum_narracoes_lei_id_fkey"
            columns: ["lei_id"]
            isOneToOne: false
            referencedRelation: "vade_mecum_leis"
            referencedColumns: ["id"]
          },
        ]
      }
      vade_mecum_pratica_tentativas: {
        Row: {
          acertos: number
          artigo_id: string
          concluido_em: string | null
          created_at: string
          id: string
          iniciado_em: string
          lei_id: string
          modo: string
          respostas: Json
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          acertos?: number
          artigo_id: string
          concluido_em?: string | null
          created_at?: string
          id?: string
          iniciado_em?: string
          lei_id: string
          modo: string
          respostas?: Json
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          acertos?: number
          artigo_id?: string
          concluido_em?: string | null
          created_at?: string
          id?: string
          iniciado_em?: string
          lei_id?: string
          modo?: string
          respostas?: Json
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vade_mecum_sync_relatorios: {
        Row: {
          alterados: Json
          created_at: string
          erro_msg: string | null
          executado_em: string
          fonte_url: string
          id: string
          lei_id: string
          novos: Json
          resumo_md: string | null
          revogados: Json
          status: string
          total_banco: number
          total_planalto: number
        }
        Insert: {
          alterados?: Json
          created_at?: string
          erro_msg?: string | null
          executado_em?: string
          fonte_url: string
          id?: string
          lei_id: string
          novos?: Json
          resumo_md?: string | null
          revogados?: Json
          status?: string
          total_banco?: number
          total_planalto?: number
        }
        Update: {
          alterados?: Json
          created_at?: string
          erro_msg?: string | null
          executado_em?: string
          fonte_url?: string
          id?: string
          lei_id?: string
          novos?: Json
          resumo_md?: string | null
          revogados?: Json
          status?: string
          total_banco?: number
          total_planalto?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_artigo_full: {
        Args: { _id: string }
        Returns: {
          alteracoes: Json | null
          aula: string | null
          comentario: string | null
          created_at: string
          data_aprovacao: string | null
          exemplo: string | null
          explicacao_resumido: string | null
          explicacao_simples_maior16: string | null
          explicacao_simples_menor16: string | null
          explicacao_tecnico: string | null
          flashcards: Json | null
          id: string
          lei_id: string
          narracao_url: string | null
          numero: string | null
          ordem: number
          questoes: Json | null
          relevancia: string | null
          relevancia_fontes: Json | null
          relevancia_nota: string | null
          revogado: boolean
          source_id: number | null
          termos: Json | null
          termos_aprofundados: Json | null
          texto: string
          ult_alteracao_em: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "vade_mecum_artigos"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_biblioteca_areas: { Args: { _slug: string }; Returns: Json }
      get_biblioteca_areas_counts: {
        Args: { _slug: string }
        Returns: {
          area: string
          total: number
        }[]
      }
      get_biblioteca_book: {
        Args: { _id: number; _slug: string }
        Returns: {
          area: string
          autor: string
          capa: string
          download: string
          id: number
          link: string
          sobre: string
          titulo: string
        }[]
      }
      get_biblioteca_books:
        | {
            Args: {
              _area?: string
              _limit?: number
              _offset?: number
              _slug: string
            }
            Returns: {
              area: string
              autor: string
              capa: string
              id: number
              titulo: string
            }[]
          }
        | {
            Args: {
              _area?: string
              _limit?: number
              _offset?: number
              _slug: string
              _sort?: string
            }
            Returns: {
              area: string
              autor: string
              capa: string
              id: number
              titulo: string
            }[]
          }
      get_biblioteca_counts: { Args: never; Returns: Json }
      get_blog_categorias_counts: {
        Args: never
        Returns: {
          categoria: string
          total: number
        }[]
      }
      get_estatuto_overview: {
        Args: { _slug: string; _user_id?: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      int_to_roman: { Args: { num: number }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "user"
      status_academico: "cursando" | "formado" | "outro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      status_academico: ["cursando", "formado", "outro"],
    },
  },
} as const
