# Art contest — deployment checklist

Implemented: static public page, public results, admin page, serverless voting API, admin API, Neon Postgres SQL schema, Vercel Blob uploads, phone/device uniqueness, Cloudflare Turnstile verification.

## URLs
- /art-contest.html
- /art-contest-results.html
- /admin/art-contest.html

## Mandatory provisioning before opening voting
1. Provision a PostgreSQL database (e.g. Neon) and attach DATABASE_URL to Vercel project kp.
2. Apply contest/schema.sql to that database using a secure admin console. The migration is NOT applied automatically.
3. Set CONTEST_SECRET to a randomly generated >=32-character secret and CONTEST_ADMIN_PASSWORD to a distinct strong password, in Vercel encrypted production variables.
4. Create Cloudflare Turnstile widget for www.kidsplanet.sa; configure TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY in Vercel. The voting endpoint **fails closed** if missing.
5. Ensure BLOB_READ_WRITE_TOKEN is available in project kp (Blob store kidsplanet-art-contest).
6. Redeploy and run end-to-end tests, including simultaneous votes, invalid phone, cookie resets, family IP, consent, time boundaries and upload.
7. Agree tie policy and retention/deletion policy; review local contest requirements before launch.

## Notes
- No OTP: one phone number per group is not proof of one real person.
- Public results show live counts and group leader, not formally approved winner.
- Admin export currently CSV compatible with Excel, not XLSX.
- All dates are stored in UTC; admin datetime-local input follows the browser timezone. Set device to Asia/Riyadh when scheduling.
- Upload limit 3 MB; public image URLs.
- Site is static HTML on Vercel with serverless functions under api/.
- DO NOT publish groups until all checks pass.
