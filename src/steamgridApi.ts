/**
 * SteamGridDB Unified Persistent Image Resolution Service
 * 
 * Clones the LaunchBox 3D proxy & multi-tier cache protocol for WebPort and Flash posters:
 * 1. In-memory Map + localStorage persistent cache
 * 2. In-flight request deduplication
 * 3. CORS-safe server proxy (/api/steamgrid/search & /api/steamgrid/grids)
 * Powered by SteamGridDB API (https://www.steamgriddb.com/api/v2)
 */

export const STEAMGRIDDB_API_KEY = '4604163d9e3c7458aad1c35e090954c0';
const CACHE_STORAGE_KEY = 'arcadia_steamgrid_cache_v2';
const MAX_CACHE_ENTRIES = 500;

export interface SteamGridAssets {
  poster: string;
  thumb?: string;
  hero?: string;
  logo?: string;
  gameId?: number;
  source: 'steamgriddb-api';
}

// In-memory cache synced with localStorage
const steamgridMemoryCache = new Map<string, SteamGridAssets | null>();
// Deduplicate concurrent lookups for the same title
const inflightLookups = new Map<string, Promise<SteamGridAssets | null>>();

// Hydrate memory cache from localStorage on load
try {
  const saved = localStorage.getItem(CACHE_STORAGE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    Object.entries(parsed).forEach(([k, v]) => {
      steamgridMemoryCache.set(k, v as SteamGridAssets | null);
    });
  }
} catch (e) {
  // Ignore localStorage errors
}

function persistCache() {
  try {
    // Keep cache bounded under localStorage quota
    while (steamgridMemoryCache.size > MAX_CACHE_ENTRIES) {
      const oldestKey = steamgridMemoryCache.keys().next().value;
      if (oldestKey !== undefined) {
        steamgridMemoryCache.delete(oldestKey);
      } else {
        break;
      }
    }
    const obj: Record<string, SteamGridAssets | null> = {};
    steamgridMemoryCache.forEach((val, key) => {
      obj[key] = val;
    });
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(obj));
  } catch (e) {
    // Ignore storage quota limits
  }
}

function normalizeLookupTitle(rawTitle: string): string {
  return rawTitle
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*\[[^\]]*\]/g, '')
    .trim();
}

/**
 * Unified SteamGridDB resolver for WebPort and Flash game titles.
 * Queries proxied SteamGridDB API (/api/steamgrid/*), caches persistently in localStorage,
 * and returns primary cover assets without CORS blocks.
 */
export async function resolveSteamGridImage(
  gameTitle: string,
  consoleType?: string
): Promise<SteamGridAssets | null> {
  if (!gameTitle) return null;
  const cleanTitle = normalizeLookupTitle(gameTitle) || gameTitle.trim();
  const normalizedTitle = cleanTitle.toLowerCase();

  // Return cached result if available
  if (steamgridMemoryCache.has(normalizedTitle)) {
    return steamgridMemoryCache.get(normalizedTitle) || null;
  }

  // Only run for WebPort, Flash, or unspecified PC games
  const cType = (consoleType || '').toUpperCase();
  const isWebOrFlash =
    cType.includes('WEB') ||
    cType.includes('FLASH') ||
    cType.includes('PORT') ||
    !cType;

  if (!isWebOrFlash) {
    steamgridMemoryCache.set(normalizedTitle, null);
    return null;
  }

  // Share in-flight promise if another card is already resolving the same title
  if (inflightLookups.has(normalizedTitle)) {
    return inflightLookups.get(normalizedTitle)!;
  }

  const lookupPromise = (async (): Promise<SteamGridAssets | null> => {
    try {
      const searchUrl = `/api/steamgrid/search/${encodeURIComponent(cleanTitle)}`;
      const res = await fetch(searchUrl);

      if (!res.ok) throw new Error(`SteamGridDB proxy search returned HTTP ${res.status}`);
      const data = await res.json();

      if (data.success && data.data && data.data.length > 0) {
        const gameId = data.data[0].id;

        // Fetch primary vertical grid images (600x900) via local CORS-safe proxy
        const gridUrl = `/api/steamgrid/grids/${gameId}?dimensions=600x900,460x215,920x430`;
        const gridRes = await fetch(gridUrl);

        if (gridRes.ok) {
          const gridData = await gridRes.json();
          if (gridData.success && gridData.data && gridData.data.length > 0) {
            const primaryGrid = gridData.data[0];
            const assets: SteamGridAssets = {
              poster: primaryGrid.url,
              thumb: primaryGrid.thumb,
              gameId,
              source: 'steamgriddb-api',
            };
            steamgridMemoryCache.set(normalizedTitle, assets);
            persistCache();
            return assets;
          }
        }
      }
    } catch (err) {
      console.warn(`[SteamGridDB Service] Could not resolve image for "${gameTitle}":`, err);
    }

    steamgridMemoryCache.set(normalizedTitle, null);
    persistCache();
    return null;
  })();

  inflightLookups.set(normalizedTitle, lookupPromise);
  try {
    return await lookupPromise;
  } finally {
    inflightLookups.delete(normalizedTitle);
  }
}
