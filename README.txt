HYPER v23 - Render/GitHub

ROOT FILES ONLY (no public folder)
- package.json
- server.js
- index.html
- supabase_schema.sql

Render:
Build Command: npm install
Start Command: npm start

What is updated:
- Home Trending is one mixed vertical feed: Hindi + Bhojpuri + Punjabi songs, Reels, latest India news and Shorts.
- Trending songs are fetched online at runtime and up to 150 songs are available to the app.
- Song cards have an audio preview player directly on Home.
- Latest India news is fetched online from Google News RSS.
- Reels/Shorts from Hyper users are mixed into the same feed and can be opened/played from the post viewer.
- Refresh reloads the live online trending feed.
- Existing login, multiple accounts, posts, reels, stories, messages, mentions, notifications and Supabase support are preserved.

IMPORTANT DATA NOTE:
Local mode writes hyper_data.json beside server.js. Render free instances can lose local files after a restart/redeploy. For permanent user/posts/stories/messages data, set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Render Environment and run supabase_schema.sql in Supabase.

Cloudflare is NOT required for this update. Cloudflare can be added later for CDN/DNS, but it does not replace a database/storage system.

Music attachment update:
- Online searched/trending songs can be previewed before publishing.
- The selected song can be attached to Post, Reel, or Story.
- Published Post/Reel/Story stores song URL and title and shows an audio player where browser policy permits playback.
- Reel remix can reuse the original Reel song.
