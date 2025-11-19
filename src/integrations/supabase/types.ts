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
      achievements: {
        Row: {
          category: string | null
          description: string | null
          earned_at: string | null
          icon: string | null
          id: string
          name: string | null
          points_awarded: number | null
          tier: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          category?: string | null
          description?: string | null
          earned_at?: string | null
          icon?: string | null
          id?: string
          name?: string | null
          points_awarded?: number | null
          tier?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          category?: string | null
          description?: string | null
          earned_at?: string | null
          icon?: string | null
          id?: string
          name?: string | null
          points_awarded?: number | null
          tier?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_activity_logs: {
        Row: {
          action: string
          admin_id: string | null
          admin_user_id: string | null
          created_at: string
          detail: Json | null
          id: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          admin_user_id?: string | null
          created_at?: string
          detail?: Json | null
          id?: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          admin_user_id?: string | null
          created_at?: string
          detail?: Json | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_admin_activity_logs_admin_id"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_admin_activity_logs_admin_id"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "vw_admin_users_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_only_sensitive_users: {
        Row: {
          is_sensitive: boolean
          user_id: string
        }
        Insert: {
          is_sensitive?: boolean
          user_id: string
        }
        Update: {
          is_sensitive?: boolean
          user_id?: string
        }
        Relationships: []
      }
      admin_roles: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          name: string
          permissions: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          name: string
          permissions?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          name?: string
          permissions?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      admin_sessions: {
        Row: {
          admin_id: string
          created_at: string | null
          expires_at: string
          id: string
          ip_address: unknown
          is_active: boolean | null
          session_token: string | null
          token_hash: string
          user_agent: string | null
        }
        Insert: {
          admin_id: string
          created_at?: string | null
          expires_at: string
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          session_token?: string | null
          token_hash: string
          user_agent?: string | null
        }
        Update: {
          admin_id?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          session_token?: string | null
          token_hash?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_sessions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_sessions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "vw_admin_users_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          is_email_verified: boolean | null
          last_login_at: string | null
          otp_attempts: number | null
          otp_code: string | null
          otp_expires_at: string | null
          password_hash: string
          permissions: Json | null
          role_id: string | null
          updated_at: string | null
          user_id: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_email_verified?: boolean | null
          last_login_at?: string | null
          otp_attempts?: number | null
          otp_code?: string | null
          otp_expires_at?: string | null
          password_hash: string
          permissions?: Json | null
          role_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_email_verified?: boolean | null
          last_login_at?: string | null
          otp_attempts?: number | null
          otp_code?: string | null
          otp_expires_at?: string | null
          password_hash?: string
          permissions?: Json | null
          role_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_users_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "admin_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      admins: {
        Row: {
          created_at: string
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          event_data: Json | null
          event_type: string
          group_id: string | null
          id: string
          ip_address: string | null
          occurred_at: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          event_data?: Json | null
          event_type: string
          group_id?: string | null
          id?: string
          ip_address?: string | null
          occurred_at?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          event_data?: Json | null
          event_type?: string
          group_id?: string | null
          id?: string
          ip_address?: string | null
          occurred_at?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      api_configurations: {
        Row: {
          api_key: string | null
          api_key_encrypted: string | null
          api_secret: string | null
          api_secret_encrypted: string | null
          created_at: string
          enabled: boolean
          id: string
          provider: string
          test_mode: boolean
          updated_at: string
          webhook_secret: string | null
          webhook_secret_encrypted: string | null
          webhook_url: string | null
        }
        Insert: {
          api_key?: string | null
          api_key_encrypted?: string | null
          api_secret?: string | null
          api_secret_encrypted?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          provider: string
          test_mode?: boolean
          updated_at?: string
          webhook_secret?: string | null
          webhook_secret_encrypted?: string | null
          webhook_url?: string | null
        }
        Update: {
          api_key?: string | null
          api_key_encrypted?: string | null
          api_secret?: string | null
          api_secret_encrypted?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          provider?: string
          test_mode?: boolean
          updated_at?: string
          webhook_secret?: string | null
          webhook_secret_encrypted?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          setting_key: string
          setting_value: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "vw_admin_users_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_name: string
          created_at: string | null
          id: string
          is_primary: boolean | null
          is_verified: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_name: string
          account_number: string
          bank_name: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          is_verified?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_name?: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          is_verified?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bonus_transactions: {
        Row: {
          amount: number
          awarded_at: string | null
          bonus_type_code: string
          group_id: string | null
          id: string
          metadata: Json | null
          processed: boolean | null
          processed_at: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          amount: number
          awarded_at?: string | null
          bonus_type_code: string
          group_id?: string | null
          id?: string
          metadata?: Json | null
          processed?: boolean | null
          processed_at?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          awarded_at?: string | null
          bonus_type_code?: string
          group_id?: string | null
          id?: string
          metadata?: Json | null
          processed?: boolean | null
          processed_at?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bonus_transactions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "rosca_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bonus_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bonus_types: {
        Row: {
          bonus_amount: number
          bonus_percentage: number | null
          code: string
          conditions: Json
          created_at: string | null
          description: string | null
          expires_days: number | null
          id: string
          is_active: boolean | null
          max_per_cycle: number | null
          min_trust_score: number | null
          name: string
          streak_multiplier: Json | null
          updated_at: string | null
        }
        Insert: {
          bonus_amount?: number
          bonus_percentage?: number | null
          code: string
          conditions?: Json
          created_at?: string | null
          description?: string | null
          expires_days?: number | null
          id?: string
          is_active?: boolean | null
          max_per_cycle?: number | null
          min_trust_score?: number | null
          name: string
          streak_multiplier?: Json | null
          updated_at?: string | null
        }
        Update: {
          bonus_amount?: number
          bonus_percentage?: number | null
          code?: string
          conditions?: Json
          created_at?: string | null
          description?: string | null
          expires_days?: number | null
          id?: string
          is_active?: boolean | null
          max_per_cycle?: number | null
          min_trust_score?: number | null
          name?: string
          streak_multiplier?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      compliance_reports: {
        Row: {
          data: Json
          generated_at: string | null
          generated_by: string | null
          id: string
          report_period_end: string
          report_period_start: string
          report_type: string
          status: string | null
        }
        Insert: {
          data: Json
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          report_period_end: string
          report_period_start: string
          report_type: string
          status?: string | null
        }
        Update: {
          data?: Json
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          report_period_end?: string
          report_period_start?: string
          report_type?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "vw_admin_users_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      contributions: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          fee_amount: number | null
          group_id: string
          id: string
          metadata: Json | null
          net_amount: number | null
          payment_method: string | null
          payment_provider: string | null
          payment_reference: string | null
          receipt_url: string | null
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          fee_amount?: number | null
          group_id: string
          id?: string
          metadata?: Json | null
          net_amount?: number | null
          payment_method?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          receipt_url?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          fee_amount?: number | null
          group_id?: string
          id?: string
          metadata?: Json | null
          net_amount?: number | null
          payment_method?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          receipt_url?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contributions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "rosca_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contributions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_scores: {
        Row: {
          base_score: number | null
          flagged_fraud: boolean | null
          id: string
          last_update: string | null
          late_payments: number | null
          total_cycles_completed: number | null
          total_groups_joined: number | null
          trust_score: number | null
          user_id: string | null
        }
        Insert: {
          base_score?: number | null
          flagged_fraud?: boolean | null
          id?: string
          last_update?: string | null
          late_payments?: number | null
          total_cycles_completed?: number | null
          total_groups_joined?: number | null
          trust_score?: number | null
          user_id?: string | null
        }
        Update: {
          base_score?: number | null
          flagged_fraud?: boolean | null
          id?: string
          last_update?: string | null
          late_payments?: number | null
          total_cycles_completed?: number | null
          total_groups_joined?: number | null
          trust_score?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      fcm_tokens: {
        Row: {
          created_at: string | null
          device_name: string | null
          device_type: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_name?: string | null
          device_type?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          token: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_name?: string | null
          device_type?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      fraud_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          description: string
          id: string
          is_resolved: boolean | null
          metadata: Json | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          user_id: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          description: string
          id?: string
          is_resolved?: boolean | null
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          user_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          description?: string
          id?: string
          is_resolved?: boolean | null
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fraud_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "vw_admin_users_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_detection_rules: {
        Row: {
          conditions: Json
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          rule_name: string
          rule_type: string
          severity: string | null
        }
        Insert: {
          conditions: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          rule_name: string
          rule_type: string
          severity?: string | null
        }
        Update: {
          conditions?: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          rule_name?: string
          rule_type?: string
          severity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fraud_detection_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_detection_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_admin_users_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      group_balance: {
        Row: {
          created_at: string | null
          current_balance: number
          escrow_balance: number
          group_id: string
          id: string
          last_contribution_at: string | null
          last_payout_at: string | null
          reserve_balance: number
          total_contributions: number
          total_fees_paid: number
          total_payouts: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_balance?: number
          escrow_balance?: number
          group_id: string
          id?: string
          last_contribution_at?: string | null
          last_payout_at?: string | null
          reserve_balance?: number
          total_contributions?: number
          total_fees_paid?: number
          total_payouts?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_balance?: number
          escrow_balance?: number
          group_id?: string
          id?: string
          last_contribution_at?: string | null
          last_payout_at?: string | null
          reserve_balance?: number
          total_contributions?: number
          total_fees_paid?: number
          total_payouts?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_balance_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: true
            referencedRelation: "rosca_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_escrows: {
        Row: {
          created_at: string | null
          group_id: string | null
          id: string
          locked: boolean | null
          next_payout_date: string | null
          payout_cycle: number | null
          total_balance: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          group_id?: string | null
          id?: string
          locked?: boolean | null
          next_payout_date?: string | null
          payout_cycle?: number | null
          total_balance?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          group_id?: string | null
          id?: string
          locked?: boolean | null
          next_payout_date?: string | null
          payout_cycle?: number | null
          total_balance?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      group_members: {
        Row: {
          contribution_amount: number | null
          group_id: string
          has_contributed: boolean | null
          joined_at: string | null
          last_payout_at: string | null
          payout_position: number | null
          position_in_cycle: number | null
          user_id: string
        }
        Insert: {
          contribution_amount?: number | null
          group_id: string
          has_contributed?: boolean | null
          joined_at?: string | null
          last_payout_at?: string | null
          payout_position?: number | null
          position_in_cycle?: number | null
          user_id: string
        }
        Update: {
          contribution_amount?: number | null
          group_id?: string
          has_contributed?: boolean | null
          joined_at?: string | null
          last_payout_at?: string | null
          payout_position?: number | null
          position_in_cycle?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "rosca_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      group_performance_analytics: {
        Row: {
          active_members: number | null
          contribution_rate: number | null
          contributions_this_month: number | null
          created_at: string | null
          expected_contributions: number | null
          group_id: string | null
          id: string
          metric_date: string
          payout_completed_at: string | null
          payout_scheduled_at: string | null
          status: string | null
          total_members: number
        }
        Insert: {
          active_members?: number | null
          contribution_rate?: number | null
          contributions_this_month?: number | null
          created_at?: string | null
          expected_contributions?: number | null
          group_id?: string | null
          id?: string
          metric_date: string
          payout_completed_at?: string | null
          payout_scheduled_at?: string | null
          status?: string | null
          total_members: number
        }
        Update: {
          active_members?: number | null
          contribution_rate?: number | null
          contributions_this_month?: number | null
          created_at?: string | null
          expected_contributions?: number | null
          group_id?: string | null
          id?: string
          metric_date?: string
          payout_completed_at?: string | null
          payout_scheduled_at?: string | null
          status?: string | null
          total_members?: number
        }
        Relationships: []
      }
      group_settings: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_settings_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "rosca_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      message_read_receipts: {
        Row: {
          id: string
          message_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_read_receipts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          created_at: string | null
          group_id: string | null
          id: string
          is_pinned: boolean | null
          message: string
          message_type: string | null
          metadata: Json | null
          pinned_at: string | null
          pinned_by: string | null
          sender_id: string | null
        }
        Insert: {
          created_at?: string | null
          group_id?: string | null
          id?: string
          is_pinned?: boolean | null
          message: string
          message_type?: string | null
          metadata?: Json | null
          pinned_at?: string | null
          pinned_by?: string | null
          sender_id?: string | null
        }
        Update: {
          created_at?: string | null
          group_id?: string | null
          id?: string
          is_pinned?: boolean | null
          message?: string
          message_type?: string | null
          metadata?: Json | null
          pinned_at?: string | null
          pinned_by?: string | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      mobile_money_accounts: {
        Row: {
          account_name: string | null
          account_status: string | null
          created_at: string | null
          failure_count: number | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          is_verified: boolean | null
          last_transaction_at: string | null
          linked_at: string | null
          phone_number: string
          provider: string
          updated_at: string | null
          user_id: string | null
          verification_method: string | null
          verification_reference: string | null
          verified_at: string | null
        }
        Insert: {
          account_name?: string | null
          account_status?: string | null
          created_at?: string | null
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          is_verified?: boolean | null
          last_transaction_at?: string | null
          linked_at?: string | null
          phone_number: string
          provider: string
          updated_at?: string | null
          user_id?: string | null
          verification_method?: string | null
          verification_reference?: string | null
          verified_at?: string | null
        }
        Update: {
          account_name?: string | null
          account_status?: string | null
          created_at?: string | null
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          is_verified?: boolean | null
          last_transaction_at?: string | null
          linked_at?: string | null
          phone_number?: string
          provider?: string
          updated_at?: string | null
          user_id?: string | null
          verification_method?: string | null
          verification_reference?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mobile_money_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      mobile_money_transactions: {
        Row: {
          amount: number
          callback_received: boolean | null
          callback_response: Json | null
          created_at: string | null
          escrow_affected: boolean | null
          escrow_amount: number | null
          failure_reason: string | null
          group_id: string | null
          id: string
          phone_number: string
          provider: string
          provider_reference: string | null
          provider_response: Json | null
          reconciled_at: string | null
          reference: string | null
          retry_count: number | null
          status: string | null
          transaction_category: string | null
          transaction_id: string
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          callback_received?: boolean | null
          callback_response?: Json | null
          created_at?: string | null
          escrow_affected?: boolean | null
          escrow_amount?: number | null
          failure_reason?: string | null
          group_id?: string | null
          id?: string
          phone_number: string
          provider: string
          provider_reference?: string | null
          provider_response?: Json | null
          reconciled_at?: string | null
          reference?: string | null
          retry_count?: number | null
          status?: string | null
          transaction_category?: string | null
          transaction_id: string
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          callback_received?: boolean | null
          callback_response?: Json | null
          created_at?: string | null
          escrow_affected?: boolean | null
          escrow_amount?: number | null
          failure_reason?: string | null
          group_id?: string | null
          id?: string
          phone_number?: string
          provider?: string
          provider_reference?: string | null
          provider_response?: Json | null
          reconciled_at?: string | null
          reference?: string | null
          retry_count?: number | null
          status?: string | null
          transaction_category?: string | null
          transaction_id?: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mobile_money_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          audience: string
          created_at: string | null
          created_by: string | null
          criteria: Json | null
          delivered_count: number | null
          failed_count: number | null
          id: string
          message: string
          metadata: Json | null
          name: string
          priority: string | null
          scheduled_at: string | null
          sent_count: number | null
          status: string | null
          total_recipients: number | null
          updated_at: string | null
        }
        Insert: {
          audience: string
          created_at?: string | null
          created_by?: string | null
          criteria?: Json | null
          delivered_count?: number | null
          failed_count?: number | null
          id?: string
          message: string
          metadata?: Json | null
          name: string
          priority?: string | null
          scheduled_at?: string | null
          sent_count?: number | null
          status?: string | null
          total_recipients?: number | null
          updated_at?: string | null
        }
        Update: {
          audience?: string
          created_at?: string | null
          created_by?: string | null
          criteria?: Json | null
          delivered_count?: number | null
          failed_count?: number | null
          id?: string
          message?: string
          metadata?: Json | null
          name?: string
          priority?: string | null
          scheduled_at?: string | null
          sent_count?: number | null
          status?: string | null
          total_recipients?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_admin_users_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_disputes: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          dispute_type: string
          evidence: Json | null
          id: string
          reason: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          dispute_type: string
          evidence?: Json | null
          id?: string
          reason: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          dispute_type?: string
          evidence?: Json | null
          id?: string
          reason?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_disputes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_disputes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "vw_admin_users_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_disputes_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_disputes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_gateway_status: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          last_checked_at: string | null
          provider: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_checked_at?: string | null
          provider: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_checked_at?: string | null
          provider?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          account_id: string | null
          amount: number
          created_at: string | null
          error_message: string | null
          external_reference: string | null
          fee_amount: number | null
          group_id: string | null
          id: string
          metadata: Json | null
          method: string
          net_amount: number
          processed_at: string | null
          provider: string | null
          reference: string | null
          status: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          created_at?: string | null
          error_message?: string | null
          external_reference?: string | null
          fee_amount?: number | null
          group_id?: string | null
          id?: string
          metadata?: Json | null
          method: string
          net_amount: number
          processed_at?: string | null
          provider?: string | null
          reference?: string | null
          status?: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          created_at?: string | null
          error_message?: string | null
          external_reference?: string | null
          fee_amount?: number | null
          group_id?: string | null
          id?: string
          metadata?: Json | null
          method?: string
          net_amount?: number
          processed_at?: string | null
          provider?: string | null
          reference?: string | null
          status?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "rosca_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_schedule: {
        Row: {
          amount: number
          created_at: string | null
          group_id: string | null
          id: string
          payout_time: string | null
          processed_at: string | null
          scheduled_date: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          group_id?: string | null
          id?: string
          payout_time?: string | null
          processed_at?: string | null
          scheduled_date: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          group_id?: string | null
          id?: string
          payout_time?: string | null
          processed_at?: string | null
          scheduled_date?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payout_schedule_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "rosca_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_schedule_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          account_id: string | null
          amount: number
          commission_amount: number
          created_at: string
          cycle_number: number
          failure_reason: string | null
          fee_amount: number
          gross_amount: number
          group_id: string
          id: string
          metadata: Json | null
          mobile_money_reference: string | null
          payment_method: string | null
          payment_provider: string | null
          payment_reference: string | null
          payout_date: string
          processed_at: string | null
          receipt_url: string | null
          recipient_id: string
          status: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          commission_amount?: number
          created_at?: string
          cycle_number?: number
          failure_reason?: string | null
          fee_amount?: number
          gross_amount: number
          group_id: string
          id?: string
          metadata?: Json | null
          mobile_money_reference?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          payout_date?: string
          processed_at?: string | null
          receipt_url?: string | null
          recipient_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          commission_amount?: number
          created_at?: string
          cycle_number?: number
          failure_reason?: string | null
          fee_amount?: number
          gross_amount?: number
          group_id?: string
          id?: string
          metadata?: Json | null
          mobile_money_reference?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          payout_date?: string
          processed_at?: string | null
          receipt_url?: string | null
          recipient_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_account_mobile_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "mobile_money_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "rosca_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_metrics: {
        Row: {
          calculated_at: string | null
          id: string
          metadata: Json | null
          metric_date: string
          metric_type: string
          metric_value: number | null
        }
        Insert: {
          calculated_at?: string | null
          id?: string
          metadata?: Json | null
          metric_date: string
          metric_type: string
          metric_value?: number | null
        }
        Update: {
          calculated_at?: string | null
          id?: string
          metadata?: Json | null
          metric_date?: string
          metric_type?: string
          metric_value?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          id: string
          onboarding_completed: boolean | null
          onboarding_completed_at: string | null
          onboarding_step: number | null
          referral_code: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id: string
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_step?: number | null
          referral_code?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_step?: number | null
          referral_code?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          blocked_until: string | null
          created_at: string
          endpoint: string
          id: string
          identifier: string
          request_count: number
          window_start: string
        }
        Insert: {
          blocked_until?: string | null
          created_at?: string
          endpoint: string
          id?: string
          identifier: string
          request_count?: number
          window_start?: string
        }
        Update: {
          blocked_until?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          identifier?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          referee_id: string
          referrer_id: string
          reward_amount: number | null
          reward_paid: boolean | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          referee_id: string
          referrer_id: string
          reward_amount?: number | null
          reward_paid?: boolean | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          referee_id?: string
          referrer_id?: string
          reward_amount?: number | null
          reward_paid?: boolean | null
          status?: string
        }
        Relationships: []
      }
      reserve_transactions: {
        Row: {
          amount: number
          group_id: string | null
          id: string
          reason: string | null
          timestamp: string
          type: string
          user_id: string | null
        }
        Insert: {
          amount: number
          group_id?: string | null
          id?: string
          reason?: string | null
          timestamp?: string
          type: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          group_id?: string | null
          id?: string
          reason?: string | null
          timestamp?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reserve_transactions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "rosca_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reserve_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reserve_wallet: {
        Row: {
          id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          id?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      revenue_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          setting_key: string
          setting_value: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          setting_key: string
          setting_value: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          setting_key?: string
          setting_value?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revenue_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "vw_admin_users_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_settings_history: {
        Row: {
          change_reason: string | null
          created_at: string | null
          id: string
          ip_address: unknown
          new_value: number
          old_value: number | null
          setting_key: string
          updated_by: string
          user_agent: string | null
        }
        Insert: {
          change_reason?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_value: number
          old_value?: number | null
          setting_key: string
          updated_by: string
          user_agent?: string | null
        }
        Update: {
          change_reason?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_value?: number
          old_value?: number | null
          setting_key?: string
          updated_by?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revenue_settings_history_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_settings_history_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "vw_admin_users_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_transactions: {
        Row: {
          amount: number
          created_at: string | null
          fee_percentage: number | null
          group_id: string | null
          id: string
          mobile_money_fee: number | null
          net_payout: number
          original_payout_amount: number
          processed_at: string | null
          revenue_type: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          fee_percentage?: number | null
          group_id?: string | null
          id?: string
          mobile_money_fee?: number | null
          net_payout: number
          original_payout_amount: number
          processed_at?: string | null
          revenue_type: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          fee_percentage?: number | null
          group_id?: string | null
          id?: string
          mobile_money_fee?: number | null
          net_payout?: number
          original_payout_amount?: number
          processed_at?: string | null
          revenue_type?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_transactions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rosca_groups: {
        Row: {
          amount: number
          auto_payout: boolean | null
          chat_enabled: boolean | null
          contribution_amount: number | null
          created_at: string | null
          created_by: string | null
          creator_id: string | null
          current_members: number | null
          description: string | null
          frequency: string
          group_code: string
          id: string
          max_members: number
          name: string
          next_contribution_date: string | null
          payout_method: string | null
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          auto_payout?: boolean | null
          chat_enabled?: boolean | null
          contribution_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          creator_id?: string | null
          current_members?: number | null
          description?: string | null
          frequency?: string
          group_code?: string
          id?: string
          max_members: number
          name: string
          next_contribution_date?: string | null
          payout_method?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          auto_payout?: boolean | null
          chat_enabled?: boolean | null
          contribution_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          creator_id?: string | null
          current_members?: number | null
          description?: string | null
          frequency?: string
          group_code?: string
          id?: string
          max_members?: number
          name?: string
          next_contribution_date?: string | null
          payout_method?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          category: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          category?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          category?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          details: Json | null
          group_id: string | null
          id: string
          phone: string | null
          status: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          details?: Json | null
          group_id?: string | null
          id?: string
          phone?: string | null
          status?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          details?: Json | null
          group_id?: string | null
          id?: string
          phone?: string | null
          status?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_score_history: {
        Row: {
          change_amount: number
          created_at: string | null
          id: string
          new_score: number
          previous_score: number
          reason: string
          user_id: string | null
        }
        Insert: {
          change_amount: number
          created_at?: string | null
          id?: string
          new_score: number
          previous_score: number
          reason: string
          user_id?: string | null
        }
        Update: {
          change_amount?: number
          created_at?: string | null
          id?: string
          new_score?: number
          previous_score?: number
          reason?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trust_score_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_score_update_queue: {
        Row: {
          created_at: string | null
          queued_at: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          queued_at?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          queued_at?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trust_score_update_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_scores: {
        Row: {
          contribution_streak: number | null
          contributions_on_time: number | null
          disputes_reported: number | null
          fast_contributions: number | null
          fraud_flags: number | null
          group_id: string | null
          id: string
          last_update: string | null
          late_contributions: number | null
          missed_contributions: number | null
          score: number | null
          user_id: string | null
        }
        Insert: {
          contribution_streak?: number | null
          contributions_on_time?: number | null
          disputes_reported?: number | null
          fast_contributions?: number | null
          fraud_flags?: number | null
          group_id?: string | null
          id?: string
          last_update?: string | null
          late_contributions?: number | null
          missed_contributions?: number | null
          score?: number | null
          user_id?: string | null
        }
        Update: {
          contribution_streak?: number | null
          contributions_on_time?: number | null
          disputes_reported?: number | null
          fast_contributions?: number | null
          fraud_flags?: number | null
          group_id?: string | null
          id?: string
          last_update?: string | null
          late_contributions?: number | null
          missed_contributions?: number | null
          score?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trust_scores_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "rosca_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_balance_history: {
        Row: {
          balance_type: string
          change_amount: number
          created_at: string | null
          id: string
          new_balance: number
          previous_balance: number
          reason: string | null
          transaction_id: string | null
          transaction_type: string | null
          user_id: string
        }
        Insert: {
          balance_type: string
          change_amount: number
          created_at?: string | null
          id?: string
          new_balance: number
          previous_balance: number
          reason?: string | null
          transaction_id?: string | null
          transaction_type?: string | null
          user_id: string
        }
        Update: {
          balance_type?: string
          change_amount?: number
          created_at?: string | null
          id?: string
          new_balance?: number
          previous_balance?: number
          reason?: string | null
          transaction_id?: string | null
          transaction_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_balance_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          read: boolean | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_referrals: {
        Row: {
          contribution_count: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          never_late: boolean | null
          referred_id: string
          referrer_id: string
        }
        Insert: {
          contribution_count?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          never_late?: boolean | null
          referred_id: string
          referrer_id: string
        }
        Update: {
          contribution_count?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          never_late?: boolean | null
          referred_id?: string
          referrer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          account_status: string | null
          active_referrals: number | null
          avatar_url: string | null
          chat_messages_this_cycle: number | null
          completed_cycles: number | null
          contribution_streak: number | null
          created_at: string | null
          elite_since: string | null
          elite_status: boolean | null
          email_verified: boolean | null
          escrow_balance: number | null
          fast_contributions: number | null
          frozen: boolean | null
          full_name: string | null
          id: string
          is_kyc_verified: boolean | null
          kyc_status: string | null
          language: string | null
          name: string
          phone_number: string
          phone_verified: boolean | null
          pin_hash: string
          pin_salt: string
          points: number | null
          premium_expires_at: string | null
          premium_tier: string | null
          total_messages_sent: number | null
          trust_score: number | null
          updated_at: string | null
          wallet_balance: number | null
        }
        Insert: {
          account_status?: string | null
          active_referrals?: number | null
          avatar_url?: string | null
          chat_messages_this_cycle?: number | null
          completed_cycles?: number | null
          contribution_streak?: number | null
          created_at?: string | null
          elite_since?: string | null
          elite_status?: boolean | null
          email_verified?: boolean | null
          escrow_balance?: number | null
          fast_contributions?: number | null
          frozen?: boolean | null
          full_name?: string | null
          id?: string
          is_kyc_verified?: boolean | null
          kyc_status?: string | null
          language?: string | null
          name: string
          phone_number: string
          phone_verified?: boolean | null
          pin_hash: string
          pin_salt: string
          points?: number | null
          premium_expires_at?: string | null
          premium_tier?: string | null
          total_messages_sent?: number | null
          trust_score?: number | null
          updated_at?: string | null
          wallet_balance?: number | null
        }
        Update: {
          account_status?: string | null
          active_referrals?: number | null
          avatar_url?: string | null
          chat_messages_this_cycle?: number | null
          completed_cycles?: number | null
          contribution_streak?: number | null
          created_at?: string | null
          elite_since?: string | null
          elite_status?: boolean | null
          email_verified?: boolean | null
          escrow_balance?: number | null
          fast_contributions?: number | null
          frozen?: boolean | null
          full_name?: string | null
          id?: string
          is_kyc_verified?: boolean | null
          kyc_status?: string | null
          language?: string | null
          name?: string
          phone_number?: string
          phone_verified?: boolean | null
          pin_hash?: string
          pin_salt?: string
          points?: number | null
          premium_expires_at?: string | null
          premium_tier?: string | null
          total_messages_sent?: number | null
          trust_score?: number | null
          updated_at?: string | null
          wallet_balance?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      mv_transactions_aggregated: {
        Row: {
          day: string | null
          total_amount: number | null
          txn_count: number | null
        }
        Relationships: []
      }
      vw_admin_users_safe: {
        Row: {
          created_at: string | null
          email: string | null
          id: string | null
          is_active: boolean | null
          is_email_verified: boolean | null
          last_login_at: string | null
          permissions: Json | null
          role_id: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string | null
          is_active?: boolean | null
          is_email_verified?: boolean | null
          last_login_at?: string | null
          permissions?: Json | null
          role_id?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string | null
          is_active?: boolean | null
          is_email_verified?: boolean | null
          last_login_at?: string | null
          permissions?: Json | null
          role_id?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_users_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "admin_roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_to_reserve_wallet: {
        Args: {
          p_amount: number
          p_group_id: string
          p_reason: string
          p_user_id: string
        }
        Returns: string
      }
      award_achievement: {
        Args: {
          p_description: string
          p_points: number
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      bulk_wallet_adjustment: {
        Args: {
          p_admin_id?: string
          p_amount: number
          p_batch_id?: string
          p_reason?: string
          p_user_id: string
        }
        Returns: Json
      }
      calculate_performance_metrics: {
        Args: { p_metric_date?: string }
        Returns: undefined
      }
      calculate_user_trust_score: {
        Args: { p_user_id: string }
        Returns: number
      }
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_identifier: string
          p_max_requests?: number
          p_window_minutes?: number
        }
        Returns: Json
      }
      create_payout_schedule: {
        Args: {
          p_group_id: string
          p_payout_time?: string
          p_start_date: string
        }
        Returns: undefined
      }
      create_user_if_not_exists: {
        Args: {
          p_language?: string
          p_name: string
          p_phone_number: string
          p_pin_hash: string
        }
        Returns: string
      }
      current_auth_user: { Args: never; Returns: string }
      decrypt_api_key: { Args: { p_encrypted_key: string }; Returns: string }
      detect_fraud_patterns: {
        Args: { p_transaction_amount: number; p_user_id: string }
        Returns: Json
      }
      encrypt_api_key: { Args: { p_key: string }; Returns: string }
      ensure_admin_user_auth: { Args: { p_admin_id: string }; Returns: Json }
      generate_compliance_report: {
        Args: {
          p_admin_id: string
          p_end_date: string
          p_report_type: string
          p_start_date: string
        }
        Returns: string
      }
      get_admin_permissions: { Args: { p_admin_id: string }; Returns: Json }
      get_group_contribution_summary: {
        Args: { p_group_id: string }
        Returns: Json
      }
      get_group_statistics: { Args: { p_group_id: string }; Returns: Json }
      get_sensitive_user_flag: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      get_system_health_summary: { Args: never; Returns: Json }
      get_user_achievements: {
        Args: { p_user_id: string }
        Returns: {
          description: string
          earned_at: string
          points_awarded: number
          title: string
          type: string
        }[]
      }
      get_user_by_phone: {
        Args: { p_phone: string }
        Returns: {
          frozen: boolean
          id: string
          language: string
          name: string
          phone_number: string
          wallet_balance: number
        }[]
      }
      get_user_escrow_balance: { Args: { p_user_id: string }; Returns: number }
      get_user_premium_status: { Args: { p_user_id: string }; Returns: Json }
      has_admin_permission: {
        Args: { p_admin_id: string; p_permission: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      jwt_has_role: { Args: { role_text: string }; Returns: boolean }
      log_analytics_event: {
        Args: {
          p_event_data?: Json
          p_event_type: string
          p_group_id?: string
          p_ip_address?: string
          p_session_id?: string
          p_user_agent?: string
          p_user_id?: string
        }
        Returns: string
      }
      payout_distribute_daily: { Args: never; Returns: undefined }
      process_daily_payouts: { Args: never; Returns: undefined }
      record_transaction: {
        Args: {
          p_amount: number
          p_group_id?: string
          p_phone?: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      safe_get_sensitive_user_flag: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      send_group_notification: {
        Args: {
          p_group_id: string
          p_message: string
          p_metadata?: Json
          p_notification_type?: string
        }
        Returns: undefined
      }
      send_system_message: {
        Args: {
          p_group_id: string
          p_message: string
          p_message_type?: string
          p_metadata?: Json
        }
        Returns: string
      }
      update_escrow_balance: {
        Args: { p_amount: number; p_user_id: string }
        Returns: number
      }
      update_trust_score: {
        Args: { p_change_amount: number; p_reason: string; p_user_id: string }
        Returns: number
      }
      update_user_premium: {
        Args: { p_months: number; p_tier: string; p_user_id: string }
        Returns: boolean
      }
      update_user_trust_score: { Args: { p_user_id: string }; Returns: number }
      update_wallet_balance: {
        Args: { p_amount: number; p_user_id: string }
        Returns: number
      }
      verify_password: {
        Args: { p_hash: string; p_password: string }
        Returns: boolean
      }
      verify_user_pin: {
        Args: { p_pin_hash: string; p_user: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
