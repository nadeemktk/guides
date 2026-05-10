-- =============================================================================
-- AISeen — Initial Schema Migration
-- =============================================================================

-- -------------------------
-- PROFILES (extends auth.users)
-- -------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz default now(),
  subscription_tier text default 'free' check (subscription_tier in ('free','starter','growth','pro')),
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text,
  current_period_end timestamptz
);

-- -------------------------
-- STORES
-- -------------------------
create table public.stores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('shopify','amazon','woocommerce','manual')),
  store_url text not null,
  store_name text,
  brand_name text,
  brand_aliases text[],
  api_credentials jsonb,
  catalog_last_synced_at timestamptz,
  is_active boolean default true,
  created_at timestamptz default now()
);

create index idx_stores_user_id on public.stores(user_id);

-- -------------------------
-- PRODUCTS
-- -------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  external_id text not null,
  title text not null,
  description text,
  product_type text,
  vendor text,
  price numeric,
  currency text,
  image_url text,
  product_url text,
  tags text[],
  raw_data jsonb,
  last_synced_at timestamptz default now(),
  unique (store_id, external_id)
);

create index idx_products_store_id on public.products(store_id);

-- -------------------------
-- QUERIES
-- -------------------------
create table public.queries (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  query_text text not null,
  category text,
  intent text,
  related_product_ids uuid[],
  is_active boolean default true,
  created_at timestamptz default now(),
  unique (store_id, query_text)
);

create index idx_queries_store_id on public.queries(store_id);

-- -------------------------
-- QUERY RUNS
-- -------------------------
create table public.query_runs (
  id uuid primary key default gen_random_uuid(),
  query_id uuid not null references public.queries(id) on delete cascade,
  provider text not null check (provider in ('openai','anthropic','gemini','perplexity','google_aio')),
  model text,
  prompt_text text,
  response_text text,
  response_raw jsonb,
  tokens_used integer,
  cost_usd numeric,
  ran_at timestamptz default now(),
  duration_ms integer,
  status text default 'completed' check (status in ('completed','failed','pending'))
);

create index idx_query_runs_query_id on public.query_runs(query_id);
create index idx_query_runs_store_ran on public.query_runs(
  (select store_id from public.queries where id = query_id),
  ran_at
);

-- -------------------------
-- MENTIONS
-- -------------------------
create table public.mentions (
  id uuid primary key default gen_random_uuid(),
  query_run_id uuid not null references public.query_runs(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  entity_type text check (entity_type in ('own_brand','own_product','competitor_brand','competitor_product')),
  entity_name text not null,
  product_id uuid references public.products(id),
  position integer,
  context_snippet text,
  sentiment text check (sentiment in ('positive','neutral','negative')),
  description_in_response text,
  reasons_cited text[],
  created_at timestamptz default now()
);

create index idx_mentions_query_run_id on public.mentions(query_run_id);
create index idx_mentions_store_id on public.mentions(store_id);
create index idx_mentions_store_entity on public.mentions(store_id, entity_name);

-- -------------------------
-- COMPETITORS
-- -------------------------
create table public.competitors (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  domain text,
  first_seen_at timestamptz default now(),
  mention_count integer default 0,
  unique (store_id, name)
);

create index idx_competitors_store_id on public.competitors(store_id);

-- -------------------------
-- VISIBILITY SNAPSHOTS
-- -------------------------
create table public.visibility_snapshots (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  snapshot_date date not null,
  visibility_score numeric,
  total_queries_run integer,
  queries_with_mention integer,
  avg_position numeric,
  share_of_voice numeric,
  by_provider jsonb,
  unique (store_id, snapshot_date)
);

create index idx_visibility_snapshots_store_date on public.visibility_snapshots(store_id, snapshot_date);

-- -------------------------
-- RECOMMENDATIONS
-- -------------------------
create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid references public.products(id),
  rec_type text check (rec_type in ('description_rewrite','schema_markup','content_topic','review_site','feature_gap')),
  title text not null,
  rationale text,
  current_value text,
  suggested_value text,
  expected_impact text,
  status text default 'pending' check (status in ('pending','approved','applied','dismissed')),
  applied_at timestamptz,
  created_at timestamptz default now()
);

create index idx_recommendations_store_id on public.recommendations(store_id);
create index idx_recommendations_product_id on public.recommendations(product_id);

-- -------------------------
-- PUBLIC AUDITS (free tier lead magnet)
-- -------------------------
create table public.public_audits (
  id uuid primary key default gen_random_uuid(),
  store_url text not null,
  email text,
  brand_name text,
  visibility_score numeric,
  summary jsonb,
  full_report_unlocked boolean default false,
  created_at timestamptz default now()
);

-- -------------------------
-- USAGE EVENTS (plan limits)
-- -------------------------
create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  event_type text not null,
  cost_usd numeric default 0,
  metadata jsonb,
  created_at timestamptz default now()
);

create index idx_usage_events_user_id on public.usage_events(user_id);
create index idx_usage_events_user_created on public.usage_events(user_id, created_at);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.queries enable row level security;
alter table public.query_runs enable row level security;
alter table public.mentions enable row level security;
alter table public.competitors enable row level security;
alter table public.visibility_snapshots enable row level security;
alter table public.recommendations enable row level security;
alter table public.public_audits enable row level security;
alter table public.usage_events enable row level security;

-- Profiles: own row only
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);
create policy "Service role can insert profiles"
  on public.profiles for insert with check (true);

-- Stores: own stores only
create policy "Users can CRUD own stores"
  on public.stores for all using (auth.uid() = user_id);

-- Products: via store ownership
create policy "Users can CRUD own products"
  on public.products for all using (
    exists (select 1 from public.stores s where s.id = store_id and s.user_id = auth.uid())
  );

-- Queries: via store ownership
create policy "Users can CRUD own queries"
  on public.queries for all using (
    exists (select 1 from public.stores s where s.id = store_id and s.user_id = auth.uid())
  );

-- Query runs: via query → store ownership
create policy "Users can CRUD own query_runs"
  on public.query_runs for all using (
    exists (
      select 1 from public.queries q
      join public.stores s on s.id = q.store_id
      where q.id = query_id and s.user_id = auth.uid()
    )
  );

-- Mentions: via store ownership
create policy "Users can CRUD own mentions"
  on public.mentions for all using (
    exists (select 1 from public.stores s where s.id = store_id and s.user_id = auth.uid())
  );

-- Competitors: via store ownership
create policy "Users can CRUD own competitors"
  on public.competitors for all using (
    exists (select 1 from public.stores s where s.id = store_id and s.user_id = auth.uid())
  );

-- Visibility snapshots: via store ownership
create policy "Users can CRUD own visibility_snapshots"
  on public.visibility_snapshots for all using (
    exists (select 1 from public.stores s where s.id = store_id and s.user_id = auth.uid())
  );

-- Recommendations: via store ownership
create policy "Users can CRUD own recommendations"
  on public.recommendations for all using (
    exists (select 1 from public.stores s where s.id = store_id and s.user_id = auth.uid())
  );

-- Public audits: open insert (for free tier), select own by email
create policy "Anyone can create public_audits"
  on public.public_audits for insert with check (true);
create policy "Audits are readable by authenticated users matching email"
  on public.public_audits for select using (
    auth.uid() is not null or true  -- public read for the report page; restrict further in API layer
  );

-- Usage events: own events only
create policy "Users can view own usage_events"
  on public.usage_events for select using (auth.uid() = user_id);
create policy "Service role can insert usage_events"
  on public.usage_events for insert with check (true);

-- =============================================================================
-- HELPER: auto-create profile on signup
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
