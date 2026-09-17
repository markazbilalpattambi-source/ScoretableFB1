-- ScoreTable FB1 — Supabase schema
-- Run this once in Supabase Dashboard -> SQL Editor -> New Query -> Run

create extension if not exists "pgcrypto";

create table teams (
  id uuid primary key default gen_random_uuid(),
  sport text not null check (sport in ('football','badminton')),
  name text not null,
  logo text,
  w int not null default 0,
  d int not null default 0,
  l int not null default 0,
  gf int not null default 0,
  ga int not null default 0,
  pts int not null default 0,
  created_at timestamptz not null default now()
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  sport text not null check (sport in ('football','badminton')),
  round int not null,
  match_number int not null,
  home_id uuid references teams(id) on delete set null,
  away_id uuid references teams(id) on delete set null,
  home_name text,
  away_name text,
  status text not null default 'upcoming' check (status in ('upcoming','completed')),
  -- football scoring
  home_score int,
  away_score int,
  -- badminton scoring (best of 3 games)
  game1_home int,
  game1_away int,
  game2_home int,
  game2_away int,
  game3_home int,
  game3_away int,
  winner_id uuid references teams(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_teams_sport on teams(sport);
create index idx_matches_sport on matches(sport);
create index idx_matches_round on matches(sport, round);

-- Row Level Security: anyone can read, only logged-in admin can write
alter table teams enable row level security;
alter table matches enable row level security;

create policy "public read teams" on teams for select using (true);
create policy "auth insert teams" on teams for insert to authenticated with check (true);
create policy "auth update teams" on teams for update to authenticated using (true);
create policy "auth delete teams" on teams for delete to authenticated using (true);

create policy "public read matches" on matches for select using (true);
create policy "auth insert matches" on matches for insert to authenticated with check (true);
create policy "auth update matches" on matches for update to authenticated using (true);
create policy "auth delete matches" on matches for delete to authenticated using (true);

-- Realtime (so scores update live without refresh)
alter publication supabase_realtime add table teams;
alter publication supabase_realtime add table matches;
