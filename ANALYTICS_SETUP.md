# Private traffic analytics setup

This project now records anonymous page views and heartbeats through Cloudflare Pages Functions. The public site never contains the admin password; the dashboard is at `/admin/` and the data API requires that password.

1. In Cloudflare, create a D1 database and run `database/schema.sql` against it.
2. In **Pages → your project → Settings → Functions**, bind that database as `ANALYTICS_DB` (for both Preview and Production).
3. In **Settings → Environment variables**, add a secret named `ADMIN_PASSWORD` and set its value to your chosen password.
4. Deploy this repository, then open `https://your-domain/admin/` and enter that password. It remains only in that browser tab's session storage.

The dashboard username is `Admin` unless you configure a different `ADMIN_USERNAME` secret.

Visitors are considered live when their last heartbeat is within two minutes. Country comes from Cloudflare's edge-country header, and source/platform comes from the referrer (for example Google, Facebook, Instagram, WhatsApp, X, or Direct). The implementation stores no IP address, name, or device fingerprint. Events and inactive visitor records older than seven days are automatically removed.
