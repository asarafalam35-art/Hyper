HYPER SOCIAL — v25 MIXED DISCOVER

Root files only; no public folder.

Render:
Build Command: npm install
Start Command: npm start

New Discover/Home feed:
- Hindi + Bhojpuri + Punjabi songs mixed with Reels, Shorts and current India news.
- Movie clips / trailers are fetched from Dailymotion public video metadata when available.
- Search box searches songs, news, Reels/Shorts and movie/trailer videos.
- Video duration appears at the bottom-right of the thumbnail/video.
- Video and song have a separate Play button.
- Song cards show duration and can open the full track on the linked music service when available.
- For a full song that Hyper is allowed to host, use Choose Full Audio in Create/Story and upload the audio file. Copyrighted catalog songs cannot be redistributed as full raw audio without the necessary rights.
- Online music catalog search uses Apple/iTunes metadata and previews; Apple Music/MusicKit can provide authorized full playback for signed-in subscribers.

Persistence:
- Local mode writes hyper_data.json.
- Render free filesystem can reset on restart/redeploy.
- For permanent users/posts/stories/messages, set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and run supabase_schema.sql.

Cloudflare is not required for these features.


v26 update:
- One unified mixed feed: Hindi/Bhojpuri/Punjabi songs, Hyper Reels/Shorts, current India news, news videos, movie clips and other videos.
- Videos use inline playback inside Hyper where the provider supplies an embed URL.
- One search box searches songs, news, Hyper reels/shorts, movie clips and videos.
- Create Post/Reel and Story now have Add Audio and Add Voice. Local/recorded audio can be trimmed by start/end seconds before publishing.
- Video duration is shown as minute:second.
- Online music catalogs may provide previews rather than unrestricted full-track audio; upload only audio you own or are authorized to use.


v28 updates:
- Refresh loads a newly rotated mixed feed using a fresh seed.
- External videos include age (days ago/date) and only entries with an embeddable Hyper player are added.
- Video cards have Like, Comment, Share and Download controls. External direct-download is not performed; Hyper-hosted videos can be downloaded.
- External video engagement is stored locally in the browser.


v30 update: Mixed feed and search now show ONLY playable/embeddable videos. Audio-only song cards and text-only news cards are excluded. Video cards keep thumbnail, duration, age (minutes/hours/days), Like, Comment, Share and Download/Open-source actions. One video plays at a time.

v43 direct download:
- Hyper-owned/local video files download directly from the Hyper page.
- External Dailymotion download stays inside Hyper via /api/download/dailymotion/:id when authorized Dailymotion API credentials are configured.
- Set DM_CLIENT_ID and DM_CLIENT_SECRET on Render only for videos you are authorized to download. Dailymotion download URLs require the appropriate plan/API permission and are time-limited.


=== v44 DATA PERSISTENCE FIX ===
IMPORTANT: If Hyper is deployed on Render without Supabase or a persistent disk, uploaded posts/videos/stories and local sessions can disappear after a redeploy/restart because Render's default filesystem is ephemeral. v44 uses HYPER_DATA_FILE when provided and defaults to /var/data/hyper_data.json on Render.

RECOMMENDED PRODUCTION SETUP:
1. Connect SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Render Environment Variables. This keeps users, posts, stories, messages and sessions in the database across deploys.
2. For local JSON fallback, use a Render Persistent Disk mounted at /var/data and set HYPER_DATA_FILE=/var/data/hyper_data.json.
3. Do not replace/delete the Supabase project when uploading a new ZIP. Deploying new code should not delete database rows.
4. Keep AUTH_SECRET the same across deployments if you use it as an environment variable.
5. Existing browser login is kept using a long-lived signed Hyper auth cookie; the server also keeps the session row in the database when Supabase is enabled.
6. Uploaded media currently stored as post/story data is preserved when the backing database/disk is persistent.

v46 UI FIXES
- Removed duplicate bottom navigation bar.
- Fixed upload/create button: missing optional mention fields no longer crash createOpen().
- Long external video cards now show the title only once.
- Shorts right-side actions are exactly Like, Comment, Share, Save; comment uses a comment bubble instead of a second heart.
- Short Follow button now has a reliable click handler and visible Following state.

=== v53 CLOUDFLARE R2 + MONETIZATION ===
Cloudflare R2 is supported for large media uploads. The browser requests a short-lived signed PUT URL from Hyper and uploads directly to R2. R2 secrets never go to the browser.

Render Environment Variables for R2:
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_BUCKET_NAME=hyper-media
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_PUBLIC_URL=https://your-r2-media-domain.example.com

R2 endpoint uses the S3-compatible Cloudflare endpoint and region auto. Configure the R2 bucket CORS for your Hyper Render origin and use a custom R2 domain for production public media. If R2 variables are absent, Hyper keeps the older data-URL fallback with the existing 12MB local-media limit.

Monetization modules added:
- Ads/sponsored-content data model and admin tracking
- Paid Post/Reel promotion orders
- Creator monthly subscription orders
- Hyper Premium orders
- Business/Brand campaign orders
- Transaction records and wallet table foundation
- Profile button: Earn / Promote

IMPORTANT PAYMENT NOTE:
The v53 monetization endpoints create pending orders/transaction records. They do NOT pretend that money was received. A real payment gateway (for example a supported Indian provider) must be configured and its server-side payment verification added before orders are marked paid/active. Never put payment secrets in index.html.
