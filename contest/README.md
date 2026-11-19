# Kids Planet art contest

## Infrastructure
- Railway project kidsplanet, Postgres production with tables contest_groups, contest_artworks, contest_votes.
- Dedicated database role contest_app, scoped table privileges and RLS policies.
- Vercel project kp has sensitive DATABASE_URL, CONTEST_SECRET, CONTEST_ADMIN_PASSWORD, and BLOB_READ_WRITE_TOKEN.
- Public TCP proxy connects Vercel to Railway Postgres via TLS.

## URLs
- /art-contest — public daily voting
- /art-contest/results — live standings
- /admin/art-contest — admin login, group scheduling, artwork upload, publishing and CSV export

## Voting
- Seven groups, each exactly 24 hours, published manually.
- Saudi mobile normalized, one vote per phone hash and per browser device hash per group.
- Browser proof-of-work challenge, IP velocity limit 30 votes per 10 minutes; optional Cloudflare Turnstile if configured.
- No OTP, so cannot guarantee a unique human behind each phone.
- 15-second polling of public counts.
- No group is published by default; no votes accepted without a published, active group.

## Required before public contest launch
1. Set CONTEST_ADMIN_PASSWORD to an owner-known password in Vercel; current generated password is secret and not shared.
2. Login and upload artworks with guardian consent, schedule seven daily groups in Riyadh time and publish first group.
3. Test end-to-end first vote, duplicates, family shared IP, expiration, concurrency, upload, admin authorization, mobile and results.
4. Decide tie resolution, prize and consent retention policy. Check Saudi promotional contest regulations.
5. Consider enabling Cloudflare Turnstile (TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY) for stronger bot defense.

## Cautions
- Live standings are not official winner approval.
- CSV is compatible with Excel, not native .xlsx.
- Group datetime-local uses browser timezone; use Asia/Riyadh.
- Do not publish group until ready.
