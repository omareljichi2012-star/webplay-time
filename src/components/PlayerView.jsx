import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  Box, 
  Rotate3d, 
  Star, 
  Calendar, 
  Monitor, 
  Disc, 
  Gamepad2, 
  Info, 
  MessageSquare, 
  Send, 
  Sparkles,
  Layers,
  ExternalLink,
  X
} from 'lucide-react';
import { SafeGameImage } from './SafeGameImage';
import { GameBox3DEngine } from './GameBox3DEngine';
import { GameBox3DModal } from './GameBox3DModal';
import { AdSenseBanner } from './AdSenseBanner';
import { getGameReviews, saveUserReview } from '../reviews';


export const SHADER_PRESETS = [
  { id: 'none', label: 'None (Smooth)', ejsShader: '' },
  { id: 'crt', label: 'CRT Monitor', ejsShader: 'https://cdn.jsdelivr.net/gh/libretro/glsl-shaders@master/crt/crt-easymode.glslp' },
  { id: 'scanlines', label: 'Scanlines (240p)', ejsShader: 'https://cdn.jsdelivr.net/gh/libretro/glsl-shaders@master/misc/scanline.glslp' },
  { id: 'pixel-perfect', label: 'Pixel-Perfect (Crisp)', ejsShader: 'https://cdn.jsdelivr.net/gh/libretro/glsl-shaders@master/interpolation/sharp-bilinear.glslp' },
  { id: 'crt-curved', label: 'CRT Curved (Retro TV)', ejsShader: 'https://cdn.jsdelivr.net/gh/libretro/glsl-shaders@master/crt/crt-lottes.glslp' }
];

export const PlayerView = ({ selectedGame, item, onClose, onRestart, favorites = [], toggleFavorite }) => {
  const activeGame = selectedGame || item;

  const containerRef = useRef(null);
  const iframeRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [is3DModalOpen, setIs3DModalOpen] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Retro Shader Filter State (EJS_shaders)
  const [selectedShader, setSelectedShader] = useState(() => {
    return localStorage.getItem('retro_shader_preference') || 'none';
  });

  // Dedicated PSP WebAssembly Mode
  const isPsp = activeGame?.consoleType === 'PSP' || 
                activeGame?.consoleType === 'PlayStation Portable' ||
                (activeGame?.core && activeGame.core.toLowerCase() === 'ppsspp');
  const [usePpssppStandalone, setUsePpssppStandalone] = useState(false);

  // Dedicated GTA V Engine State
  const [gtaSource, setGtaSource] = useState(() => {
    return activeGame?.streamUrl || 'https://fiveplay.lol/';
  });

  // Dedicated NFS Underground 2 Engine State
  const [nfsSource, setNfsSource] = useState(() => {
    return activeGame?.streamUrl || 'https://nfsunderground2.site/';
  });

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [reviewHandle, setReviewHandle] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // Synchronize EJS_shaders on change
  const handleShaderChange = (e) => {
    const newShader = e.target.value;
    setSelectedShader(newShader);
    localStorage.setItem('retro_shader_preference', newShader);

    const preset = SHADER_PRESETS.find(s => s.id === newShader);
    const shaderVal = preset ? preset.ejsShader : '';

    // Direct EmulatorJS global configuration
    window.EJS_shaders = shaderVal;

    try {
      if (window.EJS_emulator && typeof window.EJS_emulator.setShader === 'function') {
        window.EJS_emulator.setShader(shaderVal);
      } else if (window.EJS_GameManager && typeof window.EJS_GameManager.setShader === 'function') {
        window.EJS_GameManager.setShader(shaderVal);
      }
    } catch (err) {}
  };

  // Reset error & load reviews when active game changes
  useEffect(() => {
    setHasError(false);
    if (activeGame?.id) {
      setReviews(getGameReviews(activeGame.id, activeGame.title, activeGame.rating));
      setReviewComment('');
    }
    const isCurrentGta = activeGame?.id === 'webport-gtav' || 
                         activeGame?.id === 'gtav-web' || 
                         activeGame?.title?.toLowerCase().includes('gta');
    if (isCurrentGta) {
      setGtaSource('https://fiveplay.lol/');
    }
    const isCurrentNfs = activeGame?.id === 'webport-nfsu2' || 
                         activeGame?.title?.toLowerCase().includes('underground 2') ||
                         activeGame?.title?.toLowerCase().includes('nfsu2');
    if (isCurrentNfs) {
      setNfsSource('https://nfsunderground2.site/');
    }
  }, [activeGame]);

  // Clean teardown handler
  const handleClose = () => {
    try {
      if (window.EJS_emulator) {
        if (window.EJS_GameManager) {
          window.EJS_GameManager.saveSaveFiles = () => Promise.resolve();
        }
        if (typeof window.EJS_emulator.stop === 'function') {
          window.EJS_emulator.stop();
        }
      }
    } catch (e) {}

    const iframe = document.querySelector('#player-iframe, iframe');
    if (iframe) {
      try {
        iframe.src = 'about:blank';
        iframe.remove();
      } catch (e) {}
    }
    
    const gameEl = document.getElementById('game');
    if (gameEl) gameEl.innerHTML = '';
    
    if (onClose) {
      onClose();
    } else {
      window.location.reload();
    }
  };

  const handleRestart = () => {
    if (onRestart) {
      onRestart();
    } else {
      window.location.reload();
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => {});
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => {});
    }
  };

  const handlePostReview = (e) => {
    e.preventDefault();
    if (!reviewComment.trim() || !activeGame) return;

    const newReview = saveUserReview({
      gameId: activeGame.id,
      handle: reviewHandle.trim() || 'RetroFan',
      rating: reviewRating,
      comment: reviewComment.trim()
    });

    setReviews(prev => [newReview, ...prev]);
    setReviewComment('');
  };

  if (!activeGame) return null;

  const isGta = Boolean(
    activeGame.id === 'webport-gtav' ||
    activeGame.id === 'gtav-web' ||
    (activeGame.title && activeGame.title.toLowerCase().includes('gta v')) ||
    (activeGame.title && activeGame.title.toLowerCase() === 'gta 5') ||
    (activeGame.slug && activeGame.slug.includes('gtav'))
  );
  const isNfs = Boolean(
    activeGame.id === 'webport-nfsu2' ||
    (activeGame.title && activeGame.title.toLowerCase().includes('underground 2')) ||
    (activeGame.title && activeGame.title.toLowerCase().includes('nfsu2')) ||
    (activeGame.slug && (activeGame.slug.includes('nfsu2') || activeGame.slug.includes('underground-2')))
  );
  const isFlash = activeGame.consoleType === 'Flash' || Boolean(activeGame.isFlash);
  const isArtBook = Boolean(activeGame.pages || (activeGame.viewUrl && !activeGame.streamUrl) || activeGame.author);
  const poster = activeGame.poster || activeGame.posterUrl || activeGame.coverUrl || activeGame.boxFront;
  const cartridge = activeGame.cartridgeUrl || activeGame.cartridge;
  const isWebPort = activeGame.consoleType === 'WebPort' || activeGame.consoleType === 'Web Port' || activeGame.isWebPort || activeGame.engine === 'web' || activeGame.engine === 'iframe' || isGta || isNfs;
  const isClassicConsole = !isWebPort && !isFlash && !isArtBook && !isPsp;

  let streamUrl = '';
  if (isArtBook || isWebPort || isFlash) {
    streamUrl = activeGame.streamUrl || activeGame.url || activeGame.viewUrl;
  }

  const isPs1 = activeGame.consoleType === 'PS1' || activeGame.consoleType === 'PlayStation' || activeGame.consoleType === 'PSX';

  return (
    <div className="w-full min-h-screen bg-[#07080e] text-[#f7f7fb] flex flex-col font-sans select-none overflow-x-hidden">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-[#0c0d16]/95 backdrop-blur-md border-b border-[#1f2030] px-6 py-3.5 flex items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-4 min-w-0">


          <button
            onClick={handleClose}
            className="p-2.5 text-neutral-300 hover:text-white bg-[#151624] hover:bg-[#202235] border border-[#27283c] rounded-xl transition-all cursor-pointer shadow-sm hover:scale-105"
            title="Return to Catalog"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-extrabold text-white tracking-wide truncate">
                {activeGame.title}
              </h1>
              <p className="text-[11px] text-neutral-400 font-medium truncate hidden sm:block">
                {activeGame.developer || activeGame.publisher} {activeGame.year ? `• ${activeGame.year}` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">


          {/* Web Port Quick Direct Tab Button */}
          {isWebPort && !isGta && streamUrl && (
            <a
              href={activeGame.url || streamUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#151624] hover:bg-[#202235] border border-[#27283c] hover:border-purple-500/50 rounded-xl text-xs font-bold text-purple-300 transition-all cursor-pointer shadow-sm hover:scale-105"
              title="Open this web port in a dedicated browser tab"
            >
              <ExternalLink size={14} className="text-purple-400 shrink-0" />
              <span className="hidden sm:inline">Direct Tab</span>
            </a>
          )}

          {/* Dedicated PPSSPP WebAssembly Indicator */}
          {isPsp && (
            <div className="flex items-center gap-1.5 bg-blue-950/80 border border-blue-600/70 rounded-xl px-3 py-1.5 shadow-sm">
              <Gamepad2 size={15} className="text-blue-400 shrink-0" />
              <span className="text-xs font-black text-blue-300">PPSSPP WebAssembly</span>
            </div>
          )}



          {/* Favorite Star Button */}
          {activeGame && typeof toggleFavorite === 'function' && (
            <button
              type="button"
              onClick={() => toggleFavorite(activeGame.id || activeGame.slug)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm ${
                favorites?.includes(activeGame.id || activeGame.slug)
                  ? 'bg-amber-500 text-black hover:bg-amber-400'
                  : 'bg-[#151624] hover:bg-[#202235] text-amber-300 border border-amber-500/40'
              }`}
              title={favorites?.includes(activeGame.id || activeGame.slug) ? "Remove from Favorites" : "Add to Favorites"}
            >
              <Star size={15} fill={favorites?.includes(activeGame.id || activeGame.slug) ? "currentColor" : "none"} />
              <span className="hidden sm:inline">
                {favorites?.includes(activeGame.id || activeGame.slug) ? "Favorited" : "Favorite"}
              </span>
            </button>
          )}

          <button
            onClick={() => setIs3DModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-purple-300 bg-purple-950/50 hover:bg-purple-900/60 border border-purple-800/60 rounded-xl transition-all cursor-pointer shadow-sm"
            title="Open 3D Box & Media Viewer"
          >
            <Rotate3d size={15} />
            <span className="hidden md:inline">3D Box Art</span>
          </button>

          <button
            onClick={handleRestart}
            className="p-2 text-neutral-300 hover:text-white bg-[#151624] hover:bg-[#202235] border border-[#27283c] rounded-xl transition-colors cursor-pointer"
            title="Restart Game"
          >
            <RotateCcw size={15} />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 text-neutral-300 hover:text-white bg-[#151624] hover:bg-[#202235] border border-[#27283c] rounded-xl transition-colors cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </header>

      {/* Primary Game Stage */}
      <section className="w-full bg-[#000] border-b border-[#1d1e2e] flex flex-col items-center justify-center relative">
        <div 
          ref={containerRef} 
          className={`relative w-full h-[540px] sm:h-[620px] md:h-[680px] max-w-[1240px] mx-auto bg-black flex items-center justify-center overflow-hidden ${
            selectedShader !== 'none' ? `shader-${selectedShader}` : ''
          }`}
        >
          {isGta ? (
            <div className="relative w-full h-full bg-black flex flex-col items-center justify-center">
              <iframe
                ref={iframeRef}
                key={gtaSource}
                id="gtav-player-frame"
                src={gtaSource}
                title="GTA V Web Port - FiveM Engine"
                className="w-full h-full border-0 block bg-black"
                onError={() => setHasError(true)}
                allow="autoplay; fullscreen; gamepad; pointer-lock; touchscreen; cross-origin-isolated; keyboard-map; screen-wake-lock"
                allowFullScreen
                credentialless={true}
              />

              {/* Floating FiveM / GTA V Status & Engine Switcher Bar */}
              <div className="absolute bottom-3 left-4 right-4 z-20 flex items-center justify-between gap-3 bg-black/92 backdrop-blur-md px-4 py-2.5 rounded-xl border border-emerald-500/40 text-xs shadow-2xl flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    GTA V Web Port
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                    <span className="hidden sm:inline">Version:</span>
                    <button
                      type="button"
                      onClick={() => setGtaSource('https://fiveplay.lol/')}
                      className={`px-3 py-1 rounded-lg cursor-pointer font-bold text-xs transition-colors ${
                        gtaSource === 'https://fiveplay.lol/'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-[#181928] hover:bg-[#23253b] text-neutral-300'
                      }`}
                      title="GTA V V1 Direct Link"
                    >
                      V1
                    </button>
                    <button
                      type="button"
                      onClick={() => setGtaSource('https://v2.fiveplay.lol/launcher.html')}
                      className={`px-3 py-1 rounded-lg cursor-pointer font-bold text-xs transition-colors ${
                        gtaSource.includes('v2.fiveplay.lol')
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-[#181928] hover:bg-[#23253b] text-neutral-300'
                      }`}
                      title="GTA V V2"
                    >
                      V2
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href="https://fiveplay.lol/"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/90 hover:bg-emerald-800 text-emerald-200 border border-emerald-500/50 rounded-lg font-bold text-xs transition-all shadow-md hover:scale-105"
                    title="Launch GTA V V1 directly in a new tab"
                  >
                    <ExternalLink size={13} />
                    <span>Open V1</span>
                  </a>
                  <a
                    href="https://v2.fiveplay.lol/launcher.html"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-950/90 hover:bg-purple-800 text-purple-200 border border-purple-500/50 rounded-lg font-bold text-xs transition-all shadow-md hover:scale-105"
                    title="Direct Fullscreen Tab for GTA V V2"
                  >
                    <ExternalLink size={13} />
                    <span>Open V2</span>
                  </a>
                </div>
              </div>
            </div>
          ) : isNfs ? (
            <div className="relative w-full h-full bg-black flex flex-col items-center justify-center">
              {hasError ? (
                <div className="text-center p-6 sm:p-8 text-white max-w-lg bg-[#0c0d18]/95 border border-cyan-500/30 rounded-2xl shadow-2xl backdrop-blur-md mx-4">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
                    <ExternalLink size={24} />
                  </div>
                  <h3 className="text-lg sm:text-xl font-black mb-1.5 text-white">
                    NFSU2 Web Port Ready
                  </h3>
                  <p className="text-neutral-300 mb-4 text-xs leading-relaxed">
                    Need for Speed Underground 2 uses high-performance WebGPU / WebAssembly with same-origin policy ({nfsSource.includes('nfsunderground2.site') ? 'V1: nfsunderground2.site' : 'V2: nfsu2.xyz'}). Browser security restricts running in an embedded frame. Launch directly in a dedicated tab:
                  </p>

                  <div className="flex items-center justify-center gap-3 flex-wrap mb-4">
                    <a
                      href="https://nfsunderground2.site/"
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer text-white shadow-lg transition-transform hover:scale-105"
                    >
                      <ExternalLink size={14} />
                      <span>Launch V1 (nfsunderground2.site)</span>
                    </a>
                    <a
                      href="https://nfsu2.xyz/"
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer text-white shadow-lg transition-transform hover:scale-105"
                    >
                      <ExternalLink size={14} />
                      <span>Launch V2 (nfsu2.xyz)</span>
                    </a>
                  </div>

                  <div className="flex items-center justify-center gap-3 pt-2 border-t border-[#1e2035]">
                    <button
                      type="button"
                      onClick={() => setHasError(false)}
                      className="px-3.5 py-1.5 bg-[#181928] hover:bg-[#23253b] border border-[#2c2e48] rounded-lg text-[11px] font-semibold text-neutral-300 cursor-pointer"
                    >
                      Retry Embedded Frame
                    </button>
                    <button 
                      type="button"
                      onClick={handleClose}
                      className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-[11px] font-semibold text-white cursor-pointer"
                    >
                      Return to Catalog
                    </button>
                  </div>
                </div>
              ) : (
                <iframe
                  ref={iframeRef}
                  key={nfsSource}
                  id="nfsu2-player-frame"
                  src={nfsSource}
                  title="Need for Speed Underground 2 Web Port"
                  className="w-full h-full border-0 block bg-black"
                  onError={() => setHasError(true)}
                  allow="autoplay; fullscreen; gamepad; pointer-lock; touchscreen; cross-origin-isolated; keyboard-map; screen-wake-lock"
                  allowFullScreen
                  credentialless={true}
                />
              )}

              {/* Floating NFSU2 Status & Engine Switcher Bar */}
              <div className="absolute bottom-3 left-4 right-4 z-20 flex items-center justify-between gap-3 bg-black/92 backdrop-blur-md px-4 py-2.5 rounded-xl border border-cyan-500/40 text-xs shadow-2xl flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                    NFSU2 Web Port
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                    <span className="hidden sm:inline">Version:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setHasError(false);
                        setNfsSource('https://nfsunderground2.site/');
                      }}
                      className={`px-3 py-1 rounded-lg cursor-pointer font-bold text-xs transition-colors ${
                        nfsSource.includes('nfsunderground2.site')
                          ? 'bg-cyan-600 text-white shadow-sm'
                          : 'bg-[#181928] hover:bg-[#23253b] text-neutral-300'
                      }`}
                      title="NFS Underground 2 V1"
                    >
                      V1
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHasError(false);
                        setNfsSource('https://nfsu2.xyz/');
                      }}
                      className={`px-3 py-1 rounded-lg cursor-pointer font-bold text-xs transition-colors ${
                        nfsSource.includes('nfsu2.xyz')
                          ? 'bg-cyan-600 text-white shadow-sm'
                          : 'bg-[#181928] hover:bg-[#23253b] text-neutral-300'
                      }`}
                      title="NFS Underground 2 V2"
                    >
                      V2
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href="https://nfsunderground2.site/"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950/90 hover:bg-cyan-800 text-cyan-200 border border-cyan-500/50 rounded-lg font-bold text-xs transition-all shadow-md hover:scale-105"
                    title="Launch NFSU2 V1 in a new tab"
                  >
                    <ExternalLink size={13} />
                    <span>Open V1</span>
                  </a>
                  <a
                    href="https://nfsu2.xyz/"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-950/90 hover:bg-blue-800 text-blue-200 border border-blue-500/50 rounded-lg font-bold text-xs transition-all shadow-md hover:scale-105"
                    title="Launch NFSU2 V2 in a new tab"
                  >
                    <ExternalLink size={13} />
                    <span>Open V2</span>
                  </a>
                </div>
              </div>
            </div>
          ) : isPsp ? (
            <div className="relative w-full h-full bg-black flex flex-col items-center justify-center">
              <iframe
                id="ppsspp-wasm-frame"
                src="https://root-hunter.github.io/ppsspp-web/"
                title="PPSSPP WebAssembly Runner"
                className="w-full h-full border-0 block bg-black"
                allow="autoplay; fullscreen; gamepad; pointer-lock; screen-wake-lock; cross-origin-isolated; keyboard-map"
                allowFullScreen
              />
              <div className="absolute bottom-3 left-4 z-20 flex items-center gap-3 bg-black/90 backdrop-blur-md px-4 py-2 rounded-xl border border-blue-500/40 text-xs shadow-2xl">
                <span className="text-blue-400 font-bold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
                  PPSSPP WebAssembly
                </span>
                {(activeGame.downloadUrl || activeGame.romUrl || activeGame.url) && (
                  <a
                    href={activeGame.downloadUrl || activeGame.romUrl || activeGame.url}
                    download
                    className="text-amber-300 hover:text-white underline text-[11px] flex items-center gap-1 font-semibold"
                    title="Download game ROM/ISO to open in PPSSPP WebAssembly"
                  >
                    <span>Download Game ISO</span>
                  </a>
                )}
                <a
                  href="https://root-hunter.github.io/ppsspp-web/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-purple-300 hover:text-white underline text-[11px] flex items-center gap-1 font-semibold"
                  title="Open PPSSPP WebAssembly in dedicated tab"
                >
                  <ExternalLink size={12} />
                  <span>Full Window</span>
                </a>
              </div>
            </div>
          ) : isClassicConsole ? (
            <div id="game" className="w-full h-full bg-black flex items-center justify-center" />
          ) : streamUrl ? (
            <div className="relative w-full h-full bg-black flex flex-col items-center justify-center">
              {hasError ? (
                <div className="text-center p-8 text-white max-w-md">
                  <h3 className="text-xl font-bold mb-2">Game Source Connection Refused</h3>
                  <p className="text-gray-400 mb-6 text-xs leading-relaxed">
                    Browser security policies may restrict loading this game within an embedded frame. Launch directly in a dedicated tab with full controller & WebAssembly support.
                  </p>
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <a
                      href={activeGame.url || streamUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-5 py-2.5 bg-emerald-600 rounded-xl hover:bg-emerald-500 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer text-white shadow-lg"
                    >
                      <ExternalLink size={14} />
                      <span>Launch in New Tab</span>
                    </a>
                    <button 
                      onClick={handleClose}
                      className="px-5 py-2.5 bg-neutral-800 rounded-xl hover:bg-neutral-700 font-bold text-xs cursor-pointer text-white"
                    >
                      Return to Catalog
                    </button>
                  </div>
                </div>
              ) : (
                <iframe
                  ref={iframeRef}
                  key={activeGame.id || 'player-frame'}
                  id="player-iframe"
                  src={streamUrl}
                  title={activeGame.title}
                  className="w-full h-full border-0 block"
                  onError={() => setHasError(true)}
                  allow="autoplay; gamepad; fullscreen; screen-wake-lock; pointer-lock; keyboard-map; picture-in-picture; encrypted-media; cross-origin-isolated"
                  credentialless={true}
                  allowFullScreen
                />
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 text-neutral-400 p-8">
              <Info size={32} className="text-amber-400" />
              <p className="text-sm font-medium">No direct stream URL configured for this title.</p>
            </div>
          )}

        </div>
      </section>

      {/* Main Content Area: Rich Metadata & 3D Box Showcase */}
      <main className="max-w-6xl mx-auto w-full px-6 py-10 space-y-10 flex-1">
        
        {/* Rich Metadata Section */}
        <section className="bg-[#0e0f18] border border-[#202235] rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* 2D Poster Thumbnail */}
            <div className="lg:col-span-3 flex flex-col items-center gap-3">
              <div className="w-full max-w-[220px] aspect-[3/4] rounded-xl overflow-hidden border border-[#2a2c42] shadow-xl bg-[#090a12]">
                <SafeGameImage 
                  primaryUrl={poster} 
                  fallbackUrl={activeGame.boxFront}
                  alt={activeGame.title} 
                  title={activeGame.title}
                  consoleType={activeGame.consoleType}
                  className="w-full h-full object-cover" 
                />
              </div>
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                Retail Box Cover
              </span>
            </div>

            {/* Center Info Details */}
            <div className="lg:col-span-5 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                    {activeGame.consoleType}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    {activeGame.year}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <Star size={10} fill="currentColor" /> {Number(activeGame.rating || 9.0).toFixed(1)} / 10
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                  {activeGame.title}
                </h2>
              </div>

              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                {activeGame.synopsis || `Official release of ${activeGame.title} on ${activeGame.consoleType}. Verified and preserved for native WebAssembly emulation.`}
              </p>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#1d1f30]">
                <div>
                  <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Developer</div>
                  <div className="text-xs font-bold text-neutral-200 truncate">{activeGame.developer || 'Unknown'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Publisher</div>
                  <div className="text-xs font-bold text-neutral-200 truncate">{activeGame.publisher || activeGame.developer || 'Retail'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Genre</div>
                  <div className="text-xs font-bold text-neutral-200 truncate">{activeGame.genre || 'Action'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Media</div>
                  <div className="text-xs font-bold text-neutral-200 truncate">{isPs1 ? 'Black CD-ROM' : 'Game Pak'}</div>
                </div>
              </div>
            </div>

            {/* LaunchBox 3D Box Engine Showcase Card */}
            <div className="lg:col-span-4 bg-[#0a0b12] border border-[#23253b] rounded-xl p-4 flex flex-col items-center">
              <div className="w-full flex items-center justify-between pb-3 border-b border-[#1c1e30] mb-3">
                <div className="flex items-center gap-1.5 text-xs font-black text-purple-300 uppercase tracking-wide">
                  <Box size={14} />
                  <span>LaunchBox 3D Engine</span>
                </div>
                <button
                  onClick={() => setIs3DModalOpen(true)}
                  className="text-[10px] font-bold text-purple-400 hover:text-purple-300 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Rotate3d size={11} />
                  <span>Fullscreen 3D</span>
                </button>
              </div>

              <div className="w-full aspect-[4/5] relative">
                <GameBox3DEngine
                  title={activeGame.title}
                  posterUrl={poster}
                  box3dUrl={activeGame.box3dUrl || activeGame.box3d}
                  cartridgeUrl={cartridge}
                  cartridge3DUrl={activeGame.cartridge3DUrl}
                  cartridgeFrontUrl={activeGame.cartridgeFrontUrl}
                  boxFrontUrl={activeGame.boxFrontUrl || activeGame.boxFront}
                  boxBackUrl={activeGame.boxBackUrl}
                  boxSpineUrl={activeGame.boxSpineUrl}
                  cartridgeBackUrl={activeGame.cartridgeBackUrl}
                  launchboxId={activeGame.launchboxId}
                  launchboxUrl={activeGame.launchboxUrl}
                  publisher={activeGame.publisher || activeGame.developer}
                  year={activeGame.year}
                  genre={activeGame.genre}
                  synopsis={activeGame.synopsis}
                  consoleType={activeGame.consoleType}
                  isCompact={true}
                  onExpand={() => setIs3DModalOpen(true)}
                  className="w-full h-full"
                />
              </div>

              <p className="text-[10px] text-neutral-500 text-center mt-2">
                Click & drag box to rotate in 3D • Eject media toggle
              </p>
            </div>

          </div>
        </section>

        {/* Google AdSense Monetization Banner */}
        <AdSenseBanner slotId="player-view-mid-banner" format="horizontal" />

        {/* Community Reviews & Ratings Section */}
        <section className="bg-[#0e0f18] border border-[#202235] rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1d1f30]">
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <MessageSquare size={18} className="text-purple-400" />
                Community Reviews & Ratings
              </h3>
              <p className="text-xs text-neutral-400">Share your gameplay experience, tips, and impressions</p>
            </div>
            <div className="flex items-center gap-2 bg-[#141524] px-4 py-2 rounded-xl border border-[#27283c]">
              <span className="text-xs text-neutral-400">Rating:</span>
              <div className="flex items-center gap-1 text-amber-400 font-bold text-sm">
                <Star size={14} fill="currentColor" />
                <span>{Number(activeGame.rating || 9.0).toFixed(1)} / 10</span>
              </div>
            </div>
          </div>

          {/* Add Review Form */}
          <form onSubmit={handlePostReview} className="bg-[#121320] border border-[#23253b] rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Your Gamer Tag / Handle (e.g. RetroAce)"
                value={reviewHandle}
                onChange={(e) => setReviewHandle(e.target.value)}
                className="flex-1 bg-[#0a0b12] border border-[#25273f] rounded-lg px-3.5 py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-purple-500"
              />
              <div className="flex items-center gap-2 self-start sm:self-center px-3 py-1.5 bg-[#0a0b12] border border-[#25273f] rounded-lg">
                <span className="text-[10px] text-neutral-400 font-bold">Stars:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="cursor-pointer"
                    >
                      <Star
                        size={14}
                        fill={star <= reviewRating ? '#ffd166' : 'none'}
                        className={star <= reviewRating ? 'text-amber-400' : 'text-neutral-600'}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <textarea
              placeholder="What do you think of this game? (Controls, music, difficulty...)"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              rows={3}
              className="w-full bg-[#0a0b12] border border-[#25273f] rounded-lg p-3 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-purple-500 resize-none"
            />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!reviewComment.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white rounded-lg text-xs font-extrabold cursor-pointer transition-all shadow-md"
              >
                <Send size={13} />
                <span>Submit Review</span>
              </button>
            </div>
          </form>

          {/* Reviews List */}
          <div className="space-y-3 pt-2">
            {reviews.length === 0 ? (
              <div className="text-center py-6 text-neutral-500 text-xs">
                No player reviews submitted yet. Be the first to review this classic!
              </div>
            ) : (
              reviews.map((rev) => (
                <div key={rev.id} className="bg-[#121320] border border-[#202235] rounded-xl p-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-purple-300">{rev.handle}</span>
                    <div className="flex items-center gap-1 text-amber-400">
                      {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                        <Star key={i} size={11} fill="currentColor" />
                      ))}
                      <span className="text-[10px] text-neutral-500 ml-1">{rev.timestamp}</span>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">{rev.comment}</p>
                </div>
              ))
            )}
          </div>
        </section>

      </main>

      {/* Fullscreen 3D Box Engine Modal */}
      <GameBox3DModal
        game={activeGame}
        isOpen={is3DModalOpen}
        onClose={() => setIs3DModalOpen(false)}
      />
    </div>
  );
};

export default PlayerView;
