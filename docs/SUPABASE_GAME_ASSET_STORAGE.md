# Supabase game asset storage

Capitalfortune currently uses Firebase Authentication and Firestore for player identity and game state. Supabase is introduced here as the public CDN-backed asset repository only. Do not assume a Firebase ID token authenticates a Supabase Storage request.

## 1. Configure environment

Set these values in the hosting provider's server/build environment and local `.env` (never commit real values):

```dotenv
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

The publishable key is intended for browser use. Never put a Supabase secret/service-role key in any `VITE_*` variable or browser bundle.

## 2. Create the public asset bucket

Run this SQL in Supabase Dashboard → SQL Editor:

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'game-assets',
  'game-assets',
  true,
  20971520,
  array[
    'image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/avif',
    'audio/mpeg', 'audio/ogg', 'audio/wav', 'application/json', 'font/woff2'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read access is intentional: these are downloadable game assets.
create policy "Public can read game assets"
on storage.objects for select
to public
using (bucket_id = 'game-assets');

-- No browser upload/update/delete policies are created. Upload assets through
-- the Supabase Dashboard or a trusted server-side administrative workflow.
```

If a policy with the same name already exists, inspect it before creating another policy. Public bucket access permits reading files, not listing the bucket via the public URL.

## 3. Recommended object layout

```text
game-assets/
  buildings/
  properties/
  collectibles/
  ui/
  textures/
  sprites/
  animations/
  audio/
  manifests/
    asset-manifest.json
```

Use stable, descriptive filenames. For frequently updated files, prefer versioned names (for example, `buildings/cafe-v2.webp`) so long-lived browser caches do not serve stale artwork.

## 4. Upload and retrieve assets

Upload approved files through Supabase Dashboard → Storage → game-assets. Copy the object path, not a temporary dashboard URL. The application helper `src/lib/supabase-storage.ts` exposes:

- `getTextureAssetUrl(path)` to resolve the public HTTPS URL.
- `listTextureAssets(bucket, folder)` to list a folder when called with an authorized client.
- `uploadTextureAsset(file)` and `deleteTextureAsset(path)` for a future authenticated/admin upload workflow. Storage RLS must grant those operations before they can succeed.

Current Firebase sign-in does not grant Supabase upload permissions. Do not add permissive anonymous upload policies. Keep uploads dashboard-only until a trusted admin/server workflow or Supabase Auth integration is deliberately configured.

## 5. Verification checklist

1. Confirm the bucket named `game-assets` exists and is public.
2. Upload a small PNG to `ui/storage-test.png`.
3. Open `https://YOUR_PROJECT_REF.supabase.co/storage/v1/object/public/game-assets/ui/storage-test.png` in a private browser tab.
4. Confirm the image loads without authentication.
5. Set the four environment variables above in the build/deployment environment.
6. Rebuild and deploy the web app.

This setup does not migrate Firebase authentication, Firestore game saves, corporations, or economy transactions. Those remain on Firebase until a separate database/auth migration is designed and tested.
