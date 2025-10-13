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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      account: {
        Row: {
          id: number
          name: string
          user_id: string
        }
        Insert: {
          id?: number
          name: string
          user_id: string
        }
        Update: {
          id?: number
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      budget_type: {
        Row: {
          id: number
          name: string
          user_id: string
        }
        Insert: {
          id?: number
          name: string
          user_id: string
        }
        Update: {
          id?: number
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      main_category: {
        Row: {
          back_color: string
          fore_color: string
          icon: string
          id: number
          label: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          back_color: string
          fore_color: string
          icon: string
          id?: number
          label: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          back_color?: string
          fore_color?: string
          icon?: string
          id?: number
          label?: string
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: []
      }
      sub_category: {
        Row: {
          back_color: string
          budget_type_id: number | null
          fore_color: string
          icon: string
          id: number
          label: string
          main_category_id: number
          user_id: string
        }
        Insert: {
          back_color: string
          budget_type_id?: number | null
          fore_color: string
          icon: string
          id?: number
          label: string
          main_category_id: number
          user_id: string
        }
        Update: {
          back_color?: string
          budget_type_id?: number | null
          fore_color?: string
          icon?: string
          id?: number
          label?: string
          main_category_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_sub_budget"
            columns: ["user_id", "budget_type_id"]
            isOneToOne: false
            referencedRelation: "budget_type"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "fk_sub_main"
            columns: ["user_id", "main_category_id"]
            isOneToOne: false
            referencedRelation: "main_category"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      transaction: {
        Row: {
          account_id: number
          amount: number
          budget_type_id: number | null
          datetime: string | null
          id: number
          main_category_id: number | null
          merchant: string | null
          name: string | null
          original_amount: number | null
          parent_id: number | null
          raw_info: Json | null
          remark: string | null
          source: string | null
          status: Database["public"]["Enums"]["transaction_status"] | null
          sub_category_id: number | null
          title: string | null
          transaction_type:
            | Database["public"]["Enums"]["transaction_type"]
            | null
          user_id: string
        }
        Insert: {
          account_id: number
          amount: number
          budget_type_id?: number | null
          datetime?: string | null
          id?: number
          main_category_id?: number | null
          merchant?: string | null
          name?: string | null
          original_amount?: number | null
          parent_id?: number | null
          raw_info?: Json | null
          remark?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          sub_category_id?: number | null
          title?: string | null
          transaction_type?:
            | Database["public"]["Enums"]["transaction_type"]
            | null
          user_id: string
        }
        Update: {
          account_id?: number
          amount?: number
          budget_type_id?: number | null
          datetime?: string | null
          id?: number
          main_category_id?: number | null
          merchant?: string | null
          name?: string | null
          original_amount?: number | null
          parent_id?: number | null
          raw_info?: Json | null
          remark?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          sub_category_id?: number | null
          title?: string | null
          transaction_type?:
            | Database["public"]["Enums"]["transaction_type"]
            | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_account_fk"
            columns: ["user_id", "account_id"]
            isOneToOne: false
            referencedRelation: "account"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "transaction_budget_type_fk"
            columns: ["user_id", "budget_type_id"]
            isOneToOne: false
            referencedRelation: "budget_type"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "transaction_main_category_fk"
            columns: ["user_id", "main_category_id"]
            isOneToOne: false
            referencedRelation: "main_category"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "transaction_parent_fk"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "transaction"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_sub_category_fk"
            columns: ["user_id", "sub_category_id"]
            isOneToOne: false
            referencedRelation: "sub_category"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      transaction_split: {
        Row: {
          account_id: number
          amount: number
          budget_type_id: number | null
          id: number
          main_category_id: number | null
          name: string | null
          sub_category_id: number | null
          transaction_id: number
          transaction_type:
            | Database["public"]["Enums"]["transaction_type"]
            | null
          user_id: string
        }
        Insert: {
          account_id: number
          amount: number
          budget_type_id?: number | null
          id?: number
          main_category_id?: number | null
          name?: string | null
          sub_category_id?: number | null
          transaction_id: number
          transaction_type?:
            | Database["public"]["Enums"]["transaction_type"]
            | null
          user_id: string
        }
        Update: {
          account_id?: number
          amount?: number
          budget_type_id?: number | null
          id?: number
          main_category_id?: number | null
          name?: string | null
          sub_category_id?: number | null
          transaction_id?: number
          transaction_type?:
            | Database["public"]["Enums"]["transaction_type"]
            | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_split_account_fk"
            columns: ["user_id", "account_id"]
            isOneToOne: false
            referencedRelation: "account"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "transaction_split_budget_type_fk"
            columns: ["user_id", "budget_type_id"]
            isOneToOne: false
            referencedRelation: "budget_type"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "transaction_split_main_category_fk"
            columns: ["user_id", "main_category_id"]
            isOneToOne: false
            referencedRelation: "main_category"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "transaction_split_sub_category_fk"
            columns: ["user_id", "sub_category_id"]
            isOneToOne: false
            referencedRelation: "sub_category"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "transaction_split_transaction_fk"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transaction"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      transaction_status:
        | "待处理"
        | "经自动处理取消"
        | "经自动处理填写"
        | "稍后处理"
        | "取消"
        | "附加到其他交易"
        | "已完成"
      transaction_type:
        | "支出"
        | "收入"
        | "转出"
        | "转入"
        | "应收款项"
        | "应付款项"
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
      transaction_status: [
        "待处理",
        "经自动处理取消",
        "经自动处理填写",
        "稍后处理",
        "取消",
        "附加到其他交易",
        "已完成",
      ],
      transaction_type: [
        "支出",
        "收入",
        "转出",
        "转入",
        "应收款项",
        "应付款项",
      ],
    },
  },
} as const
