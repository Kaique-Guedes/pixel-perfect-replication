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
      clientes: {
        Row: {
          created_at: string
          email: string | null
          empresa_id: string
          id: string
          nome: string
          observacoes: string | null
          origem: string | null
          status: Database["public"]["Enums"]["cliente_status"]
          telefone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          empresa_id: string
          id?: string
          nome: string
          observacoes?: string | null
          origem?: string | null
          status?: Database["public"]["Enums"]["cliente_status"]
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          observacoes?: string | null
          origem?: string | null
          status?: Database["public"]["Enums"]["cliente_status"]
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes_interacoes: {
        Row: {
          cliente_id: string
          created_at: string
          criado_por: string | null
          empresa_id: string
          id: string
          texto: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          criado_por?: string | null
          empresa_id: string
          id?: string
          texto: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          criado_por?: string | null
          empresa_id?: string
          id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_interacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_interacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      despesas: {
        Row: {
          created_at: string
          data: string
          descricao: string
          empresa_id: string
          evento_id: string
          fornecedor: string | null
          id: string
          valor: number
        }
        Insert: {
          created_at?: string
          data?: string
          descricao: string
          empresa_id: string
          evento_id: string
          fornecedor?: string | null
          id?: string
          valor?: number
        }
        Update: {
          created_at?: string
          data?: string
          descricao?: string
          empresa_id?: string
          evento_id?: string
          fornecedor?: string | null
          id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "despesas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despesas_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          cnpj: string | null
          created_at: string
          endereco: string | null
          id: string
          margem_alvo: number
          margem_minima: number
          markup_padrao: number
          nome: string
          telefone: string | null
          tipo_negocio: Database["public"]["Enums"]["tipo_negocio"] | null
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          margem_alvo?: number
          margem_minima?: number
          markup_padrao?: number
          nome: string
          telefone?: string | null
          tipo_negocio?: Database["public"]["Enums"]["tipo_negocio"] | null
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          margem_alvo?: number
          margem_minima?: number
          markup_padrao?: number
          nome?: string
          telefone?: string | null
          tipo_negocio?: Database["public"]["Enums"]["tipo_negocio"] | null
        }
        Relationships: []
      }
      evento_cardapio_itens: {
        Row: {
          created_at: string
          empresa_id: string
          evento_id: string
          id: string
          item_cardapio_id: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          evento_id: string
          id?: string
          item_cardapio_id: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          evento_id?: string
          id?: string
          item_cardapio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evento_cardapio_itens_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_cardapio_itens_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_cardapio_itens_item_cardapio_id_fkey"
            columns: ["item_cardapio_id"]
            isOneToOne: false
            referencedRelation: "itens_cardapio"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos: {
        Row: {
          cliente_id: string | null
          convidados_estimados: number
          created_at: string
          data: string
          empresa_id: string
          hora_fim: string
          hora_inicio: string
          id: string
          local: string | null
          observacoes: string | null
          status: Database["public"]["Enums"]["evento_status"]
          titulo: string
          updated_at: string
        }
        Insert: {
          cliente_id?: string | null
          convidados_estimados?: number
          created_at?: string
          data: string
          empresa_id: string
          hora_fim: string
          hora_inicio: string
          id?: string
          local?: string | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["evento_status"]
          titulo: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string | null
          convidados_estimados?: number
          created_at?: string
          data?: string
          empresa_id?: string
          hora_fim?: string
          hora_inicio?: string
          id?: string
          local?: string | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["evento_status"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredientes: {
        Row: {
          categoria: Database["public"]["Enums"]["categoria_ingrediente"]
          created_at: string
          empresa_id: string
          estoque_atual: number
          fornecedor: string | null
          id: string
          nome: string
          preco_unidade: number
          unidade: Database["public"]["Enums"]["unidade_medida"]
          updated_at: string
        }
        Insert: {
          categoria?: Database["public"]["Enums"]["categoria_ingrediente"]
          created_at?: string
          empresa_id: string
          estoque_atual?: number
          fornecedor?: string | null
          id?: string
          nome: string
          preco_unidade?: number
          unidade: Database["public"]["Enums"]["unidade_medida"]
          updated_at?: string
        }
        Update: {
          categoria?: Database["public"]["Enums"]["categoria_ingrediente"]
          created_at?: string
          empresa_id?: string
          estoque_atual?: number
          fornecedor?: string | null
          id?: string
          nome?: string
          preco_unidade?: number
          unidade?: Database["public"]["Enums"]["unidade_medida"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredientes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_cardapio: {
        Row: {
          categoria: Database["public"]["Enums"]["categoria_item_cardapio"]
          created_at: string
          empresa_id: string
          foto_url: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          categoria: Database["public"]["Enums"]["categoria_item_cardapio"]
          created_at?: string
          empresa_id: string
          foto_url?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          categoria?: Database["public"]["Enums"]["categoria_item_cardapio"]
          created_at?: string
          empresa_id?: string
          foto_url?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "itens_cardapio_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_cardapio_ingredientes: {
        Row: {
          empresa_id: string
          id: string
          ingrediente_id: string
          item_cardapio_id: string
          quantidade_por_convidado: number
        }
        Insert: {
          empresa_id: string
          id?: string
          ingrediente_id: string
          item_cardapio_id: string
          quantidade_por_convidado: number
        }
        Update: {
          empresa_id?: string
          id?: string
          ingrediente_id?: string
          item_cardapio_id?: string
          quantidade_por_convidado?: number
        }
        Relationships: [
          {
            foreignKeyName: "itens_cardapio_ingredientes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_cardapio_ingredientes_ingrediente_id_fkey"
            columns: ["ingrediente_id"]
            isOneToOne: false
            referencedRelation: "ingredientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_cardapio_ingredientes_item_cardapio_id_fkey"
            columns: ["item_cardapio_id"]
            isOneToOne: false
            referencedRelation: "itens_cardapio"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_itens_avulsos: {
        Row: {
          created_at: string
          descricao: string
          empresa_id: string
          evento_id: string
          id: string
          tipo: Database["public"]["Enums"]["tipo_item_avulso"]
          valor: number
        }
        Insert: {
          created_at?: string
          descricao: string
          empresa_id: string
          evento_id: string
          id?: string
          tipo?: Database["public"]["Enums"]["tipo_item_avulso"]
          valor?: number
        }
        Update: {
          created_at?: string
          descricao?: string
          empresa_id?: string
          evento_id?: string
          id?: string
          tipo?: Database["public"]["Enums"]["tipo_item_avulso"]
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_itens_avulsos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_itens_avulsos_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      parcelas: {
        Row: {
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          empresa_id: string
          evento_id: string
          id: string
          status: Database["public"]["Enums"]["status_parcela"]
          valor: number
        }
        Insert: {
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao?: string
          empresa_id: string
          evento_id: string
          id?: string
          status?: Database["public"]["Enums"]["status_parcela"]
          valor?: number
        }
        Update: {
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          empresa_id?: string
          evento_id?: string
          id?: string
          status?: Database["public"]["Enums"]["status_parcela"]
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "parcelas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcelas_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          created_at: string
          email: string | null
          empresa_id: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          empresa_id: string
          id: string
          nome: string
        }
        Update: {
          created_at?: string
          email?: string | null
          empresa_id?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfis_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios_papeis: {
        Row: {
          empresa_id: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          empresa_id: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          empresa_id?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_papeis_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      criar_empresa: {
        Args: {
          _cnpj: string
          _nome_empresa: string
          _nome_usuario: string
          _tipo: Database["public"]["Enums"]["tipo_negocio"]
        }
        Returns: string
      }
      get_empresa_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "usuario"
      categoria_ingrediente:
        | "proteina"
        | "bebida"
        | "descartavel"
        | "decoracao"
        | "outro"
      categoria_item_cardapio:
        | "entrada"
        | "prato_principal"
        | "sobremesa"
        | "bebida"
      cliente_status:
        | "novo_lead"
        | "em_negociacao"
        | "cliente_ativo"
        | "perdido"
      evento_status:
        | "orcamento"
        | "contrato_assinado"
        | "confirmado"
        | "realizado"
        | "cancelado"
      status_parcela: "pendente" | "pago"
      tipo_item_avulso: "fixo" | "por_convidado"
      tipo_negocio: "buffet" | "casa_de_festas" | "cerimonial" | "produtora"
      unidade_medida: "kg" | "g" | "litro" | "ml" | "unidade"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "usuario"],
      categoria_ingrediente: [
        "proteina",
        "bebida",
        "descartavel",
        "decoracao",
        "outro",
      ],
      categoria_item_cardapio: [
        "entrada",
        "prato_principal",
        "sobremesa",
        "bebida",
      ],
      cliente_status: [
        "novo_lead",
        "em_negociacao",
        "cliente_ativo",
        "perdido",
      ],
      evento_status: [
        "orcamento",
        "contrato_assinado",
        "confirmado",
        "realizado",
        "cancelado",
      ],
      status_parcela: ["pendente", "pago"],
      tipo_item_avulso: ["fixo", "por_convidado"],
      tipo_negocio: ["buffet", "casa_de_festas", "cerimonial", "produtora"],
      unidade_medida: ["kg", "g", "litro", "ml", "unidade"],
    },
  },
} as const
