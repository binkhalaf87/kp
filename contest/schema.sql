create extension if not exists pgcrypto;
create table if not exists contest_groups(
 id uuid primary key default gen_random_uuid(),number int not null unique check(number between 1 and 7),
 starts_at timestamptz not null,ends_at timestamptz not null,published boolean not null default false,
 check(ends_at=starts_at+interval '72 hours')
);
create table if not exists contest_artworks(
 id uuid primary key default gen_random_uuid(),group_id uuid not null references contest_groups(id),
 entry_number int not null unique,display_name text not null check(length(display_name) between 1 and 80),
 image_url text not null,guardian_consent_at timestamptz not null,created_at timestamptz not null default now()
);
create table if not exists contest_votes(
 id uuid primary key default gen_random_uuid(),group_id uuid not null references contest_groups(id),
 artwork_id uuid not null references contest_artworks(id),voter_name text not null,
 phone_hash text not null,device_hash text not null,ip_hash text,
 created_at timestamptz not null default now(),unique(group_id,phone_hash),unique(group_id,device_hash)
);
create index if not exists contest_votes_artwork_idx on contest_votes(artwork_id);
alter table contest_groups enable row level security;
alter table contest_artworks enable row level security;
alter table contest_votes enable row level security;
-- Run using the database owner connection; never expose the DB connection string in frontend code.

-- Application role is created separately by the Railway migration function.
-- Grant only contest tables and scope policies to contest_app.
GRANT USAGE ON SCHEMA public TO contest_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON contest_groups, contest_artworks, contest_votes TO contest_app;
CREATE POLICY contest_app_policy ON contest_groups FOR ALL TO contest_app USING (true) WITH CHECK (true);
CREATE POLICY contest_app_policy ON contest_artworks FOR ALL TO contest_app USING (true) WITH CHECK (true);
CREATE POLICY contest_app_policy ON contest_votes FOR ALL TO contest_app USING (true) WITH CHECK (true);
