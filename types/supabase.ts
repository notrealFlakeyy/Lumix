export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type Relationship = {
  foreignKeyName: string
  columns: string[]
  isOneToOne: boolean
  referencedRelation: string
  referencedColumns: string[]
}

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          country_code: string
          base_currency: string
          timezone: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          country_code?: string
          base_currency?: string
          timezone?: string
          created_at?: string
        }
        Update: {
          name?: string
          country_code?: string
          base_currency?: string
          timezone?: string
        }
        Relationships: Relationship[]
      }
      org_members: {
        Row: {
          org_id: string
          user_id: string
          role: string
          full_name: string | null
          allowed_modules: string[]
          created_at: string
        }
        Insert: {
          org_id: string
          user_id: string
          role?: string
          full_name?: string | null
          allowed_modules?: string[]
          created_at?: string
        }
        Update: {
          role?: string
          full_name?: string | null
          allowed_modules?: string[]
        }
        Relationships: Relationship[]
      }
      hr_employees: {
        Row: {
          id: string
          org_id: string
          user_id: string | null
          full_name: string
          email: string | null
          hourly_rate: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          user_id?: string | null
          full_name: string
          email?: string | null
          hourly_rate?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string | null
          full_name?: string
          email?: string | null
          hourly_rate?: number
          status?: string
          updated_at?: string
        }
        Relationships: Relationship[]
      }
      pay_time_entries: {
        Row: {
          id: string
          org_id: string
          employee_id: string
          start_time: string
          end_time: string | null
          minutes: number
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          employee_id: string
          start_time: string
          end_time?: string | null
          minutes?: number
          status?: string
          created_at?: string
        }
        Update: {
          end_time?: string | null
          minutes?: number
          status?: string
        }
        Relationships: Relationship[]
      }
      accounting_locks: {
        Row: {
          org_id: string
          locked_until: string | null
          updated_at: string
        }
        Insert: {
          org_id: string
          locked_until?: string | null
          updated_at?: string
        }
        Update: {
          locked_until?: string | null
          updated_at?: string
        }
        Relationships: Relationship[]
      }
      audit_log: {
        Row: {
          id: number
          org_id: string | null
          actor_user_id: string | null
          action: string
          table_name: string
          record_id: string | null
          old_data: Json | null
          new_data: Json | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          org_id?: string | null
          actor_user_id?: string | null
          action: string
          table_name: string
          record_id?: string | null
          old_data?: Json | null
          new_data?: Json | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          metadata?: Json | null
        }
        Relationships: Relationship[]
      }
      gl_accounts: {
        Row: {
          id: string
          org_id: string
          number: string
          name: string
          type: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          number: string
          name: string
          type: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          name?: string
          type?: string
          is_active?: boolean
        }
        Relationships: Relationship[]
      }
      gl_entries: {
        Row: {
          id: string
          org_id: string
          entry_date: string
          description: string
          source_type: string
          source_id: string | null
          posted_by: string | null
          posted_at: string | null
          is_reversing: boolean
          reversed_entry_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          entry_date: string
          description: string
          source_type?: string
          source_id?: string | null
          posted_by?: string | null
          posted_at?: string | null
          is_reversing?: boolean
          reversed_entry_id?: string | null
          created_at?: string
        }
        Update: {
          posted_at?: string | null
          posted_by?: string | null
        }
        Relationships: Relationship[]
      }
      gl_lines: {
        Row: {
          id: string
          org_id: string
          entry_id: string
          account_id: string
          description: string | null
          debit: string
          credit: string
          dimensions: Json
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          entry_id: string
          account_id: string
          description?: string | null
          debit?: number
          credit?: number
          dimensions?: Json
          created_at?: string
        }
        Update: {
          description?: string | null
          debit?: number
          credit?: number
          dimensions?: Json
        }
        Relationships: Relationship[]
      }
      ar_customers: {
        Row: {
          id: string
          org_id: string
          name: string
          email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          email?: string | null
          updated_at?: string
        }
        Relationships: Relationship[]
      }
      ar_invoices: {
        Row: {
          id: string
          org_id: string
          customer_id: string | null
          invoice_number: string
          reference_number: string | null
          issue_date: string
          due_date: string | null
          currency: string
          notes: string | null
          subtotal: string
          vat_total: string
          total: string
          status: string
          posted_entry_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          customer_id?: string | null
          invoice_number: string
          reference_number?: string | null
          issue_date?: string
          due_date?: string | null
          currency?: string
          notes?: string | null
          subtotal?: number
          vat_total?: number
          total?: number
          status?: string
          posted_entry_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          due_date?: string | null
          notes?: string | null
          subtotal?: number
          vat_total?: number
          total?: number
          status?: string
          posted_entry_id?: string | null
          updated_at?: string
        }
        Relationships: Relationship[]
      }
      ar_invoice_lines: {
        Row: {
          id: string
          org_id: string
          invoice_id: string
          product_id: string | null
          description: string
          quantity: string
          unit_price: string
          vat_rate: string
          line_subtotal: string
          line_vat: string
          line_total: string
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          invoice_id: string
          product_id?: string | null
          description: string
          quantity: number
          unit_price: number
          vat_rate: number
          line_subtotal: number
          line_vat: number
          line_total: number
          created_at?: string
        }
        Update: {
          description?: string
          quantity?: number
          unit_price?: number
          vat_rate?: number
          line_subtotal?: number
          line_vat?: number
          line_total?: number
        }
        Relationships: Relationship[]
      }
      ar_payments: {
        Row: {
          id: string
          org_id: string
          payment_date: string
          amount: string
          currency: string
          reference_number: string | null
          method: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          payment_date: string
          amount: number
          currency?: string
          reference_number?: string | null
          method?: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          reference_number?: string | null
        }
        Relationships: Relationship[]
      }
      ar_payment_allocations: {
        Row: {
          id: string
          org_id: string
          payment_id: string
          invoice_id: string
          amount: string
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          payment_id: string
          invoice_id: string
          amount: number
          created_at?: string
        }
        Update: {
          amount?: number
        }
        Relationships: Relationship[]
      }
      ap_vendors: {
        Row: {
          id: string
          org_id: string
          name: string
          email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          email?: string | null
          updated_at?: string
        }
        Relationships: Relationship[]
      }
      ap_invoices: {
        Row: {
          id: string
          org_id: string
          vendor_id: string | null
          vendor_invoice_number: string | null
          issue_date: string
          due_date: string | null
          currency: string
          notes: string | null
          subtotal: string
          vat_total: string
          total: string
          status: string
          posted_entry_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          vendor_id?: string | null
          vendor_invoice_number?: string | null
          issue_date?: string
          due_date?: string | null
          currency?: string
          notes?: string | null
          subtotal?: number
          vat_total?: number
          total?: number
          status?: string
          posted_entry_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          due_date?: string | null
          notes?: string | null
          subtotal?: number
          vat_total?: number
          total?: number
          status?: string
          posted_entry_id?: string | null
          updated_at?: string
        }
        Relationships: Relationship[]
      }
      ap_invoice_lines: {
        Row: {
          id: string
          org_id: string
          invoice_id: string
          description: string
          quantity: string
          unit_price: string
          vat_rate: string
          expense_account_no: string
          vat_account_no: string
          line_subtotal: string
          line_vat: string
          line_total: string
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          invoice_id: string
          description: string
          quantity: number
          unit_price: number
          vat_rate: number
          expense_account_no: string
          vat_account_no: string
          line_subtotal: number
          line_vat: number
          line_total: number
          created_at?: string
        }
        Update: {
          description?: string
          quantity?: number
          unit_price?: number
          vat_rate?: number
          expense_account_no?: string
          vat_account_no?: string
          line_subtotal?: number
          line_vat?: number
          line_total?: number
        }
        Relationships: Relationship[]
      }
      ap_payments: {
        Row: {
          id: string
          org_id: string
          invoice_id: string
          payment_date: string
          amount: string
          currency: string
          method: string
          exported_payment_file: boolean
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          invoice_id: string
          payment_date: string
          amount: number
          currency?: string
          method?: string
          exported_payment_file?: boolean
          created_by?: string | null
          created_at?: string
        }
        Update: {
          exported_payment_file?: boolean
        }
        Relationships: Relationship[]
      }
      bank_imports: {
        Row: {
          id: string
          org_id: string
          source: string
          original_filename: string | null
          imported_by: string | null
          imported_at: string
          stats: Json
        }
        Insert: {
          id?: string
          org_id: string
          source?: string
          original_filename?: string | null
          imported_by?: string | null
          imported_at?: string
          stats?: Json
        }
        Update: {
          stats?: Json
        }
        Relationships: Relationship[]
      }
      bank_transactions: {
        Row: {
          id: string
          org_id: string
          import_id: string | null
          booking_date: string
          amount: string
          currency: string
          counterparty_name: string | null
          reference_number: string | null
          message: string | null
          raw: Json
          matched_invoice_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          import_id?: string | null
          booking_date: string
          amount: number
          currency?: string
          counterparty_name?: string | null
          reference_number?: string | null
          message?: string | null
          raw?: Json
          matched_invoice_id?: string | null
          created_at?: string
        }
        Update: {
          matched_invoice_id?: string | null
        }
        Relationships: Relationship[]
      }
    }
    Views: Record<string, never>
    Functions: {
      post_ar_invoice: { Args: { p_invoice_id: string }; Returns: string }
      post_ap_invoice: { Args: { p_invoice_id: string }; Returns: string }
      record_ar_payment: {
        Args: { p_invoice_id: string; p_payment_date: string; p_amount: number; p_reference_number?: string | null }
        Returns: string
      }
      record_ap_payment: { Args: { p_invoice_id: string; p_payment_date: string; p_amount: number }; Returns: string }
      reverse_gl_entry: { Args: { p_entry_id: string; p_entry_date: string; p_description?: string | null }; Returns: string }
      void_ar_invoice: { Args: { p_invoice_id: string; p_void_date?: string | null; p_reason?: string | null }; Returns: string }
      void_ap_invoice: { Args: { p_invoice_id: string; p_void_date?: string | null; p_reason?: string | null }; Returns: string }
      reporting_pnl: { Args: { p_org_id: string; p_start: string; p_end: string }; Returns: Json }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
