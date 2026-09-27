
create table if not exists users (
 id text primary key,
 username text unique not null,
 email text unique not null,
 name text not null,
 bio text default '',
 avatar text default 'U',
 password_hash text not null,
 private_profile boolean default false,
 notifications boolean default true,
 followers jsonb default '[]'::jsonb,
 following jsonb default '[]'::jsonb
);
create table if not exists posts (
 id text primary key,
 user_id text not null references users(id) on delete cascade,
 type text not null,
 category text default 'other',
 caption text default '',
 image text default '',
 song_url text default '',
 song_title text default '',
 mentions jsonb not null default '[]'::jsonb,
 likes integer default 0,
 liked_by jsonb default '[]'::jsonb,
 saved_by jsonb default '[]'::jsonb,
 comments jsonb default '[]'::jsonb,
 created_at timestamptz default now()
);
create table if not exists stories (
 id text primary key,
 user_id text not null references users(id) on delete cascade,
 category text default 'story',
 image text default '',
 post_id text,
 post_type text,
 caption text default '',
 song_url text default '',
 song_title text default '',
 mentions jsonb not null default '[]'::jsonb,
 created_at timestamptz default now(),
 expires_at timestamptz not null
);

create table if not exists story_likes (
 id text primary key,
 story_id text not null references stories(id) on delete cascade,
 user_id text not null references users(id) on delete cascade,
 created_at timestamptz default now(),
 unique(story_id,user_id)
);
create index if not exists story_likes_story_idx on story_likes(story_id);
create index if not exists story_likes_user_idx on story_likes(user_id);

create table if not exists messages (
 id text primary key,
 from_id text not null references users(id) on delete cascade,
 to_id text not null references users(id) on delete cascade,
 text text default '',
 shared_post_id text,
 shared_story_id text,
 created_at timestamptz default now()
);
create table if not exists calls (
 id text primary key,
 from_id text not null references users(id) on delete cascade,
 to_id text not null references users(id) on delete cascade,
 type text,
 offer jsonb,
 answer jsonb,
 status text,
 created_at timestamptz default now()
);
create table if not exists sessions (
 id text primary key,
 user_id text not null references users(id) on delete cascade,
 expires_at timestamptz not null
);
create index if not exists posts_user_id_idx on posts(user_id);
create index if not exists stories_user_id_idx on stories(user_id);
create index if not exists messages_from_idx on messages(from_id);
create index if not exists messages_to_idx on messages(to_id);
create index if not exists sessions_user_id_idx on sessions(user_id);


-- v16 mention migration for existing projects
alter table if exists public.posts add column if not exists mentions jsonb not null default '[]'::jsonb;
alter table if exists public.stories add column if not exists mentions jsonb not null default '[]'::jsonb;


-- v18 notifications migration
create table if not exists notifications (
 id text primary key,
 user_id text not null references users(id) on delete cascade,
 type text not null,
 text text not null,
 meta jsonb not null default '{}'::jsonb,
 created_at timestamptz default now(),
 read_at timestamptz
);
create index if not exists notifications_user_idx on notifications(user_id,created_at desc);

-- If you already have the Hyper database, run these once in Supabase SQL Editor:
-- alter table posts add column if not exists category text default 'other';
-- alter table stories add column if not exists category text default 'story';

-- v53 Cloudflare R2 + Hyper monetization
alter table if exists public.users add column if not exists created_at timestamptz default now();

create table if not exists public.ad_campaigns (
 id text primary key,
 user_id text not null references public.users(id) on delete cascade,
 brand text default '', title text not null, budget numeric default 0, currency text default 'INR',
 audience text default 'all', status text default 'pending_payment', created_at timestamptz default now()
);
create table if not exists public.promotions (
 id text primary key,
 user_id text not null references public.users(id) on delete cascade,
 post_id text default '', budget numeric default 0, currency text default 'INR',
 audience text default 'all', status text default 'pending_payment', created_at timestamptz default now()
);
create table if not exists public.creator_subscriptions (
 id text primary key,
 subscriber_id text not null references public.users(id) on delete cascade,
 creator_id text not null references public.users(id) on delete cascade,
 amount numeric default 0, currency text default 'INR', status text default 'pending_payment', created_at timestamptz default now()
);
create table if not exists public.premium_memberships (
 id text primary key,
 user_id text not null references public.users(id) on delete cascade,
 plan text not null, amount numeric default 0, currency text default 'INR', status text default 'pending_payment', created_at timestamptz default now()
);
create table if not exists public.transactions (
 id text primary key,
 user_id text not null references public.users(id) on delete cascade,
 type text not null, reference_id text default '', amount numeric default 0, currency text default 'INR',
 status text default 'pending', created_at timestamptz default now()
);
create table if not exists public.wallets (
 user_id text primary key references public.users(id) on delete cascade,
 balance numeric default 0, currency text default 'INR', updated_at timestamptz default now()
);
create index if not exists ad_campaigns_user_idx on public.ad_campaigns(user_id,created_at desc);
create index if not exists promotions_user_idx on public.promotions(user_id,created_at desc);
create index if not exists creator_subscriptions_subscriber_idx on public.creator_subscriptions(subscriber_id,created_at desc);
create index if not exists creator_subscriptions_creator_idx on public.creator_subscriptions(creator_id,created_at desc);
create index if not exists transactions_user_idx on public.transactions(user_id,created_at desc);
