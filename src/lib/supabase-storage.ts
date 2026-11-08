import { supabase } from "@/integrations/supabase/client";

export const GAME_ASSET_BUCKET = "game-assets";

const MAX_ASSET_BYTES = 20 * 1024 * 1024;
const ALLOWED_ASSET_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/avif",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "application/json",
  "font/woff2",
]);

function validateAsset(file: File) {
  if (file.size <= 0 || file.size > MAX_ASSET_BYTES) {
    throw new Error("Asset must be between 1 byte and 20 MB.");
  }
  if (!ALLOWED_ASSET_TYPES.has(file.type)) {
    throw new Error(`Unsupported asset type: ${file.type || "unknown"}`);
  }
}

function cleanPath(path: string) {
  const normalized = path.replace(/\\\\/g, "/").replace(/^\\/+|\\/+$/g, "");
  if (!normalized || normalized.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error("Invalid asset path.");
  }
  return normalized;
}

/**
 * Upload an approved game asset to the public game-assets bucket.
 * Upload permission is controlled by Supabase Storage RLS; never expose a
 * service-role key in browser code.
 */
export async function uploadTextureAsset(
  file: File,
  bucket = GAME_ASSET_BUCKET,
  path?: string,
): Promise<string> {
  validateAsset(file);
  const filePath = cleanPath(path || `uploads/${crypto.randomUUID()}-${file.name}`);
  const { data, error } = await supabase.storage.from(bucket).upload(filePath, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });

  if (error) throw new Error(`Failed to upload game asset: ${error.message}`);
  return getTextureAssetUrl(data.path, bucket);
}

/** Resolve a public URL for an asset in Supabase Storage. */
export function getTextureAssetUrl(path: string, bucket = GAME_ASSET_BUCKET): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(cleanPath(path));
  return data.publicUrl;
}

/** List assets in a bucket folder. Nested folders are returned by Storage separately. */
export async function listTextureAssets(
  bucket = GAME_ASSET_BUCKET,
  folder = "",
): Promise<{ name: string; path: string; url: string; size: number | null }[]> {
  const safeFolder = folder ? cleanPath(folder) : "";
  const { data, error } = await supabase.storage.from(bucket).list(safeFolder, {
    limit: 100,
    offset: 0,
    sortBy: { column: "name", order: "asc" },
  });

  if (error) throw new Error(`Failed to list game assets: ${error.message}`);

  return (data || [])
    .filter((item) => item.id !== null)
    .map((item) => {
      const path = safeFolder ? `${safeFolder}/${item.name}` : item.name;
      return {
        name: item.name,
        path,
        url: getTextureAssetUrl(path, bucket),
        size: item.metadata?.size ?? null,
      };
    });
}

/** Delete an asset; Storage RLS must explicitly permit the current user. */
export async function deleteTextureAsset(path: string, bucket = GAME_ASSET_BUCKET) {
  const { error } = await supabase.storage.from(bucket).remove([cleanPath(path)]);
  if (error) throw new Error(`Failed to delete game asset: ${error.message}`);
}
