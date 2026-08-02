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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      affiliate_orders: {
        Row: {
          amount: number
          created_at: string
          domain: string
          domain_ext: string
          id: string
          notes: string | null
          phone: string
          status: Database["public"]["Enums"]["affiliate_status"]
          updated_at: string
          user_id: string
          website_name: string
        }
        Insert: {
          amount: number
          created_at?: string
          domain: string
          domain_ext: string
          id?: string
          notes?: string | null
          phone: string
          status?: Database["public"]["Enums"]["affiliate_status"]
          updated_at?: string
          user_id: string
          website_name: string
        }
        Update: {
          amount?: number
          created_at?: string
          domain?: string
          domain_ext?: string
          id?: string
          notes?: string | null
          phone?: string
          status?: Database["public"]["Enums"]["affiliate_status"]
          updated_at?: string
          user_id?: string
          website_name?: string
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_code: string
          bank_name: string
          created_at: string
          id: string
          is_default: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name: string
          account_number: string
          bank_code: string
          bank_name: string
          created_at?: string
          id?: string
          is_default?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_code?: string
          bank_name?: string
          created_at?: string
          id?: string
          is_default?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      boost_orders: {
        Row: {
          amount_paid: number
          created_at: string
          id: string
          metadata: Json | null
          product_id: string
          provider_order_id: string | null
          quantity: number
          status: Database["public"]["Enums"]["order_status"]
          target_url: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid: number
          created_at?: string
          id?: string
          metadata?: Json | null
          product_id: string
          provider_order_id?: string | null
          quantity: number
          status?: Database["public"]["Enums"]["order_status"]
          target_url: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          product_id?: string
          provider_order_id?: string | null
          quantity?: number
          status?: Database["public"]["Enums"]["order_status"]
          target_url?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boost_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "boost_products"
            referencedColumns: ["id"]
          },
        ]
      }
      boost_products: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          platform: string
          price_ngn: number
          provider_cost_ngn: number
          quantity: number
          service_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          platform: string
          price_ngn: number
          provider_cost_ngn?: number
          quantity: number
          service_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          platform?: string
          price_ngn?: number
          provider_cost_ngn?: number
          quantity?: number
          service_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json | null
          id: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      number_orders: {
        Row: {
          amount_paid: number
          created_at: string
          expires_at: string | null
          id: string
          otp_code: string | null
          phone_number: string | null
          product_id: string
          provider_order_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid: number
          created_at?: string
          expires_at?: string | null
          id?: string
          otp_code?: string | null
          phone_number?: string | null
          product_id: string
          provider_order_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          otp_code?: string | null
          phone_number?: string | null
          product_id?: string
          provider_order_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "number_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "number_products"
            referencedColumns: ["id"]
          },
        ]
      }
      number_products: {
        Row: {
          country_code: string
          country_name: string
          created_at: string
          id: string
          is_active: boolean
          provider: string
          provider_cost_usd: number
          selling_price_ngn: number
          server_id: string
          service_key: string
          service_name: string
          stock_count: number
          updated_at: string
        }
        Insert: {
          country_code: string
          country_name: string
          created_at?: string
          id?: string
          is_active?: boolean
          provider: string
          provider_cost_usd: number
          selling_price_ngn: number
          server_id: string
          service_key: string
          service_name: string
          stock_count?: number
          updated_at?: string
        }
        Update: {
          country_code?: string
          country_name?: string
          created_at?: string
          id?: string
          is_active?: boolean
          provider?: string
          provider_cost_usd?: number
          selling_price_ngn?: number
          server_id?: string
          service_key?: string
          service_name?: string
          stock_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bvn_status: Database["public"]["Enums"]["kyc_status"]
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          phone: string | null
          pin_hash: string | null
          pin_set: boolean
          tier: Database["public"]["Enums"]["user_tier"]
          updated_at: string
        }
        Insert: {
          bvn_status?: Database["public"]["Enums"]["kyc_status"]
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          phone?: string | null
          pin_hash?: string | null
          pin_set?: boolean
          tier?: Database["public"]["Enums"]["user_tier"]
          updated_at?: string
        }
        Update: {
          bvn_status?: Database["public"]["Enums"]["kyc_status"]
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          phone?: string | null
          pin_hash?: string | null
          pin_set?: boolean
          tier?: Database["public"]["Enums"]["user_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string
          fee: number
          id: string
          metadata: Json | null
          payment_method: string | null
          reference: string
          status: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          description: string
          fee?: number
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          reference: string
          status?: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string
          fee?: number
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          reference?: string
          status?: Database["public"]["Enums"]["transaction_status"]
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          ledger_balance: number
          updated_at: string
          user_id: string
          virtual_account_number: string | null
          virtual_account_reference: string | null
          virtual_bank_name: string | null
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          ledger_balance?: number
          updated_at?: string
          user_id: string
          virtual_account_number?: string | null
          virtual_account_reference?: string | null
          virtual_bank_name?: string | null
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          ledger_balance?: number
          updated_at?: string
          user_id?: string
          virtual_account_number?: string | null
          virtual_account_reference?: string | null
          virtual_bank_name?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      record_wallet_transaction: {
        Args: {
          _amount: number
          _description: string
          _fee: number
          _metadata?: Json
          _payment_method: string
          _reference: string
          _type: Database["public"]["Enums"]["transaction_type"]
          _user_id: string
        }
        Returns: {
          amount: number
          created_at: string
          currency: string
          description: string
          fee: number
          id: string
          metadata: Json | null
          payment_method: string | null
          reference: string
          status: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      seed_demo_activity: { Args: { _user_id: string }; Returns: undefined }
    }
    Enums: {
      affiliate_status: "pending" | "processing" | "live" | "rejected"
      kyc_status: "unverified" | "pending" | "verified"
      order_status:
        | "pending"
        | "active"
        | "received"
        | "expired"
        | "cancelled"
        | "refunded"
      transaction_status: "pending" | "success" | "failed" | "refunded"
      transaction_type: "credit" | "debit"
      user_tier: "tier_1" | "tier_2" | "tier_3"
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
      affiliate_status: ["pending", "processing", "live", "rejected"],
      kyc_status: ["unverified", "pending", "verified"],
      order_status: [
        "pending",
        "active",
        "received",
        "expired",
        "cancelled",
        "refunded",
      ],
      transaction_status: ["pending", "success", "failed", "refunded"],
      transaction_type: ["credit", "debit"],
      user_tier: ["tier_1", "tier_2", "tier_3"],
    },
  },
} as const
