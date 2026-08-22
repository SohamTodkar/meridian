/**
 * Asset preloader for the WebGL layer. Textures and the glTF overlay are
 * fetched once, cached module-level, and shared by every canvas on the page.
 * `preloadVisualAssets()` is scheduled with requestIdleCallback from the
 * shell so the hero never competes with first paint.
 */

export const ASSET_PATHS = {
  base: "/assets/textures/base.png",
  depth: "/assets/textures/depth.png",
  alpha: "/assets/textures/alpha.png",
  roughness: "/assets/textures/roughness.png",
  normal: "/assets/textures/normal.png",
  model: "/assets/models/meridian-knot.glb",
  rive: "/assets/rive/meridian-orb.riv",
} as const;

const blobCache = new Map<string, Promise<Blob>>();

function fetchBlob(url: string): Promise<Blob> {
  let cached = blobCache.get(url);
  if (!cached) {
    cached = fetch(url).then((response) => {
      if (!response.ok) throw new Error(`asset ${url} failed: ${response.status}`);
      return response.blob();
    });
    cached.catch(() => blobCache.delete(url));
    blobCache.set(url, cached);
  }
  return cached;
}

export async function loadAssetBlob(url: string): Promise<Blob> {
  return fetchBlob(url);
}

export async function createImageBitmapAsset(url: string): Promise<ImageBitmap> {
  const blob = await fetchBlob(url);
  return createImageBitmap(blob);
}

/** Warm every heavy asset into the HTTP cache during idle time. */
export function preloadVisualAssets(): void {
  for (const url of Object.values(ASSET_PATHS)) {
    fetchBlob(url).catch(() => {
      /* offline or missing asset — engines fall back gracefully */
    });
  }
}
