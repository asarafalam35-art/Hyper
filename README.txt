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
