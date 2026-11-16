import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getTextureSafeUrl, fetchLaunchBox3DAssetsFromApi } from '../launchboxApi';
import { resolveSteamGridImage } from '../steamgridApi';

interface SafeGameImageProps {
  primaryUrl?: string | null;
  fallbackUrl?: string | null;
  alt: string;
  className?: string;
  crossOrigin?: 'anonymous' | 'use-credentials' | '' | undefined;
  title?: string;
  consoleType?: string;
}

/**
 * Generates an array of format candidates across standard image extensions:
 * Original -> WebP -> PNG -> JPG -> JPEG -> AVIF
 * Cloned from the 3D LaunchBox Box3DEngine protocol.
 */
export function buildImageFormatFallbackChain(rawUrl?: string | null): string[] {
  if (!rawUrl || typeof rawUrl !== 'string') return [];
  const trimmed = rawUrl.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return [trimmed];

  const qIndex = trimmed.indexOf('?');
  const cleaned = qIndex >= 0 ? trimmed.slice(0, qIndex) : trimmed;
  const query = qIndex >= 0 ? trimmed.slice(qIndex) : '';

  const match = cleaned.match(/^(.*)\.(png|jpg|jpeg|webp|avif)$/i);
  if (!match) {
    return [trimmed];
  }

  const basePath = match[1];
  const origExt = match[2].toLowerCase();
  const formatOrder = ['webp', 'png', 'jpg', 'jpeg', 'avif'];
  const candidates = [trimmed];

  for (const ext of formatOrder) {
    if (ext !== origExt) {
      candidates.push(`${basePath}.${ext}${query}`);
    }
  }

  return candidates;
}

function appendProxiedVariants(url: string, target: string[], includeFormatFallbacks: boolean) {
  if (!url) return;

  const isLocalOrData =
    url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/');

  // Libretro & 3-D-Box-Art GitHub repos strictly store .png files; skip redundant extension guesses
  const isStrictPngRepo =
    url.includes('raw.githubusercontent.com/libretro-thumbnails/') ||
    url.includes('raw.githubusercontent.com/Justme488/3-D-Box-Art/');

  const formats =
    includeFormatFallbacks && !isStrictPngRepo
      ? buildImageFormatFallbackChain(url)
      : [url];

  for (const candidate of formats) {
    if (!target.includes(candidate)) {
      target.push(candidate);
    }
    if (!isLocalOrData) {
      const proxied = getTextureSafeUrl(candidate);
      if (proxied && !target.includes(proxied)) {
        target.push(proxied);
      }
    }
  }
}

// Procedural SVG PS1 Cover Generator
export function createPs1ProceduralCover(gameTitle: string): string {
  const displayTitle = (gameTitle || 'PLAYSTATION CLASSIC').toUpperCase();
  const truncatedTitle =
    displayTitle.length > 24 ? displayTitle.substring(0, 22) + '...' : displayTitle;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
    <defs>
      <linearGradient id="ps1Bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#141520"/>
        <stop offset="100%" stop-color="#08080f"/>
      </linearGradient>
      <linearGradient id="ps1Spine" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#000000"/>
        <stop offset="100%" stop-color="#181926"/>
      </linearGradient>
    </defs>
    <rect width="400" height="400" fill="url(#ps1Bg)" rx="8"/>
    <rect x="0" y="0" width="60" height="400" fill="url(#ps1Spine)"/>
    <line x1="60" y1="0" x2="60" y2="400" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
    <text x="30" y="240" fill="#ffffff" font-family="'Arial Black', sans-serif" font-size="16" font-weight="900" text-anchor="middle" letter-spacing="3" transform="rotate(-90, 30, 240)">PlayStation</text>
    <circle cx="30" cy="50" r="16" fill="#003791"/>
    <text x="30" y="56" fill="#ffffff" font-family="'Arial Black', sans-serif" font-size="14" font-weight="900" text-anchor="middle">PS</text>
    <rect x="80" y="40" width="295" height="320" rx="8" fill="#0d0e17" stroke="#25273a" stroke-width="2"/>
    <text x="227" y="180" fill="#ffffff" font-family="'Arial Black', sans-serif" font-size="18" font-weight="900" text-anchor="middle">${truncatedTitle}</text>
    <text x="227" y="215" fill="#0070d1" font-family="monospace" font-size="11" font-weight="700" text-anchor="middle" letter-spacing="2">ORIGINAL SONY CD-ROM</text>
    <rect x="180" y="270" width="95" height="30" rx="4" fill="#000000" stroke="#0070d1" stroke-width="1.5"/>
    <text x="227" y="290" fill="#ffffff" font-family="monospace" font-size="9" font-weight="700" text-anchor="middle">PAL / NTSC-U</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Procedural SVG NES Cover Generator
export function createNesProceduralCover(gameTitle: string): string {
  const displayTitle = (gameTitle || 'NES CLASSIC').toUpperCase();
  const truncatedTitle =
    displayTitle.length > 24 ? displayTitle.substring(0, 22) + '...' : displayTitle;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="100%" height="100%">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#181a24"/>
        <stop offset="60%" stop-color="#0c0d14"/>
        <stop offset="100%" stop-color="#050609"/>
      </linearGradient>
      <linearGradient id="sealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffe066"/>
        <stop offset="100%" stop-color="#b8860b"/>
      </linearGradient>
      <pattern id="pixelGrid" width="16" height="16" patternUnits="userSpaceOnUse">
        <rect width="16" height="16" fill="none"/>
        <path d="M 16 0 L 0 0 0 16" fill="none" stroke="rgba(255, 255, 255, 0.04)" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="400" height="533" rx="12" fill="url(#bgGrad)"/>
    <rect width="400" height="533" rx="12" fill="url(#pixelGrid)"/>
    <rect x="6" y="6" width="388" height="521" rx="8" fill="none" stroke="#252738" stroke-width="2"/>
    <path d="M 6 18 Q 6 6 18 6 L 382 6 Q 394 6 394 18 L 394 48 L 6 48 Z" fill="#e60012"/>
    <text x="200" y="32" fill="#ffffff" font-family="'Arial Black', sans-serif" font-size="14" font-weight="900" text-anchor="middle" letter-spacing="1">NINTENDO ENTERTAINMENT SYSTEM</text>
    <rect x="24" y="66" width="352" height="375" rx="8" fill="#10111a" stroke="#e60012" stroke-width="3"/>
    <circle cx="200" cy="180" r="48" fill="#181a28" stroke="#363952" stroke-width="2"/>
    <path d="M 180 180 L 220 180 M 200 160 L 200 200" stroke="#e60012" stroke-width="6" stroke-linecap="round"/>
    <circle cx="225" cy="195" r="4" fill="#ffd166"/>
    <circle cx="235" cy="185" r="4" fill="#e60012"/>
    <rect x="36" y="255" width="328" height="70" rx="6" fill="#08080f" stroke="#24263a" stroke-width="1.5"/>
    <text x="200" y="295" fill="#ffffff" font-family="'Arial Black', sans-serif" font-size="17" font-weight="900" text-anchor="middle">${truncatedTitle}</text>
    <text x="200" y="314" fill="#e60012" font-family="sans-serif" font-size="11" font-weight="700" text-anchor="middle" letter-spacing="1.5">AUTHENTIC 8-BIT CLASSIC</text>
    <ellipse cx="100" cy="385" rx="42" ry="26" fill="none" stroke="url(#sealGrad)" stroke-width="2.5"/>
    <text x="100" y="382" fill="#ffd166" font-family="'Arial Black', sans-serif" font-size="8" font-weight="900" text-anchor="middle">OFFICIAL</text>
    <text x="100" y="393" fill="#ffd166" font-family="sans-serif" font-size="7" font-weight="bold" text-anchor="middle">Nintendo</text>
    <text x="100" y="401" fill="#ffe066" font-family="sans-serif" font-size="6" text-anchor="middle">SEAL OF QUALITY</text>
    <rect x="230" y="365" width="120" height="40" rx="6" fill="#161826" stroke="#2c2f45" stroke-width="1"/>
    <text x="290" y="382" fill="#4cc9f0" font-family="monospace" font-size="10" font-weight="bold" text-anchor="middle">REV-USA</text>
    <text x="290" y="396" fill="#9a9bb5" font-family="sans-serif" font-size="9" text-anchor="middle">8-BIT CARTRIDGE</text>
    <path d="M 6 490 L 394 490 L 394 521 Q 394 527 382 527 L 18 527 Q 6 527 6 521 Z" fill="#e60012"/>
    <text x="200" y="512" fill="#ffffff" font-family="'Arial Black', sans-serif" font-size="12" font-weight="900" text-anchor="middle" letter-spacing="2">ACTION SERIES</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Procedural SVG Sega Genesis Cover Generator
export function createGenesisProceduralCover(gameTitle: string): string {
  const displayTitle = (gameTitle || 'SEGA GENESIS').toUpperCase();
  const truncatedTitle =
    displayTitle.length > 24 ? displayTitle.substring(0, 22) + '...' : displayTitle;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="100%" height="100%">
    <defs>
      <linearGradient id="genBg" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#12101a"/>
        <stop offset="100%" stop-color="#06050a"/>
      </linearGradient>
      <linearGradient id="genBanner" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#a855f7"/>
        <stop offset="50%" stop-color="#7e22ce"/>
        <stop offset="100%" stop-color="#9333ea"/>
      </linearGradient>
      <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
        <rect width="20" height="20" fill="none"/>
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(168, 85, 247, 0.12)" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="400" height="533" rx="12" fill="url(#genBg)"/>
    <rect width="400" height="533" rx="12" fill="url(#gridPattern)"/>
    <rect x="6" y="6" width="388" height="521" rx="8" fill="none" stroke="#3b1754" stroke-width="2"/>
    <rect x="12" y="12" width="28" height="509" rx="4" fill="#0d0817" stroke="#7e22ce" stroke-width="1"/>
    <text x="26" y="270" fill="#a855f7" font-family="'Arial Black', sans-serif" font-size="12" font-weight="900" text-anchor="middle" letter-spacing="3" transform="rotate(-90, 26, 270)">SEGA GENESIS</text>
    <path d="M 48 18 Q 48 12 56 12 L 382 12 Q 388 12 388 18 L 388 56 L 48 56 Z" fill="url(#genBanner)"/>
    <text x="218" y="38" fill="#ffffff" font-family="'Arial Black', sans-serif" font-size="15" font-weight="900" text-anchor="middle" letter-spacing="2">SEGA GENESIS 16-BIT</text>
    <rect x="52" y="70" width="326" height="370" rx="8" fill="#090612" stroke="#a855f7" stroke-width="2.5"/>
    <rect x="64" y="220" width="302" height="80" rx="6" fill="#120924" stroke="#7e22ce" stroke-width="1.5"/>
    <text x="215" y="260" fill="#ffffff" font-family="'Arial Black', sans-serif" font-size="17" font-weight="900" text-anchor="middle">${truncatedTitle}</text>
    <text x="215" y="282" fill="#c084fc" font-family="sans-serif" font-size="10" font-weight="800" text-anchor="middle" letter-spacing="1.5">HIGH DEFINITION GRAPHICS</text>
    <rect x="52" y="452" width="326" height="60" rx="8" fill="#0e081c" stroke="#3b1754" stroke-width="1.5"/>
    <text x="215" y="478" fill="#fbbf24" font-family="'Arial Black', sans-serif" font-size="12" font-weight="900" text-anchor="middle">OFFICIAL 16-BIT CARTRIDGE</text>
    <text x="215" y="496" fill="#a855f7" font-family="monospace" font-size="10" font-weight="700" text-anchor="middle">PAL / NTSC-U • MEGADRIVE</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Universal fallback image (high quality data URI / SVG)
const universalFallbackImage =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="100%" height="100%">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e1b4b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="400" height="533" fill="url(#bg)"/>
  <rect x="20" y="20" width="360" height="493" rx="12" fill="none" stroke="#4c1d95" stroke-width="3"/>
  <circle cx="200" cy="220" r="50" fill="#7c3aed" opacity="0.3"/>
  <path d="M 170 220 L 230 220 M 200 190 L 200 250" stroke="#a78bfa" stroke-width="8" stroke-linecap="round"/>
  <text x="200" y="320" fill="#ffffff" font-family="system-ui, sans-serif" font-size="18" font-weight="900" text-anchor="middle">RETRO ARCADE</text>
  <text x="200" y="350" fill="#c4b5fd" font-family="system-ui, sans-serif" font-size="12" font-weight="600" text-anchor="middle">UNIVERSAL GAME PORT</text>
</svg>
`);

export const SafeGameImage: React.FC<SafeGameImageProps> = ({
  primaryUrl,
  fallbackUrl,
  alt,
  className,
  crossOrigin,
  title,
  consoleType,
}) => {
  const displayTitle = title || alt || 'Retro Game';
  const cType = (consoleType || '').toUpperCase();
  const isPs1 = cType === 'PS1' || cType === 'PLAYSTATION' || cType === 'PSX';
  const isGenesis =
    cType === 'SEGA GENESIS' || cType === 'GENESIS' || cType === 'MEGA DRIVE';

  const proceduralFallback = useMemo(
    () =>
      isPs1
        ? createPs1ProceduralCover(displayTitle)
        : isGenesis
        ? createGenesisProceduralCover(displayTitle)
        : createNesProceduralCover(displayTitle),
    [isPs1, isGenesis, displayTitle]
  );

  // Stage 1: Build static candidate chain (direct + /api/proxy + format fallbacks)
  const staticCandidates = useMemo(() => {
    const chain: string[] = [];
    const primary = typeof primaryUrl === 'string' ? primaryUrl.trim() : '';
    const fallback = typeof fallbackUrl === 'string' ? fallbackUrl.trim() : '';

    if (primary) {
      appendProxiedVariants(primary, chain, false);
    }
    if (fallback && fallback !== primary) {
      appendProxiedVariants(fallback, chain, false);
    }
    if (primary) {
      appendProxiedVariants(primary, chain, true);
    }
    if (fallback && fallback !== primary) {
      appendProxiedVariants(fallback, chain, true);
    }
    return chain;
  }, [primaryUrl, fallbackUrl]);

  const [candidateIndex, setCandidateIndex] = useState<number>(0);
  const [liveCandidates, setLiveCandidates] = useState<string[]>([]);
  const [liveLookupDone, setLiveLookupDone] = useState<boolean>(false);
  const [fallbackStage, setFallbackStage] = useState<number>(0);
  const lookupGenerationRef = useRef<number>(0);
  const liveTriggeredRef = useRef<boolean>(false);

  // Combine static candidates + any live API resolved candidates
  const allCandidates = useMemo(() => {
    if (liveCandidates.length === 0) return staticCandidates;
    const merged = [...staticCandidates];
    for (const url of liveCandidates) {
      if (!merged.includes(url)) {
        merged.push(url);
      }
    }
    return merged;
  }, [staticCandidates, liveCandidates]);

  // Reset resolution state whenever item props change
  useEffect(() => {
    lookupGenerationRef.current += 1;
    liveTriggeredRef.current = false;
    setCandidateIndex(0);
    setLiveCandidates([]);
    setLiveLookupDone(false);
    setFallbackStage(0);
  }, [primaryUrl, fallbackUrl, displayTitle, consoleType]);

  const triggerLiveApiResolution = () => {
    if (liveTriggeredRef.current) return;
    liveTriggeredRef.current = true;
    const generation = lookupGenerationRef.current;

    const isWebOrFlash =
      cType.includes('WEB') ||
      cType.includes('FLASH') ||
      cType.includes('PORT') ||
      !cType;

    if (isWebOrFlash) {
      resolveSteamGridImage(displayTitle, consoleType)
        .then((assets) => {
          if (lookupGenerationRef.current !== generation) return;
          const resolved: string[] = [];
          if (assets?.poster) appendProxiedVariants(assets.poster, resolved, false);
          if (assets?.thumb) appendProxiedVariants(assets.thumb, resolved, false);
          const fresh = resolved.filter((u) => !staticCandidates.includes(u));

          if (fresh.length > 0) {
            setLiveCandidates(fresh);
          } else {
            setLiveLookupDone(true);
            setFallbackStage(1);
          }
        })
        .catch(() => {
          if (lookupGenerationRef.current !== generation) return;
          setLiveLookupDone(true);
          setFallbackStage(1);
        });
    } else {
      fetchLaunchBox3DAssetsFromApi(displayTitle, consoleType || 'NES')
        .then((assets) => {
          if (lookupGenerationRef.current !== generation) return;
          const resolved: string[] = [];
          if (assets) {
            if (assets.boxFrontUrl) appendProxiedVariants(assets.boxFrontUrl, resolved, true);
            if (assets.box3dUrl) appendProxiedVariants(assets.box3dUrl, resolved, true);
            if (assets.cartridgeFrontUrl) {
              appendProxiedVariants(assets.cartridgeFrontUrl, resolved, false);
            }
          }
          const fresh = resolved.filter((u) => !staticCandidates.includes(u));

          if (fresh.length > 0) {
            setLiveCandidates(fresh);
          } else {
            setLiveLookupDone(true);
            setFallbackStage(1);
          }
        })
        .catch(() => {
          if (lookupGenerationRef.current !== generation) return;
          setLiveLookupDone(true);
          setFallbackStage(1);
        });
    }
  };

  // If the manifest provided no static URL at all, immediately run the live API lookup
  useEffect(() => {
    if (staticCandidates.length === 0) {
      triggerLiveApiResolution();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staticCandidates, displayTitle, consoleType]);

  const currentSrc = useMemo(() => {
    if (candidateIndex < allCandidates.length) {
      return allCandidates[candidateIndex];
    }
    if (fallbackStage >= 2) {
      return universalFallbackImage;
    }
    if (fallbackStage >= 1 || liveLookupDone || staticCandidates.length === 0) {
      return proceduralFallback;
    }
    return proceduralFallback;
  }, [
    candidateIndex,
    allCandidates,
    fallbackStage,
    liveLookupDone,
    staticCandidates.length,
    proceduralFallback,
  ]);

  const handleError = () => {
    // Advance through static + live API candidates
    if (candidateIndex < allCandidates.length - 1) {
      setCandidateIndex((prev) => prev + 1);
      return;
    }

    // Reached end of static chain: trigger live SteamGridDB / LaunchBox lookup once
    if (!liveTriggeredRef.current) {
      setCandidateIndex(allCandidates.length);
      triggerLiveApiResolution();
      return;
    }

    // Already finished live API attempts: step through procedural -> universal SVG fallbacks
    if (fallbackStage === 0) {
      setCandidateIndex(allCandidates.length);
      setLiveLookupDone(true);
      setFallbackStage(1);
    } else if (fallbackStage === 1) {
      setFallbackStage(2);
    }
  };

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      crossOrigin={crossOrigin}
      onError={handleError}
      loading="lazy"
    />
  );
};

export default SafeGameImage;
