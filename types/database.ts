export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

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
      companies: {
        Row: {
          id: string
          name: string
          business_id: string | null
          vat_number: string | null
          email: string | null
          phone: string | null
          address_line1: string | null
          address_line2: string | null
          postal_code: string | null
          city: string | null
          country: string
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          business_id?: string | null
          vat_number?: string | null
          email?: string | null
          phone?: string | null
          address_line1?: string | null
          address_line2?: string | null
          postal_code?: string | null
          city?: string | null
          country?: string
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['companies']['Insert']>
        Relationships: Relationship[]
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Database['public']['Tables']['profiles']['Insert'], 'id'>>
        Relationships: Relationship[]
      }
      company_users: {
        Row: {
          id: string
          company_id: string
          user_id: string
          role: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          user_id: string
          role: string
          is_active?: boolean
          created_at?: string
        }
        Update: Partial<Omit<Database['public']['Tables']['company_users']['Insert'], 'company_id' | 'user_id'>>
        Relationships: Relationship[]
      }
      company_modules: {
        Row: {
          id: string
          company_id: string
          module_key: string
          is_enabled: boolean
          config: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          module_key: string
          is_enabled?: boolean
          config?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Database['public']['Tables']['company_modules']['Insert'], 'company_id' | 'module_key'>>
        Relationships: Relationship[]
      }
      branches: {
        Row: {
          id: string
          company_id: string
          name: string
          code: string | null
          branch_type: string
          address_line1: string | null
          address_line2: string | null
          postal_code: string | null
          city: string | null
          country: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          code?: string | null
          branch_type?: string
          address_line1?: string | null
          address_line2?: string | null
          postal_code?: string | null
          city?: string | null
          country?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Database['public']['Tables']['branches']['Insert'], 'company_id'>>
        Relationships: Relationship[]
      }
      company_user_branches: {
        Row: {
          id: string
          company_id: string
          user_id: string
          branch_id: string
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          user_id: string
          branch_id: string
          created_at?: string
        }
        Update: Partial<Omit<Database['public']['Tables']['company_user_branches']['Insert'], 'company_id' | 'user_id' | 'branch_id'>>
        Relationships: Relationship[]
      }
      customers: {
        Row: {
          id: string
          company_id: string
          branch_id: string | null
          name: string
          business_id: string | null
          vat_number: string | null
          email: string | null
          phone: string | null
          billing_address_line1: string | null
          billing_address_line2: string | null
          billing_postal_code: string | null
          billing_city: string | null
          billing_country: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          branch_id?: string | null
          name: string
          business_id?: string | null
          vat_number?: string | null
          email?: string | null
          phone?: string | null
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_postal_code?: string | null
          billing_city?: string | null
          billing_country?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Database['public']['Tables']['customers']['Insert'], 'company_id'>>
        Relationships: Relationship[]
      }
      vehicles: {
        Row: {
          id: string
          company_id: string
          branch_id: string | null
          registration_number: string
          make: string | null
          model: string | null
          year: number | null
          fuel_type: string | null
          current_km: string
          next_service_km: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          branch_id?: string | null
          registration_number: string
          make?: string | null
          model?: string | null
          year?: number | null
          fuel_type?: string | null
          current_km?: number | string
          next_service_km?: number | string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Database['public']['Tables']['vehicles']['Insert'], 'company_id'>>
        Relationships: Relationship[]
      }
      vehicle_maintenance: {
        Row: {
          id: string
          company_id: string
          vehicle_id: string
          branch_id: string | null
          type: string
          description: string | null
          performed_at: string
          km_at_service: number | null
          next_service_km: number | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          vehicle_id: string
          branch_id?: string | null
          type: string
          description?: string | null
          performed_at?: string
          km_at_service?: number | null
          next_service_km?: number | null
          created_at?: string
        }
        Update: Partial<Omit<Database['public']['Tables']['vehicle_maintenance']['Insert'], 'company_id'>>
        Relationships: Relationship[]
      }
      drivers: {
        Row: {
          id: string
          public_id: string
          company_id: string
          branch_id: string | null
          auth_user_id: string | null
          full_name: string
          phone: string | null
          email: string | null
          license_type: string | null
          employment_type: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          public_id?: string
          company_id: string
          branch_id?: string | null
          auth_user_id?: string | null
          full_name: string
          phone?: string | null
          email?: string | null
          license_type?: string | null
          employment_type?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Database['public']['Tables']['drivers']['Insert'], 'company_id'>>
        Relationships: Relationship[]
      }
      transport_orders: {
        Row: {
          id: string
          company_id: string
          branch_id: string | null
          customer_id: string
          assigned_vehicle_id: string | null
          assigned_driver_id: string | null
          order_number: string
          pickup_location: string
          delivery_location: string
          cargo_description: string | null
          scheduled_at: string | null
          status: string
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          branch_id?: string | null
          customer_id: string
          assigned_vehicle_id?: string | null
          assigned_driver_id?: string | null
          order_number: string
          pickup_location: string
          delivery_location: string
          cargo_description?: string | null
          scheduled_at?: string | null
          status?: string
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Database['public']['Tables']['transport_orders']['Insert'], 'company_id' | 'created_by'>>
        Relationships: Relationship[]
      }
      trips: {
        Row: {
          id: string
          public_id: string
          company_id: string
          branch_id: string | null
          transport_order_id: string | null
          customer_id: string
          vehicle_id: string | null
          driver_id: string | null
          start_time: string | null
          end_time: string | null
          start_km: string | null
          end_km: string | null
          distance_km: string | null
          waiting_time_minutes: number
          notes: string | null
          delivery_confirmation: string | null
          delivery_recipient_name: string | null
          delivery_received_at: string | null
          status: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          public_id?: string
          company_id: string
          branch_id?: string | null
          transport_order_id?: string | null
          customer_id: string
          vehicle_id?: string | null
          driver_id?: string | null
          start_time?: string | null
          end_time?: string | null
          start_km?: number | string | null
          end_km?: number | string | null
          distance_km?: number | string | null
          waiting_time_minutes?: number
          notes?: string | null
          delivery_confirmation?: string | null
          delivery_recipient_name?: string | null
          delivery_received_at?: string | null
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Database['public']['Tables']['trips']['Insert'], 'company_id' | 'created_by'>>
        Relationships: Relationship[]
      }
      trip_checkpoints: {
        Row: {
          id: string
          company_id: string
          branch_id: string | null
          trip_id: string
          checkpoint_type: string
          latitude: string
          longitude: string
          accuracy_meters: string | null
          notes: string | null
          captured_at: string
          captured_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          branch_id?: string | null
          trip_id: string
          checkpoint_type: string
          latitude: number | string
          longitude: number | string
          accuracy_meters?: number | string | null
          notes?: string | null
          captured_at?: string
          captured_by?: string | null
          created_at?: string
        }
        Update: Partial<Omit<Database['public']['Tables']['trip_checkpoints']['Insert'], 'company_id' | 'trip_id'>>
        Relationships: Relationship[]
      }
      invoices: {
        Row: {
          id: string
          company_id: string
          branch_id: string | null
          customer_id: string
          trip_id: string | null
          invoice_number: string
          issue_date: string
          due_date: string
          reference_number: string | null
          status: string
          subtotal: string
          vat_total: string
          total: string
          notes: string | null
          pdf_url: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          branch_id?: string | null
          customer_id: string
          trip_id?: string | null
          invoice_number: string
          issue_date: string
          due_date: string
          reference_number?: string | null
          status?: string
          subtotal?: number | string
          vat_total?: number | string
          total?: number | string
          notes?: string | null
          pdf_url?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Database['public']['Tables']['invoices']['Insert'], 'company_id' | 'created_by'>>
        Relationships: Relationship[]
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          description: string
          quantity: string
          unit_price: string
          vat_rate: string
          line_total: string
        }
        Insert: {
          id?: string
          invoice_id: string
          description: string
          quantity: number | string
          unit_price: number | string
          vat_rate?: number | string
          line_total: number | string
        }
        Update: Partial<Omit<Database['public']['Tables']['invoice_items']['Insert'], 'invoice_id'>>
        Relationships: Relationship[]
      }
      payments: {
        Row: {
          id: string
          company_id: string
          invoice_id: string
          payment_date: string
          amount: string
          payment_method: string | null
          reference: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          invoice_id: string
          payment_date: string
          amount: number | string
          payment_method?: string | null
          reference?: string | null
          created_at?: string
        }
        Update: Partial<Omit<Database['public']['Tables']['payments']['Insert'], 'company_id' | 'invoice_id'>>
        Relationships: Relationship[]
      }
      company_billing_accounts: {
        Row: {
          company_id: string
          stripe_customer_id: string
          billing_email: string | null
          billing_name: string | null
          stripe_default_payment_method_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          company_id: string
          stripe_customer_id: string
          billing_email?: string | null
          billing_name?: string | null
          stripe_default_payment_method_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Database['public']['Tables']['company_billing_accounts']['Insert'], 'company_id' | 'stripe_customer_id'>>
        Relationships: Relationship[]
      }
      company_subscriptions: {
        Row: {
          id: string
          company_id: string
          stripe_customer_id: string
          stripe_subscription_id: string
          plan_key: string
          status: string
          stripe_price_id: string | null
          seats: number
          cancel_at_period_end: boolean
          current_period_start: string | null
          current_period_end: string | null
          trial_ends_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          stripe_customer_id: string
          stripe_subscription_id: string
          plan_key: string
          status: string
          stripe_price_id?: string | null
          seats?: number
          cancel_at_period_end?: boolean
          current_period_start?: string | null
          current_period_end?: string | null
          trial_ends_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Database['public']['Tables']['company_subscriptions']['Insert'], 'company_id' | 'stripe_customer_id' | 'stripe_subscription_id'>>
        Relationships: Relationship[]
      }
      company_app_settings: {
        Row: {
          company_id: string
          order_prefix: string
          order_next_number: number
          invoice_prefix: string
          invoice_next_number: number
          default_payment_terms_days: number
          default_vat_rate: string
          fuel_cost_per_km: string
          maintenance_cost_per_km: string
          driver_cost_per_hour: string
          waiting_cost_per_hour: string
          default_currency: string
          invoice_footer: string | null
          brand_accent: string
          invoice_payment_instructions: string | null
          invoice_logo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          company_id: string
          order_prefix?: string
          order_next_number?: number
          invoice_prefix?: string
          invoice_next_number?: number
          default_payment_terms_days?: number
          default_vat_rate?: number | string
          fuel_cost_per_km?: number | string
          maintenance_cost_per_km?: number | string
          driver_cost_per_hour?: number | string
          waiting_cost_per_hour?: number | string
          default_currency?: string
          invoice_footer?: string | null
          brand_accent?: string
          invoice_payment_instructions?: string | null
          invoice_logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Database['public']['Tables']['company_app_settings']['Insert'], 'company_id'>>
        Relationships: Relationship[]
      }
      inventory_products: {
        Row: {
          id: string
          company_id: string
          branch_id: string
          sku: string
          name: string
          category: string | null
          unit: string
          reorder_level: string
          cost_price: string
          sale_price: string | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          branch_id: string
          sku: string
          name: string
          category?: string | null
          unit?: string
          reorder_level?: number | string
          cost_price?: number | string
          sale_price?: number | string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Database['public']['Tables']['inventory_products']['Insert'], 'company_id'>>
        Relationships: Relationship[]
      }
      inventory_movements: {
        Row: {
          id: string
          company_id: string
          branch_id: string
          product_id: string
          movement_type: string
          quantity: string
          unit_cost: string | null
          reference: string | null
          notes: string | null
          created_by: string | null
          occurred_at: string
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          branch_id: string
          product_id: string
          movement_type: string
          quantity: number | string
          unit_cost?: number | string | null
          reference?: string | null
          notes?: string | null
          created_by?: string | null
          occurred_at?: string
          created_at?: string
        }
        Update: Partial<Omit<Database['public']['Tables']['inventory_movements']['Insert'], 'company_id' | 'product_id' | 'branch_id' | 'created_by'>>
        Relationships: Relationship[]
      }
      purchase_vendors: {
        Row: {
          id: string
          company_id: string
          branch_id: string
          name: string
          business_id: string | null
          email: string | null
          phone: string | null
          address_line1: string | null
          address_line2: string | null
          postal_code: string | null
          city: string | null
          country: string
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          branch_id: string
          name: string
          business_id?: string | null
          email?: string | null
          phone?: string | null
          address_line1?: string | null
          address_line2?: string | null
          postal_code?: string | null
          city?: string | null
          country?: string
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Database['public']['Tables']['purchase_vendors']['Insert'], 'company_id'>>
        Relationships: Relationship[]
      }
      purchase_invoices: {
        Row: {
          id: string
          company_id: string
          branch_id: string
          vendor_id: string
          invoice_number: string
          invoice_date: string
          due_date: string | null
          status: string
          reference_number: string | null
          subtotal: string
          vat_total: string
          total: string
          notes: string | null
          received_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          branch_id: string
          vendor_id: string
          invoice_number: string
          invoice_date: string
          due_date?: string | null
          status?: string
          reference_number?: string | null
          subtotal?: number | string
          vat_total?: number | string
          total?: number | string
          notes?: string | null
          received_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Database['public']['Tables']['purchase_invoices']['Insert'], 'company_id' | 'created_by'>>
        Relationships: Relationship[]
      }
      purchase_invoice_items: {
        Row: {
          id: string
          purchase_invoice_id: string
          inventory_product_id: string | null
          description: string
          quantity: string
          unit_price: string
          vat_rate: string
          line_total: string
          received_to_stock: boolean
        }
        Insert: {
          id?: string
          purchase_invoice_id: string
          inventory_product_id?: string | null
          description: string
          quantity: number | string
          unit_price?: number | string
          vat_rate?: number | string
          line_total?: number | string
          received_to_stock?: boolean
        }
        Update: Partial<Omit<Database['public']['Tables']['purchase_invoice_items']['Insert'], 'purchase_invoice_id'>>
        Relationships: Relationship[]
      }
      purchase_payments: {
        Row: {
          id: string
          company_id: string
          purchase_invoice_id: string
          payment_date: string
          amount: string
          reference: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          purchase_invoice_id: string
          payment_date: string
          amount: number | string
          reference?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: Partial<Omit<Database['public']['Tables']['purchase_payments']['Insert'], 'company_id' | 'purchase_invoice_id'>>
        Relationships: Relationship[]
      }
      workforce_employees: {
        Row: {
          id: string
          company_id: string
          branch_id: string
          auth_user_id: string | null
          full_name: string
          email: string | null
          phone: string | null
          job_title: string | null
          employment_type: string | null
          pay_type: string
          hourly_rate: string
          overtime_rate: string | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          branch_id: string
          auth_user_id?: string | null
          full_name: string
          email?: string | null
          phone?: string | null
          job_title?: string | null
          employment_type?: string | null
          pay_type?: string
          hourly_rate?: number | string
          overtime_rate?: number | string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Database['public']['Tables']['workforce_employees']['Insert'], 'company_id'>>
        Relationships: Relationship[]
      }
      time_entries: {
        Row: {
          id: string
          company_id: string
          branch_id: string
          employee_id: string
          payroll_run_id: string | null
          work_date: string
          start_time: string
          end_time: string | null
          break_minutes: number
          regular_minutes: number
          overtime_minutes: number
          status: string
          source: string
          notes: string | null
          created_by: string | null
          approved_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          branch_id: string
          employee_id: string
          payroll_run_id?: string | null
          work_date: string
          start_time: string
          end_time?: string | null
          break_minutes?: number
          regular_minutes?: number
          overtime_minutes?: number
          status?: string
          source?: string
          notes?: string | null
          created_by?: string | null
          approved_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Database['public']['Tables']['time_entries']['Insert'], 'company_id' | 'branch_id' | 'employee_id'>>
        Relationships: Relationship[]
      }
      payroll_runs: {
        Row: {
          id: string
          company_id: string
          branch_id: string | null
          period_start: string
          period_end: string
          status: string
          notes: string | null
          total_regular_minutes: number
          total_overtime_minutes: number
          total_estimated_gross: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          branch_id?: string | null
          period_start: string
          period_end: string
          status?: string
          notes?: string | null
          total_regular_minutes?: number
          total_overtime_minutes?: number
          total_estimated_gross?: number | string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Database['public']['Tables']['payroll_runs']['Insert'], 'company_id'>>
        Relationships: Relationship[]
      }
      payroll_run_items: {
        Row: {
          id: string
          payroll_run_id: string
          employee_id: string
          regular_minutes: number
          overtime_minutes: number
          hourly_rate: string
          overtime_rate: string
          estimated_gross: string
          notes: string | null
        }
        Insert: {
          id?: string
          payroll_run_id: string
          employee_id: string
          regular_minutes?: number
          overtime_minutes?: number
          hourly_rate?: number | string
          overtime_rate?: number | string
          estimated_gross?: number | string
          notes?: string | null
        }
        Update: Partial<Omit<Database['public']['Tables']['payroll_run_items']['Insert'], 'payroll_run_id' | 'employee_id'>>
        Relationships: Relationship[]
      }
      documents: {
        Row: {
          id: string
          company_id: string
          branch_id: string | null
          related_type: string | null
          related_id: string | null
          file_name: string
          file_path: string
          mime_type: string | null
          uploaded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          branch_id?: string | null
          related_type?: string | null
          related_id?: string | null
          file_name: string
          file_path: string
          mime_type?: string | null
          uploaded_by?: string | null
          created_at?: string
        }
        Update: Partial<Omit<Database['public']['Tables']['documents']['Insert'], 'company_id' | 'file_name' | 'file_path'>>
        Relationships: Relationship[]
      }
      recurring_order_templates: {
        Row: {
          id: string
          company_id: string
          branch_id: string | null
          customer_id: string | null
          vehicle_id: string | null
          driver_id: string | null
          pickup_location: string
          delivery_location: string
          cargo_description: string | null
          notes: string | null
          recurrence_rule: string
          recurrence_day_of_week: number | null
          recurrence_day_of_month: number | null
          next_occurrence_date: string
          is_active: boolean
          last_generated_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          branch_id?: string | null
          customer_id?: string | null
          vehicle_id?: string | null
          driver_id?: string | null
          pickup_location: string
          delivery_location: string
          cargo_description?: string | null
          notes?: string | null
          recurrence_rule: string
          recurrence_day_of_week?: number | null
          recurrence_day_of_month?: number | null
          next_occurrence_date: string
          is_active?: boolean
          last_generated_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Database['public']['Tables']['recurring_order_templates']['Insert'], 'company_id'>>
        Relationships: Relationship[]
      }
      sales_quotes: {
        Row: {
          id: string
          company_id: string
          branch_id: string | null
          customer_id: string
          quote_number: string
          title: string
          pickup_location: string
          delivery_location: string
          cargo_description: string | null
          issue_date: string
          valid_until: string | null
          status: string
          subtotal: string
          vat_total: string
          total: string
          notes: string | null
          converted_order_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          branch_id?: string | null
          customer_id: string
          quote_number: string
          title: string
          pickup_location: string
          delivery_location: string
          cargo_description?: string | null
          issue_date: string
          valid_until?: string | null
          status?: string
          subtotal?: number | string
          vat_total?: number | string
          total?: number | string
          notes?: string | null
          converted_order_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Database['public']['Tables']['sales_quotes']['Insert'], 'company_id' | 'created_by'>>
        Relationships: Relationship[]
      }
      sales_quote_items: {
        Row: {
          id: string
          quote_id: string
          description: string
          quantity: string
          unit_price: string
          vat_rate: string
          line_total: string
        }
        Insert: {
          id?: string
          quote_id: string
          description: string
          quantity: number | string
          unit_price: number | string
          vat_rate?: number | string
          line_total: number | string
        }
        Update: Partial<Omit<Database['public']['Tables']['sales_quote_items']['Insert'], 'quote_id'>>
        Relationships: Relationship[]
      }
      audit_logs: {
        Row: {
          id: string
          company_id: string | null
          user_id: string | null
          entity_type: string
          entity_id: string | null
          action: string
          old_values: Json | null
          new_values: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id?: string | null
          user_id?: string | null
          entity_type: string
          entity_id?: string | null
          action: string
          old_values?: Json | null
          new_values?: Json | null
          created_at?: string
        }
        Update: Partial<Omit<Database['public']['Tables']['audit_logs']['Insert'], 'entity_type' | 'action'>>
        Relationships: Relationship[]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type PublicSchema = Database['public']
export type TableName = keyof PublicSchema['Tables']
export type TableRow<T extends TableName> = PublicSchema['Tables'][T]['Row']
export type TableInsert<T extends TableName> = PublicSchema['Tables'][T]['Insert']
export type TableUpdate<T extends TableName> = PublicSchema['Tables'][T]['Update']
