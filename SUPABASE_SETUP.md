# Hyper v7 — persistent database setup

This version removes the in-memory users/posts/stories/messages/session storage. Data is stored in Supabase/PostgreSQL so Render restarts and redeploys do not wipe the app database.

## 1. Create a Supabase project
Create a project at https://supabase.com/ and open **SQL Editor**.

## 2. Run `supabase_schema.sql`
Copy the complete SQL from `supabase_schema.sql` into Supabase SQL Editor and run it once.

## 3. Render environment variables
In Render → your Web Service → Environment add:

- `SUPABASE_URL` = your Supabase Project URL
- `SUPABASE_SERVICE_ROLE_KEY` = your Supabase service-role key (keep this secret; server only)
- `ADMIN_EMAIL` = `asarafalamt20@gmail.com`
- `ADMIN_PASSWORD` = `A2aryann`

Do NOT put the service-role key in `index.html` or client-side JavaScript.

## 4. Render commands
Build Command: `npm install`
Start Command: `npm start`

## 5. Important
This fixes persistence for database records. Existing data that was only stored in the old Render process memory cannot be recovered after that process/redeploy is gone. New v7 data will persist.

Media in the current UI is still sent as data URLs and stored in database text fields. For a large production app, move images/videos/audio to Supabase Storage later; this ZIP intentionally focuses on fixing login/data persistence first.
