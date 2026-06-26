export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      actions: {
        Row: {
          created_at: string | null
          due_date: string | null
          id: string
          risk_id: string | null
          status: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          due_date?: string | null
          id?: string
          risk_id?: string | null
          status?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          due_date?: string | null
          id?: string
          risk_id?: string | null
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      alerts: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      audit_checklists: {
        Row: {
          id: string
          name: string
          description: string | null
          sector_id: string | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          sector_id?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          sector_id?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_checklists_sector_id_fkey"
            columns: ["sector_id"]
            referencedRelation: "sectors"
            referencedSchema: "public"
          }
        ]
      }
      audit_checklist_items: {
        Row: {
          id: string
          checklist_id: string | null
          category: string
          question: string
          requirement_code: string | null
          order_index: number | null
        }
        Insert: {
          id?: string
          checklist_id?: string | null
          category: string
          question: string
          requirement_code?: string | null
          order_index?: number | null
        }
        Update: {
          id?: string
          checklist_id?: string | null
          category?: string
          question?: string
          requirement_code?: string | null
          order_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            referencedRelation: "audit_checklists"
            referencedSchema: "public"
          }
        ]
      }
      audit_responses: {
        Row: {
          id: string
          session_id: string | null
          item_id: string | null
          response: string | null
          observations: string | null
          evidence_url: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          session_id?: string | null
          item_id?: string | null
          response?: string | null
          observations?: string | null
          evidence_url?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          session_id?: string | null
          item_id?: string | null
          response?: string | null
          observations?: string | null
          evidence_url?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_responses_session_id_fkey"
            columns: ["session_id"]
            referencedRelation: "audit_sessions"
            referencedSchema: "public"
          },
          {
            foreignKeyName: "audit_responses_item_id_fkey"
            columns: ["item_id"]
            referencedRelation: "audit_checklist_items"
            referencedSchema: "public"
          }
        ]
      }
      audit_sessions: {
        Row: {
          id: string
          company_id: string | null
          checklist_id: string | null
          auditor_id: string | null
          status: string | null
          score: number | null
          created_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          company_id?: string | null
          checklist_id?: string | null
          auditor_id?: string | null
          status?: string | null
          score?: number | null
          created_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string | null
          checklist_id?: string | null
          auditor_id?: string | null
          status?: string | null
          score?: number | null
          created_at?: string | null
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_sessions_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedSchema: "public"
          },
          {
            foreignKeyName: "audit_sessions_checklist_id_fkey"
            columns: ["checklist_id"]
            referencedRelation: "audit_checklists"
            referencedSchema: "public"
          }
        ]
      }
      audits: {
        Row: {
          auditor_id: string | null
          company_id: string | null
          created_at: string | null
          description: string | null
          end_date: string
          findings: string | null
          id: string
          recommendations: string | null
          start_date: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          auditor_id?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          end_date: string
          findings?: string | null
          id?: string
          recommendations?: string | null
          start_date: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          auditor_id?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string
          findings?: string | null
          id?: string
          recommendations?: string | null
          start_date?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string | null
          employee_count: string | null
          id: string
          name: string | null
          owner_id: string | null
          risk_level: string | null
          sector: string | null
          sector_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          employee_count?: string | null
          id?: string
          name?: string | null
          owner_id?: string | null
          risk_level?: string | null
          sector?: string | null
          sector_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          employee_count?: string | null
          id?: string
          name?: string | null
          owner_id?: string | null
          risk_level?: string | null
          sector?: string | null
          sector_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      evidences: {
        Row: {
          created_at: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          risk_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          risk_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          risk_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      risk_templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          impact: number | null
          is_active: boolean | null
          name: string | null
          probability: number | null
          sector_id: string | null
          standard_id: string | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          impact?: number | null
          is_active?: boolean | null
          name?: string | null
          probability?: number | null
          sector_id?: string | null
          standard_id?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          impact?: number | null
          is_active?: boolean | null
          name?: string | null
          probability?: number | null
          sector_id?: string | null
          standard_id?: string | null
          type?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          created_at: string | null
          plan_id: string | null
          subscription_end_date: string | null
          subscription_status: string | null
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          created_at?: string | null
          plan_id?: string | null
          subscription_end_date?: string | null
          subscription_status?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          created_at?: string | null
          plan_id?: string | null
          subscription_end_date?: string | null
          subscription_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedSchema: "auth"
          },
          {
            foreignKeyName: "profiles_plan_id_fkey"
            columns: ["plan_id"]
            referencedRelation: "plans"
            referencedSchema: "public"
          }
        ]
      }
      plans: {
        Row: {
          id: string
          name: string
          price: number
          max_companies: number
          features: string[]
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          price: number
          max_companies?: number
          features?: string[]
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          price?: number
          max_companies?: number
          features?: string[]
          is_active?: boolean | null
          created_at?: string | null
        }
        Relationships: []
      }
      risks: {
        Row: {
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string
          impact: number | null
          name: string | null
          owner_id: string | null
          probability: number | null
          risk_level: number | null
          standard_id: string | null
          status: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          impact?: number | null
          name?: string | null
          owner_id?: string | null
          probability?: number | null
          risk_level?: number | null
          standard_id?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          impact?: number | null
          name?: string | null
          owner_id?: string | null
          probability?: number | null
          risk_level?: number | null
          standard_id?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"] | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"] | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"] | null
          user_id?: string | null
        }
        Relationships: []
      }
      vulnerabilidades: {
        Row: {
          afectada: boolean | null
          created_at: string | null
          cve_id: string | null
          cvss: number | null
          descripcion: string | null
          empresa_id: string | null
          fecha_deteccion: string | null
          fecha_publicacion: string | null
          fuente: string | null
          id: string
          nueva: boolean | null
          parchada: boolean | null
          producto_id: string | null
          severity: string | null
          status: string | null
          title: string | null
        }
        Insert: {
          afectada?: boolean | null
          created_at?: string | null
          cve_id?: string | null
          cvss?: number | null
          descripcion?: string | null
          empresa_id?: string | null
          fecha_deteccion?: string | null
          fecha_publicacion?: string | null
          fuente?: string | null
          id?: string
          nueva?: boolean | null
          parchada?: boolean | null
          producto_id?: string | null
          severity?: string | null
          status?: string | null
          title?: string | null
        }
        Update: {
          afectada?: boolean | null
          created_at?: string | null
          cve_id?: string | null
          cvss?: number | null
          descripcion?: string | null
          empresa_id?: string | null
          fecha_deteccion?: string | null
          fecha_publicacion?: string | null
          fuente?: string | null
          id?: string
          nueva?: boolean | null
          parchada?: boolean | null
          producto_id?: string | null
          severity?: string | null
          status?: string | null
          title?: string | null
        }
        Relationships: []
      }
      webhooks: {
        Row: {
          active: boolean | null
          created_at: string | null
          events: string[]
          id: string
          secret: string | null
          updated_at: string | null
          url: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          events?: string[]
          id?: string
          secret?: string | null
          updated_at?: string | null
          url: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          events?: string[]
          id?: string
          secret?: string | null
          updated_at?: string | null
          url?: string
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
      app_role: "admin" | "auditor" | "superadmin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T]