# AISeen — AI Search Visibility for E-commerce

Track how often ChatGPT, Perplexity, Gemini, Claude, and Google AI Overviews recommend your store — and automatically fix your catalog to win more mentions.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| Payments | Stripe |
| Background jobs | Inngest |
| LLM providers | OpenAI, Anthropic, Google Gemini, Perplexity, SerpAPI (Google AIO) |
| Email | Resend |
| Analytics | PostHog |
| Error monitoring | Sentry |
| Rate limiting | Upstash Redis |
| Hosting | Vercel + Supabase + Inngest Cloud |

---

## Local Setup

### 1. Prerequisites

- Node.js 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- Accounts on: Supabase, Stripe, Inngest, Resend, Upstash, PostHog, Sentry

### 2. Clone and install

```bash
git clone https://github.com/nadeemktk/guides
cd guides/aiseen
npm install
```

### 3. Environment variables

```bash
cp .env.example .env.local
# Fill in all values in .env.local
```

### 4. Database setup

Run the migration in the Supabase SQL editor:
- `supabase/migrations/20260510000000_initial_schema.sql`

Or via CLI:
```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

### 5. Stripe setup

Create three products in Stripe Dashboard (test mode):
- **Starter** — $39/month
- **Growth** — $99/month  
- **Pro** — $249/month

Copy the Price IDs into `.env.local`. Set up webhook at `/api/stripe/webhook` for events:
`checkout.session.completed`, `customer.subscription.*`

### 6. Inngest setup

1. Create account at [app.inngest.com](https://app.inngest.com)
2. Copy Event Key + Signing Key to `.env.local`
3. Dev: `npx inngest-cli@latest dev`

### 7. Run locally

```bash
npm run dev
```

---

## Project Structure

```
src/
├── app/
│   ├── (marketing)/        # Public pages (landing, free audit, pricing, blog)
│   ├── (dashboard)/        # Auth-protected dashboard pages
│   └── api/                # API routes
├── components/
│   ├── ui/                 # shadcn/ui base components
│   ├── dashboard/          # Dashboard-specific components
│   ├── marketing/          # Marketing site components
│   ├── charts/             # Recharts-based chart components
│   └── layout/             # Layout + provider components
├── lib/
│   ├── supabase/           # Supabase client helpers
│   ├── stripe/             # Stripe client + plan definitions
│   ├── inngest/            # Inngest client + job functions
│   ├── llm/                # LLM provider abstraction + prompts
│   ├── email/              # Resend email templates
│   └── redis/              # Upstash Redis + rate limiters
├── types/                  # TypeScript types
└── hooks/                  # Custom React hooks
supabase/
└── migrations/             # SQL migration files
```

---

## Build Phases

| Phase | Description | Status |
|---|---|---|
| 0 | Project skeleton | ✅ Done |
| 1 | Marketing site + free audit | 🔄 Next |
| 2 | Auth + onboarding | Pending |
| 3 | Store connections | Pending |
| 4 | Catalog ingestion | Pending |
| 5 | Auto-generated queries | Pending |
| 6 | Multi-LLM monitoring | Pending |
| 7 | Mention detection | Pending |
| 8 | Visibility dashboard | Pending |
| 9 | Recommendations engine | Pending |
| 10 | Auto-apply (Pro) | Pending |
| 11 | Billing + feature gating | Pending |
| 12 | Polish + launch | Pending |
