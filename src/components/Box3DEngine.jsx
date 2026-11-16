import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Rotate3d, 
  Play, 
  Pause, 
  Layers, 
  Box as BoxIcon, 
  Disc, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Moon,
  Sun,
  ShieldAlert,
  Gamepad2
} from 'lucide-react';
import { getTextureSafeUrl } from '../launchboxApi';
import { 
  createPs1ProceduralCover, 
  createNesProceduralCover, 
  createGenesisProceduralCover 
} from './SafeGameImage';

/**
 * Generates an array of format candidates across all standard image extensions:
 * WebP -> PNG -> JPG -> JPEG -> AVIF
 */
export function buildImageFormatFallbackChain(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return [];
  if (rawUrl.startsWith('data:')) return [rawUrl];

  const cleaned = rawUrl.split('?')[0];
  const query = rawUrl.includes('?') ? '?' + rawUrl.split('?')[1] : '';

  // Extract base path without extension
  const match = cleaned.match(/^(.*)\.(png|jpg|jpeg|webp|avif)$/i);
  if (!match) {
    return [rawUrl];
  }

  const basePath = match[1];
  const origExt = match[2].toLowerCase();

  // Preferred order: WebP -> PNG -> JPG -> JPEG -> AVIF
  const formatOrder = ['webp', 'png', 'jpg', 'jpeg', 'avif'];
  const candidates = [rawUrl];

  for (const ext of formatOrder) {
    if (ext !== origExt) {
      candidates.push(`${basePath}.${ext}${query}`);
    }
  }

  return candidates;
}

/**
 * Universal Box Art image component with format fallback chain
 * If all remote formats fail, renders an authentic procedural styled card
 */
export const UniversalBoxArt = ({ 
  src, 
  alt, 
  title = 'Retro Classic', 
  consoleType = 'NES', 
  className = '', 
  isJewelCase = false,
  year = 1995,
  publisher = 'Nintendo'
}) => {
  const formatChain = useMemo(() => buildImageFormatFallbackChain(src), [src]);
  const [formatIndex, setFormatIndex] = useState(0);
  const [hasFailedAll, setHasFailedAll] = useState(false);

  useEffect(() => {
    setFormatIndex(0);
    setHasFailedAll(false);
  }, [src]);

  const handleFormatError = () => {
    if (formatIndex < formatChain.length - 1) {
      setFormatIndex(prev => prev + 1);
    } else {
      setHasFailedAll(true);
    }
  };

  if (hasFailedAll || formatChain.length === 0) {
    const cUpper = (consoleType || '').toUpperCase();
    if (cUpper.includes('PS1') || cUpper.includes('PLAYSTATION')) {
      return (
        <img 
          src={createPs1ProceduralCover(title)} 
          alt={alt} 
          className={`w-full h-full object-cover block ${className}`} 
        />
      );
    }
    if (cUpper.includes('GENESIS') || cUpper.includes('MEGA DRIVE')) {
      return (
        <img 
          src={createGenesisProceduralCover(title)} 
          alt={alt} 
          className={`w-full h-full object-cover block ${className}`} 
        />
      );
    }
    // High-Fidelity universal fallback card
    return (
      <div className={`w-full h-full p-4 flex flex-col justify-between bg-gradient-to-br from-[#181a28] via-[#0e101a] to-[#080910] text-white border border-purple-500/30 ${className}`}>
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-purple-900/60 text-purple-300 border border-purple-500/40">
            {consoleType}
          </span>
          <span className="text-[9px] font-mono text-amber-400">★ 9.8</span>
        </div>

        <div className="my-auto py-3 text-center">
          <Gamepad2 className="w-8 h-8 mx-auto text-purple-400/80 mb-2" />
          <h3 className="text-xs sm:text-sm font-black tracking-wide leading-snug line-clamp-2">
            {title}
          </h3>
          <p className="text-[9px] text-neutral-400 mt-1 uppercase font-mono tracking-wider">
            Verified Classic
          </p>
        </div>

        <div className="border-t border-white/10 pt-2 flex items-center justify-between text-[8px] text-neutral-400 font-mono">
          <span>{publisher}</span>
          <span>{year}</span>
        </div>
      </div>
    );
  }

  const currentUrl = formatChain[formatIndex];

  return (
    <img
      src={getTextureSafeUrl(currentUrl)}
      alt={alt}
      className={`w-full h-full object-cover block ${className}`}
      onError={handleFormatError}
      loading="lazy"
    />
  );
};

/**
 * LaunchBox 3D Box Engine (Dark Studio Theme)
 * Pure CSS 3D prism with perspective: 1200px, obsidian background, overhead spotlight,
 * reflective floor gradient, dynamic cursor tilt micro-interaction, and universal format fallbacks.
 */
export const Box3DEngine = ({
  title = 'Retro Classic',
  posterUrl,
  box3dUrl,
  cartridgeUrl,
  cartridge3DUrl,
  cartridgeFrontUrl,
  boxFrontUrl,
  boxBackUrl,
  boxSpineUrl,
  cartridgeBackUrl,
  launchboxId,
  launchboxUrl,
  publisher = 'Nintendo',
  developer,
  year = 1995,
  genre = 'Action',
  synopsis,
  consoleType = 'NES',
  initialMode = 'duo',
  isCompact = false,
  className = ''
}) => {
  const consoleUpper = (consoleType || '').toUpperCase();
  
  // Physical console geometry categorization
  const isJewelCase = consoleUpper.includes('PS1') || 
                      consoleUpper.includes('PLAYSTATION 1') || 
                      consoleUpper.includes('SATURN') || 
                      consoleUpper.includes('SEGA CD');

  const isPsp = consoleUpper.includes('PSP') || consoleUpper.includes('PLAYSTATION PORTABLE');
  const isDvdCase = isPsp || consoleUpper.includes('PS2') || consoleUpper.includes('GAMECUBE');

  // Exact physical geometry dimensions per LaunchBox specification
  let boxWidth = 180;
  let boxHeight = 250;
  let boxDepth = 32;

  if (isJewelCase) {
    boxWidth = 200;
    boxHeight = 200;
    boxDepth = 22;
  } else if (isDvdCase) {
    boxWidth = 170;
    boxHeight = 250;
    boxDepth = 20;
  }

  const scaleMultiplier = isCompact ? 0.88 : 1.0;
  boxWidth = Math.round(boxWidth * scaleMultiplier);
  boxHeight = Math.round(boxHeight * scaleMultiplier);
  boxDepth = Math.round(boxDepth * scaleMultiplier);

  // View state
  const [viewMode, setViewMode] = useState(initialMode);
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [isSlideOut, setIsSlideOut] = useState(initialMode === 'duo');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDarkStudio, setIsDarkStudio] = useState(true);
  const [isSpineError, setIsSpineError] = useState(false);

  // Base rotation angles (degrees)
  const [rotX, setRotX] = useState(12);
  const [rotY, setRotY] = useState(-32);

  // Dynamic hover micro-interaction tilt offsets
  const [hoverTiltX, setHoverTiltX] = useState(0);
  const [hoverTiltY, setHoverTiltY] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

  // Pointer drag interaction refs
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ vx: 0, vy: 0 });
  const animFrameRef = useRef(null);
  const stageRef = useRef(null);

  const frontCoverUrl = boxFrontUrl || posterUrl || box3dUrl || '';
  const mediaArtUrl = cartridgeFrontUrl || cartridge3DUrl || cartridgeUrl || posterUrl || '';
  const effectivePublisher = publisher || developer || (isJewelCase ? 'Sony Computer Ent.' : isDvdCase ? 'Sony Interactive' : 'Nintendo');

  // Auto-rotation turntable loop
  useEffect(() => {
    if (!isAutoRotating) return;
    let lastTime = performance.now();

    const loop = (time) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;
      setRotY((prev) => (prev + dt * 26) % 360);
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isAutoRotating]);

  // Pointer / Drag Event Handlers with pitch limits and drag inertia
  const handlePointerDown = (e) => {
    isDraggingRef.current = true;
    setIsAutoRotating(false);
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    velocityRef.current = { vx: 0, vy: 0 };
    e.target.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e) => {
    // 1. If dragging, orbit camera with limits
    if (isDraggingRef.current) {
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;

      velocityRef.current = { vx: dx * 0.45, vy: dy * 0.4 };
      setRotY((prev) => prev + dx * 0.5);
      // Pitch limit: -65deg to +65deg prevents inverted camera disorientation
      setRotX((prev) => Math.max(-65, Math.min(65, prev - dy * 0.4)));

      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // 2. Hover micro-interaction: subtle box tilt toward cursor + dynamic rim highlight
    if (stageRef.current) {
      const rect = stageRef.current.getBoundingClientRect();
      const normX = (e.clientX - rect.left) / rect.width;
      const normY = (e.clientY - rect.top) / rect.height;

      setMousePos({ x: normX, y: normY });
      // Responsive tilt (-14deg to +14deg)
      setHoverTiltY((normX - 0.5) * 22);
      setHoverTiltX(-(normY - 0.5) * 18);
    }
  };

  const handlePointerLeave = () => {
    // Ease hover tilt back to neutral
    setHoverTiltX(0);
    setHoverTiltY(0);
  };

  const handlePointerUp = (e) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    e.target.releasePointerCapture?.(e.pointerId);

    // Smooth drag inertia decay
    const decay = () => {
      if (isDraggingRef.current || isAutoRotating) return;
      const { vx, vy } = velocityRef.current;
      if (Math.abs(vx) > 0.08 || Math.abs(vy) > 0.08) {
        setRotY((prev) => prev + vx);
        setRotX((prev) => Math.max(-65, Math.min(65, prev - vy * 0.5)));
        velocityRef.current = { vx: vx * 0.92, vy: vy * 0.92 };
        requestAnimationFrame(decay);
      }
    };
    decay();
  };

  // Angle Presets
  const setPresetAngle = (preset) => {
    setIsAutoRotating(false);
    if (preset === 'front') {
      setRotX(0);
      setRotY(0);
    } else if (preset === 'iso') {
      setRotX(12);
      setRotY(-32);
    } else if (preset === 'spine') {
      setRotX(2);
      setRotY(-84);
    } else if (preset === 'back') {
      setRotX(0);
      setRotY(180);
    }
  };

  // Light reflection calculations based on rotation angle & cursor position
  const effectiveRotY = rotY + hoverTiltY;
  const effectiveRotX = rotX + hoverTiltX;
  const sheenShift = Math.sin((effectiveRotY * Math.PI) / 180) * 45;

  return (
    <div 
      className={`relative flex flex-col items-center justify-between overflow-hidden select-none transition-colors duration-500 rounded-2xl border ${className}`}
      style={{
        background: isDarkStudio 
          ? 'radial-gradient(circle at 50% 20%, #111318 0%, #090a10 55%, #000000 100%)' 
          : 'radial-gradient(circle at 50% 25%, #181a28 0%, #0d0f1a 60%, #06070c 100%)',
        borderColor: isDarkStudio ? '#1e2130' : '#2d3148'
      }}
    >
      {/* Overhead Theatrical Spotlight Beam (Radial Gradient Flare) */}
      <div 
        className="absolute top-0 inset-x-0 h-[420px] pointer-events-none transition-opacity duration-700"
        style={{
          background: isDarkStudio
            ? 'radial-gradient(ellipse 65% 55% at 50% 0%, rgba(168, 85, 247, 0.28) 0%, rgba(59, 130, 246, 0.12) 45%, transparent 75%)'
            : 'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(192, 132, 252, 0.4) 0%, rgba(99, 102, 241, 0.18) 50%, transparent 80%)',
          filter: 'blur(3px)'
        }}
      />

      {/* Top Header Badge & Controls */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 z-20 pointer-events-auto">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black tracking-wider uppercase rounded-lg bg-black/85 text-purple-300 border border-purple-500/40 shadow-lg backdrop-blur-md">
            <Rotate3d size={12} className="text-purple-400" />
            <span>{isJewelCase ? 'JEWEL CASE 3D' : isPsp ? 'PSP DVD 3D' : 'CARTRIDGE BOX 3D'}</span>
          </span>

          {isPsp && (
            <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-amber-950/80 text-amber-300 border border-amber-500/50">
              Coming Soon
            </span>
          )}

          {launchboxId && (
            <a
              href={launchboxUrl || `https://gamesdb.launchbox-app.com/games/details/${launchboxId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1 px-2 py-1 text-[10px] font-mono font-bold uppercase rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900/90 transition-colors shadow-lg"
              title="Official LaunchBox Sourced Asset"
            >
              <CheckCircle2 size={11} className="text-emerald-400" />
              <span>LaunchBox #{launchboxId}</span>
              <ExternalLink size={10} className="opacity-70" />
            </a>
          )}
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center p-0.5 rounded-lg bg-black/85 border border-white/10 shadow-lg text-[11px] backdrop-blur-md">
          <button
            onClick={() => { setViewMode('box'); setIsSlideOut(false); }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
              viewMode === 'box'
                ? 'bg-purple-600 text-white shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <BoxIcon size={12} />
            <span>3D Box</span>
          </button>
          <button
            onClick={() => { setViewMode('cartridge'); setIsSlideOut(false); }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
              viewMode === 'cartridge'
                ? 'bg-purple-600 text-white shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Disc size={12} />
            <span>{isJewelCase ? 'CD-ROM' : isPsp ? 'UMD Disc' : 'Game Pak'}</span>
          </button>
          <button
            onClick={() => { setViewMode('duo'); setIsSlideOut(true); }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
              viewMode === 'duo'
                ? 'bg-purple-600 text-white shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Layers size={12} />
            <span>Combo</span>
          </button>

          {/* Studio Lighting Toggle */}
          <button
            onClick={() => setIsDarkStudio(!isDarkStudio)}
            className="p-1 rounded-md text-neutral-400 hover:text-white transition-colors cursor-pointer ml-1 border-l border-white/10 pl-1.5"
            title={isDarkStudio ? 'Dark Studio Lighting Active' : 'Switch Studio Lighting'}
          >
            {isDarkStudio ? <Moon size={11} className="text-purple-300" /> : <Sun size={11} className="text-amber-300" />}
          </button>
        </div>
      </div>

      {/* 3D Viewport Stage */}
      <div 
        ref={stageRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-full flex-1 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none py-12 relative"
        style={{ perspective: `${1200 / zoomLevel}px` }}
        title="Drag in 360° to rotate 3D box or hover to catch specular rim reflections"
      >
        {/* Reflective Stage Floor Gradient beneath the 3D model */}
        <div 
          className="absolute bottom-6 inset-x-8 h-24 pointer-events-none rounded-full transition-all duration-300"
          style={{
            background: 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(147, 51, 234, 0.15) 0%, rgba(30, 27, 75, 0.3) 40%, transparent 80%)',
            transform: 'rotateX(80deg) scale(1.4)',
            filter: 'blur(10px)'
          }}
        />

        {/* Master 3D Transform Object with hover micro-interaction tilt */}
        <div
          className="relative transition-transform duration-75 ease-out"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(${effectiveRotX}deg) rotateY(${effectiveRotY}deg) scale(${zoomLevel})`,
          }}
        >
          {/* Ground Contact Soft Drop Shadow beneath the box */}
          <div
            className="absolute rounded-full pointer-events-none transition-all duration-100"
            style={{
              width: `${boxWidth * 1.35}px`,
              height: `${boxDepth * 2.4}px`,
              left: `${-boxWidth * 0.17}px`,
              top: `${boxHeight + 12}px`,
              background: 'radial-gradient(ellipse at center, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.55) 45%, transparent 75%)',
              filter: 'blur(7px)',
              transform: `rotateX(90deg) translateZ(-${boxHeight / 2}px)`,
            }}
          />

          {/* ============================================================== */}
          {/* 6-SIDED CSS 3D PRISM BOX MODEL                                  */}
          {/* ============================================================== */}
          {(viewMode === 'box' || viewMode === 'duo') && (
            <div
              className="relative transition-all duration-300"
              style={{
                width: `${boxWidth}px`,
                height: `${boxHeight}px`,
                transformStyle: 'preserve-3d',
                transform: viewMode === 'duo' ? `translateX(-${isJewelCase ? 40 : 35}px)` : 'none',
              }}
            >
              {/* FACE 1: FRONT */}
              <div
                className={`absolute inset-0 rounded-sm overflow-hidden shadow-2xl border ${
                  isJewelCase 
                    ? 'border-white/25 bg-[#0a0b12]' 
                    : 'border-white/10 bg-[#12131e]'
                }`}
                style={{
                  transformStyle: 'preserve-3d',
                  transform: `translateZ(${boxDepth / 2}px)`,
                  backfaceVisibility: 'hidden',
                }}
              >
                {/* Front Cover Artwork with Universal Format Fallback Chain */}
                <UniversalBoxArt
                  src={frontCoverUrl}
                  alt={`${title} Front Cover`}
                  title={title}
                  consoleType={consoleType}
                  isJewelCase={isJewelCase}
                  year={year}
                  publisher={effectivePublisher}
                />

                {/* PS1 Front Case Left Clear Hinge Ridge Strip */}
                {isJewelCase && (
                  <div className="absolute top-0 left-0 bottom-0 w-6 bg-gradient-to-r from-black/80 via-white/10 to-transparent border-r border-white/20 pointer-events-none flex flex-col justify-around py-4">
                    <div className="w-full h-0.5 bg-white/30" />
                    <div className="w-full h-0.5 bg-white/30" />
                    <div className="w-full h-0.5 bg-white/30" />
                  </div>
                )}

                {/* Dynamic Specular Rim Light & Face Sheen responding to cursor tilt */}
                <div
                  className="absolute inset-0 pointer-events-none transition-opacity duration-150"
                  style={{
                    background: `linear-gradient(${120 + sheenShift * 0.4}deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.08) 30%, transparent 55%, rgba(255, 255, 255, 0.22) 85%, transparent 100%)`,
                    mixBlendMode: 'overlay',
                  }}
                />

                {/* Rim Highlight Bevel */}
                <div className="absolute inset-0 rounded-sm pointer-events-none ring-1 ring-inset ring-white/20" />
              </div>

              {/* FACE 2: BACK */}
              <div
                className="absolute inset-0 rounded-sm overflow-hidden bg-[#0c0d16] border border-white/10"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: `rotateY(180deg) translateZ(${boxDepth / 2}px)`,
                  backfaceVisibility: 'hidden',
                }}
              >
                {boxBackUrl ? (
                  <UniversalBoxArt
                    src={boxBackUrl}
                    alt={`${title} Back Cover`}
                    title={title}
                    consoleType={consoleType}
                    isJewelCase={isJewelCase}
                    year={year}
                    publisher={effectivePublisher}
                  />
                ) : (
                  /* Auto-Generated Styled Back Panel */
                  <div className="w-full h-full p-4 flex flex-col justify-between text-white bg-[#0e101a]">
                    <div className="border-b border-white/15 pb-2">
                      <div className="flex items-center justify-between text-[10px] font-bold text-neutral-400">
                        <span className="font-mono">{consoleType.toUpperCase()} CLASSIC</span>
                        <span className="text-amber-400 font-mono">★ 9.8 / 10</span>
                      </div>
                      <h4 className="text-sm font-black text-white mt-1 leading-tight line-clamp-2">
                        {title}
                      </h4>
                    </div>

                    <div className="my-2 space-y-2 flex-1 flex flex-col justify-center">
                      <p className="text-[10px] text-neutral-300 leading-relaxed line-clamp-4">
                        {synopsis || `Official release of ${title} on ${consoleType}. Preserved and cataloged for high-performance WebAssembly emulation.`}
                      </p>
                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        <div className="aspect-video bg-[#181a29] rounded border border-white/10 flex items-center justify-center text-[8px] font-mono text-neutral-400">
                          STAGE 01
                        </div>
                        <div className="aspect-video bg-[#181a29] rounded border border-white/10 flex items-center justify-center text-[8px] font-mono text-neutral-400">
                          HARDWARE WASM
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-white/15 pt-2 flex items-center justify-between text-[8px] text-neutral-400 font-mono">
                      <div>
                        <span>PUB: {effectivePublisher}</span><br />
                        <span>YEAR: {year}</span>
                      </div>
                      <div className="p-1 bg-white text-black rounded font-mono text-[7px] font-bold tracking-widest text-center">
                        |||||||||||||||<br />
                        {isJewelCase ? 'SLUS-00921' : 'NES-USA-01'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* FACE 3: LEFT SPINE (With Dynamic Spine Synthesizer Fallback) */}
              <div
                className="absolute top-0 bottom-0 overflow-hidden"
                style={{
                  width: `${boxDepth}px`,
                  left: `${-boxDepth / 2}px`,
                  transform: `rotateY(-90deg)`,
                  transformOrigin: 'center center',
                  backfaceVisibility: 'hidden',
                }}
              >
                {boxSpineUrl && !isSpineError ? (
                  <img
                    src={getTextureSafeUrl(boxSpineUrl)}
                    alt={`${title} Spine`}
                    className="w-full h-full object-cover block"
                    onError={() => setIsSpineError(true)}
                  />
                ) : (
                  /* Dynamic Spine Synthesizer: Vertical console badge, title text & bottom branding */
                  <div className={`w-full h-full flex flex-col items-center justify-between py-3 border-x border-white/15 shadow-inner ${
                    isJewelCase 
                      ? 'bg-gradient-to-b from-black via-[#10121d] to-black text-white' 
                      : isPsp
                      ? 'bg-gradient-to-b from-[#09152b] via-[#111f3d] to-[#09152b] text-white'
                      : 'bg-gradient-to-b from-[#181926] via-[#242639] to-[#181926] text-white'
                  }`}>
                    {/* Top Console Badge */}
                    <div className="flex flex-col items-center gap-0.5">
                      <div className={`w-4 h-4 rounded-xs flex items-center justify-center font-black text-[8px] text-white shadow ${
                        isJewelCase 
                          ? 'bg-gradient-to-tr from-red-600 via-amber-500 to-blue-600' 
                          : isPsp
                          ? 'bg-blue-600'
                          : 'bg-red-600'
                      }`}>
                        {isJewelCase ? 'PS' : isPsp ? 'P' : 'N'}
                      </div>
                      <span className="text-[6px] font-mono font-bold text-neutral-300 uppercase tracking-tighter">
                        {isJewelCase ? 'CD' : isPsp ? 'PSP' : consoleType.slice(0, 4)}
                      </span>
                    </div>

                    {/* Vertical Game Title Text */}
                    <div className="flex-1 flex items-center justify-center py-2 overflow-hidden">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white [writing-mode:vertical-rl] rotate-180 line-clamp-1 max-h-[185px]">
                        {title}
                      </span>
                    </div>

                    {/* Bottom Branding / Publisher Code */}
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[6px] font-mono font-bold text-neutral-400">
                        {isJewelCase ? 'SLUS' : 'REV-A'}
                      </span>
                      <div className="w-3 h-1 bg-amber-400 rounded-xs" />
                    </div>
                  </div>
                )}
              </div>

              {/* FACE 4: RIGHT EDGE */}
              <div
                className={`absolute top-0 bottom-0 overflow-hidden border-x ${
                  isJewelCase
                    ? 'border-white/20 bg-gradient-to-b from-[#1c1e30] via-white/10 to-[#1c1e30]'
                    : 'border-white/10 bg-gradient-to-b from-[#151624] via-[#0f101b] to-[#151624]'
                }`}
                style={{
                  width: `${boxDepth}px`,
                  right: `${-boxDepth / 2}px`,
                  transform: `rotateY(90deg)`,
                  transformOrigin: 'center center',
                  backfaceVisibility: 'hidden',
                }}
              >
                <div className="w-full h-full flex flex-col justify-around py-4 opacity-40">
                  <div className="w-full h-0.5 bg-white/20" />
                  <div className="w-full h-0.5 bg-white/20" />
                  <div className="w-full h-0.5 bg-white/20" />
                </div>
              </div>

              {/* FACE 5: TOP */}
              <div
                className="absolute left-0 right-0 overflow-hidden bg-gradient-to-r from-[#1c1d2c] via-[#2a2d45] to-[#1c1d2c] border-y border-white/15"
                style={{
                  height: `${boxDepth}px`,
                  top: `${-boxDepth / 2}px`,
                  transform: `rotateX(90deg)`,
                  transformOrigin: 'center center',
                  backfaceVisibility: 'hidden',
                }}
              >
                <div className="w-full h-full flex items-center justify-center px-3">
                  <span className="text-[7px] font-mono font-bold text-neutral-300 truncate">
                    {title.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* FACE 6: BOTTOM */}
              <div
                className="absolute left-0 right-0 overflow-hidden bg-[#0d0e17] border-y border-black"
                style={{
                  height: `${boxDepth}px`,
                  bottom: `${-boxDepth / 2}px`,
                  transform: `rotateX(-90deg)`,
                  transformOrigin: 'center center',
                  backfaceVisibility: 'hidden',
                }}
              />
            </div>
          )}

          {/* ============================================================== */}
          {/* COMPANION MEDIA: CARTRIDGE PAK OR CD-ROM DISC                  */}
          {/* ============================================================== */}
          {(viewMode === 'cartridge' || viewMode === 'duo') && (
            <div
              className="absolute top-0 left-0 transition-all duration-500 ease-out"
              style={{
                transformStyle: 'preserve-3d',
                transform: viewMode === 'duo' 
                  ? `translateX(${isJewelCase ? (boxWidth * 0.44) : (boxWidth * 0.46)}px) translateZ(${isSlideOut ? 28 : -14}px) rotateY(${isSlideOut ? -15 : 0}deg)`
                  : 'none',
              }}
            >
              {isJewelCase || isPsp ? (
                /* Authentic Disc Face */
                <div
                  className="rounded-full shadow-2xl relative flex items-center justify-center overflow-hidden border border-white/20"
                  style={{
                    width: `${boxHeight * 0.9}px`,
                    height: `${boxHeight * 0.9}px`,
                    background: 'radial-gradient(circle at center, #0e0f14 0%, #151620 40%, #08090d 100%)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.85), inset 0 0 15px rgba(255,255,255,0.15)',
                  }}
                >
                  <UniversalBoxArt
                    src={mediaArtUrl}
                    alt={`${title} Disc Artwork`}
                    title={title}
                    consoleType={consoleType}
                    className="rounded-full opacity-90"
                    year={year}
                    publisher={effectivePublisher}
                  />

                  <div className="absolute inset-0 flex flex-col items-center justify-between p-6 pointer-events-none text-center">
                    <span className="text-[10px] font-black text-white/90 font-mono tracking-widest uppercase truncate max-w-[140px]">
                      {title}
                    </span>
                    <span className="text-[7px] font-mono text-neutral-400">
                      {isPsp ? 'UNIVERSAL MEDIA DISC' : 'COMPACT DISC • 700MB'}
                    </span>
                  </div>

                  <div className="absolute w-14 h-14 rounded-full bg-gradient-to-tr from-black/80 to-transparent border border-white/40 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full bg-black/95 border border-white/60" />
                  </div>

                  {/* Holographic Laser Reflection */}
                  <div
                    className="absolute inset-0 pointer-events-none rounded-full"
                    style={{
                      background: `conic-gradient(from ${rotY * 2}deg at 50% 50%, rgba(255,0,0,0.15), rgba(255,255,0,0.15), rgba(0,255,0,0.15), rgba(0,255,255,0.15), rgba(0,0,255,0.15), rgba(255,0,255,0.15), rgba(255,0,0,0.15))`,
                      mixBlendMode: 'color-dodge',
                    }}
                  />
                </div>
              ) : (
                /* Authentic Game Pak Cartridge */
                <div
                  className="relative rounded-lg shadow-2xl overflow-hidden border border-white/10"
                  style={{
                    width: `${boxWidth * 0.9}px`,
                    height: `${boxHeight * 0.88}px`,
                    background: 'linear-gradient(135deg, #6c6e78 0%, #52545d 50%, #3e4049 100%)',
                    boxShadow: '0 25px 45px rgba(0,0,0,0.9)',
                  }}
                >
                  <div className="pt-2 px-3 flex flex-col gap-1 opacity-70">
                    <div className="w-full h-1 bg-black/40 rounded-full" />
                    <div className="w-full h-1 bg-black/40 rounded-full" />
                    <div className="w-full h-1 bg-black/40 rounded-full" />
                    <div className="w-full h-1 bg-black/40 rounded-full" />
                  </div>

                  <div className="mx-3 mt-2 rounded-md overflow-hidden bg-[#10111a] border border-black/60 shadow-inner aspect-[3/4]">
                    <UniversalBoxArt
                      src={mediaArtUrl}
                      alt={`${title} Cartridge Label`}
                      title={title}
                      consoleType={consoleType}
                      year={year}
                      publisher={effectivePublisher}
                    />
                  </div>

                  <div className="absolute bottom-0 inset-x-3 h-2 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 rounded-t-xs opacity-90" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dock Controls */}
      <div className="w-full px-4 py-3 bg-[#0d0e19] border-t border-[#1e2133] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mr-1 flex items-center gap-1">
            <Layers size={11} /> Angles:
          </span>
          <button
            onClick={() => setPresetAngle('front')}
            className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#181a29] hover:bg-purple-900/50 hover:text-purple-200 border border-[#2b2d45] transition-colors cursor-pointer"
          >
            Front
          </button>
          <button
            onClick={() => setPresetAngle('iso')}
            className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#181a29] hover:bg-purple-900/50 hover:text-purple-200 border border-[#2b2d45] transition-colors cursor-pointer"
          >
            3D Iso
          </button>
          <button
            onClick={() => setPresetAngle('spine')}
            className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#181a29] hover:bg-purple-900/50 hover:text-purple-200 border border-[#2b2d45] transition-colors cursor-pointer"
          >
            Spine
          </button>
          <button
            onClick={() => setPresetAngle('back')}
            className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#181a29] hover:bg-purple-900/50 hover:text-purple-200 border border-[#2b2d45] transition-colors cursor-pointer"
          >
            Back
          </button>
        </div>

        {viewMode === 'duo' && (
          <button
            onClick={() => setIsSlideOut(!isSlideOut)}
            className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-900/90 transition-colors cursor-pointer flex items-center gap-1"
          >
            <Sparkles size={11} />
            <span>{isSlideOut ? 'Insert' : 'Slide Out'}</span>
          </button>
        )}

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
              isAutoRotating
                ? 'bg-purple-600 text-white border-purple-400'
                : 'bg-[#181a29] text-neutral-300 border-[#2b2d45] hover:text-white'
            }`}
            title="360° Turntable Auto-Rotate"
          >
            {isAutoRotating ? <Pause size={12} /> : <Play size={12} fill="currentColor" />}
            <span>Spin 360°</span>
          </button>

          <div className="flex items-center gap-1 border-l border-white/10 pl-2">
            <button
              onClick={() => setZoomLevel((prev) => Math.min(prev + 0.15, 2.0))}
              className="p-1.5 rounded-md bg-[#181a29] hover:bg-[#25283d] text-neutral-300 border border-[#2b2d45] cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn size={12} />
            </button>
            <button
              onClick={() => setZoomLevel((prev) => Math.max(prev - 0.15, 0.65))}
              className="p-1.5 rounded-md bg-[#181a29] hover:bg-[#25283d] text-neutral-300 border border-[#2b2d45] cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut size={12} />
            </button>
            <button
              onClick={() => { setZoomLevel(1); setPresetAngle('iso'); }}
              className="p-1.5 rounded-md bg-[#181a29] hover:bg-[#25283d] text-neutral-300 border border-[#2b2d45] cursor-pointer"
              title="Reset Camera"
            >
              <RotateCcw size={12} />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

export const GameBox3DEngine = Box3DEngine;
export const GameBox3D = Box3DEngine;
export default Box3DEngine;
