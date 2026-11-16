import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Columns2,
  ScrollText,
  Maximize2,
  Minimize2,
  Search,
  Volume2,
  VolumeX,
  Sun,
  Star,
  List,
  ExternalLink,
  SlidersHorizontal,
  ZoomIn,
  ZoomOut,
  FileCode2,
} from 'lucide-react';
import { ComicChapter, ComicSeries } from '../types';
import { getComicAssetUrl, sortComicChaptersForReading } from '../utils/batcaveParser';

type ReadMode = 'single' | 'spread' | 'strip' | 'width';
type LightingTheme = 'obsidian' | 'newsprint' | 'studio';
type AmbientSound = 'off' | 'rain' | 'wind' | 'vinyl';

interface ComicReaderModalProps {
  series: ComicSeries;
  initialChapterId?: number | string;
  onClose: () => void;
  onOpenImporter?: () => void;
}

const PROGRESS_STORAGE_KEY = 'arcadia_comic_progress_v1';
const FAV_CHAPTERS_KEY = 'arcadia_comic_fav_chapters_v1';

interface PageImageSlotProps {
  primarySrc: string;
  fallbackSrc?: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  lensActive?: boolean;
  lensZoom?: number;
  lensSize?: number;
}

const PageImageSlot: React.FC<PageImageSlotProps> = ({
  primarySrc,
  fallbackSrc,
  alt,
  className = '',
  style,
  lensActive = false,
  lensZoom = 2.4,
  lensSize = 190,
}) => {
  const [src, setSrc] = useState(primarySrc);
  const [usedFallback, setUsedFallback] = useState(false);
  const [broken, setBroken] = useState(false);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number; w: number; h: number } | null>(
    null
  );
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSrc(primarySrc);
    setUsedFallback(false);
    setBroken(false);
  }, [primarySrc, fallbackSrc]);

  const handleError = () => {
    const proxiedFallback = fallbackSrc ? getComicAssetUrl(fallbackSrc) : '';
    if (!usedFallback && proxiedFallback && proxiedFallback !== src) {
      setUsedFallback(true);
      setSrc(proxiedFallback);
    } else {
      setBroken(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!lensActive || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setHoverPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      w: rect.width,
      h: rect.height,
    });
  };

  if (broken) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 rounded-lg text-center p-8 aspect-[2/3] min-h-[420px] ${className}`}
      >
        <BookOpen size={36} className="text-amber-400 mb-3" />
        <p className="text-sm font-semibold text-zinc-200">{alt}</p>
        <p className="text-xs text-zinc-400 mt-1 max-w-xs">
          Unable to decode this comic page image.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverPos(null)}
      className={`relative select-none ${lensActive ? 'cursor-crosshair' : ''} ${className}`}
    >
      <img
        src={src}
        alt={alt}
        onError={handleError}
        referrerPolicy="no-referrer"
        draggable={false}
        style={style}
        className="w-full h-auto block rounded-sm shadow-2xl"
      />
      {lensActive && hoverPos && (
        <div
          className="pointer-events-none absolute rounded-full border-2 border-amber-400/90 shadow-2xl z-30 overflow-hidden bg-zinc-950"
          style={{
            width: `${lensSize}px`,
            height: `${lensSize}px`,
            left: `${hoverPos.x - lensSize / 2}px`,
            top: `${hoverPos.y - lensSize / 2}px`,
            backgroundImage: `url("${src}")`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: `${hoverPos.w * lensZoom}px ${hoverPos.h * lensZoom}px`,
            backgroundPosition: `${-(hoverPos.x * lensZoom - lensSize / 2)}px ${-(
              hoverPos.y * lensZoom -
              lensSize / 2
            )}px`,
            boxShadow: '0 16px 40px rgba(0,0,0,0.85), inset 0 0 0 1px rgba(255,255,255,0.2)',
          }}
        />
      )}
    </div>
  );
};

export const ComicReaderModal: React.FC<ComicReaderModalProps> = ({
  series,
  initialChapterId,
  onClose,
  onOpenImporter,
}) => {
  const orderedChapters = useMemo(
    () => sortComicChaptersForReading(series.chapters),
    [series.chapters]
  );

  const [activeChapterId, setActiveChapterId] = useState<number | string>(
    initialChapterId || series.defaultChapterId || orderedChapters[0]?.id
  );
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [readMode, setReadMode] = useState<ReadMode>('single');
  const [lighting, setLighting] = useState<LightingTheme>('obsidian');
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(102);

  // Loupe magnifier state (recreates BatCave reader-lens.js)
  const [lensActive, setLensActive] = useState<boolean>(false);
  const [lensZoom, setLensZoom] = useState<number>(2.5);

  // Ambient Web Audio soundscape state (recreates BatCave reader-sounds.js without missing files)
  const [ambientSound, setAmbientSound] = useState<AmbientSound>('off');
  const [pageTurnSound, setPageTurnSound] = useState<boolean>(true);
  const [ambientVolume, setAmbientVolume] = useState<number>(0.22);

  // Drawers / panels
  const [showChapterDrawer, setShowChapterDrawer] = useState<boolean>(false);
  const [chapterSearch, setChapterSearch] = useState<string>('');
  const [showSettingsPopover, setShowSettingsPopover] = useState<boolean>(false);
  const [showFilmstrip, setShowFilmstrip] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const [favChapters, setFavChapters] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(FAV_CHAPTERS_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const modalRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ambientNodesRef = useRef<{ source?: AudioNode; gain?: GainNode }>({});

  const activeChapter: ComicChapter | undefined = useMemo(
    () =>
      orderedChapters.find((c) => String(c.id) === String(activeChapterId)) ||
      orderedChapters[0],
    [orderedChapters, activeChapterId]
  );

  const activeIndex = useMemo(
    () => orderedChapters.findIndex((c) => String(c.id) === String(activeChapter?.id)),
    [orderedChapters, activeChapter]
  );

  const pages = useMemo(() => {
    if (!activeChapter) return [];
    const localList = activeChapter.pages || [];
    const remoteList = activeChapter.remotePages || [];
    const count = Math.max(localList.length, remoteList.length);
    const items: { index: number; primary: string; fallback?: string }[] = [];
    for (let i = 0; i < count; i++) {
      const localItem = localList[i];
      const remoteItem = remoteList[i];
      const primary =
        localItem && localItem.startsWith('/')
          ? localItem
          : getComicAssetUrl(localItem || remoteItem);
      const fallback = remoteItem;
      if (primary) {
        items.push({ index: i + 1, primary, fallback });
      }
    }
    return items;
  }, [activeChapter]);

  const totalPages = pages.length;

  // Restore saved progress when switching chapters
  useEffect(() => {
    if (!activeChapter) return;
    try {
      const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
      const map = raw ? JSON.parse(raw) : {};
      const key = `${series.id}:${activeChapter.id}`;
      const savedPage = Number(map[key]?.page || 1);
      if (pages.length > 0) {
        setCurrentPage(Math.min(Math.max(1, savedPage), pages.length));
      } else {
        setCurrentPage(1);
      }
    } catch {
      setCurrentPage(1);
    }
  }, [series.id, activeChapter?.id, pages.length]);

  // Persist current reading progress
  useEffect(() => {
    if (!activeChapter || totalPages === 0) return;
    try {
      const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
      const map = raw ? JSON.parse(raw) : {};
      map[`${series.id}:${activeChapter.id}`] = {
        page: currentPage,
        total: totalPages,
        updatedAt: Date.now(),
      };
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(map));
    } catch {
      // Ignore storage quota errors
    }
  }, [series.id, activeChapter?.id, currentPage, totalPages]);

  const playPageTurnRustle = useCallback(() => {
    if (!pageTurnSound) return;
    try {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const duration = 0.09;
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const env = Math.sin((i / bufferSize) * Math.PI);
        data[i] = (Math.random() * 2 - 1) * env * 0.25;
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1800;
      filter.Q.value = 0.8;
      const gain = ctx.createGain();
      gain.gain.value = 0.14;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start();
    } catch {
      // Ignore audio errors when blocked by autoplay policy
    }
  }, [pageTurnSound]);

  // Web Audio ambient generator (Off / Rain / Night Wind / Warm Vinyl)
  useEffect(() => {
    const cleanupAmbient = () => {
      try {
        if (ambientNodesRef.current.source && 'stop' in ambientNodesRef.current.source) {
          (ambientNodesRef.current.source as AudioBufferSourceNode).stop();
        }
        ambientNodesRef.current.gain?.disconnect();
      } catch {}
      ambientNodesRef.current = {};
    };

    cleanupAmbient();
    if (ambientSound === 'off') return cleanupAmbient;

    try {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return cleanupAmbient;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const len = ctx.sampleRate * 3;
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const channel = buffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        // Brown/pink noise shaping depending on atmosphere
        lastOut = (lastOut + 0.03 * white) / 1.03;
        channel[i] = ambientSound === 'rain' ? white * 0.35 + lastOut * 1.4 : lastOut * 2.4;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = ambientSound === 'rain' ? 'lowpass' : 'bandpass';
      filter.frequency.value =
        ambientSound === 'rain' ? 1400 : ambientSound === 'wind' ? 420 : 240;
      filter.Q.value = ambientSound === 'wind' ? 1.8 : 0.7;

      const gain = ctx.createGain();
      gain.gain.value = ambientVolume * 0.25;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();

      ambientNodesRef.current = { source, gain };
    } catch {
      // Ignore Web Audio init errors
    }

    return cleanupAmbient;
  }, [ambientSound]);

  useEffect(() => {
    if (ambientNodesRef.current.gain) {
      ambientNodesRef.current.gain.gain.value = ambientVolume * 0.25;
    }
  }, [ambientVolume]);

  const goToPage = useCallback(
    (target: number) => {
      if (totalPages === 0) return;
      const clamped = Math.min(Math.max(1, target), totalPages);
      if (clamped !== currentPage) {
        setCurrentPage(clamped);
        playPageTurnRustle();
        if (readMode === 'strip') {
          const el = document.getElementById(`comic-strip-page-${clamped}`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          stageRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    },
    [totalPages, currentPage, playPageTurnRustle, readMode]
  );

  const stepPage = useCallback(
    (delta: number) => {
      const increment = readMode === 'spread' ? delta * 2 : delta;
      goToPage(currentPage + increment);
    },
    [readMode, currentPage, goToPage]
  );

  const toggleFavoriteChapter = (chapterId: number | string) => {
    const key = `${series.id}:${chapterId}`;
    setFavChapters((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(FAV_CHAPTERS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && modalRef.current) {
      modalRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else if (document.fullscreenElement) {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        if (readMode !== 'strip') {
          e.preventDefault();
          stepPage(1);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        if (readMode !== 'strip') {
          e.preventDefault();
          stepPage(-1);
        }
      } else if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        setLensActive((v) => !v);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'Home') {
        e.preventDefault();
        goToPage(1);
      } else if (e.key === 'End' && totalPages > 0) {
        e.preventDefault();
        goToPage(totalPages);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, readMode, stepPage, goToPage, totalPages]);

  // Lighting themes
  const stageBgClass =
    lighting === 'studio'
      ? 'bg-zinc-200 text-zinc-900'
      : lighting === 'newsprint'
      ? 'bg-[#1b1712] text-amber-50'
      : 'bg-[#09090b] text-zinc-100';

  const pageImageStyle: React.CSSProperties = {
    filter:
      lighting === 'newsprint'
        ? `brightness(${brightness}%) contrast(${contrast}%) sepia(14%)`
        : `brightness(${brightness}%) contrast(${contrast}%)`,
  };

  const filteredDrawerChapters = useMemo(() => {
    if (!chapterSearch.trim()) return orderedChapters;
    const q = chapterSearch.toLowerCase();
    return orderedChapters.filter((ch) => ch.title.toLowerCase().includes(q));
  }, [orderedChapters, chapterSearch]);

  const isFav = activeChapter ? Boolean(favChapters[`${series.id}:${activeChapter.id}`]) : false;

  // Spread pairs computation
  const spreadPages = useMemo(() => {
    if (pages.length === 0) return [];
    if (currentPage === 1) return [pages[0]];
    const idx = currentPage - 1;
    const first = idx % 2 === 1 ? pages[idx] : pages[idx - 1];
    const second = idx % 2 === 1 ? pages[idx + 1] : pages[idx];
    return [first, second].filter(Boolean);
  }, [pages, currentPage]);

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 flex flex-col bg-[#09090b] text-zinc-100 overflow-hidden"
    >
      {/* Top Bar Studio Chrome */}
      <header className="flex items-center justify-between gap-4 px-4 sm:px-6 py-2.5 border-b border-zinc-800 bg-[#0d0d11]/95 backdrop-blur-md shrink-0">
        {/* Left Zone: Title + Issue Selector + Page Telemetry */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setShowChapterDrawer((v) => !v)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              showChapterDrawer
                ? 'bg-amber-400 text-zinc-950 border-amber-400'
                : 'bg-zinc-900 text-zinc-200 border-zinc-800 hover:border-zinc-700'
            }`}
            title="Browse Issues"
          >
            <List size={14} />
            <span>Issues ({orderedChapters.length})</span>
          </button>

          <div className="min-w-0 hidden md:block">
            <div className="flex items-center gap-2 text-xs text-zinc-400 truncate">
              <span className="font-semibold text-zinc-100 truncate">{series.title}</span>
              <span aria-hidden="true">·</span>
              <span className="truncate text-amber-400 font-medium">
                {activeChapter?.title || 'Issue #1'}
              </span>
            </div>
          </div>

          {activeChapter && (
            <button
              type="button"
              onClick={() => toggleFavoriteChapter(activeChapter.id)}
              className={`p-1.5 rounded-lg border transition-colors shrink-0 ${
                isFav
                  ? 'bg-amber-400/15 border-amber-400/50 text-amber-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-100'
              }`}
              title={isFav ? 'Remove Issue Bookmark' : 'Bookmark Issue'}
            >
              <Star size={14} fill={isFav ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>

        {/* Center Zone: Reading Mode Switcher */}
        <div className="hidden lg:flex items-center gap-1 p-1 rounded-lg bg-zinc-900 border border-zinc-800 shrink-0">
          {(
            [
              { id: 'single', label: 'Single', icon: BookOpen },
              { id: 'spread', label: 'Spread', icon: Columns2 },
              { id: 'strip', label: 'Strip', icon: ScrollText },
              { id: 'width', label: 'Fit Width', icon: Maximize2 },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setReadMode(id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                readMode === id
                  ? 'bg-amber-400 text-zinc-950 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              <Icon size={13} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Right Zone: Tools (Magnifier, Lighting, Audio, Fullscreen, Close) */}
        <div className="flex items-center gap-2 shrink-0 relative">
          {totalPages > 0 && (
            <span className="font-mono tabular-nums text-xs text-zinc-300 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 whitespace-nowrap">
              {String(currentPage).padStart(2, '0')} / {String(totalPages).padStart(2, '0')}
            </span>
          )}

          <button
            type="button"
            onClick={() => setLensActive((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              lensActive
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
            }`}
            title="Panel Magnifier Loupe (Shortcut: Z)"
          >
            <Search size={13} />
            <span className="hidden sm:inline">Loupe</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSettingsPopover((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              showSettingsPopover
                ? 'bg-zinc-800 border-zinc-600 text-white'
                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
            }`}
            title="Display & Audio Studio Settings"
          >
            <SlidersHorizontal size={13} />
            <span className="hidden sm:inline">Studio</span>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors"
            title="Fullscreen (F)"
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            title="Close Reader (ESC)"
          >
            <X size={14} />
            <span>Close</span>
          </button>

          {/* Studio Settings Popover */}
          {showSettingsPopover && (
            <div className="absolute right-0 top-11 w-80 p-4 rounded-xl border border-zinc-700 bg-[#121217] shadow-2xl z-40 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-xs font-semibold text-zinc-100">Reader Studio Controls</span>
                <button
                  type="button"
                  onClick={() => setShowSettingsPopover(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Mobile mode selector */}
              <div className="lg:hidden space-y-1.5">
                <span className="text-[11px] font-medium text-zinc-400">Page Layout</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['single', 'spread', 'strip', 'width'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setReadMode(m)}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-medium capitalize ${
                        readMode === m
                          ? 'bg-amber-400 text-zinc-950 font-semibold'
                          : 'bg-zinc-900 text-zinc-300 border border-zinc-800'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lighting / Paper tint */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1.5">
                  <Sun size={12} />
                  <span>Canvas & Paper Stock</span>
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: 'obsidian', label: 'Ink Dark' },
                      { id: 'newsprint', label: 'Newsprint' },
                      { id: 'studio', label: 'Daylight' },
                    ] as const
                  ).map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setLighting(theme.id)}
                      className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        lighting === theme.id
                          ? 'bg-amber-400 text-zinc-950 font-semibold'
                          : 'bg-zinc-900 text-zinc-300 border border-zinc-800'
                      }`}
                    >
                      {theme.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brightness / Contrast */}
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] text-zinc-400">
                  <span>Brightness</span>
                  <span className="font-mono tabular-nums text-zinc-200">{brightness}%</span>
                </div>
                <input
                  type="range"
                  min={70}
                  max={130}
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full accent-amber-400"
                />
                <div className="flex justify-between text-[11px] text-zinc-400">
                  <span>Ink Contrast</span>
                  <span className="font-mono tabular-nums text-zinc-200">{contrast}%</span>
                </div>
                <input
                  type="range"
                  min={85}
                  max={130}
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="w-full accent-amber-400"
                />
              </div>

              {/* Magnifier Zoom */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Loupe Magnification</span>
                  <span className="font-mono tabular-nums text-zinc-200">{lensZoom.toFixed(1)}x</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLensZoom((z) => Math.max(1.5, Number((z - 0.5).toFixed(1))))}
                    className="p-1.5 rounded border border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white"
                  >
                    <ZoomOut size={13} />
                  </button>
                  <input
                    type="range"
                    min={1.5}
                    max={4.5}
                    step={0.5}
                    value={lensZoom}
                    onChange={(e) => setLensZoom(Number(e.target.value))}
                    className="flex-1 accent-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setLensZoom((z) => Math.min(4.5, Number((z + 0.5).toFixed(1))))}
                    className="p-1.5 rounded border border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white"
                  >
                    <ZoomIn size={13} />
                  </button>
                </div>
              </div>

              {/* Ambient Soundscapes */}
              <div className="space-y-2 border-t border-zinc-800 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1.5">
                    {ambientSound === 'off' ? <VolumeX size={12} /> : <Volume2 size={12} />}
                    <span>Ambient Soundscape</span>
                  </span>
                  <label className="flex items-center gap-1.5 text-[11px] text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pageTurnSound}
                      onChange={(e) => setPageTurnSound(e.target.checked)}
                      className="accent-amber-400"
                    />
                    <span>Page SFX</span>
                  </label>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {(['off', 'rain', 'wind', 'vinyl'] as const).map((sound) => (
                    <button
                      key={sound}
                      type="button"
                      onClick={() => setAmbientSound(sound)}
                      className={`px-2 py-1 rounded text-[11px] font-medium capitalize ${
                        ambientSound === sound
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                      }`}
                    >
                      {sound}
                    </button>
                  ))}
                </div>
                {ambientSound !== 'off' && (
                  <input
                    type="range"
                    min={0.05}
                    max={0.8}
                    step={0.05}
                    value={ambientVolume}
                    onChange={(e) => setAmbientVolume(Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Reader Body: Optional Left Issue Drawer + Comic Viewport */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {showChapterDrawer && (
          <aside className="w-80 border-r border-zinc-800 bg-[#0d0d11] flex flex-col shrink-0">
            <div className="p-3 border-b border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-200">
                  Issue Index · {orderedChapters.length}
                </span>
                <button
                  type="button"
                  onClick={() => setShowChapterDrawer(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
              <input
                type="text"
                value={chapterSearch}
                onChange={(e) => setChapterSearch(e.target.value)}
                placeholder="Filter issue # or TPB..."
                className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredDrawerChapters.map((ch) => {
                const isSelected = String(ch.id) === String(activeChapter?.id);
                const chFav = Boolean(favChapters[`${series.id}:${ch.id}`]);
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setActiveChapterId(ch.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-amber-400 text-zinc-950 font-semibold'
                        : 'text-zinc-300 hover:bg-zinc-900'
                    }`}
                  >
                    <span className="truncate">{ch.title}</span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {chFav && <Star size={11} fill="currentColor" />}
                      {ch.pageCount && (
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            isSelected
                              ? 'bg-zinc-950/20 text-zinc-950'
                              : ch.hasLocalPages
                              ? 'bg-zinc-800 text-amber-400'
                              : 'bg-zinc-900 text-zinc-400'
                          }`}
                        >
                          {ch.pageCount}p
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>
        )}

        {/* Primary Comic Canvas Stage */}
        <div
          ref={stageRef}
          className={`flex-1 overflow-y-auto relative transition-colors ${stageBgClass}`}
        >
          {totalPages === 0 ? (
            <div className="h-full flex items-center justify-center p-8">
              <div className="max-w-md w-full p-8 rounded-2xl border border-zinc-800 bg-[#111116] text-center space-y-4 shadow-2xl">
                {(activeChapter?.thumb || series.poster || series.remotePoster) ? (
                  <div className="w-28 aspect-[2/3] rounded-xl overflow-hidden border border-zinc-700 mx-auto shadow-lg bg-zinc-900">
                    <img
                      src={getComicAssetUrl(activeChapter?.thumb || series.poster || series.remotePoster)}
                      alt={activeChapter?.title || series.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover block"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-amber-400/15 text-amber-400 mx-auto flex items-center justify-center">
                    <BookOpen size={24} />
                  </div>
                )}
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-zinc-100">
                    {activeChapter?.title || 'Issue Not Cached Locally'}
                  </h3>
                  {(activeChapter?.pageCount || activeChapter?.date) && (
                    <div className="text-xs font-mono tabular-nums text-amber-400/90">
                      {[
                        activeChapter.pageCount ? `${activeChapter.pageCount} Pages` : null,
                        activeChapter.date ? `Uploaded ${activeChapter.date}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  )}
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {orderedChapters.length === 1 && !activeChapter?.readerUrl?.includes('/reader/')
                      ? 'This entry was indexed from a BatCave catalog page. Open the series on BatCave.biz, pick any issue, press Ctrl+S → Webpage, HTML Only, then drop that .html file into the importer.'
                      : (
                        <>
                          This HTML file indexed {orderedChapters.length}{' '}
                          {orderedChapters.length === 1 ? 'issue' : 'issues'} and cover metadata, but
                          readable comic scans live inside each issue&apos;s{' '}
                          <code className="text-zinc-300">
                            /reader/{series.newsId || '...'}/{activeChapter?.id}
                          </code>{' '}
                          HTML export.
                        </>
                      )}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-2">
                  {activeChapter?.readerUrl && (
                    <a
                      href={activeChapter.readerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-bold transition-colors"
                    >
                      <span>Open on BatCave.biz</span>
                      <ExternalLink size={13} />
                    </a>
                  )}
                  {onOpenImporter && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenImporter();
                      }}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 text-xs font-semibold transition-colors"
                    >
                      <FileCode2 size={13} />
                      <span>Import Saved Issue HTML</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : readMode === 'strip' ? (
            /* Continuous Vertical Scroll Strip */
            <div className="max-w-4xl mx-auto py-6 px-3 sm:px-6 space-y-3">
              {pages.map((p) => (
                <div
                  key={p.index}
                  id={`comic-strip-page-${p.index}`}
                  onMouseEnter={() => setCurrentPage(p.index)}
                  className="relative"
                >
                  <PageImageSlot
                    primarySrc={p.primary}
                    fallbackSrc={p.fallback}
                    alt={`${activeChapter?.title} — Page ${p.index}`}
                    style={pageImageStyle}
                    lensActive={lensActive}
                    lensZoom={lensZoom}
                  />
                </div>
              ))}
            </div>
          ) : readMode === 'spread' ? (
            /* Two-Page Collector Spread View */
            <div className="min-h-full flex items-center justify-center p-4 sm:p-8 relative">
              <button
                type="button"
                onClick={() => stepPage(-1)}
                disabled={currentPage <= 1}
                className="fixed left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-zinc-900/90 border border-zinc-700 text-zinc-100 hover:bg-amber-400 hover:text-zinc-950 disabled:opacity-25 transition-all shadow-xl"
                title="Previous Spread (Left Arrow)"
              >
                <ChevronLeft size={20} />
              </button>

              <div
                className={`grid gap-2 items-center max-w-6xl w-full ${
                  spreadPages.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 max-w-xl'
                }`}
              >
                {spreadPages.map((p) => (
                  <PageImageSlot
                    key={p.index}
                    primarySrc={p.primary}
                    fallbackSrc={p.fallback}
                    alt={`${activeChapter?.title} — Page ${p.index}`}
                    style={pageImageStyle}
                    lensActive={lensActive}
                    lensZoom={lensZoom}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => stepPage(1)}
                disabled={currentPage >= totalPages}
                className="fixed right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-zinc-900/90 border border-zinc-700 text-zinc-100 hover:bg-amber-400 hover:text-zinc-950 disabled:opacity-25 transition-all shadow-xl"
                title="Next Spread (Right Arrow)"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          ) : (
            /* Single Page Fit or Fit Width View */
            <div className="min-h-full flex flex-col items-center justify-center p-3 sm:p-6 relative">
              {/* Clickable left/right navigation zones when Loupe isn't active */}
              {!lensActive && (
                <>
                  <button
                    type="button"
                    onClick={() => stepPage(-1)}
                    disabled={currentPage <= 1}
                    aria-label="Previous Page"
                    className="hidden sm:flex fixed left-5 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-zinc-900/85 border border-zinc-700/80 text-zinc-100 hover:bg-amber-400 hover:text-zinc-950 disabled:opacity-20 transition-all shadow-xl"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() => stepPage(1)}
                    disabled={currentPage >= totalPages}
                    aria-label="Next Page"
                    className="hidden sm:flex fixed right-5 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-zinc-900/85 border border-zinc-700/80 text-zinc-100 hover:bg-amber-400 hover:text-zinc-950 disabled:opacity-20 transition-all shadow-xl"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}

              <div
                className={`w-full mx-auto ${
                  readMode === 'width' ? 'max-w-5xl' : 'max-w-[740px]'
                }`}
              >
                <PageImageSlot
                  primarySrc={pages[currentPage - 1]?.primary || ''}
                  fallbackSrc={pages[currentPage - 1]?.fallback}
                  alt={`${activeChapter?.title} — Page ${currentPage}`}
                  style={pageImageStyle}
                  lensActive={lensActive}
                  lensZoom={lensZoom}
                />
              </div>

              {/* Mobile bottom tap navigation */}
              <div className="flex sm:hidden items-center justify-between w-full max-w-sm mt-4 gap-3">
                <button
                  type="button"
                  onClick={() => stepPage(-1)}
                  disabled={currentPage <= 1}
                  className="flex-1 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs font-semibold text-zinc-100 disabled:opacity-35"
                >
                  Previous Page
                </button>
                <button
                  type="button"
                  onClick={() => stepPage(1)}
                  disabled={currentPage >= totalPages}
                  className="flex-1 py-2.5 rounded-lg bg-amber-400 text-xs font-bold text-zinc-950 disabled:opacity-35"
                >
                  Next Page
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Scrubber & Issue Navigation Footer */}
      {totalPages > 0 && (
        <footer className="border-t border-zinc-800 bg-[#0d0d11]/95 px-4 sm:px-6 py-2 shrink-0 space-y-2">
          {showFilmstrip && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {pages.map((p) => {
                const isActive = p.index === currentPage;
                return (
                  <button
                    key={p.index}
                    type="button"
                    onClick={() => goToPage(p.index)}
                    className={`relative shrink-0 w-10 h-14 rounded overflow-hidden border transition-all ${
                      isActive
                        ? 'border-amber-400 ring-2 ring-amber-400/40 scale-105'
                        : 'border-zinc-800 opacity-60 hover:opacity-100'
                    }`}
                    title={`Page ${p.index}`}
                  >
                    <img
                      src={p.primary}
                      alt={`Page ${p.index}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[9px] font-mono tabular-nums text-white text-center leading-tight py-0.5">
                      {p.index}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={activeIndex <= 0}
                onClick={() =>
                  activeIndex > 0 && setActiveChapterId(orderedChapters[activeIndex - 1].id)
                }
                className="px-2.5 py-1 rounded border border-zinc-800 bg-zinc-900 text-xs text-zinc-300 hover:text-white disabled:opacity-35 whitespace-nowrap"
              >
                Prev Issue
              </button>
              <button
                type="button"
                disabled={activeIndex < 0 || activeIndex >= orderedChapters.length - 1}
                onClick={() =>
                  activeIndex < orderedChapters.length - 1 &&
                  setActiveChapterId(orderedChapters[activeIndex + 1].id)
                }
                className="px-2.5 py-1 rounded border border-zinc-800 bg-zinc-900 text-xs text-zinc-300 hover:text-white disabled:opacity-35 whitespace-nowrap"
              >
                Next Issue
              </button>
            </div>

            <div className="flex-1 flex items-center gap-3 max-w-xl">
              <span className="text-[11px] font-mono tabular-nums text-zinc-400 shrink-0">
                p.{currentPage}
              </span>
              <input
                type="range"
                min={1}
                max={totalPages}
                value={currentPage}
                onChange={(e) => goToPage(Number(e.target.value))}
                className="w-full accent-amber-400"
              />
              <span className="text-[11px] font-mono tabular-nums text-zinc-400 shrink-0">
                {totalPages}p
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowFilmstrip((v) => !v)}
              className="text-xs text-zinc-400 hover:text-zinc-100 whitespace-nowrap shrink-0"
            >
              {showFilmstrip ? 'Hide Strip' : 'Show Strip'}
            </button>
          </div>
        </footer>
      )}
    </div>
  );
};

export default ComicReaderModal;
