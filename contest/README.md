# Kids Planet Art Contest — development branch

## Status
This branch introduces the public-facing Arabic contest page and a proposed database migration. **Not production-ready**: backend endpoints, admin upload UI, authentication, deployment wiring and testing remain to be implemented. The page fails closed if its API is unavailable; it does not fake or store votes.

## Requirements
- Daily 24-hour groups (Asia/Riyadh), variable number of artwork entries
- One vote per submitted phone AND device identifier per group; a new vote is allowed in another group
- No OTP; phone ownership cannot be verified
- Live counts based on committed server-side votes
- One winner per group; ties require a published policy
- Phone numbers normalized to +9665XXXXXXXX, then HMAC-SHA256 hashed using a secret pepper, not plain SHA
- Device cookie random, HttpOnly/Secure/SameSite=Lax; hash server-side, do not trust client IDs
- IP only for abuse detection/rate limiting; do not enforce one vote per IP
- Atomic DB unique constraints; check artwork belongs to open group on server
- Turnstile and server-side rate limiting, bot/abuse monitoring
- Guardian consent before artwork publishing; data retention/deletion policy

## API contract to implement
GET /api/art-contest/current -> {group: {id,number,ends_at}|null, artworks:[{id,entry_number,display_name,image_url,votes}]}
POST /api/art-contest/vote {artwork_id,name,phone} -> {message}, with Set-Cookie on first verified device identity.

## Remaining tasks
1. Confirm which Vercel project serves the public static HTML. Its current static deployment may not route /api paths to the separate Next.js dashboard.
2. Implement server-side API and atomic validation in the *actual* deployed runtime, including safe group switching.
3. Build protected admin upload, consent, scheduling, winner review and export.
4. Configure storage, secrets and service account; no credentials in Git.
5. Add integration/load/security tests; run them on staging before any merge.
6. Review legal/contest rules and prize details before opening voting.
