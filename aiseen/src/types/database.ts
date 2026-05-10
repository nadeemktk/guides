// Auto-typed Supabase schema — mirrors migration 20260510000000_initial_schema.sql
// Run `supabase gen types typescript` to regenerate after schema changes.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type SubscriptionTier = "free" | "starter" | "growth" | "pro";
export type Platform = "shopify" | "amazon" | "woocommerce" | "manual";
export type LLMProvider = "openai" | "anthropic" | "gemini" | "perplexity" | "google_aio";
export type EntityType = "own_brand" | "own_product" | "competitor_brand" | "competitor_product";
export type Sentiment = "positive" | "neutral" | "negative";
export type RecType = "description_rewrite" | "schema_markup" | "content_topic" | "review_site" | "feature_gap";
export type RecStatus = "pending" | "approved" | "applied" | "dismissed";
export type RunStatus = "completed" | "failed" | "pending";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          created_at: string;
          subscription_tier: SubscriptionTier;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          subscription_status: string | null;
          current_period_end: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      stores: {
        Row: {
          id: string;
          user_id: string;
          platform: Platform;
          store_url: string;
          store_name: string | null;
          brand_name: string | null;
          brand_aliases: string[] | null;
          api_credentials: Json | null;
          catalog_last_synced_at: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["stores"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["stores"]["Insert"]>;
      };
      products: {
        Row: {
          id: string;
          store_id: string;
          external_id: string;
          title: string;
          description: string | null;
          product_type: string | null;
          vendor: string | null;
          price: number | null;
          currency: string | null;
          image_url: string | null;
          product_url: string | null;
          tags: string[] | null;
          raw_data: Json | null;
          last_synced_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["products"]["Row"], "id" | "last_synced_at">;
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
      };
      queries: {
        Row: {
          id: string;
          store_id: string;
          query_text: string;
          category: string | null;
          intent: string | null;
          related_product_ids: string[] | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["queries"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["queries"]["Insert"]>;
      };
      query_runs: {
        Row: {
          id: string;
          query_id: string;
          provider: LLMProvider;
          model: string | null;
          prompt_text: string | null;
          response_text: string | null;
          response_raw: Json | null;
          tokens_used: number | null;
          cost_usd: number | null;
          ran_at: string;
          duration_ms: number | null;
          status: RunStatus;
        };
        Insert: Omit<Database["public"]["Tables"]["query_runs"]["Row"], "id" | "ran_at">;
        Update: Partial<Database["public"]["Tables"]["query_runs"]["Insert"]>;
      };
      mentions: {
        Row: {
          id: string;
          query_run_id: string;
          store_id: string;
          entity_type: EntityType | null;
          entity_name: string;
          product_id: string | null;
          position: number | null;
          context_snippet: string | null;
          sentiment: Sentiment | null;
          description_in_response: string | null;
          reasons_cited: string[] | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["mentions"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["mentions"]["Insert"]>;
      };
      competitors: {
        Row: {
          id: string;
          store_id: string;
          name: string;
          domain: string | null;
          first_seen_at: string;
          mention_count: number;
        };
        Insert: Omit<Database["public"]["Tables"]["competitors"]["Row"], "id" | "first_seen_at">;
        Update: Partial<Database["public"]["Tables"]["competitors"]["Insert"]>;
      };
      visibility_snapshots: {
        Row: {
          id: string;
          store_id: string;
          snapshot_date: string;
          visibility_score: number | null;
          total_queries_run: number | null;
          queries_with_mention: number | null;
          avg_position: number | null;
          share_of_voice: number | null;
          by_provider: Json | null;
        };
        Insert: Omit<Database["public"]["Tables"]["visibility_snapshots"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["visibility_snapshots"]["Insert"]>;
      };
      recommendations: {
        Row: {
          id: string;
          store_id: string;
          product_id: string | null;
          rec_type: RecType | null;
          title: string;
          rationale: string | null;
          current_value: string | null;
          suggested_value: string | null;
          expected_impact: string | null;
          status: RecStatus;
          applied_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["recommendations"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["recommendations"]["Insert"]>;
      };
      public_audits: {
        Row: {
          id: string;
          store_url: string;
          email: string | null;
          brand_name: string | null;
          visibility_score: number | null;
          summary: Json | null;
          full_report_unlocked: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["public_audits"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["public_audits"]["Insert"]>;
      };
      usage_events: {
        Row: {
          id: string;
          user_id: string;
          event_type: string;
          cost_usd: number;
          metadata: Json | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["usage_events"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["usage_events"]["Insert"]>;
      };
    };
  };
}
