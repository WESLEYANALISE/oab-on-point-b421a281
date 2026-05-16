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
          oab_exame_id?: string | null
          oab_source_url?: string | null
          prova_1fase_url?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
    }
    Enums: {
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
      status_academico: ["cursando", "formado", "outro"],
    },
  },
} as const
