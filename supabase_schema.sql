
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
