export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      attempts: {
        Row: {
          age_range: string | null;
          answers: Json;
          base_score: number;
          breakdown: Json;
          city: string | null;
          country: string | null;
          created_at: string;
          final_score: number;
          flags: Json;
          gender: string | null;
          has_been_scammed: string | null;
          id: string;
          insights: Json;
          interests: string[] | null;
          nickname: string | null;
          percentile: number;
          personality: string;
          referral_source: string | null;
          respondent_email: string | null;
          respondent_name: string | null;
          self_caution: number | null;
          share_id: string;
          stats: Json;
          survey_completed: boolean;
          survey_extras_completed: boolean;
          test_set_id: string | null;
          top_fear: string | null;
          total_penalty: number;
          total_time_ms: number;
          wants_courses: boolean | null;
        };
        Insert: {
          age_range?: string | null;
          answers?: Json;
          base_score: number;
          breakdown: Json;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          final_score: number;
          flags?: Json;
          gender?: string | null;
          has_been_scammed?: string | null;
          id?: string;
          insights?: Json;
          interests?: string[] | null;
          nickname?: string | null;
          percentile: number;
          personality: string;
          referral_source?: string | null;
          respondent_email?: string | null;
          respondent_name?: string | null;
          self_caution?: number | null;
          share_id: string;
          stats: Json;
          survey_completed?: boolean;
          survey_extras_completed?: boolean;
          test_set_id?: string | null;
          top_fear?: string | null;
          total_penalty: number;
          total_time_ms: number;
          wants_courses?: boolean | null;
        };
        Update: {
          age_range?: string | null;
          answers?: Json;
          base_score?: number;
          breakdown?: Json;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          final_score?: number;
          flags?: Json;
          gender?: string | null;
          has_been_scammed?: string | null;
          id?: string;
          insights?: Json;
          interests?: string[] | null;
          nickname?: string | null;
          percentile?: number;
          personality?: string;
          referral_source?: string | null;
          respondent_email?: string | null;
          respondent_name?: string | null;
          self_caution?: number | null;
          share_id?: string;
          stats?: Json;
          survey_completed?: boolean;
          survey_extras_completed?: boolean;
          test_set_id?: string | null;
          top_fear?: string | null;
          total_penalty?: number;
          total_time_ms?: number;
          wants_courses?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "attempts_test_set_id_fkey";
            columns: ["test_set_id"];
            isOneToOne: false;
            referencedRelation: "test_sets";
            referencedColumns: ["id"];
          },
        ];
      };
      test_sets: {
        Row: {
          author_password_hash: string | null;
          collects_responses: boolean;
          created_at: string;
          creator_label: string | null;
          id: string;
          max_questions: number;
          passing_threshold: number;
          question_ids: string[];
          source_pack_slugs: string[] | null;
        };
        Insert: {
          author_password_hash?: string | null;
          collects_responses?: boolean;
          created_at?: string;
          creator_label?: string | null;
          id?: string;
          max_questions: number;
          passing_threshold?: number;
          question_ids: string[];
          source_pack_slugs?: string[] | null;
        };
        Update: {
          author_password_hash?: string | null;
          collects_responses?: boolean;
          created_at?: string;
          creator_label?: string | null;
          id?: string;
          max_questions?: number;
          passing_threshold?: number;
          question_ids?: string[];
          source_pack_slugs?: string[] | null;
        };
        Relationships: [];
      };
      sponsors: {
        Row: {
          id: string;
          stripe_customer_id: string;
          display_name: string | null;
          display_link: string | null;
          display_message: string | null;
          show_in_footer: boolean;
          created_at: string;
          total_eur: number;
        };
        Insert: {
          id?: string;
          stripe_customer_id: string;
          display_name?: string | null;
          display_link?: string | null;
          display_message?: string | null;
          show_in_footer?: boolean;
          created_at?: string;
          total_eur?: number;
        };
        Update: {
          id?: string;
          stripe_customer_id?: string;
          display_name?: string | null;
          display_link?: string | null;
          display_message?: string | null;
          show_in_footer?: boolean;
          created_at?: string;
          total_eur?: number;
        };
        Relationships: [];
      };
      donations: {
        Row: {
          id: string;
          sponsor_id: string;
          stripe_payment_intent_id: string | null;
          amount_eur: number;
          currency: string;
          kind: "oneoff" | "subscription_invoice" | "refund";
          refund_of_donation_id: string | null;
          invoice_pdf_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          sponsor_id: string;
          stripe_payment_intent_id?: string | null;
          amount_eur: number;
          currency?: string;
          kind: "oneoff" | "subscription_invoice" | "refund";
          refund_of_donation_id?: string | null;
          invoice_pdf_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          sponsor_id?: string;
          stripe_payment_intent_id?: string | null;
          amount_eur?: number;
          currency?: string;
          kind?: "oneoff" | "subscription_invoice" | "refund";
          refund_of_donation_id?: string | null;
          invoice_pdf_url?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "donations_sponsor_id_fkey";
            columns: ["sponsor_id"];
            isOneToOne: false;
            referencedRelation: "sponsors";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          id: string;
          sponsor_id: string;
          stripe_subscription_id: string | null;
          status: string;
          monthly_eur: number;
          started_at: string;
          cancelled_at: string | null;
        };
        Insert: {
          id?: string;
          sponsor_id: string;
          stripe_subscription_id?: string | null;
          status: string;
          monthly_eur: number;
          started_at?: string;
          cancelled_at?: string | null;
        };
        Update: {
          id?: string;
          sponsor_id?: string;
          stripe_subscription_id?: string | null;
          status?: string;
          monthly_eur?: number;
          started_at?: string;
          cancelled_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_sponsor_id_fkey";
            columns: ["sponsor_id"];
            isOneToOne: false;
            referencedRelation: "sponsors";
            referencedColumns: ["id"];
          },
        ];
      };
      // AH-1.8 — admin-hub tables (manual sync; mirror of
      // supabase/migrations/20260517000000_admin_hub_schema.sql).
      answer_sets: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          branch_slugs: string[];
          author_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          branch_slugs?: string[];
          author_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          branch_slugs?: string[];
          author_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      answers: {
        Row: {
          id: string;
          set_id: string;
          text: string;
          is_correct: boolean;
          explanation: string | null;
          position: number;
        };
        Insert: {
          id?: string;
          set_id: string;
          text: string;
          is_correct?: boolean;
          explanation?: string | null;
          position?: number;
        };
        Update: {
          id?: string;
          set_id?: string;
          text?: string;
          is_correct?: boolean;
          explanation?: string | null;
          position?: number;
        };
        Relationships: [];
      };
      app_settings: {
        Row: {
          key: string;
          value: Json;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: { key: string; value?: Json; updated_at?: string; updated_by?: string | null };
        Update: { key?: string; value?: Json; updated_at?: string; updated_by?: string | null };
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          actor_id: string | null;
          actor_name: string | null;
          action: string;
          target_type: string | null;
          target_id: string | null;
          pii_access: boolean;
          details: Json | null;
          at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          actor_name?: string | null;
          action: string;
          target_type?: string | null;
          target_id?: string | null;
          pii_access?: boolean;
          details?: Json | null;
          at?: string;
        };
        Update: never;
        Relationships: [];
      };
      behavioral_events: {
        Row: { id: string; session_id: string; type: string; payload: Json; at: string };
        Insert: { id?: string; session_id: string; type: string; payload?: Json; at?: string };
        Update: { id?: string; session_id?: string; type?: string; payload?: Json; at?: string };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          color: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          color?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          color?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      cms_footer: {
        Row: { id: number; columns: Json; socials: Json; legal: Json; updated_at: string };
        Insert: { id?: number; columns?: Json; socials?: Json; legal?: Json; updated_at?: string };
        Update: { id?: number; columns?: Json; socials?: Json; legal?: Json; updated_at?: string };
        Relationships: [];
      };
      cms_header: {
        Row: { id: number; logo: string | null; nav: Json; updated_at: string };
        Insert: { id?: number; logo?: string | null; nav?: Json; updated_at?: string };
        Update: { id?: number; logo?: string | null; nav?: Json; updated_at?: string };
        Relationships: [];
      };
      cms_navigation: {
        Row: { id: number; items: Json; updated_at: string };
        Insert: { id?: number; items?: Json; updated_at?: string };
        Update: { id?: number; items?: Json; updated_at?: string };
        Relationships: [];
      };
      cms_pages: {
        Row: {
          id: string;
          slug: string;
          title: string;
          seo_title: string | null;
          seo_description: string | null;
          blocks: Json;
          status: string;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          seo_title?: string | null;
          seo_description?: string | null;
          blocks?: Json;
          status?: string;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          seo_title?: string | null;
          seo_description?: string | null;
          blocks?: Json;
          status?: string;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      dsr_requests: {
        Row: {
          id: string;
          requester_email: string;
          type: Database["public"]["Enums"]["dsr_type"];
          status: Database["public"]["Enums"]["dsr_status"];
          note: string | null;
          created_at: string;
          sla_due_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          requester_email: string;
          type: Database["public"]["Enums"]["dsr_type"];
          status?: Database["public"]["Enums"]["dsr_status"];
          note?: string | null;
          created_at?: string;
          sla_due_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          requester_email?: string;
          type?: Database["public"]["Enums"]["dsr_type"];
          status?: Database["public"]["Enums"]["dsr_status"];
          note?: string | null;
          created_at?: string;
          sla_due_at?: string;
          resolved_at?: string | null;
        };
        Relationships: [];
      };
      group_assignments: {
        Row: {
          id: string;
          test_id: string;
          group_id: string;
          assigned_by: string | null;
          assigned_at: string;
          invited_count: number;
        };
        Insert: {
          id?: string;
          test_id: string;
          group_id: string;
          assigned_by?: string | null;
          assigned_at?: string;
          invited_count?: number;
        };
        Update: {
          id?: string;
          test_id?: string;
          group_id?: string;
          assigned_by?: string | null;
          assigned_at?: string;
          invited_count?: number;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          event_type: string;
          test_id: string | null;
          title: string;
          body: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_type: string;
          test_id?: string | null;
          title: string;
          body?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_type?: string;
          test_id?: string | null;
          title?: string;
          body?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          avatar_initials: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          avatar_initials?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          avatar_initials?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      questions: {
        Row: {
          id: string;
          type: Database["public"]["Enums"]["question_type"];
          prompt: string;
          options: Json | null;
          matrix_rows: Json | null;
          matrix_cols: Json | null;
          correct: Json | null;
          category_id: string | null;
          branch_slug: string | null;
          difficulty: string | null;
          author_id: string | null;
          status: Database["public"]["Enums"]["question_status"];
          answer_set_id: string | null;
          visual: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: Database["public"]["Enums"]["question_type"];
          prompt: string;
          options?: Json | null;
          matrix_rows?: Json | null;
          matrix_cols?: Json | null;
          correct?: Json | null;
          category_id?: string | null;
          branch_slug?: string | null;
          difficulty?: string | null;
          author_id?: string | null;
          status?: Database["public"]["Enums"]["question_status"];
          answer_set_id?: string | null;
          visual?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: Database["public"]["Enums"]["question_type"];
          prompt?: string;
          options?: Json | null;
          matrix_rows?: Json | null;
          matrix_cols?: Json | null;
          correct?: Json | null;
          category_id?: string | null;
          branch_slug?: string | null;
          difficulty?: string | null;
          author_id?: string | null;
          status?: Database["public"]["Enums"]["question_status"];
          answer_set_id?: string | null;
          visual?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      quick_test_config: {
        Row: { id: number; config: Json; updated_at: string };
        Insert: { id?: number; config?: Json; updated_at?: string };
        Update: { id?: number; config?: Json; updated_at?: string };
        Relationships: [];
      };
      quick_test_questions: {
        Row: {
          quick_test_config_id: number;
          question_id: string;
          order_index: number;
        };
        Insert: {
          quick_test_config_id?: number;
          question_id: string;
          order_index?: number;
        };
        Update: {
          quick_test_config_id?: number;
          question_id?: string;
          order_index?: number;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          target_type: string;
          target_id: string;
          reason: Database["public"]["Enums"]["report_reason"];
          status: Database["public"]["Enums"]["report_status"];
          note: string | null;
          reporter_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          target_type: string;
          target_id: string;
          reason: Database["public"]["Enums"]["report_reason"];
          status?: Database["public"]["Enums"]["report_status"];
          note?: string | null;
          reporter_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          target_type?: string;
          target_id?: string;
          reason?: Database["public"]["Enums"]["report_reason"];
          status?: Database["public"]["Enums"]["report_status"];
          note?: string | null;
          reporter_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      respondent_groups: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          owner_id: string;
          member_emails: string[];
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          owner_id: string;
          member_emails?: string[];
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          owner_id?: string;
          member_emails?: string[];
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      respondents: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          anonymized_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          anonymized_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          anonymized_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      session_answers: {
        Row: {
          session_id: string;
          question_id: string;
          value: string | null;
          is_correct: boolean | null;
          time_ms: number | null;
        };
        Insert: {
          session_id: string;
          question_id: string;
          value?: string | null;
          is_correct?: boolean | null;
          time_ms?: number | null;
        };
        Update: {
          session_id?: string;
          question_id?: string;
          value?: string | null;
          is_correct?: boolean | null;
          time_ms?: number | null;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          test_id: string;
          version: number;
          respondent_id: string | null;
          intake_data: Json;
          consent_given: boolean;
          started_at: string;
          finished_at: string | null;
          score: number | null;
          status: Database["public"]["Enums"]["session_status"];
          segment: string | null;
          ip_hash: string | null;
        };
        Insert: {
          id?: string;
          test_id: string;
          version?: number;
          respondent_id?: string | null;
          intake_data?: Json;
          consent_given?: boolean;
          started_at?: string;
          finished_at?: string | null;
          score?: number | null;
          status?: Database["public"]["Enums"]["session_status"];
          segment?: string | null;
          ip_hash?: string | null;
        };
        Update: {
          id?: string;
          test_id?: string;
          version?: number;
          respondent_id?: string | null;
          intake_data?: Json;
          consent_given?: boolean;
          started_at?: string;
          finished_at?: string | null;
          score?: number | null;
          status?: Database["public"]["Enums"]["session_status"];
          segment?: string | null;
          ip_hash?: string | null;
        };
        Relationships: [];
      };
      share_card_config: {
        Row: {
          id: number;
          tiers: Json;
          gradient: string | null;
          branding: Json;
          updated_at: string;
        };
        Insert: {
          id?: number;
          tiers?: Json;
          gradient?: string | null;
          branding?: Json;
          updated_at?: string;
        };
        Update: {
          id?: number;
          tiers?: Json;
          gradient?: string | null;
          branding?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      support_config: {
        Row: {
          id: number;
          email: string | null;
          hours: string | null;
          enabled: boolean;
          updated_at: string;
        };
        Insert: {
          id?: number;
          email?: string | null;
          hours?: string | null;
          enabled?: boolean;
          updated_at?: string;
        };
        Update: {
          id?: number;
          email?: string | null;
          hours?: string | null;
          enabled?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      team_members: {
        Row: {
          id: string;
          team_id: string;
          user_id: string;
          role: Database["public"]["Enums"]["team_role"];
          joined_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          user_id: string;
          role?: Database["public"]["Enums"]["team_role"];
          joined_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          user_id?: string;
          role?: Database["public"]["Enums"]["team_role"];
          joined_at?: string;
        };
        Relationships: [];
      };
      teams: {
        Row: { id: string; name: string; owner_id: string; created_at: string };
        Insert: { id?: string; name: string; owner_id: string; created_at?: string };
        Update: { id?: string; name?: string; owner_id?: string; created_at?: string };
        Relationships: [];
      };
      templates: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          question_ids: string[];
          gdpr_purpose: Database["public"]["Enums"]["gdpr_purpose"];
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          question_ids?: string[];
          gdpr_purpose?: Database["public"]["Enums"]["gdpr_purpose"];
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          question_ids?: string[];
          gdpr_purpose?: Database["public"]["Enums"]["gdpr_purpose"];
          created_at?: string;
        };
        Relationships: [];
      };
      test_questions: {
        Row: { test_id: string; question_id: string; position: number };
        Insert: { test_id: string; question_id: string; position?: number };
        Update: { test_id?: string; question_id?: string; position?: number };
        Relationships: [];
      };
      test_versions: {
        Row: {
          id: string;
          test_id: string;
          version: number;
          snapshot: Json;
          published_at: string;
          published_by: string | null;
          changelog: string | null;
        };
        Insert: {
          id?: string;
          test_id: string;
          version: number;
          snapshot: Json;
          published_at?: string;
          published_by?: string | null;
          changelog?: string | null;
        };
        Update: {
          id?: string;
          test_id?: string;
          version?: number;
          snapshot?: Json;
          published_at?: string;
          published_by?: string | null;
          changelog?: string | null;
        };
        Relationships: [];
      };
      tests: {
        Row: {
          id: string;
          slug: string;
          share_id: string;
          owner_id: string;
          team_id: string | null;
          title: string;
          description: string | null;
          status: Database["public"]["Enums"]["test_status"];
          version: number;
          password_hash: string | null;
          segmentation: string[];
          gdpr_purpose: Database["public"]["Enums"]["gdpr_purpose"];
          intake_fields: Json;
          branches: Json;
          notif_config: Json;
          anonymize_after_days: number | null;
          allow_behavioral_tracking: boolean;
          expires_at: string | null;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          share_id: string;
          owner_id: string;
          team_id?: string | null;
          title: string;
          description?: string | null;
          status?: Database["public"]["Enums"]["test_status"];
          version?: number;
          password_hash?: string | null;
          segmentation?: string[];
          gdpr_purpose?: Database["public"]["Enums"]["gdpr_purpose"];
          intake_fields?: Json;
          branches?: Json;
          notif_config?: Json;
          anonymize_after_days?: number | null;
          allow_behavioral_tracking?: boolean;
          expires_at?: string | null;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          share_id?: string;
          owner_id?: string;
          team_id?: string | null;
          title?: string;
          description?: string | null;
          status?: Database["public"]["Enums"]["test_status"];
          version?: number;
          password_hash?: string | null;
          segmentation?: string[];
          gdpr_purpose?: Database["public"]["Enums"]["gdpr_purpose"];
          intake_fields?: Json;
          branches?: Json;
          notif_config?: Json;
          anonymize_after_days?: number | null;
          allow_behavioral_tracking?: boolean;
          expires_at?: string | null;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      topics: {
        Row: {
          id: string;
          name: string;
          slug: string;
          color: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          color?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          color?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      trainings: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          topic_slug: string | null;
          status: Database["public"]["Enums"]["training_status"];
          content: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          topic_slug?: string | null;
          status?: Database["public"]["Enums"]["training_status"];
          content?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          topic_slug?: string | null;
          status?: Database["public"]["Enums"]["training_status"];
          content?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: Database["public"]["Enums"]["app_role"];
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: Database["public"]["Enums"]["app_role"];
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          created_at?: string;
        };
        Relationships: [];
      };
      mfa_backup_codes: {
        Row: {
          id: string;
          user_id: string;
          code_hash: string;
          used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          code_hash: string;
          used_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          code_hash?: string;
          used_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      public_sponsors: {
        Row: {
          id: string;
          display_name: string;
          display_link: string | null;
          display_message: string | null;
          created_at: string;
          net_amount_eur: number;
          has_refund: boolean;
        };
        Relationships: [];
      };
      footer_sponsors: {
        Row: {
          id: string;
          display_name: string;
          display_link: string | null;
          created_at: string;
        };
        Relationships: [];
      };
      attempts_anon: {
        Row: {
          id: string;
          share_id: string;
          nickname: string | null;
          final_score: number;
          base_score: number;
          total_penalty: number;
          percentile: number;
          personality: string;
          breakdown: Json;
          insights: Json;
          stats: Json;
          flags: Json;
          total_time_ms: number;
          test_set_id: string | null;
          created_at: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      hash_test_set_password: {
        Args: { password: string };
        Returns: string;
      };
      verify_test_set_password: {
        Args: { set_id: string; password: string };
        Returns: boolean;
      };
      purge_expired_respondent_pii: {
        Args: Record<string, never>;
        Returns: number;
      };
      has_role: {
        Args: { _user_id: string; _role: Database["public"]["Enums"]["app_role"] };
        Returns: boolean;
      };
      generate_mfa_backup_codes: {
        Args: Record<string, never>;
        Returns: string[];
      };
      consume_mfa_backup_code: {
        Args: { p_code: string };
        Returns: boolean;
      };
      log_audit_event: {
        Args: {
          p_action: string;
          p_target_type: string;
          p_target_id: string;
          p_pii_access?: boolean;
          p_details?: Json;
        };
        Returns: string;
      };
      start_respondent_session: {
        Args: {
          p_share_id: string;
          p_intake?: Json;
          p_consent_given?: boolean;
          p_segment?: string | null;
        };
        Returns: string;
      };
      submit_respondent_answer: {
        Args: {
          p_session_id: string;
          p_question_id: string;
          p_value: string;
          p_is_correct?: boolean | null;
          p_time_ms?: number | null;
        };
        Returns: void;
      };
      finalize_respondent_session: {
        Args: { p_session_id: string; p_score?: number | null };
        Returns: void;
      };
      get_quick_test_questions: {
        Args: { p_limit?: number };
        Returns: {
          id: string;
          type: Database["public"]["Enums"]["question_type"];
          prompt: string;
          options: Json;
          correct: Json;
          branch_slug: string | null;
          difficulty: string | null;
          visual: Json | null;
          order_index: number;
        }[];
      };
    };
    Enums: {
      app_role: "admin" | "moderator" | "user";
      test_status: "draft" | "published" | "archived";
      question_type:
        | "single"
        | "multi"
        | "scale_1_5"
        | "scale_1_10"
        | "nps"
        | "matrix"
        | "ranking"
        | "slider"
        | "short_text"
        | "long_text"
        | "date"
        | "time"
        | "file_upload"
        | "image_choice"
        | "yes_no";
      question_status:
        | "draft"
        | "approved"
        | "deprecated"
        | "pending"
        | "flagged"
        | "published"
        | "archived";
      gdpr_purpose: "marketing" | "research" | "recruitment" | "education" | "internal_training";
      session_status: "in_progress" | "completed" | "abandoned";
      training_status: "published" | "draft" | "archived";
      report_reason: "spam" | "inappropriate" | "harassment" | "misinformation" | "other";
      report_status: "open" | "reviewing" | "resolved" | "dismissed";
      team_role: "owner" | "editor" | "viewer";
      dsr_type: "access" | "erase" | "portability";
      dsr_status: "open" | "in_progress" | "completed" | "rejected";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      test_status: ["draft", "published", "archived"],
      question_type: [
        "single",
        "multi",
        "scale_1_5",
        "scale_1_10",
        "nps",
        "matrix",
        "ranking",
        "slider",
        "short_text",
        "long_text",
        "date",
        "time",
        "file_upload",
        "image_choice",
        "yes_no",
      ],
      question_status: [
        "draft",
        "approved",
        "deprecated",
        "pending",
        "flagged",
        "published",
        "archived",
      ],
      gdpr_purpose: ["marketing", "research", "recruitment", "education", "internal_training"],
      session_status: ["in_progress", "completed", "abandoned"],
      training_status: ["published", "draft", "archived"],
      report_reason: ["spam", "inappropriate", "harassment", "misinformation", "other"],
      report_status: ["open", "reviewing", "resolved", "dismissed"],
      team_role: ["owner", "editor", "viewer"],
      dsr_type: ["access", "erase", "portability"],
      dsr_status: ["open", "in_progress", "completed", "rejected"],
    },
  },
} as const;
