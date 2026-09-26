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
