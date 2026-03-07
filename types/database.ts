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
      customers: {
        Row: {
          id: string
          company_id: string
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
      drivers: {
        Row: {
          id: string
          public_id: string
          company_id: string
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
          status: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          public_id?: string
          company_id: string
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
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Database['public']['Tables']['trips']['Insert'], 'company_id' | 'created_by'>>
        Relationships: Relationship[]
      }
      invoices: {
        Row: {
          id: string
          company_id: string
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
      documents: {
        Row: {
          id: string
          company_id: string
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
