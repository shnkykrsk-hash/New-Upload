-- Run this once in Supabase: your project -> SQL Editor -> New query -> paste -> Run

create table if not exists channels (
  channel_id text primary key,       -- normalized key, e.g. youtube.com/@handle
  channel_url text,                  -- the raw URL the user actually pasted
  free_used boolean default false,
  created_at timestamptz default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  channel_id text references channels(channel_id),
  razorpay_order_id text unique,
  razorpay_payment_id text,
  pack_name text,
  amount_paise integer,
  status text default 'created',     -- created -> paid
  created_at timestamptz default now()
);

create table if not exists entitlements (
  channel_id text primary key references channels(channel_id),
  ideas_remaining integer default 0,
  updated_at timestamptz default now()
);

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  channel_id text,                   -- nullable: feedback can arrive before/without a channel check
  message text not null,
  created_at timestamptz default now()
);

-- Row Level Security: these tables are only ever touched by the serverless
-- functions using the service role key, never directly from the browser, so
-- we lock them down completely at the row level.
alter table channels enable row level security;
alter table transactions enable row level security;
alter table entitlements enable row level security;
alter table feedback enable row level security;
