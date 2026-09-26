# Deploying this project to a new Cloudflare site

This folder contains the website, the `/admin/` dashboard, and all Pages Functions. Deploy it with Wrangler; a drag-and-drop static upload does **not** deploy the Functions or connect the dashboard storage.

## One-time Cloudflare setup

1. Create a new Cloudflare Pages project name, D1 database, and R2 bucket for the new site.
2. Run `database/schema.sql` against the new D1 database.
3. Update `wrangler.jsonc` with the new Pages project name, D1 database ID/name, and R2 bucket name.
4. Add the Pages secret `ADMIN_PASSWORD` (and optionally `ADMIN_USERNAME`).
5. Deploy from this folder:

   ```powershell
   npx.cmd wrangler pages deploy . --project-name YOUR_PROJECT_NAME
   ```

6. Attach the new custom domain in Cloudflare Pages, then sign in at `/admin/`.

## Dashboard-managed data

These items are intentionally not stored as local files:

- Profile images: D1 table `profile_images`
- Ad placement code: D1 table `ad_placements`
- Analytics: D1 tables in `database/schema.sql`
- Call videos: R2 bucket objects plus D1 table `video_assets`

For an exact copy of an existing site, copy/export the old D1 database data and R2 video objects into the new database/bucket before deployment. After a fresh setup, upload profile images, ads, and videos through `/admin/`.

The old local `images/` fallback files are no longer required: the site now uses dashboard images first and shows remote placeholders only until an admin upload is made.
