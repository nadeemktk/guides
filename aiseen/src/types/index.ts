// Re-export database types
export type {
  Database,
  SubscriptionTier,
  Platform,
  LLMProvider,
  EntityType,
  Sentiment,
  RecType,
  RecStatus,
  RunStatus,
  Json,
} from "./database";

// App-level convenience types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Store = Database["public"]["Tables"]["stores"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type Query = Database["public"]["Tables"]["queries"]["Row"];
export type QueryRun = Database["public"]["Tables"]["query_runs"]["Row"];
export type Mention = Database["public"]["Tables"]["mentions"]["Row"];
export type Competitor = Database["public"]["Tables"]["competitors"]["Row"];
export type VisibilitySnapshot = Database["public"]["Tables"]["visibility_snapshots"]["Row"];
export type Recommendation = Database["public"]["Tables"]["recommendations"]["Row"];
export type PublicAudit = Database["public"]["Tables"]["public_audits"]["Row"];
export type UsageEvent = Database["public"]["Tables"]["usage_events"]["Row"];

import type { Database } from "./database";

export interface AuditSummary {
  visibilityScore: number;
  totalQueries: number;
  winningQueries: Array<{ query: string; providers: string[] }>;
  losingQueries: Array<{ query: string; competitors: string[] }>;
  topCompetitors: Array<{ name: string; mentionCount: number }>;
  topFixes: string[];
}

export interface MentionExtractionResult {
  own_brand_mentioned: boolean;
  own_brand_position: number | null;
  own_brand_description: string | null;
  own_brand_reasons: string[];
  own_brand_sentiment: "positive" | "neutral" | "negative" | null;
  competitors: Array<{
    name: string;
    position: number;
    reasons: string[];
    description: string;
  }>;
}

export interface GeneratedQuery {
  query_text: string;
  category: string;
  intent: string;
  expected_competitor_brands: string[];
}
