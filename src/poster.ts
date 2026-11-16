// 100% Reliable Poster Pathway & Fallback System

// SVG Retro Cartridge Assets for Guaranteed Non-Blank Fallbacks
function createCartridgeSvg(systemLabel: string, bgColor: string, accentColor: string, detailText: string, gameTitle?: string): string {
  const displayTitle = (gameTitle || systemLabel).toUpperCase();
  const truncatedTitle = displayTitle.length > 24 ? displayTitle.substring(0, 22) + '...' : displayTitle;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 420" width="100%" height="100%">
    <defs>
      <linearGradient id="g_${encodeURIComponent(systemLabel)}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgColor}" />
        <stop offset="100%" stop-color="#05060a" />
      </linearGradient>
      <linearGradient id="labelGrad_${encodeURIComponent(systemLabel)}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#141523" />
        <stop offset="100%" stop-color="#090a12" />
      </linearGradient>
    </defs>
    <!-- Cartridge Shell -->
    <rect x="20" y="20" width="280" height="380" rx="20" fill="url(#g_${encodeURIComponent(systemLabel)})" stroke="#282938" stroke-width="3"/>
    <!-- Top Grip Ridges -->
    <line x1="50" y1="45" x2="270" y2="45" stroke="#282938" stroke-width="4" stroke-linecap="round"/>
    <line x1="50" y1="58" x2="270" y2="58" stroke="#282938" stroke-width="4" stroke-linecap="round"/>
    <line x1="50" y1="71" x2="270" y2="71" stroke="#282938" stroke-width="4" stroke-linecap="round"/>
    <!-- Label Recess -->
    <rect x="40" y="95" width="240" height="270" rx="12" fill="url(#labelGrad_${encodeURIComponent(systemLabel)})" stroke="${accentColor}" stroke-width="2" stroke-opacity="0.5"/>
    <!-- System Badge -->
    <rect x="55" y="115" width="210" height="34" rx="8" fill="${accentColor}" fill-opacity="0.15" stroke="${accentColor}" stroke-width="1.5"/>
    <text x="160" y="137" fill="${accentColor}" font-family="Inter, sans-serif" font-size="12" font-weight="900" text-anchor="middle" letter-spacing="1.5">${systemLabel.toUpperCase()}</text>
    <!-- Center Game Title Label -->
    <rect x="55" y="165" width="210" height="110" rx="8" fill="#0d0e18" stroke="#232434" stroke-width="1"/>
    <text x="160" y="210" fill="#ffffff" font-family="Inter, sans-serif" font-size="14" font-weight="800" text-anchor="middle">${truncatedTitle}</text>
    <text x="160" y="240" fill="${accentColor}" font-family="Inter, sans-serif" font-size="10" font-weight="700" text-anchor="middle" letter-spacing="1">AUTHENTIC EDITION</text>
    <!-- Micro Text / Seal -->
    <text x="160" y="310" fill="#9a9aaa" font-family="Inter, sans-serif" font-size="11" font-weight="700" text-anchor="middle" letter-spacing="1">WEBPLAY VERIFIED</text>
    <text x="160" y="330" fill="#6b6c80" font-family="Inter, sans-serif" font-size="10" text-anchor="middle">${detailText}</text>
    <!-- Cartridge Pins Indicator -->
    <rect x="60" y="385" width="200" height="15" rx="3" fill="#1b1d2e"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Fallback image maps keyed by console type
export function getConsoleFallbackPoster(consoleType: string, title?: string): string {
  if (consoleType === 'NES') return createCartridgeSvg('NES', '#1f2030', '#e63946', '8-Bit Cartridge', title);
  if (consoleType === 'SNES') return createCartridgeSvg('SNES', '#252033', '#8b2ed8', '16-Bit Super Cartridge', title);
  if (consoleType === 'GBA') return createCartridgeSvg('Game Boy Advance', '#121e36', '#4cc9f0', '32-Bit Handheld Core', title);
  if (consoleType === 'Flash') return createCartridgeSvg('Flash Vault', '#2d142c', '#f72585', 'Vector SWF Preservation', title);
  if (consoleType === 'Sega Genesis') return createCartridgeSvg('Sega Genesis', '#1a1a24', '#ffd166', '16-Bit Mega Drive', title);
  if (consoleType === 'Nintendo DS') return createCartridgeSvg('Nintendo DS', '#182428', '#61e0bb', 'Dual-Screen Touch Card', title);
  if (consoleType === 'N64') return createCartridgeSvg('Nintendo 64', '#16192b', '#ef476f', '64-Bit Reality Cartridge', title);
  if (consoleType === 'PS1') return createCartridgeSvg('PlayStation', '#1a1829', '#06d6a0', '32-Bit CD-ROM Disc', title);
  if (consoleType === 'WebPort' || consoleType === 'Web Port') return createCartridgeSvg('Web Port', '#0f2027', '#00d2ff', 'WebAssembly Stream Engine', title);
  return createCartridgeSvg(consoleType || 'Retro Arcade', '#1b1c2b', '#8b2ed8', 'WebPlay Verified Classic', title);
}

// Direct Libretro Boxart CDN resolver
export function getLibretroBoxart(consoleType: string, title: string): string {
  const cleanTitle = title
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/[:\/\\*?"<>|]/g, '_')
    .trim();

  let folder = '';
  if (consoleType === 'NES') {
    folder = 'Nintendo_-_Nintendo_Entertainment_System';
  } else if (consoleType === 'SNES') {
    folder = 'Nintendo_-_Super_Nintendo_Entertainment_System';
  } else if (consoleType === 'GBA') {
    folder = 'Nintendo_-_Game_Boy_Advance';
  } else if (consoleType === 'Sega Genesis') {
    folder = 'Sega_-_Mega_Drive_-_Genesis';
  } else if (consoleType === 'Nintendo DS') {
    folder = 'Nintendo_-_Nintendo_DS';
  } else if (consoleType === 'N64') {
    folder = 'Nintendo_-_Nintendo_64';
  } else if (consoleType === 'PS1') {
    folder = 'Sony_-_PlayStation';
  }

  if (!folder) return '';

  return `https://raw.githubusercontent.com/libretro-thumbnails/${folder}/master/Named_Boxarts/${encodeURIComponent(cleanTitle)}%20(USA).png`;
}

// Main image URL selector with strict fallback guard
export function getSafePosterUrl(posterUrl: string | undefined, consoleType: string, title: string): string {
  if (posterUrl && posterUrl.startsWith('http') && !posterUrl.includes('api.rawg.io') && !posterUrl.includes('images.igdb.com/igdb/image/upload/t_cover_big/')) {
    return posterUrl;
  }
  const libretro = getLibretroBoxart(consoleType, title);
  if (libretro) return libretro;
  return getConsoleFallbackPoster(consoleType, title);
}

// Event handler for img onError to ensure NO IMAGE EVER LOADS BLANK
export function handlePosterError(e: React.SyntheticEvent<HTMLImageElement>, consoleType: string, title?: string) {
  const target = e.currentTarget;
  const fallback = getConsoleFallbackPoster(consoleType, title);
  if (target.src !== fallback) {
    target.src = fallback;
  }
}
