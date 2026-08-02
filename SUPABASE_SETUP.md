# Fated OS Supabase cloud save setup

This replaces the old Cloudflare D1/R2 save path. Cloudflare Pages can still host the frontend.

## 1. Create Supabase project

Create a Supabase project. In Authentication settings, keep email/password enabled. For easiest testing, disable email confirmation first; you can enable it later after the flow is stable.

## 2. Run SQL

Open Supabase SQL Editor and run the whole file:

`supabase_fated_cloud.sql`

It creates:

- `fated_profiles`: user email and encryption salt.
- `fated_snapshots`: encrypted full website snapshot.
- `fated_invite_codes`: invite code validation. Default code is `123456`.
- `fated-assets`: public Storage bucket for avatars, plugin images, wallpapers, stickers, and audio.

## 3. Fill frontend config

Open:

`js/main/core/08a-supabase-config.js`

Fill these public values from Supabase Project Settings > API:

```js
window.FATED_SUPABASE_CONFIG = Object.assign({
  url: 'https://YOUR_PROJECT.supabase.co',
  anonKey: 'YOUR_SUPABASE_ANON_KEY',
  assetBucket: 'fated-assets'
}, window.FATED_SUPABASE_CONFIG || {});
```

Use the anon key only. Never put the service role key in this frontend file.

## 4. Deploy

Push the repo to GitHub and redeploy Cloudflare Pages. The frontend will call Supabase directly.

## 5. Expected behavior

- First visit: login/register modal asks for email, password, invite code.
- After login: Supabase session persists, so users do not need to log in every day.
- Every local save triggers encrypted cloud autosave.
- Images are uploaded to Storage and replaced with stable public URLs before the encrypted snapshot is saved.
- Next visit: local cache loads first, then cloud snapshot restores if it is newer or if local data is empty.
