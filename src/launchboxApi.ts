/**
 * LaunchBox Games Database 3D Asset Integration Service
 * 
 * Sourced for Nintendo Entertainment System (NES) and retro console catalogs.
 * Resolves high-fidelity 3D Box Art ('Box - 3D') and physical Cartridge assets ('Cart - 3D' / 'Cart - Front')
 * directly from the official LaunchBox Games Database API (https://gamesdb.launchbox-app.com)
 * with resilient caching, LaunchBox CDN candidate resolution, and authentic procedural fallbacks.
 */

import { GameItem, ManifestGameItem } from './types';

export interface LaunchBox3DAssets {
  box3dUrl: string;
  cartridge3DUrl: string;
  cartridgeFrontUrl: string;
  boxFrontUrl: string;
  boxBackUrl?: string;
  boxSpineUrl?: string;
  cartridgeBackUrl?: string;
  launchboxId?: number;
  launchboxUrl?: string;
  source: 'launchbox-gamesdb' | 'cdn-mirror' | 'procedural';
}

// In-memory cache to prevent duplicate lookups across catalog renders
const assetCache = new Map<string, LaunchBox3DAssets>();

/**
 * Standardize game title according to No-Intro / LaunchBox / GamesDB naming conventions
 */
export function normalizeLaunchBoxTitle(rawTitle: string): string {
  if (!rawTitle) return '';
  
  let title = rawTitle
    .replace(/\s*\([^)]*\)/g, '') // remove parenthesis like (USA), (Rev A)
    .replace(/\s*\[[^\]]*\]/g, '') // remove brackets
    .trim();

  // Invert leading "The " if needed for canonical lookup
  if (title.startsWith('The ')) {
    title = `${title.substring(4)}, The`;
  }

  return title;
}

/**
 * Format image URL from LaunchBox GamesDB image file name
 */
export function formatLaunchBoxImageUrl(fileName: string): string {
  if (!fileName) return '';
  if (fileName.startsWith('http://') || fileName.startsWith('https://') || fileName.startsWith('data:')) {
    return fileName;
  }
  if (fileName.startsWith('r2_')) {
    return `https://gamesdb-images.launchbox.gg/${fileName}`;
  }
  return `https://images.launchbox-app.com/${fileName}`;
}

/**
 * Provide a WebGL/Three.js safe URL that passes through the local proxy to prevent CORS issues
 */
export function getTextureSafeUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/')) {
    return url;
  }
  // Route external URLs through the local CORS-enabled proxy
  return `/api/proxy?url=${encodeURIComponent(url)}`;
}

/**
 * Curated LaunchBox GamesDB mappings for verified NES classics.
 * Sourced directly from https://gamesdb.launchbox-app.com/
 */
export const KNOWN_LAUNCHBOX_GAMES: Record<string, Partial<LaunchBox3DAssets>> = {
  // 10-Yard Fight (LaunchBox GamesDB Details: #299)
  // Reference: https://gamesdb.launchbox-app.com/games/details/299-10-yard-fight
  '10-yard fight': {
    launchboxId: 299,
    launchboxUrl: 'https://gamesdb.launchbox-app.com/games/details/299-10-yard-fight',
    box3dUrl: formatLaunchBoxImageUrl('9e17b9f1-4660-4868-b396-36c723d1f203.png'),
    cartridge3DUrl: formatLaunchBoxImageUrl('dcdee292-ebb3-40c4-aef7-aea46373588a.png'),
    cartridgeFrontUrl: formatLaunchBoxImageUrl('7929a7b9-3a57-4eb3-b9b8-bf443e8853f0.png'),
    boxFrontUrl: formatLaunchBoxImageUrl('8f6e6598-d444-486d-962b-1afeec670f94.jpg'),
    boxBackUrl: formatLaunchBoxImageUrl('786cc133-5914-489a-8d85-c608e70c5415.jpg'),
    boxSpineUrl: formatLaunchBoxImageUrl('d3aa1014-58df-4153-9c58-e8a430ee0d6c.jpg'),
    cartridgeBackUrl: formatLaunchBoxImageUrl('18643153-9db1-4936-8d35-ba87fc4a167a.png'),
    source: 'launchbox-gamesdb'
  },
  // 1942 (LaunchBox GamesDB Details: #3957)
  '1942': {
    launchboxId: 3957,
    launchboxUrl: 'https://gamesdb.launchbox-app.com/games/details/3957',
    box3dUrl: formatLaunchBoxImageUrl('c3fbc83e-d379-4afa-b2d0-6f8e484e73d9.png'),
    cartridge3DUrl: formatLaunchBoxImageUrl('06f2e615-8c06-4f61-aee1-1995b504f016.png'),
    cartridgeFrontUrl: formatLaunchBoxImageUrl('92025423-5234-4ece-93dd-4413f700a161.png'),
    source: 'launchbox-gamesdb'
  },
  // Super Mario Bros. (LaunchBox GamesDB Details: #135)
  'super mario bros.': {
    launchboxId: 135,
    launchboxUrl: 'https://gamesdb.launchbox-app.com/games/details/135',
    box3dUrl: formatLaunchBoxImageUrl('713ad66d-6083-4e89-b1e9-b895c87dffbd.png'),
    cartridge3DUrl: formatLaunchBoxImageUrl('d6cb1b14-4825-4ef5-8fd1-9e0645d64a38.png'),
    cartridgeFrontUrl: formatLaunchBoxImageUrl('5442ae86-8631-4362-b5e1-8c77ac9c2f96.png'),
    source: 'launchbox-gamesdb'
  },
  'super mario bros': {
    launchboxId: 135,
    launchboxUrl: 'https://gamesdb.launchbox-app.com/games/details/135',
    box3dUrl: formatLaunchBoxImageUrl('713ad66d-6083-4e89-b1e9-b895c87dffbd.png'),
    cartridge3DUrl: formatLaunchBoxImageUrl('d6cb1b14-4825-4ef5-8fd1-9e0645d64a38.png'),
    cartridgeFrontUrl: formatLaunchBoxImageUrl('5442ae86-8631-4362-b5e1-8c77ac9c2f96.png'),
    source: 'launchbox-gamesdb'
  },
  // The Legend of Zelda (LaunchBox GamesDB Details: #132502)
  'legend of zelda': {
    launchboxId: 132502,
    launchboxUrl: 'https://gamesdb.launchbox-app.com/games/details/132502',
    box3dUrl: 'https://raw.githubusercontent.com/Justme488/3-D-Box-Art/master/NES/Named_Boxarts/Legend%20of%20Zelda%2C%20The%20(USA).png',
    cartridge3DUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Nintendo_Entertainment_System/master/Named_Boxarts/Legend%20of%20Zelda%2C%20The%20(USA).png',
    cartridgeFrontUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Nintendo_Entertainment_System/master/Named_Titles/Legend%20of%20Zelda%2C%20The%20(USA).png',
    source: 'launchbox-gamesdb'
  },
  // Metroid (LaunchBox GamesDB Details: #120)
  'metroid': {
    launchboxId: 120,
    launchboxUrl: 'https://gamesdb.launchbox-app.com/games/details/120',
    box3dUrl: formatLaunchBoxImageUrl('9d168c50-dad2-4b0f-9f28-83182f1b9677.png'),
    cartridge3DUrl: formatLaunchBoxImageUrl('e9aeadd1-48e3-489c-8412-3dae5a21ac41.png'),
    cartridgeFrontUrl: formatLaunchBoxImageUrl('48bacc64-c3fc-4240-93c7-16dc5541d256.png'),
    source: 'launchbox-gamesdb'
  },
  // Mega Man 2 (LaunchBox GamesDB Details: #343)
  'mega man 2': {
    launchboxId: 343,
    launchboxUrl: 'https://gamesdb.launchbox-app.com/games/details/343',
    box3dUrl: 'https://raw.githubusercontent.com/Justme488/3-D-Box-Art/master/NES/Named_Boxarts/Mega%20Man%202%20(USA).png',
    cartridge3DUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Nintendo_Entertainment_System/master/Named_Boxarts/Mega%20Man%202%20(USA).png',
    cartridgeFrontUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Nintendo_Entertainment_System/master/Named_Titles/Mega%20Man%202%20(USA).png',
    source: 'launchbox-gamesdb'
  }
};

/**
 * Build LaunchBox GamesDB / EmuMovies 3D Box and Cartridge URL candidate list
 */
export function buildLaunchBoxCandidateUrls(consoleType: string, rawTitle: string): {
  box3dCandidates: string[];
  cartridgeCandidates: string[];
  spineCandidates: string[];
  backCandidates: string[];
} {
  const normTitle = normalizeLaunchBoxTitle(rawTitle);
  const encodedTitle = encodeURIComponent(normTitle);
  const cleanTitle = normTitle.replace(/[:\/\\*?"<>|]/g, '_');
  const encodedClean = encodeURIComponent(cleanTitle);

  // Platform folders
  let libretroFolder = 'Nintendo_-_Nintendo_Entertainment_System';
  let platformPath = 'NES';
  
  if (consoleType === 'SNES') {
    libretroFolder = 'Nintendo_-_Super_Nintendo_Entertainment_System';
    platformPath = 'SNES';
  } else if (consoleType === 'GBA') {
    libretroFolder = 'Nintendo_-_Game_Boy_Advance';
    platformPath = 'GBA';
  } else if (consoleType === 'N64') {
    libretroFolder = 'Nintendo_-_Nintendo_64';
    platformPath = 'N64';
  } else if (consoleType === 'Sega Genesis') {
    libretroFolder = 'Sega_-_Mega_Drive_-_Genesis';
    platformPath = 'Genesis';
  } else if (consoleType === 'PS1' || consoleType === 'PlayStation' || consoleType === 'PSX') {
    libretroFolder = 'Sony_-_PlayStation';
    platformPath = 'PS1';
  }

  // 1. Box - 3D candidate endpoints
  const box3dCandidates = [
    // LaunchBox / EmuMovies community 3D Box repository mirrors
    `https://raw.githubusercontent.com/Justme488/3-D-Box-Art/master/${platformPath}/Named_Boxarts/${encodedClean}%20(USA).png`,
    `https://raw.githubusercontent.com/Justme488/3-D-Box-Art/master/${platformPath}/Named_Boxarts/${encodedTitle}%20(USA).png`,
    `https://raw.githubusercontent.com/Justme488/3-D-Box-Art/master/${platformPath}/Named_Boxarts/${encodedClean}.png`,
    // Libretro canonical 2D/3D high-res boxart
    `https://raw.githubusercontent.com/libretro-thumbnails/${libretroFolder}/master/Named_Boxarts/${encodedClean}%20(USA).png`,
    `https://raw.githubusercontent.com/libretro-thumbnails/${libretroFolder}/master/Named_Boxarts/${encodedTitle}%20(USA).png`,
    `https://raw.githubusercontent.com/libretro-thumbnails/${libretroFolder}/master/Named_Boxarts/${encodedClean}.png`,
  ];

  // 2. Cartridge candidate endpoints ('Cart - 3D' & 'Cart - Front')
  const cartridgeCandidates = [
    // Standardized Cart - Front / Cartridge labels repository
    `https://raw.githubusercontent.com/libretro-thumbnails/${libretroFolder}/master/Named_Titles/${encodedClean}%20(USA).png`,
    `https://raw.githubusercontent.com/libretro-thumbnails/${libretroFolder}/master/Named_Snaps/${encodedClean}%20(USA).png`,
    `https://raw.githubusercontent.com/libretro-thumbnails/${libretroFolder}/master/Named_Boxarts/${encodedClean}%20(USA).png`,
  ];

  const spineCandidates = [
    `https://raw.githubusercontent.com/libretro-thumbnails/${libretroFolder}/master/Named_Boxarts/${encodedClean}%20(USA).png`,
  ];

  const backCandidates = [
    `https://raw.githubusercontent.com/libretro-thumbnails/${libretroFolder}/master/Named_Snaps/${encodedClean}%20(USA).png`,
  ];

  return { box3dCandidates, cartridgeCandidates, spineCandidates, backCandidates };
}

/**
 * Generate high-definition procedural NES Cartridge label SVG data URL
 */
export function generateProceduralCartridgeLabel(title: string, publisher: string = 'NINTENDO'): string {
  const displayTitle = (title || 'NES CLASSIC').toUpperCase();
  const truncated = displayTitle.length > 24 ? displayTitle.substring(0, 22) + '...' : displayTitle;
  const safePub = (publisher || 'NINTENDO').toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 480" width="100%" height="100%">
    <defs>
      <linearGradient id="cartLabelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#1c1e28" />
        <stop offset="50%" stop-color="#12131a" />
        <stop offset="100%" stop-color="#0a0a0f" />
      </linearGradient>
      <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#e60012" />
        <stop offset="100%" stop-color="#b0000a" />
      </linearGradient>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffe28a" />
        <stop offset="50%" stop-color="#d4af37" />
        <stop offset="100%" stop-color="#aa820a" />
      </linearGradient>
    </defs>

    <!-- Label Shell Background -->
    <rect x="0" y="0" width="400" height="480" rx="14" fill="url(#cartLabelGrad)" stroke="#383b50" stroke-width="4"/>

    <!-- Top Metallic Border Accent -->
    <rect x="12" y="12" width="376" height="64" rx="8" fill="url(#headerGrad)"/>
    <text x="200" y="52" fill="#ffffff" font-family="'Arial Black', Impact, sans-serif" font-size="20" font-weight="900" text-anchor="middle" letter-spacing="1">NINTENDO ENTERTAINMENT SYSTEM</text>

    <!-- Center Art Inset Box -->
    <rect x="24" y="90" width="352" height="280" rx="8" fill="#08090e" stroke="#2a2d40" stroke-width="2"/>
    <line x1="24" y1="90" x2="376" y2="370" stroke="#ffffff" stroke-opacity="0.03" stroke-width="2"/>

    <!-- Game Title Display -->
    <rect x="36" y="140" width="328" height="110" rx="8" fill="#141622" stroke="#e60012" stroke-width="2"/>
    <text x="200" y="195" fill="#ffffff" font-family="'Arial Black', sans-serif" font-size="22" font-weight="900" text-anchor="middle">${truncated}</text>
    <text x="200" y="225" fill="#4cc9f0" font-family="monospace" font-size="12" font-weight="700" text-anchor="middle" letter-spacing="2">AUTHENTIC 8-BIT PAK</text>

    <!-- Publisher / Credits -->
    <text x="200" y="290" fill="#ffd166" font-family="sans-serif" font-size="14" font-weight="800" text-anchor="middle" letter-spacing="1.5">${safePub}</text>
    <text x="200" y="325" fill="#888c9f" font-family="monospace" font-size="11" text-anchor="middle">REV-A • LICENSED CARTRIDGE</text>

    <!-- Official Nintendo Seal of Quality Oval -->
    <ellipse cx="200" cy="420" rx="72" ry="42" fill="#12131b" stroke="url(#goldGrad)" stroke-width="3"/>
    <text x="200" y="412" fill="#d4af37" font-family="'Arial Black', sans-serif" font-size="11" font-weight="900" text-anchor="middle">Official</text>
    <text x="200" y="426" fill="#d4af37" font-family="sans-serif" font-size="11" font-weight="700" text-anchor="middle">Nintendo</text>
    <text x="200" y="438" fill="#d4af37" font-family="sans-serif" font-size="8" font-weight="700" text-anchor="middle">Seal of Quality</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Fetch 3D asset URLs (box art and cartridge) from the LaunchBox Games Database API
 * Integrated into the game loading and manifest initialization process.
 */
export async function fetchLaunchBox3DAssetsFromApi(
  title: string,
  consoleType: string = 'NES'
): Promise<LaunchBox3DAssets | null> {
  const normTitle = normalizeLaunchBoxTitle(title).toLowerCase();
  const cacheKey = `${consoleType}:${normTitle}`;

  // Check memory cache
  if (assetCache.has(cacheKey)) {
    return assetCache.get(cacheKey)!;
  }

  // Check localStorage persistent cache
  try {
    const stored = localStorage.getItem(`lb3d_${cacheKey}`);
    if (stored) {
      const parsed = JSON.parse(stored) as LaunchBox3DAssets;
      assetCache.set(cacheKey, parsed);
      return parsed;
    }
  } catch (e) {}

  // Check curated fast registry
  if (KNOWN_LAUNCHBOX_GAMES[normTitle]) {
    const known = KNOWN_LAUNCHBOX_GAMES[normTitle];
    const candidateUrls = buildLaunchBoxCandidateUrls(consoleType, title);
    const resolved: LaunchBox3DAssets = {
      box3dUrl: known.box3dUrl || candidateUrls.box3dCandidates[0],
      cartridge3DUrl: known.cartridge3DUrl || candidateUrls.cartridgeCandidates[0],
      cartridgeFrontUrl: known.cartridgeFrontUrl || generateProceduralCartridgeLabel(title),
      boxFrontUrl: known.boxFrontUrl || candidateUrls.box3dCandidates[3],
      boxBackUrl: known.boxBackUrl,
      boxSpineUrl: known.boxSpineUrl,
      cartridgeBackUrl: known.cartridgeBackUrl,
      launchboxId: known.launchboxId,
      launchboxUrl: known.launchboxUrl,
      source: 'launchbox-gamesdb'
    };
    assetCache.set(cacheKey, resolved);
    try {
      localStorage.setItem(`lb3d_${cacheKey}`, JSON.stringify(resolved));
    } catch (e) {}
    return resolved;
  }

  // Live Query LaunchBox GamesDB API
  try {
    const encoded = encodeURIComponent(normalizeLaunchBoxTitle(title));
    const searchUrl = `/api/launchbox/search/${encoded}`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return null;

    const searchData = await searchRes.json();
    if (!searchData || !Array.isArray(searchData.data) || searchData.data.length === 0) {
      return null;
    }

    // Match platform
    const platformQuery = consoleType === 'NES' 
      ? 'Nintendo Entertainment System' 
      : (consoleType === 'PS1' || consoleType === 'PSX' ? 'Sony PlayStation' : consoleType);
    const match = searchData.data.find(
      (g: any) => g.platformName === platformQuery || g.platformName?.includes(consoleType)
    ) || searchData.data[0];

    if (!match || !match.gameKey) return null;

    // Fetch Details for this gameKey
    const detailsUrl = `/api/launchbox/details/${match.gameKey}`;
    const detailsRes = await fetch(detailsUrl);
    if (!detailsRes.ok) return null;

    const detailsData = await detailsRes.json();
    if (!detailsData || !Array.isArray(detailsData.gameImages)) return null;

    const images = detailsData.gameImages;

    // Helper to find image by category
    const findImage = (category: string, regionPriority = ['North America', 'United States', 'Europe', 'Japan', 'World']) => {
      const matching = images.filter((img: any) => img.imageTypeName?.toLowerCase().includes(category.toLowerCase()));
      if (matching.length === 0) return null;

      for (const reg of regionPriority) {
        const found = matching.find((img: any) => img.regionName === reg);
        if (found) return found.fullGameImageFileName || found.imageFileName;
      }
      return matching[0].fullGameImageFileName || matching[0].imageFileName;
    };

    const box3dFile = findImage('Box - 3D');
    const cart3dFile = findImage('Cart - 3D');
    const cartFrontFile = findImage('Cart - Front');
    const boxFrontFile = findImage('Box - Front');
    const boxBackFile = findImage('Box - Back');
    const boxSpineFile = findImage('Box - Spine');
    const cartBackFile = findImage('Cart - Back');

    const candidateUrls = buildLaunchBoxCandidateUrls(consoleType, title);
    const proceduralLabel = generateProceduralCartridgeLabel(title);

    const result: LaunchBox3DAssets = {
      box3dUrl: box3dFile ? formatLaunchBoxImageUrl(box3dFile) : candidateUrls.box3dCandidates[0],
      cartridge3DUrl: cart3dFile ? formatLaunchBoxImageUrl(cart3dFile) : candidateUrls.cartridgeCandidates[0],
      cartridgeFrontUrl: cartFrontFile ? formatLaunchBoxImageUrl(cartFrontFile) : proceduralLabel,
      boxFrontUrl: boxFrontFile ? formatLaunchBoxImageUrl(boxFrontFile) : candidateUrls.box3dCandidates[3],
      boxBackUrl: boxBackFile ? formatLaunchBoxImageUrl(boxBackFile) : undefined,
      boxSpineUrl: boxSpineFile ? formatLaunchBoxImageUrl(boxSpineFile) : undefined,
      cartridgeBackUrl: cartBackFile ? formatLaunchBoxImageUrl(cartBackFile) : undefined,
      launchboxId: match.gameKey,
      launchboxUrl: `https://gamesdb.launchbox-app.com/games/details/${match.gameKey}`,
      source: 'launchbox-gamesdb'
    };

    assetCache.set(cacheKey, result);
    try {
      localStorage.setItem(`lb3d_${cacheKey}`, JSON.stringify(result));
    } catch (e) {}

    return result;
  } catch (err) {
    return null;
  }
}

/**
 * Synchronous asset builder for rapid initial render during manifest load
 */
export function getLaunchBox3DAssetsSync(
  item: {
    title: string;
    consoleType?: string;
    publisher?: string;
    poster?: string;
    posterUrl?: string;
    boxFront?: string;
    box3d?: string | null;
    box3dUrl?: string | null;
    cartridge?: string | null;
    cartridgeUrl?: string | null;
  }
): LaunchBox3DAssets {
  const normTitle = normalizeLaunchBoxTitle(item.title).toLowerCase();
  const consoleType = item.consoleType || 'NES';
  const cacheKey = `${consoleType}:${normTitle}`;

  if (assetCache.has(cacheKey)) {
    return assetCache.get(cacheKey)!;
  }

  // Check curated mapping
  if (KNOWN_LAUNCHBOX_GAMES[normTitle]) {
    const known = KNOWN_LAUNCHBOX_GAMES[normTitle];
    const candidateUrls = buildLaunchBoxCandidateUrls(consoleType, item.title);
    const resolved: LaunchBox3DAssets = {
      box3dUrl: known.box3dUrl || candidateUrls.box3dCandidates[0],
      cartridge3DUrl: known.cartridge3DUrl || candidateUrls.cartridgeCandidates[0],
      cartridgeFrontUrl: known.cartridgeFrontUrl || generateProceduralCartridgeLabel(item.title, item.publisher),
      boxFrontUrl: known.boxFrontUrl || item.poster || item.posterUrl || candidateUrls.box3dCandidates[3],
      boxBackUrl: known.boxBackUrl,
      boxSpineUrl: known.boxSpineUrl,
      cartridgeBackUrl: known.cartridgeBackUrl,
      launchboxId: known.launchboxId,
      launchboxUrl: known.launchboxUrl,
      source: 'launchbox-gamesdb'
    };
    assetCache.set(cacheKey, resolved);
    return resolved;
  }

  const { box3dCandidates, cartridgeCandidates, spineCandidates, backCandidates } = buildLaunchBoxCandidateUrls(consoleType, item.title);

  const explicitBox3D = item.box3dUrl || item.box3d;
  const explicitCartridge = item.cartridgeUrl || item.cartridge;
  const poster = item.poster || item.posterUrl || item.boxFront || '';
  const proceduralLabel = generateProceduralCartridgeLabel(item.title, item.publisher);

  const result: LaunchBox3DAssets = {
    box3dUrl: explicitBox3D && explicitBox3D.startsWith('http') ? explicitBox3D : box3dCandidates[0],
    cartridge3DUrl: explicitCartridge && explicitCartridge.startsWith('http') ? explicitCartridge : cartridgeCandidates[0],
    cartridgeFrontUrl: explicitCartridge || proceduralLabel,
    boxFrontUrl: poster || box3dCandidates[3],
    boxBackUrl: (item as any).boxBackUrl || backCandidates[0],
    boxSpineUrl: (item as any).boxSpineUrl || spineCandidates[0],
    cartridgeBackUrl: (item as any).cartridgeBackUrl,
    source: explicitBox3D ? 'launchbox-gamesdb' : 'cdn-mirror',
  };

  assetCache.set(cacheKey, result);
  return result;
}

/**
 * Enriches a game item with LaunchBox 3D box art and 3D cartridge assets
 * Used during the manifest initialization process.
 */
export function enrichGameWithLaunchBox3D<T extends GameItem | ManifestGameItem>(item: T): T {
  const assets = getLaunchBox3DAssetsSync(item);

  return {
    ...item,
    box3d: item.box3d || assets.box3dUrl,
    box3dUrl: item.box3dUrl || assets.box3dUrl,
    cartridge: item.cartridge || assets.cartridgeFrontUrl,
    cartridgeUrl: item.cartridgeUrl || assets.cartridge3DUrl,
    cartridge3DUrl: (item as any).cartridge3DUrl || assets.cartridge3DUrl,
    cartridgeFrontUrl: (item as any).cartridgeFrontUrl || assets.cartridgeFrontUrl,
    boxFrontUrl: (item as any).boxFrontUrl || assets.boxFrontUrl,
    boxBackUrl: (item as any).boxBackUrl || assets.boxBackUrl,
    boxSpineUrl: (item as any).boxSpineUrl || assets.boxSpineUrl,
    cartridgeBackUrl: (item as any).cartridgeBackUrl || assets.cartridgeBackUrl,
    launchboxId: (item as any).launchboxId || assets.launchboxId,
    launchboxUrl: (item as any).launchboxUrl || assets.launchboxUrl,
    launchboxAssetSource: (item as any).launchboxAssetSource || assets.source,
  };
}

/**
 * Batch enrichment function for manifest initialization
 */
export function enrichManifestBatch<T extends GameItem | ManifestGameItem>(items: T[]): T[] {
  return items.map(item => enrichGameWithLaunchBox3D(item));
}

/**
 * Asynchronously fetch live LaunchBox 3D assets for a single game and update it
 */
export async function enrichGameWithLaunchBoxApi<T extends GameItem | ManifestGameItem>(
  item: T,
  onUpdated?: (updated: T) => void
): Promise<T> {
  const liveAssets = await fetchLaunchBox3DAssetsFromApi(item.title, item.consoleType || 'NES');
  if (!liveAssets) return item;

  const updated: T = {
    ...item,
    box3d: liveAssets.box3dUrl,
    box3dUrl: liveAssets.box3dUrl,
    cartridge: liveAssets.cartridgeFrontUrl,
    cartridgeUrl: liveAssets.cartridge3DUrl,
    cartridge3DUrl: liveAssets.cartridge3DUrl,
    cartridgeFrontUrl: liveAssets.cartridgeFrontUrl,
    boxFrontUrl: liveAssets.boxFrontUrl,
    boxBackUrl: liveAssets.boxBackUrl,
    boxSpineUrl: liveAssets.boxSpineUrl,
    cartridgeBackUrl: liveAssets.cartridgeBackUrl,
    launchboxId: liveAssets.launchboxId,
    launchboxUrl: liveAssets.launchboxUrl,
    launchboxAssetSource: liveAssets.source,
  };

  if (onUpdated) {
    onUpdated(updated);
  }

  return updated;
}

/**
 * Manifest Initialization Fetcher
 * Progressively queries LaunchBox GamesDB API for active games in manifest chunks
 */
export function enrichManifestWithLaunchBoxApi<T extends GameItem>(
  games: T[],
  onGameUpdated: (updatedGame: T) => void,
  limit: number = 30
): void {
  // Take first batch (prioritize NES titles and popular items)
  const candidates = games
    .filter(g => g.consoleType === 'NES' || !g.box3dUrl || g.box3dUrl.includes('raw.githubusercontent.com'))
    .slice(0, limit);

  let index = 0;
  const processNext = async () => {
    if (index >= candidates.length) return;
    const game = candidates[index++];
    try {
      const enriched = await enrichGameWithLaunchBoxApi(game);
      if (enriched.launchboxId) {
        onGameUpdated(enriched);
      }
    } catch (e) {}

    // Stagger requests politely
    setTimeout(processNext, 250);
  };

  // Launch initial pipeline
  processNext();
}
