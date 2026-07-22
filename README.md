# Finance Tracker

A personal finance tracker: expenses, income, and credit card cycle/balance tracking.

## Stack

- **Frontend:** React + Vite + TypeScript + Tailwind CSS (`web/`)
- **Backend/DB:** Supabase (Postgres + Auth), free tier
- **Legacy:** the original Streamlit + SQLite version lives in `legacy_streamlit/` for reference

## Running locally

```bash
cd web
npm install
npm run dev
```

Requires a `web/.env.local` with:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

## Data model

See the Supabase project migrations for the schema: `accounts`, `categories`, `credit_cards`,
`expenses`, `credit_card_payments`, `income`, plus `card_outstanding` and `card_current_cycle`
views that compute outstanding balance, available credit, and billing cycle dates per card.
