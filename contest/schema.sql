-- Planned schema only. Do not apply to production without approval.
create extension if not exists pgcrypto;
create table if not exists contest_groups (
 id uuid primary key default gen_random_uuid(),
 number integer not null unique check (number between 1 and 7),
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 published boolean not null default false,
 check (ends_at > starts_at)
);
create table if not exists contest_artworks (
 id uuid primary key default gen_random_uuid(),
 group_id uuid not null references contest_groups(id),
 entry_number integer not null unique,
 display_name text not null check (length(display_name) between 1 and 80),
 image_path text not null,
 guardian_consent_at timestamptz,
 created_at timestamptz not null default now()
);
create table if not exists contest_votes (
 id uuid primary key default gen_random_uuid(),
 group_id uuid not null references contest_groups(id),
 artwork_id uuid not null references contest_artworks(id),
 voter_name text not null check (length(voter_name) between 1 and 80),
 phone_hash text not null,
 device_hash text not null,
 ip_hash text,
 created_at timestamptz not null default now(),
 unique(group_id,phone_hash),
 unique(group_id,device_hash)
);
create index if not exists contest_votes_artwork_idx on contest_votes(artwork_id);
alter table contest_groups enable row level security;
alter table contest_artworks enable row level security;
alter table contest_votes enable row level security;
-- No anonymous INSERT/SELECT policies: only server-side privileged endpoints access votes.
