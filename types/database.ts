export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: 'admin' | 'agent' | 'viewer'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'admin' | 'agent' | 'viewer'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'admin' | 'agent' | 'viewer'
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          id: string
          full_name: string
          phone: string
          whatsapp_enabled: boolean
          email: string | null
          address: string | null
          city: string | null
          country: string
          notes: string | null
          archived: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          full_name: string
          phone: string
          whatsapp_enabled?: boolean
          email?: string | null
          address?: string | null
          city?: string | null
          country?: string
          notes?: string | null
          archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          phone?: string
          whatsapp_enabled?: boolean
          email?: string | null
          address?: string | null
          city?: string | null
          country?: string
          notes?: string | null
          archived?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      packages: {
        Row: {
          id: string
          tracking_number: string | null
          customer_id: string
          route_id: string
          description: string
          weight_kg: number
          pieces: number
          volume_cm3: number | null
          declared_value: number | null
          amount_paid: number
          amount_due: number
          payment_method: 'cash' | 'mobile_money' | 'on_delivery'
          status: 'received' | 'in_transit' | 'available' | 'delivered' | 'dispute'
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tracking_number?: string | null
          customer_id: string
          route_id: string
          description: string
          weight_kg: number
          pieces?: number
          volume_cm3?: number | null
          declared_value?: number | null
          amount_paid?: number
          amount_due?: number
          payment_method?: 'cash' | 'mobile_money' | 'on_delivery'
          status?: 'received' | 'in_transit' | 'available' | 'delivered' | 'dispute'
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tracking_number?: string | null
          customer_id?: string
          route_id?: string
          description?: string
          weight_kg?: number
          pieces?: number
          volume_cm3?: number | null
          declared_value?: number | null
          amount_paid?: number
          amount_due?: number
          payment_method?: 'cash' | 'mobile_money' | 'on_delivery'
          status?: 'received' | 'in_transit' | 'available' | 'delivered' | 'dispute'
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'packages_customer_id_fkey'
            columns: ['customer_id']
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'packages_route_id_fkey'
            columns: ['route_id']
            referencedRelation: 'routes'
            referencedColumns: ['id']
          }
        ]
      }
      routes: {
        Row: {
          id: string
          name: string
          origin: string
          destination: string
          capacity_kg: number
          price_per_kg: number
          currency: string
          estimated_days: number
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          origin: string
          destination: string
          capacity_kg?: number
          price_per_kg?: number
          currency?: string
          estimated_days?: number
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          origin?: string
          destination?: string
          capacity_kg?: number
          price_per_kg?: number
          currency?: string
          estimated_days?: number
          active?: boolean
        }
        Relationships: []
      }
      package_status_history: {
        Row: {
          id: string
          package_id: string
          from_status: string | null
          to_status: string
          changed_by: string | null
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          package_id: string
          from_status?: string | null
          to_status: string
          changed_by?: string | null
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          package_id?: string
          from_status?: string | null
          to_status?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'package_status_history_package_id_fkey'
            columns: ['package_id']
            referencedRelation: 'packages'
            referencedColumns: ['id']
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          package_id: string
          channel: 'whatsapp' | 'sms' | 'email'
          recipient_phone: string
          message: string
          status: 'pending' | 'sent' | 'failed'
          provider_message_id: string | null
          error: string | null
          sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          package_id: string
          channel: 'whatsapp' | 'sms' | 'email'
          recipient_phone: string
          message: string
          status?: 'pending' | 'sent' | 'failed'
          provider_message_id?: string | null
          error?: string | null
          sent_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          status?: 'pending' | 'sent' | 'failed'
          provider_message_id?: string | null
          error?: string | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_package_id_fkey'
            columns: ['package_id']
            referencedRelation: 'packages'
            referencedColumns: ['id']
          }
        ]
      }
      message_templates: {
        Row: {
          id: string
          key: string
          channel: 'whatsapp' | 'sms'
          language: string
          body: string
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          key: string
          channel: 'whatsapp' | 'sms'
          language?: string
          body: string
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          key?: string
          channel?: 'whatsapp' | 'sms'
          language?: string
          body?: string
          active?: boolean
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          id: string
          user_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          before: Json | null
          after: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          before?: Json | null
          after?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
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

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
