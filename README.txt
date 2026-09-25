HYPER v16 - Multiple Accounts + Mentions

Features:
- Create more than one account on the same device.
- Add account / Switch account buttons on profile.
- Saved account emails are stored locally; password is never stored.
- Login with the selected account's password.
- Mention users in posts, reels and stories.
- Search users by name/username and add mention chips before publishing.
- Mentions are stored in Supabase/local data.
- Existing v15 share/story/music/admin features retained.

Render:
Build: npm install
Start: npm start

Supabase:
Run supabase_schema.sql. It includes safe ALTER statements for existing posts/stories tables.
Environment variables:
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
ADMIN_EMAIL=asarafalamt20@gmail.com
ADMIN_PASSWORD=A2aryann
AUTH_SECRET=<fixed random secret>
