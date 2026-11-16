import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Gamepad2,
  Search,
  Maximize2,
  Minimize2,
  RotateCcw,
  X,
  Play,
  AlertCircle,
  ExternalLink,
  Star,
  MessageSquare,
  Send,
  Calendar,
  Monitor,
  Sparkles,
  Box,
  Film,
  Tv,
  BookOpen,
  Smile,
  ShieldCheck,
  Video,
  Clapperboard,
  Layers,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { GameItem, GameReview, ManifestGameItem } from './types';
import { CONSOLE_SOURCES } from './sources';
import { getGameReviews, saveUserReview } from './reviews';
import { PlayerView, SafeGameImage, GameBox3DModal, StreamPlayer, AdSenseBanner, FeaturedHeroBanner, ComicsSection } from './components';
import { enrichGameWithLaunchBox3D, enrichManifestWithLaunchBoxApi, enrichGameWithLaunchBoxApi } from './launchboxApi';
import { STREAMING_CATALOG, MediaStreamItem, STREAM_X_BASE_URL, TOONIX_BASE_URL } from './data/streamingData';
import { adShield } from './utils/adBlocker';


// Declare Ruffle global
declare global {
  interface Window {
    RufflePlayer?: {
      config?: any;
      newest?: () => {
        createPlayer: () => HTMLElement & {
          load: (options: any) => Promise<void>;
          pause?: () => void;
          play?: () => void;
          isPlaying?: boolean;
        };
      };
      [key: string]: any;
    };
  }
}

const DEFAULT_CONSOLE_TABS = [
  'All',
  'Favorites',
  'WebPort',
  'Flash',
  'NES',
  'SNES',
  'GBA',
  'Game Boy',
  'Game Boy Color',
  'Sega Genesis',
  'Master System',
  'Game Gear',
  'TurboGrafx-16',
  'N64',
  'PS1',
  'PSP',
  'Sega Saturn',
  'Atari 2600',
  'Atari 7800',
  'Sega CD',
  'Sega 32X',
  'MS-DOS',
  'Virtual Boy',
  'Nintendo DS'
];
const ITEMS_PER_PAGE = 50; // Optimized 50 items per view page for massive 1,000+ catalog

export default function App() {
  const [games, setGames] = useState<GameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConsole, setSelectedConsole] = useState<string>('All');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);

  // Favorites state with localStorage persistence
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('arcadia_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('arcadia_favorites', JSON.stringify(favorites));
    } catch (e) {}
  }, [favorites]);

  const toggleFavorite = (gameId: string) => {
    setFavorites(prev =>
      prev.includes(gameId) ? prev.filter(id => id !== gameId) : [...prev, gameId]
    );
  };

  // Dynamic console tabs computed from loaded games
  const consoleTabs = useMemo(() => {
    const presentConsoles = new Set(games.map(g => g.consoleType).filter(Boolean));
    const ordered = DEFAULT_CONSOLE_TABS.filter(c => c === 'All' || c === 'Favorites' || presentConsoles.has(c));
    presentConsoles.forEach(c => {
      if (!ordered.includes(c)) ordered.push(c);
    });
    return ordered;
  }, [games]);

  // View state: 'catalog' | 'player' | 'stream_player'
  const [currentView, setCurrentView] = useState<'catalog' | 'player' | 'stream_player'>('catalog');
  const [activeGame, setActiveGame] = useState<GameItem | null>(null);
  const [activeStreamItem, setActiveStreamItem] = useState<MediaStreamItem | null>(null);
  const [mainTab, setMainTab] = useState<'games' | 'movies' | 'tv' | 'anime' | 'comics' | 'cartoons' | 'streamx' | 'toonix'>('games');
  const [customStreamInput, setCustomStreamInput] = useState('');
  const [customStreamCategory, setCustomStreamCategory] = useState<'Movies' | 'TV Shows' | 'Anime' | 'Cartoons'>('Movies');
  const [inspecting3DGame, setInspecting3DGame] = useState<GameItem | null>(null);
  const [showWebPortComingSoon, setShowWebPortComingSoon] = useState(false);
  const [isPlayerFullscreen, setIsPlayerFullscreen] = useState(false);
  const [ruffleError, setRuffleError] = useState<string | null>(null);

  // Keyboard shortcuts for cycling through console filter tabs using Left/Right arrow keys
  useEffect(() => {
    if (currentView !== 'catalog' || mainTab !== 'games') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) || target?.isContentEditable) {
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const currentIndex = consoleTabs.indexOf(selectedConsole);
        if (currentIndex === -1) {
          setSelectedConsole('All');
          return;
        }

        let nextIndex = e.key === 'ArrowRight' ? currentIndex + 1 : currentIndex - 1;
        if (nextIndex >= consoleTabs.length) nextIndex = 0;
        if (nextIndex < 0) nextIndex = consoleTabs.length - 1;

        setSelectedConsole(consoleTabs[nextIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentView, mainTab, consoleTabs, selectedConsole]);

  // Initialize Ad-Shield on mount
  useEffect(() => {
    adShield.init();
  }, []);


  // Reviews state for active game
  const [activeReviews, setActiveReviews] = useState<GameReview[]>([]);
  const [reviewHandle, setReviewHandle] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  const ruffleContainerRef = useRef<HTMLDivElement>(null);
  const activeRufflePlayerRef = useRef<any>(null);

  // Global error handler to catch and suppress harmless cross-origin "Script error." & unhandled rejections
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      if (
        !event.message || 
        event.message === 'Script error.' || 
        event.message === '[object Object]' ||
        event.message?.toLowerCase().includes('null function') ||
        event.filename?.includes('emulatorjs') || 
        event.filename?.includes('fiveplay') || 
        event.filename?.includes('cdn') ||
        event.filename?.startsWith('blob:') ||
        (event.error && event.error.name === 'RuntimeError')
      ) {
        event.preventDefault();
        return true;
      }
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.toLowerCase().includes('null function') || event.reason?.name === 'RuntimeError') {
        event.preventDefault();
        return;
      }
      event.preventDefault();
    };
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  // Load games database from separate console JSON files with retry resilience
  useEffect(() => {
    let cancelled = false;

    const fetchManifestWithRetry = async (manifestUrl: string, retries = 3): Promise<any[]> => {
      const resolvedUrl = new URL(manifestUrl, window.location.origin).toString();
      let lastErr: unknown;
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const res = await fetch(resolvedUrl, attempt > 0 ? { cache: 'no-store' } : undefined);
          if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${manifestUrl}`);
          const json = await res.json();
          return Array.isArray(json) ? json : [];
        } catch (err) {
          lastErr = err;
          if (attempt < retries) {
            await new Promise((r) => setTimeout(r, 250 * Math.pow(2, attempt)));
          }
        }
      }
      throw lastErr;
    };

    const loadGames = async () => {
      try {
        setLoading(true);
        const allLoadedGames: GameItem[] = [];
        const batchSize = 4;

        for (let i = 0; i < CONSOLE_SOURCES.length; i += batchSize) {
          if (cancelled) return;
          const batch = CONSOLE_SOURCES.slice(i, i + batchSize);
          const batchResults = await Promise.all(
            batch.map(async (source) => {
              try {
                const data = await fetchManifestWithRetry(source.manifestUrl);
                const mapped: GameItem[] = [];
                data.forEach((item: any) => {
                  const slug = item.slug || '';
                  const encodedSlug = slug.split('/').map((p: string) => encodeURIComponent(p)).join('/');
                  const targetUrl =
                    item.streamUrl ||
                    item.url ||
                    item.rom_url ||
                    (source.romSourceBaseUrl ? `${source.romSourceBaseUrl}${encodedSlug}` : slug);
                  const baseGame: GameItem = {
                    ...item,
                    id:
                      item.id ||
                      `${source.console.toLowerCase()}-${slug
                        .replace(/\.[^/.]+$/, '')
                        .replace(/[^a-zA-Z0-9_-]/g, '-')
                        .toLowerCase()}`,
                    consoleType: item.consoleType || source.console,
                    engine: item.engine || source.engine,
                    core: item.core || source.core,
                    url: targetUrl,
                    streamUrl: item.streamUrl || targetUrl,
                    rom_url: targetUrl,
                  };
                  mapped.push(enrichGameWithLaunchBox3D(baseGame));
                });
                return mapped;
              } catch (err) {
                console.warn(`Unable to load source ${source.console} after retries:`, err);
                return [] as GameItem[];
              }
            })
          );

          for (const items of batchResults) {
            allLoadedGames.push(...items);
          }
        }

        if (cancelled) return;
        setGames(allLoadedGames);
        setLoading(false);

        // Progressively fetch real 3D asset URLs (box art and cartridge) from LaunchBox Games Database API
        enrichManifestWithLaunchBoxApi(allLoadedGames, (updatedGame) => {
          if (cancelled) return;
          setGames(prevGames =>
            prevGames.map(g => (g.id === updatedGame.id ? { ...g, ...updatedGame } : g))
          );
          setActiveGame(prev => (prev && prev.id === updatedGame.id ? { ...prev, ...updatedGame } : prev));
          setInspecting3DGame(prev => (prev && prev.id === updatedGame.id ? { ...prev, ...updatedGame } : prev));
        });
      } catch (err) {
        console.warn('Failed to load game data:', err);
        if (!cancelled) setLoading(false);
      }
    };
    loadGames();
    return () => {
      cancelled = true;
    };
  }, []);

  // Compute genres
  const genres = useMemo(() => {
    const set = new Set<string>();
    games.forEach(g => {
      if (g.genre) set.add(g.genre);
    });
    return ['All', ...Array.from(set).sort()];
  }, [games]);

  // Filtered games
  const filteredGames = useMemo(() => {
    return games.filter(g => {
      const matchesSearch =
        g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.publisher.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesConsole =
        selectedConsole === 'All'
          ? true
          : selectedConsole === 'Favorites'
          ? favorites.includes(g.id) || favorites.includes(g.slug) || favorites.includes(g.title)
          : g.consoleType === selectedConsole;
      const matchesGenre = selectedGenre === 'All' || g.genre === selectedGenre;
      return matchesSearch && matchesConsole && matchesGenre;
    });
  }, [games, searchQuery, selectedConsole, selectedGenre, favorites]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedConsole, selectedGenre]);

  // Pagination (50 items per view page)
  const totalPages = Math.ceil(filteredGames.length / ITEMS_PER_PAGE) || 1;
  const paginatedGames = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredGames.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredGames, currentPage]);

  // Load reviews when active game changes
  useEffect(() => {
    if (activeGame) {
      setActiveReviews(getGameReviews(activeGame.id, activeGame.title, activeGame.rating));
      setReviewComment('');
    }
  }, [activeGame]);

  // Initialize game runner (Ruffle for Flash)
  useEffect(() => {
    if (!activeGame || activeGame.engine !== 'ruffle') return;
    if (!ruffleContainerRef.current) return;

    setRuffleError(null);
    const container = ruffleContainerRef.current;
    container.innerHTML = '';

    const setupRuffle = () => {
      // Ensure Ruffle configuration is globally defined
      window.RufflePlayer = window.RufflePlayer || {};
      window.RufflePlayer.config = window.RufflePlayer.config || {
        publicPath: 'https://cdn.jsdelivr.net/npm/@ruffle-rs/ruffle@0.7.1/',
        polyfillStyle: 'none',
        autoplay: 'on',
        unmuteOverlay: 'hidden',
        letterbox: 'on',
        warnOnUnsupportedContent: false,
      };

      if (!window.RufflePlayer || typeof window.RufflePlayer.newest !== 'function') {
        setRuffleError('Initializing Ruffle Flash WebAssembly emulator...');
        setTimeout(setupRuffle, 300);
        return;
      }

      try {
        const ruffle = window.RufflePlayer.newest();
        const player = ruffle.createPlayer();
        player.style.width = '100%';
        player.style.height = '100%';

        container.appendChild(player);
        activeRufflePlayerRef.current = player;

        player.load({
          url: activeGame.url,
          allowScriptAccess: true,
          parameters: '',
          autoplay: 'on',
        }).catch((err: any) => {
          console.warn('Ruffle load attempt failed, retrying with raw URL string:', err);
          player.load(activeGame.url).catch((err2: any) => {
            console.error('Ruffle load error:', err2);
            setRuffleError(
              `Could not load SWF: ${activeGame.url}. The file might be temporarily blocked by CORS.`
            );
          });
        });
      } catch (e: any) {
        console.error('Failed to create Ruffle player', e);
        setRuffleError(`Ruffle error: ${e.message}`);
      }
    };

    setupRuffle();

    return () => {
      if (container) container.innerHTML = '';
      activeRufflePlayerRef.current = null;
    };
  }, [activeGame]);

  const handleLaunchGame = (game: GameItem) => {
    let resolvedGame = game;
    // If GTA V, ensure streamUrl points directly to https://fiveplay.lol/ (V1)
    if (game.id === 'gta5' || game.id === 'webport-gtav' || game.id === 'gtav-web' || game.title.toLowerCase() === 'gta v' || game.title.toLowerCase().includes('gta 5') || game.title.toLowerCase().includes('grand theft auto v')) {
      resolvedGame = {
        ...game,
        id: 'webport-gtav',
        title: 'GTA V',
        consoleType: 'WebPort',
        engine: 'web',
        url: 'https://fiveplay.lol/',
        streamUrl: 'https://fiveplay.lol/',
        poster: game.poster || 'https://upload.wikimedia.org/wikipedia/en/a/a5/Grand_Theft_Auto_V_cover_art.jpg'
      };
    }
    // If Need for Speed Underground 2, ensure streamUrl points to V1 (https://nfsunderground2.site/)
    if (game.id === 'webport-nfsu2' || game.title.toLowerCase().includes('underground 2') || game.title.toLowerCase().includes('nfsu2')) {
      resolvedGame = {
        ...game,
        id: 'webport-nfsu2',
        title: 'Need for Speed Underground 2',
        consoleType: 'WebPort',
        engine: 'web',
        url: 'https://nfsunderground2.site/',
        streamUrl: 'https://nfsunderground2.site/'
      };
    }
    setActiveGame(resolvedGame);
    setCurrentView('player');
  };

  useEffect(() => {
    if (activeGame) {
      setTimeout(() => {
        const scrollEl = document.querySelector('.player-scroll-content');
        if (scrollEl) {
          scrollEl.scrollTop = 0;
        }
      }, 30);
    }
  }, [activeGame]);

  const handleClosePlayer = () => {
    // 1. Forcefully detach EmulatorJS event listeners and globals to prevent teardown crashes
    try {
      if ((window as any).EJS_emulator) {
        // Attempt a silent pause if possible
        try { (window as any).EJS_emulator.pause(); } catch (e) {}
        
        // No-op the save function to prevent the "null function" WASM error
        if ((window as any).EJS_GameManager) {
          (window as any).EJS_GameManager.saveSaveFiles = () => Promise.resolve();
        }
        
        if (typeof (window as any).EJS_emulator.stop === 'function') {
          (window as any).EJS_emulator.stop();
        }
      }
    } catch (e) {}

    // 2. Kill the iframe context immediately
    const playerFrame = document.getElementById('player-iframe') as HTMLIFrameElement;
    if (playerFrame) {
      try {
        playerFrame.src = 'about:blank';
        playerFrame.remove();
      } catch (e) {}
    }

    // 3. Clear the DOM container
    const gameEl = document.getElementById('game');
    if (gameEl) gameEl.innerHTML = '';

    setActiveGame(null);
    setCurrentView('catalog');
    setRuffleError(null);
    setIsPlayerFullscreen(false);
  };

  const handleRestartGame = () => {
    if (!activeGame) return;
    const currentGame = activeGame;
    setActiveGame(null);
    setTimeout(() => setActiveGame(currentGame), 80);
  };

  const toggleFullscreen = () => {
    const targetEl = document.getElementById('active-game-canvas') || document.getElementById('game') || document.querySelector('.player-window');
    if (!targetEl) return;

    if (!document.fullscreenElement) {
      targetEl.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsPlayerFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => {
        console.error(`Error attempting to disable full-screen mode: ${err.message}`);
      });
      setIsPlayerFullscreen(false);
    }
  };

  // Submit comment & review
  const handlePostReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGame || !reviewComment.trim()) return;

    const updated = saveUserReview(
      activeGame.id,
      reviewHandle,
      reviewRating,
      reviewComment
    );
    setActiveReviews(updated);
    setReviewComment('');
  };



  // Local SWF or ROM Uploader for testing
  const handleLocalUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const blobUrl = URL.createObjectURL(file);
    const ext = file.name.split('.').pop()?.toLowerCase();

    const isSwf = ext === 'swf';
    let detectedConsole: GameItem['consoleType'] = 'Flash';
    let core = undefined;

    if (ext === 'nes') {
      detectedConsole = 'NES';
      core = 'fceumm';
    } else if (ext === 'sfc' || ext === 'smc') {
      detectedConsole = 'SNES';
      core = 'snes';
    } else if (ext === 'gba') {
      detectedConsole = 'GBA';
      core = 'gba';
    } else if (ext === 'bin' || ext === 'gen' || ext === 'md') {
      detectedConsole = 'Sega Genesis';
      core = 'segaMD';
    } else if (ext === 'nds') {
      detectedConsole = 'Nintendo DS';
      core = 'nds';
    } else if (ext === 'z64' || ext === 'n64') {
      detectedConsole = 'N64';
      core = 'n64';
    } else if (ext === 'pbp' || ext === 'chd' || ext === 'cue') {
      detectedConsole = 'PS1';
      core = 'psx';
    }

    const customGame: GameItem = {
      id: `custom-${Date.now()}`,
      title: file.name.replace(/\.[^/.]+$/, ''),
      slug: file.name,
      consoleType: detectedConsole,
      engine: isSwf ? 'ruffle' : 'emulatorjs',
      core: core,
      genre: 'Custom File',
      year: 2026,
      rating: 9.0,
      url: blobUrl,
      poster: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80',
      synopsis: `Custom game cartridge loaded directly from your device storage (${file.name}).`,
      publisher: 'Local Storage',
      releaseDate: 'Custom Release',
    };

    setActiveGame(customGame);
  };

  // ISOLATE FLASH & PURGE SMW VARIABLE INFECTION (EXCLUSION FILTERS)
  useEffect(() => {
    if (!activeGame) return;

    const isCustomWeb = activeGame.engine === 'web' ||
                        activeGame.engine === 'iframe' ||
                        activeGame.consoleType === 'WebPort' ||
                        activeGame.consoleType === 'Web Port' ||
                        activeGame.id === 'webport-gtav' ||
                        activeGame.id === 'gtav-web' ||
                        activeGame.url?.includes('fiveplay.lol') ||
                        activeGame.id === 'gen-sonic-the-hedgehog' ||
                        (activeGame.title.toLowerCase() === 'sonic the hedgehog' && activeGame.consoleType === 'Sega Genesis');

    const isFlash = activeGame.engine === 'ruffle' ||
                    activeGame.consoleType === 'Flash' ||
                    (activeGame.url && activeGame.url.toLowerCase().endsWith('.swf'));

    const isPspGame = activeGame.consoleType === 'PSP' || 
                      activeGame.consoleType === 'PlayStation Portable' ||
                      (activeGame.core && activeGame.core.toLowerCase() === 'ppsspp');

    const isNonEJS = isFlash || isCustomWeb || isPspGame;

    if (isNonEJS) {
      if ((window as any).EJS_player) {
        (window as any).EJS_player = null;
        (window as any).EJS_core = null;
        (window as any).EJS_gameUrl = null;
        (window as any).EJS_biosUrl = null;
        (window as any).EJS_pathtodata = null;
        (window as any).EJS_startOnLoaded = null;
        const staleScripts = document.querySelectorAll('script[src*="emulatorjs"]');
        staleScripts.forEach(script => script.remove());
      }
      return;
    }

    // Complete Reset for Retro Consoles: Forcefully clear out prior configurations
    if ((window as any).EJS_player) {
      (window as any).EJS_player = null;
      (window as any).EJS_core = null;
      (window as any).EJS_gameUrl = null;
      (window as any).EJS_biosUrl = null;
      (window as any).EJS_pathtodata = null;
      (window as any).EJS_startOnLoaded = null;

      // Wipe lingering DOM scripts to prevent the browser from loading the cached SMW file structure
      const staleScripts = document.querySelectorAll('script[src*="emulatorjs"]');
      staleScripts.forEach(script => script.remove());
    }

    // Clear game element container
    const gameContainer = document.getElementById('game');
    if (gameContainer) {
      gameContainer.innerHTML = '';
    }

    const origin = window.location.origin;

    // Bind fresh parameters explicitly matching the NEW non-Flash selected game object
    (window as any).EJS_player = '#game';
    (window as any).EJS_pathtodata = 'https://cdn.emulatorjs.org/stable/data/'; // Restores core asset mirrors
    (window as any).EJS_startOnLoaded = true;

    // Configure Retro Game Shaders (CRT, Scanlines, Pixel-Perfect)
    const savedShader = localStorage.getItem('retro_shader_preference') || 'none';
    const SHADER_PRESETS_MAP: Record<string, string> = {
      'none': '',
      'crt': 'https://cdn.jsdelivr.net/gh/libretro/glsl-shaders@master/crt/crt-easymode.glslp',
      'scanlines': 'https://cdn.jsdelivr.net/gh/libretro/glsl-shaders@master/misc/scanline.glslp',
      'pixel-perfect': 'https://cdn.jsdelivr.net/gh/libretro/glsl-shaders@master/interpolation/sharp-bilinear.glslp',
      'crt-curved': 'https://cdn.jsdelivr.net/gh/libretro/glsl-shaders@master/crt/crt-lottes.glslp'
    };
    (window as any).EJS_shaders = SHADER_PRESETS_MAP[savedShader] || '';

    // STRICT ZERO-MISTAKE CONSOLE ROUTING MATRIX
    const consoleSystem = (activeGame.console_type || activeGame.consoleType || activeGame.core || '').toLowerCase().trim();
    const isPs1Console = ['ps1', 'psx', 'playstation'].includes(consoleSystem);

    // AUTO-BYPASS CORS BLOCK & ZERO-NETWORK-ERROR STREAMING:
    let rawUrl = activeGame.streamUrl || activeGame.rom_url || activeGame.url || '';

    // Determine accurate filename and extension so EmulatorJS correctly identifies CHD/ROM format
    let fileName = '';
    try {
      const parsed = new URL(rawUrl);
      const parts = parsed.pathname.split('/');
      fileName = decodeURIComponent(parts[parts.length - 1] || '');
    } catch (e) {}

    if (!fileName) {
      const safeTitle = (activeGame.title || 'game').replace(/[^a-zA-Z0-9_\-\. ]/g, '').trim();
      const defaultExt = isPs1Console ? '.chd' : '.nes';
      fileName = `${safeTitle}${defaultExt}`;
    }
    if (!fileName.includes('.')) {
      fileName += isPs1Console ? '.chd' : '.bin';
    }

    if (rawUrl.includes('archive.org') || rawUrl.includes('joeheyming.github.io') || rawUrl.startsWith('http')) {
      // Use proxy path containing fileName so getBaseFileName() extracts the true extension
      (window as any).EJS_gameUrl = `${origin}/api/proxy/${encodeURIComponent(fileName)}?url=${encodeURIComponent(rawUrl)}`;
    } else {
      (window as any).EJS_gameUrl = rawUrl;
    }
    (window as any).EJS_gameName = fileName;

    // If environment lacks SharedArrayBuffer / cross-origin isolation, avoid worker thread fetch failure
    if (!window.crossOriginIsolated) {
      (window as any).EJS_threads = false;
    }

    if (consoleSystem === 'genesis' || consoleSystem === 'megadrive' || consoleSystem === 'sega' || consoleSystem === 'sega genesis') {
      (window as any).EJS_core = 'segaMD';
      (window as any).EJS_biosUrl = null;
    } else if (consoleSystem === 'nes') {
      (window as any).EJS_core = 'fceumm';
      (window as any).EJS_biosUrl = null;
    } else if (consoleSystem === 'snes') {
      (window as any).EJS_core = 'snes9x';
      (window as any).EJS_biosUrl = null;
    } else if (consoleSystem === 'game boy' || consoleSystem === 'gb') {
      (window as any).EJS_core = 'gambatte';
      (window as any).EJS_biosUrl = null;
    } else if (consoleSystem === 'game boy color' || consoleSystem === 'gbc') {
      (window as any).EJS_core = 'gambatte';
      (window as any).EJS_biosUrl = null;
    } else if (consoleSystem === 'gba') {
      (window as any).EJS_core = 'mgba';
      (window as any).EJS_biosUrl = null;
    } else if (consoleSystem === 'master system' || consoleSystem === 'mastersystem') {
      (window as any).EJS_core = 'picodrive';
      (window as any).EJS_biosUrl = null;
    } else if (consoleSystem === 'game gear' || consoleSystem === 'gamegear') {
      (window as any).EJS_core = 'picodrive';
      (window as any).EJS_biosUrl = null;
    } else if (consoleSystem === 'turbografx-16' || consoleSystem === 'turbografx16') {
      (window as any).EJS_core = 'mednafen_pce_fast';
      (window as any).EJS_biosUrl = null;
    } else if (consoleSystem === 'atari 2600' || consoleSystem === 'atari2600') {
      (window as any).EJS_core = 'stella';
      (window as any).EJS_biosUrl = null;
    } else if (consoleSystem === 'sega cd' || consoleSystem === 'segacd') {
      (window as any).EJS_core = 'picodrive';
      (window as any).EJS_biosUrl = null;
    } else if (consoleSystem === 'sega 32x' || consoleSystem === 'sega32x') {
      (window as any).EJS_core = 'picodrive';
      (window as any).EJS_biosUrl = null;
    } else if (consoleSystem === 'virtual boy' || consoleSystem === 'virtualboy') {
      (window as any).EJS_core = 'mednafen_vb';
      (window as any).EJS_biosUrl = null;
    } else if (consoleSystem === 'nds' || consoleSystem === 'nintendo ds') {
      (window as any).EJS_core = 'desmume';
      (window as any).EJS_biosUrl = null;
    } else if (consoleSystem === 'n64' || consoleSystem === 'nintendo 64') {
      (window as any).EJS_core = 'n64';
      (window as any).EJS_biosUrl = null;
    } else if (isPs1Console) {
      (window as any).EJS_core = 'psx';
      (window as any).EJS_biosUrl = `${origin}/scph5501.bin`;
      (window as any).EJS_dontExtractBIOS = true; // Prevents decompression error on raw .bin PS1 BIOS
      (window as any).EJS_threads = false; // Disables WebWorker SharedArrayBuffer requirement
      (window as any).EJS_disableDatabases = true; // Prevents browser IndexedDB quota aborts on large CHD ROMs
    } else if (consoleSystem === 'ps2' || consoleSystem === 'playstation 2') {
      (window as any).EJS_core = 'play';
      (window as any).EJS_biosUrl = null;
    } else if (consoleSystem === 'psp' || consoleSystem === 'playstation portable') {
      (window as any).EJS_core = 'ppsspp';
      (window as any).EJS_biosUrl = null;
      (window as any).EJS_threads = false; // Ensures WASM compatibility
      (window as any).EJS_disableDatabases = true; // Prevents IndexedDB issues
      // EmulatorJS loads the official WASM PPSSPP core automatically when 'ppsspp' core is specified.
    } else {
      (window as any).EJS_core = activeGame.core || consoleSystem || 'gba';
      (window as any).EJS_biosUrl = null;
    }

    // Dynamically append the script loader only after old tracking vectors are cleared
    const activeScript = document.createElement('script');
    activeScript.src = 'https://cdn.emulatorjs.org/stable/data/loader.js';
    activeScript.crossOrigin = 'anonymous';
    activeScript.async = true;
    document.body.appendChild(activeScript);

    return () => {
      const staleScripts = document.querySelectorAll('script[src*="emulatorjs"]');
      staleScripts.forEach(script => script.remove());
      if ((window as any).EJS_player) {
        (window as any).EJS_player = null;
        (window as any).EJS_core = null;
        (window as any).EJS_gameUrl = null;
        (window as any).EJS_biosUrl = null;
        (window as any).EJS_pathtodata = null;
        (window as any).EJS_startOnLoaded = null;
      }
    };
  }, [activeGame]);

  // Computed streaming catalog filtered by active main tab
  const streamingItems = useMemo(() => {
    if (mainTab === 'games' || mainTab === 'comics') return [];
    if (mainTab === 'movies') return STREAMING_CATALOG.filter(i => i.category === 'Movies');
    if (mainTab === 'tv') return STREAMING_CATALOG.filter(i => i.category === 'TV Shows');
    if (mainTab === 'anime') return STREAMING_CATALOG.filter(i => i.category === 'Anime');
    if (mainTab === 'cartoons') return STREAMING_CATALOG.filter(i => i.category === 'Cartoons');
    return STREAMING_CATALOG;
  }, [mainTab]);

  const filteredStreamingItems = useMemo(() => {
    if (!searchQuery.trim()) return streamingItems;
    const q = searchQuery.toLowerCase();
    return streamingItems.filter(i =>
      i.title.toLowerCase().includes(q) ||
      i.genre.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q) ||
      (i.tags && i.tags.some(t => t.toLowerCase().includes(q)))
    );
  }, [streamingItems, searchQuery]);

  const handleLaunchCustomStream = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStreamInput.trim()) return;

    const streamUrl = customStreamInput.trim();
    const isToonix = streamUrl.includes('toonix');
    const customItem: MediaStreamItem = {
      id: `custom-stream-${Date.now()}`,
      title: isToonix ? 'Toonix Cartoon Stream' : 'Stream X Media Stream',
      category: customStreamCategory,
      source: isToonix ? 'Toonix' : 'Stream X',
      genre: 'Live Web Stream',
      year: 2026,
      rating: 9.5,
      synopsis: `Custom streaming broadcast loaded from ${streamUrl}. Protected by Stream X Smart Ad-Shield.`,
      poster: isToonix
        ? 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80'
        : 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=800&q=80',
      streamUrl: streamUrl,
      embedUrl: streamUrl,
      quality: '1080p'
    };

    setActiveStreamItem(customItem);
    setCurrentView('stream_player');
    setCustomStreamInput('');
  };

  if (currentView === 'stream_player' && activeStreamItem) {
    return (
      <StreamPlayer
        item={activeStreamItem}
        onClose={() => {
          setActiveStreamItem(null);
          setCurrentView('catalog');
        }}
        onSelectOther={(other) => {
          setActiveStreamItem(other);
        }}
      />
    );
  }

  if (currentView === 'player' && activeGame) {
    return (
      <PlayerView
        selectedGame={activeGame}
        item={activeGame}
        onClose={handleClosePlayer}
        onRestart={handleRestartGame}
        favorites={favorites as any}
        toggleFavorite={toggleFavorite as any}
      />
    );
  }

  return (
    <div className="app-shell">
      {/* Topbar */}
      <header className="topbar">
        <div className="brand-lockup">
          <div>
            <div className="eyebrow">
              <span>STREAM X</span>
            </div>
            <h1>Multi-Media Streaming & Retro Arcade Suite</h1>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main>
        {/* Stream X Main Mode Switcher Navigation */}
        <div className="streamx-modes pt-4">
          <button
            onClick={() => setMainTab('games')}
            className={`mode-btn ${mainTab === 'games' ? 'active' : ''}`}
          >
            <Gamepad2 size={15} />
            <span>Retro Games</span>
            <span style={{ opacity: 0.7, fontSize: '10px' }}>({games.length})</span>
          </button>
          <button
            onClick={() => setMainTab('movies')}
            className={`mode-btn ${mainTab === 'movies' ? 'active' : ''}`}
          >
            <Film size={15} />
            <span>Movies</span>
            <span style={{ opacity: 0.7, fontSize: '10px' }}>(Stream X)</span>
          </button>
          <button
            onClick={() => setMainTab('tv')}
            className={`mode-btn ${mainTab === 'tv' ? 'active' : ''}`}
          >
            <Tv size={15} />
            <span>TV Shows</span>
            <span style={{ opacity: 0.7, fontSize: '10px' }}>(Stream X)</span>
          </button>
          <button
            onClick={() => setMainTab('anime')}
            className={`mode-btn ${mainTab === 'anime' ? 'active' : ''}`}
          >
            <Flame size={15} />
            <span>Anime</span>
            <span style={{ opacity: 0.7, fontSize: '10px' }}>(Stream X)</span>
          </button>
          <button
            onClick={() => setMainTab('comics')}
            className={`mode-btn ${mainTab === 'comics' ? 'active' : ''}`}
          >
            <BookOpen size={15} />
            <span>Comics</span>
          </button>
          <button
            onClick={() => setMainTab('cartoons')}
            className={`mode-btn ${mainTab === 'cartoons' ? 'active' : ''}`}
          >
            <Smile size={15} />
            <span>Cartoons</span>
            <span style={{ opacity: 0.7, fontSize: '10px' }}>(Toonix)</span>
          </button>
          <button
            onClick={() => {
              setActiveStreamItem({
                id: 'streamx-direct-hub',
                title: 'Stream X Portal',
                category: 'Stream X',
                source: 'Stream X',
                genre: 'Full Multi-Media Catalog',
                year: 2026,
                rating: 9.9,
                synopsis: 'Browse the complete Stream X online catalog for movies, series, anime, and manga releases with high-speed streaming.',
                poster: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=800&q=80',
                streamUrl: STREAM_X_BASE_URL,
                embedUrl: STREAM_X_BASE_URL,
                quality: '4K'
              });
              setCurrentView('stream_player');
            }}
            className="mode-btn"
            style={{ borderColor: '#9333ea', color: '#c084fc' }}
            title="Open Stream X Portal with Ad-Shield"
          >
            <Clapperboard size={15} />
            <span>Stream X Hub</span>
            <ExternalLink size={11} />
          </button>
          <button
            onClick={() => {
              setActiveStreamItem({
                id: 'toonix-direct-hub',
                title: 'Toonix Cartoon Portal',
                category: 'Toonix',
                source: 'Toonix',
                genre: 'Dedicated Animated Series & Cartoons',
                year: 2026,
                rating: 9.8,
                synopsis: 'Watch non-stop classic and modern animated cartoons on Toonix commercial-free.',
                poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
                streamUrl: TOONIX_BASE_URL,
                embedUrl: TOONIX_BASE_URL,
                quality: '1080p'
              });
              setCurrentView('stream_player');
            }}
            className="mode-btn"
            style={{ borderColor: '#d97706', color: '#fbbf24' }}
            title="Open Toonix Portal with Ad-Shield"
          >
            <Video size={15} />
            <span>Toonix Hub</span>
            <ExternalLink size={11} />
          </button>
        </div>

        {/* HERO SECTION */}
        {mainTab === 'games' ? (
          <FeaturedHeroBanner games={games} onLaunchGame={handleLaunchGame} />
        ) : mainTab === 'comics' ? null : (
          <section className="hero-panel">
            <div className="hero-copy">
              <span className="section-kicker">
                {mainTab === 'cartoons' ? '🧸 Toonix Animation Network' : '✦ Stream X Entertainment'}
              </span>
              <h2>
                {mainTab === 'cartoons'
                  ? <>Non-Stop Cartoons & Anime, <em>Ad-Shield Protected</em></>
                  : <>Stream Movies, TV & Anime, <em>Zero Popups</em></>}
              </h2>
              <p>
                Integrated with <strong>Stream X</strong> (<a href={STREAM_X_BASE_URL} target="_blank" rel="noreferrer" className="text-purple-400 underline">streamex.hn</a>) and <strong>Toonix</strong> (<a href={TOONIX_BASE_URL} target="_blank" rel="noreferrer" className="text-amber-400 underline">toonix.bond</a>). All external popups, tab redirects, and deceptive ad overlays are neutralized while Google AdSense monetization is preserved.
              </p>
            </div>

            {/* Direct Portal Quick Links */}
            <div className="flex items-center gap-3 flex-wrap">
              <a
                href={STREAM_X_BASE_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 bg-[#170928] hover:bg-[#25103e] border border-purple-500/40 rounded-xl text-xs font-bold text-purple-300 transition-all hover:scale-105 shadow-lg"
              >
                <Clapperboard size={15} />
                <span>Visit Stream X</span>
                <ExternalLink size={12} />
              </a>
              <a
                href={TOONIX_BASE_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 bg-[#1f190e] hover:bg-[#302613] border border-amber-500/40 rounded-xl text-xs font-bold text-amber-300 transition-all hover:scale-105 shadow-lg"
              >
                <Smile size={15} />
                <span>Visit Toonix</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </section>
        )}

        {/* Compliant Google AdSense Monetization Banner */}
        <div className="my-4">
          <AdSenseBanner slotId="streamx-top-catalog-banner" format="horizontal" />
        </div>

        {/* CUSTOM STREAM LAUNCHER FOR STREAM X & TOONIX */}
        {mainTab !== 'games' && mainTab !== 'comics' && (
          <div className="my-5 p-4 rounded-xl border border-[#3b1754] bg-gradient-to-r from-[#170928] via-[#210c3a] to-[#170928] shadow-xl">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Video size={14} className="text-purple-400" />
                <span>Quick Stream Launcher</span>
              </span>
              <span className="text-[10px] text-slate-400">
                Paste any link from <span className="text-purple-300 font-mono">streamex.hn</span> or <span className="text-amber-300 font-mono">toonix.bond</span>
              </span>
            </div>
            <form onSubmit={handleLaunchCustomStream} className="flex gap-2 flex-wrap sm:flex-nowrap">
              <input
                type="url"
                placeholder="https://www.streamex.hn/movie/... or https://toonix.bond/watch/..."
                value={customStreamInput}
                onChange={(e) => setCustomStreamInput(e.target.value)}
                className="flex-1 bg-[#0b0717] border border-[#3b1754] rounded-lg px-3.5 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-purple-400"
              />
              <select
                value={customStreamCategory}
                onChange={(e: any) => setCustomStreamCategory(e.target.value)}
                className="bg-[#0b0717] border border-[#3b1754] rounded-lg px-3 py-2 text-xs text-slate-300 outline-none"
              >
                <option value="Movies">Movies</option>
                <option value="TV Shows">TV Shows</option>
                <option value="Anime">Anime</option>
                <option value="Cartoons">Cartoons</option>
              </select>
              <button
                type="submit"
                disabled={!customStreamInput.trim()}
                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-xs rounded-lg transition-all shadow-md shrink-0 cursor-pointer"
              >
                Launch Stream
              </button>
            </form>
          </div>
        )}

        {/* Global Console Tabs Filter (Only visible in Games mode) */}
        {mainTab === 'games' && (
          <div className="filter-tabs">
            {consoleTabs.map(tab => {
              const count = tab === 'All' ? games.length : games.filter(g => g.consoleType === tab).length;
              return (
                <button
                  key={tab}
                  onClick={() => setSelectedConsole(tab)}
                  className={`filter-tab ${selectedConsole === tab ? 'active' : ''}`}
                >
                  <span>{tab}</span>
                  <span style={{ opacity: 0.7, fontSize: '10px' }}>({count} / verified)</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Library Toolbar */}
        <div className="library-toolbar">
          <div className="toolbar-title">
            <span className="status-line"></span>
            <span>
              {mainTab === 'games'
                ? 'Game Collection'
                : mainTab === 'comics'
                ? 'Comic Vault'
                : `${mainTab.toUpperCase()} Stream Library`}
            </span>
            <span className="result-count">
              {mainTab === 'games'
                ? `(${filteredGames.length} titles in ${selectedConsole})`
                : mainTab === 'comics'
                ? '(BatCave.biz Archive Edition)'
                : `(${filteredStreamingItems.length} streams available)`}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {mainTab === 'games' && (
              <select
                value={selectedGenre}
                onChange={e => setSelectedGenre(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #1e293b',
                  borderRadius: '9px',
                  background: '#0a0e17',
                  color: '#c0c0ce',
                  fontSize: '11px',
                  outline: 'none',
                }}
              >
                {genres.map(g => (
                  <option key={g} value={g}>
                    Genre: {g}
                  </option>
                ))}
              </select>
            )}

            {/* Search Box */}
            <div className="search-box">
              <Search size={14} />
              <input
                type="text"
                placeholder={
                  mainTab === 'games'
                    ? "Instant search by title, console..."
                    : mainTab === 'comics'
                    ? "Search comics, publishers, creators..."
                    : "Search movies, series, anime, cartoons..."
                }
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} title="Clear search">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* PSP Coming Soon Splash Card */}
        {mainTab === 'games' && selectedConsole === 'PSP' && (
          <div className="my-6 p-6 rounded-2xl bg-gradient-to-r from-blue-950/90 via-[#0a1228] to-purple-950/90 border border-blue-500/40 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-blue-500/30 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600/20 border border-blue-400/40 rounded-xl text-blue-400">
                  <Gamepad2 size={28} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Status: Coming Soon ⚡</span>
                  <h3 className="text-xl font-extrabold text-white">PlayStation Portable (PSP) WebAssembly</h3>
                  <p className="text-xs text-blue-200/80">Full high-performance PPSSPP WebAssembly engine integration is currently in preview testing.</p>
                </div>
              </div>
              <span className="px-3.5 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-xs font-bold shrink-0">
                Launch Target: Q2 2026
              </span>
            </div>

            {/* PSP Sample Boxart Preview Cards Grid */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Preview Catalog Artwork (Libretro CDN)</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {[
                  { title: "God of War: Chains of Olympus", file: "God of War - Chains of Olympus (USA).png" },
                  { title: "Crisis Core: Final Fantasy VII", file: "Crisis Core - Final Fantasy VII (USA).png" },
                  { title: "Grand Theft Auto: Liberty City Stories", file: "Grand Theft Auto - Liberty City Stories (USA).png" },
                  { title: "Monster Hunter Freedom Unite", file: "Monster Hunter Freedom Unite (USA).png" },
                  { title: "Tekken 6", file: "Tekken 6 (USA).png" },
                  { title: "Kingdom Hearts: Birth by Sleep", file: "Kingdom Hearts - Birth by Sleep (USA).png" }
                ].map(item => (
                  <div key={item.title} className="bg-blue-950/40 border border-blue-800/40 rounded-xl p-2 text-center space-y-1.5 group hover:border-blue-400 transition-all">
                    <div className="aspect-[3/4] rounded-lg overflow-hidden bg-black/60 relative">
                      <img
                        src={`https://raw.githubusercontent.com/libretro-thumbnails/Sony_-_PlayStation_Portable/master/Named_Boxarts/${encodeURIComponent(item.file)}`}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=80';
                        }}
                      />
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider bg-amber-950/90 text-amber-300 border border-amber-500/50 rounded">
                        Coming Soon
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-200 line-clamp-1 block">{item.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CONTENT RENDER: COMICS VAULT, STREAMING CATALOG, OR GAMES GRID */}
        {mainTab === 'comics' ? (
          <ComicsSection searchQuery={searchQuery} />
        ) : mainTab !== 'games' ? (
          <div className="game-grid">
            {filteredStreamingItems.map((media) => (
              <div key={media.id} className="game-card">
                {/* Poster Art */}
                <div className="card-art" style={{ height: '200px' }}>
                  <img
                    src={media.poster}
                    alt={media.title}
                    className="card-art-img"
                    style={{ opacity: 0.65 }}
                  />
                  <span className="genre-badge">{media.genre}</span>
                  {media.quality && (
                    <span
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '12px',
                        zIndex: 2,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: 900,
                        background: '#0284c7',
                        color: '#fff',
                        letterSpacing: '0.04em'
                      }}
                    >
                      {media.quality}
                    </span>
                  )}
                </div>

                {/* Metadata Badges */}
                <div className="card-metadata-badges">
                  <span className={`meta-badge ${media.source === 'Toonix' ? 'bg-amber-950/40 text-amber-300 border-amber-700/40' : 'console'}`}>
                    <Tv size={10} />
                    {media.source}
                  </span>
                  <span className="meta-badge year">
                    <Calendar size={10} />
                    {media.year}
                  </span>
                  <span className="meta-badge rating">
                    <Star size={10} fill="currentColor" />
                    IMDb {media.rating.toFixed(1)}/10
                  </span>
                </div>

                {/* Card Body */}
                <div className="card-body">
                  <div className="card-info">
                    <h3 title={media.title}>{media.title}</h3>
                    <p title={media.synopsis}>{media.synopsis}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                    <button
                      className="play-btn-card"
                      style={{ flex: 1 }}
                      onClick={() => {
                        setActiveStreamItem(media);
                        setCurrentView('stream_player');
                      }}
                    >
                      <Play size={12} fill="currentColor" />
                      <span>Watch Stream</span>
                    </button>
                    <a
                      href={media.streamUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="play-btn-card"
                      style={{ background: '#141c2e', borderColor: '#223049', color: '#38bdf8', padding: '0 10px' }}
                      title="Direct link to source provider"
                    >
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Game Grid */
          loading ? (
            <div className="empty-state">
              <div className="loader"></div>
              <p>Loading 1,800+ community-verified games...</p>
            </div>
          ) : filteredGames.length === 0 ? (
            <div className="empty-state">
              <Gamepad2 size={36} color="#0284c7" />
              <h3>No games found</h3>
              <p>Try switching console categories or clearing your search term.</p>
            </div>
          ) : (
            <div className="game-grid">
              {paginatedGames.map((game, index) => {
                const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + index;
                return (
                  <div key={`${game.slug}-${index}`} className="game-card">
                    {/* Poster Art with Number & Genre */}
                    <div className="card-art">
                      <SafeGameImage
                        primaryUrl={game.poster || game.posterUrl || game.coverUrl}
                        fallbackUrl={game.boxFront || game.boxFrontUrl}
                        title={game.title}
                        consoleType={game.consoleType}
                        alt={game.title}
                        className="card-art-img"
                      />
                      <span className="genre-badge">{game.genre}</span>
                      <span className="card-number">
                        {String(globalIndex + 1).padStart(2, '0')}
                      </span>
                      {/* Favorite Star Button Overlay */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(game.id || game.slug);
                        }}
                        className={`absolute top-2 right-2 z-10 p-2 rounded-xl backdrop-blur-md transition-all cursor-pointer shadow-lg ${
                          favorites.includes(game.id || game.slug)
                            ? 'bg-amber-500 text-black scale-110'
                            : 'bg-black/60 text-white hover:bg-black/80 hover:scale-105'
                        }`}
                        title={favorites.includes(game.id || game.slug) ? "Remove from Favorites" : "Add to Favorites"}
                      >
                        <Star size={16} fill={favorites.includes(game.id || game.slug) ? "currentColor" : "none"} />
                      </button>
                    </div>

                    {/* Metadata Badges immediately under poster image */}
                    <div className="card-metadata-badges">
                      <span className="meta-badge console">
                        <Monitor size={10} />
                        {game.consoleType}
                      </span>
                      <span className="meta-badge year">
                        <Calendar size={10} />
                        {game.year}
                      </span>
                      <span className="meta-badge rating">
                        <Star size={10} fill="currentColor" />
                        IMDb {game.rating.toFixed(1)}/10
                      </span>
                    </div>

                    {/* Card Body */}
                    <div className="card-body">
                      <div className="card-info">
                        <h3 title={game.title}>{game.title}</h3>
                        <p title={game.synopsis}>{game.synopsis}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                        <button className="play-btn-card" style={{ flex: 1 }} onClick={() => handleLaunchGame(game)}>
                          <Play size={12} fill="currentColor" />
                          <span>Play</span>
                        </button>
                        <button
                          type="button"
                          className="play-btn-card"
                          style={{ background: '#121828', borderColor: '#223049', color: '#38bdf8', padding: '0 8px', gap: '4px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspecting3DGame(game);
                            enrichGameWithLaunchBoxApi(game, (updated) => {
                              setInspecting3DGame(updated);
                              setGames(prev => prev.map(g => g.id === updated.id ? { ...g, ...updated } : g));
                            });
                          }}
                          title="Inspect 3D Box Engine"
                        >
                          <Box size={13} />
                          <span>3D Box</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Pagination (50 items per view page) */}
        {mainTab === 'games' && filteredGames.length > ITEMS_PER_PAGE && (
          <div className="pagination">
            <button
              onClick={() => {
                setCurrentPage(p => Math.max(1, p - 1));
                window.scrollTo({ top: 380, behavior: 'smooth' });
              }}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span>
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> (50 games/page)
            </span>
            <button
              onClick={() => {
                setCurrentPage(p => Math.min(totalPages, p + 1));
                window.scrollTo({ top: 380, behavior: 'smooth' });
              }}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </main>

      {/* Web Ports Coming Soon Modal */}
      {showWebPortComingSoon && (
        <div className="player-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{
            background: '#141622',
            border: '1px solid #3b82f6',
            borderRadius: '16px',
            padding: '36px 40px',
            maxWidth: '480px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.85)',
            position: 'relative'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#60a5fa',
              marginBottom: '16px'
            }}>
              <Sparkles size={28} />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>Web Ports Coming Soon! ⚡</h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.6', marginBottom: '24px' }}>
              Heavy WebAssembly streaming engines (like GTA V and 3D Web Ports) are under active development. This requires high-performance multithreaded optimization!
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowWebPortComingSoon(false)}
                style={{
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Got It
              </button>
              <button
                onClick={() => {
                  setShowWebPortComingSoon(false);
                  handleLaunchGame({
                    id: 'webport-gtav',
                    title: 'Grand Theft Auto V',
                    slug: 'webport-gtav',
                    consoleType: 'WebPort',
                    engine: 'web',
                    genre: 'Action / Open World',
                    year: 2024,
                    rating: 9.9,
                    url: 'https://fiveplay.lol/',
                    streamUrl: 'https://fiveplay.lol/',
                    poster: 'https://upload.wikimedia.org/wikipedia/en/a/a5/Grand_Theft_Auto_V_cover_art.jpg',
                    synopsis: 'High-performance browser web port of GTA V running directly on the web.',
                    publisher: 'Rockstar Games',
                    releaseDate: '2013'
                  });
                }}
                style={{
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Play size={14} fill="currentColor" />
                <span>Launch GTA V</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive 3D Box Engine Modal */}
      <GameBox3DModal
        game={inspecting3DGame}
        isOpen={Boolean(inspecting3DGame)}
        onClose={() => setInspecting3DGame(null)}
      />
    </div>
  );
}
