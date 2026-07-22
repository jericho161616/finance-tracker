export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string
          id: string
          name: string
          starting_balance: number
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          starting_balance?: number
          type: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          starting_balance?: number
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          kind: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          kind: string
          name: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          kind?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_card_payments: {
        Row: {
          amount: number
          created_at: string
          credit_card_id: string
          id: string
          notes: string | null
          payment_date: string
          payment_source_account_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          credit_card_id: string
          id?: string
          notes?: string | null
          payment_date: string
          payment_source_account_id?: string | null
          user_id?: string
        }
        Update: {
          amount?: number
          created_at?: string
          credit_card_id?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_source_account_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      credit_cards: {
        Row: {
          bank_name: string
          card_name: string | null
          created_at: string
          credit_limit: number
          due_day: number
          id: string
          statement_day: number
          user_id: string
        }
        Insert: {
          bank_name: string
          card_name?: string | null
          created_at?: string
          credit_limit: number
          due_day: number
          id?: string
          statement_day: number
          user_id?: string
        }
        Update: {
          bank_name?: string
          card_name?: string | null
          created_at?: string
          credit_limit?: number
          due_day?: number
          id?: string
          statement_day?: number
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string | null
          created_at: string
          credit_card_id: string | null
          description: string | null
          expense_date: string
          id: string
          payment_method: string
          receipt_url: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id?: string | null
          created_at?: string
          credit_card_id?: string | null
          description?: string | null
          expense_date: string
          id?: string
          payment_method: string
          receipt_url?: string | null
          user_id?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string
          credit_card_id?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          payment_method?: string
          receipt_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      income: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          income_date: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          income_date: string
          user_id?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          income_date?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      card_current_cycle: {
        Row: {
          credit_card_id: string | null
          cycle_end: string | null
          cycle_start: string | null
          user_id: string | null
        }
        Relationships: []
      }
      card_outstanding: {
        Row: {
          available_credit: number | null
          credit_card_id: string | null
          outstanding_balance: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database['public']

export type Tables<T extends keyof (PublicSchema['Tables'] & PublicSchema['Views'])> =
  (PublicSchema['Tables'] & PublicSchema['Views'])[T] extends { Row: infer R } ? R : never
