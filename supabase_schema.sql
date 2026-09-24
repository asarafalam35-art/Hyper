create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key,
  username text not null unique,
  email text not null unique,
  name text not null,
  bio text not null default '',
  avatar text not null default '',
  password_hash text not null,
  private_profile boolean not null default false,
  notifications boolean not null default true,
  followers jsonb not null default '[]'::jsonb,
  following jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists sessions_user_id_idx on public.sessions(user_id);
create index if not exists sessions_expires_idx on public.sessions(expires_at);

create table if not exists public.posts (
  id uuid primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null default 'post' check (type in ('post','reel')),
  caption text not null default '',
  image text not null default '',
  song_url text not null default '',
  song_title text not null default '',
  likes integer not null default 0,
  liked_by jsonb not null default '[]'::jsonb,
  saved_by jsonb not null default '[]'::jsonb,
  comments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists posts_user_id_idx on public.posts(user_id);
create index if not exists posts_created_at_idx on public.posts(created_at desc);

create table if not exists public.stories (
  id uuid primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  image text not null default '',
  post_id uuid references public.posts(id) on delete cascade,
  post_type text,
  caption text not null default '',
  song_url text not null default '',
  song_title text not null default '',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists stories_expires_idx on public.stories(expires_at);
create index if not exists stories_user_id_idx on public.stories(user_id);

create table if not exists public.messages (
  id uuid primary key,
  from_id uuid not null references public.users(id) on delete cascade,
  to_id uuid not null references public.users(id) on delete cascade,
  text text not null default '',
  shared_post_id uuid references public.posts(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists messages_from_idx on public.messages(from_id,created_at desc);
create index if not exists messages_to_idx on public.messages(to_id,created_at desc);

create table if not exists public.calls (
  id uuid primary key,
  from_id uuid not null references public.users(id) on delete cascade,
  to_id uuid not null references public.users(id) on delete cascade,
  type text not null default 'audio',
  offer jsonb,
  answer jsonb,
  created_at timestamptz not null default now()
);
create index if not exists calls_to_idx on public.calls(to_id,created_at desc);

-- The server uses the Supabase service-role key, so these tables do not need client-side RLS for this app version.
