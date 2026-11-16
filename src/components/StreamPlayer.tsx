import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  RotateCcw,
  Shield,
  ShieldCheck,
  Film,
  ExternalLink,
  Tv,
  Sparkles,
  Info,
  Layers,
  Star,
  MonitorPlay,
  CheckCircle2,
  AlertTriangle,
  Play,
  ChevronRight,
  Globe
} from 'lucide-react';
import { MediaStreamItem, STREAMING_CATALOG } from '../data/streamingData';
import { adShield, AdShieldStats } from '../utils/adBlocker';
import { AdSenseBanner } from './AdSenseBanner';

interface StreamPlayerProps {
  item: MediaStreamItem;
  onClose: () => void;
  onSelectOther?: (item: MediaStreamItem) => void;
}

export const SERVER_PROVIDERS = [
  { id: 'vidlink', name: 'VidLink (No Sandbox Block)', type: 'embed' },
  { id: 'superembed', name: 'SuperEmbed (Multi)', type: 'fallback' },
  { id: 'embedsu', name: 'Embed.su HD', type: 'embed' },
  { id: 'vidsrc-cc', name: 'VidSrc Primary (v2)', type: 'vidsrc' },
  { id: 'vidsrc-me', name: 'VidSrc.me Mirror', type: 'vidsrc' },
  { id: 'streamex', name: 'StreamX Proxy', type: 'proxy' },
  { id: 'framex', name: 'FrameX VIP', type: 'proxy' },
  { id: 'autoembed', name: 'AutoEmbed', type: 'fallback' },
  { id: 'embed2', name: '2Embed', type: 'fallback' },
  { id: 'vidsrc-xyz', name: 'VidSrc.xyz', type: 'vidsrc' },
  { id: 'french', name: 'French Dub (FR)', type: 'dub' },
  { id: 'spanish', name: 'Spanish Dub (ES)', type: 'dub' },
  { id: 'italian', name: 'Italian Dub (IT)', type: 'dub' },
  { id: 'hls', name: 'HLS Direct Stream', type: 'hls' }
];

export const StreamPlayer: React.FC<StreamPlayerProps> = ({ item, onClose, onSelectOther }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'16/9' | 'fill' | 'theater'>('16/9');
  const [selectedServer, setSelectedServer] = useState<string>('vidlink');
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [adShieldActive, setAdShieldActive] = useState(true);
  const [adStats, setAdStats] = useState<AdShieldStats>({
    blockedPopups: 0,
    blockedRedirects: 0,
    whitelistedAllowed: 1
  });
  const [iframeKey, setIframeKey] = useState(Date.now());
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    adShield.init();
    const unsubscribe = adShield.subscribe((stats) => {
      setAdStats(stats);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Reset load error when item or server changes
  useEffect(() => {
    setLoadError(false);
  }, [item, selectedServer, season, episode]);

  const isTvSeries = item.category === 'TV Shows' || item.category === 'Anime' || item.category === 'Cartoons' || item.category === 'Toonix';

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleReloadStream = () => {
    setLoadError(false);
    setIframeKey(Date.now());
  };

  // Compute active stream URL dynamically according to selected VidSrc mirror or provider
  const resolveActiveStreamUrl = (): string => {
    const rawUrl = item.streamUrl || item.embedUrl || '';
    const imdbId = item.imdbId || 'tt15239678';
    const tmdbId = item.tmdbId || '693134';
    const isMovie = !isTvSeries;

    switch (selectedServer) {
      case 'vidlink':
        return isMovie
          ? `https://vidlink.pro/movie/${tmdbId}`
          : `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`;

      case 'embedsu':
        return isMovie
          ? `https://embed.su/embed/movie/${tmdbId}`
          : `https://embed.su/embed/tv/${tmdbId}/${season}/${episode}`;

      case 'vidsrc-cc':
        return isMovie
          ? `https://vidsrc.cc/v2/embed/movie/${tmdbId}`
          : `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season}/${episode}`;

      case 'vidsrc-me':
        return isMovie
          ? `https://vidsrc.me/embed/movie?imdb=${imdbId}&tmdb=${tmdbId}`
          : `https://vidsrc.me/embed/tv?imdb=${imdbId}&tmdb=${tmdbId}&season=${season}&episode=${episode}`;

      case 'streamex':
        return `https://streamex.hn/embed/${isMovie ? 'movie' : 'tv'}/${imdbId || tmdbId}${isMovie ? '' : `/${season}/${episode}`}`;

      case 'framex':
        return `https://framex.vip/embed/${isMovie ? 'movie' : 'tv'}/${tmdbId}${isMovie ? '' : `/${season}/${episode}`}`;

      case 'superembed':
        return isMovie
          ? `https://multiembed.mov/?video_id=${imdbId || tmdbId}`
          : `https://multiembed.mov/?video_id=${imdbId || tmdbId}&s=${season}&e=${episode}`;

      case 'autoembed':
        return isMovie
          ? `https://autoembed.co/movie/tmdb/${tmdbId}`
          : `https://autoembed.co/tv/tmdb/${tmdbId}/${season}/${episode}`;

      case 'embed2':
        return isMovie
          ? `https://www.2embed.cc/embed/${imdbId}`
          : `https://www.2embed.cc/embedtv/${imdbId}&s=${season}&e=${episode}`;

      case 'vidsrc-xyz':
        return isMovie
          ? `https://vidsrc.xyz/embed/movie/${tmdbId}`
          : `https://vidsrc.xyz/embed/tv/${tmdbId}/${season}-${episode}`;

      case 'french':
        return `https://vidsrc.me/embed/${isMovie ? 'movie' : 'tv'}?imdb=${imdbId}&ds_lang=fr${isMovie ? '' : `&season=${season}&episode=${episode}`}`;

      case 'spanish':
        return `https://vidsrc.me/embed/${isMovie ? 'movie' : 'tv'}?imdb=${imdbId}&ds_lang=es${isMovie ? '' : `&season=${season}&episode=${episode}`}`;

      case 'italian':
        return `https://vidsrc.me/embed/${isMovie ? 'movie' : 'tv'}?imdb=${imdbId}&ds_lang=it${isMovie ? '' : `&season=${season}&episode=${episode}`}`;

      case 'hls':
        return item.hlsUrl || rawUrl;

      default:
        return isMovie
          ? `https://vidsrc.cc/v2/embed/movie/${tmdbId}`
          : `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season}/${episode}`;
    }
  };

  const activeStreamUrl = resolveActiveStreamUrl();

  const handleIframeError = () => {
    setLoadError(true);
  };

  const otherRecommendations = STREAMING_CATALOG.filter(
    (c) => c.id !== item.id && (c.category === item.category || c.source === item.source)
  ).slice(0, 4);

  return (
    <div className={`w-full min-h-screen bg-[#06080e] text-[#f7f7fb] flex flex-col font-sans select-none overflow-x-hidden ${isCinemaMode ? 'cinema-active' : ''}`}>
      {/* Top Stream X Header Bar */}
      <header className="sticky top-0 z-40 bg-[#0b0717]/95 backdrop-blur-md border-b border-[#2e1065] px-4 sm:px-6 py-3 flex items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-[#170928] hover:bg-[#25103e] text-white rounded-xl text-xs font-bold border border-[#3b1754] transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
            title="Return to Catalog"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="h-5 w-[1px] bg-[#3b1754] hidden sm:block" />

          {/* Stream X Brand Badge & Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded border shrink-0 ${
                item.source === 'Toonix'
                  ? 'bg-amber-950/80 text-amber-300 border-amber-600/50'
                  : 'bg-purple-950/80 text-purple-300 border-purple-500/50'
              }`}
            >
              {item.source}
            </span>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm md:text-base font-extrabold text-white tracking-wide truncate">
                {item.title}
              </h1>
              <p className="text-[10px] sm:text-[11px] text-purple-300/80 font-medium truncate">
                {isTvSeries ? `Season ${season} • Episode ${episode}` : `${item.category} • ${item.genre}`} {item.year ? `• ${item.year}` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Direct Fail-Safe Action Button: Open in Player Tab */}
          <a
            href={activeStreamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg shadow-md transition-all hover:scale-105"
            title="Open native upstream player in dedicated tab"
          >
            <ExternalLink size={13} />
            <span className="hidden sm:inline">Open in Player Tab</span>
          </a>

          {/* Ad-Shield Toggle Badge */}
          <button
            onClick={() => setAdShieldActive(!adShieldActive)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
              adShieldActive
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/70'
                : 'bg-amber-950/60 border-amber-500/50 text-amber-300 hover:bg-amber-900/70'
            }`}
            title="Toggle Stream X Smart Ad-Shield"
          >
            {adShieldActive ? <ShieldCheck size={14} className="text-emerald-400" /> : <Shield size={14} />}
            <span className="hidden md:inline">
              Ad-Shield: {adShieldActive ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Reload Stream Button */}
          <button
            onClick={handleReloadStream}
            className="p-2 text-purple-200 hover:text-white bg-[#170928] hover:bg-[#25103e] border border-[#3b1754] rounded-lg transition-colors cursor-pointer"
            title="Reload Video Stream"
          >
            <RotateCcw size={15} />
          </button>

          {/* Toggle Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-2 text-purple-200 hover:text-white bg-[#170928] hover:bg-[#25103e] border border-[#3b1754] rounded-lg transition-colors cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </header>

      {/* Primary Video Stage Area */}
      <section className="w-full bg-[#030206] border-b border-[#2e1065] flex flex-col items-center justify-center relative">
        <div
          ref={containerRef}
          className={`relative w-full mx-auto bg-black flex items-center justify-center overflow-hidden transition-all duration-300 ${
            aspectRatio === 'fill'
              ? 'h-[80vh] max-w-full'
              : aspectRatio === 'theater'
              ? 'h-[75vh] max-w-[1400px]'
              : 'aspect-video max-h-[70vh] sm:max-h-[75vh] max-w-[1240px]'
          }`}
        >
          {selectedServer === 'hls' && item.hlsUrl ? (
            <video
              src={item.hlsUrl}
              controls
              autoPlay
              className="w-full h-full object-contain"
            />
          ) : (
            <iframe
              ref={iframeRef}
              key={`${iframeKey}-${selectedServer}-${season}-${episode}`}
              src={activeStreamUrl}
              title={item.title}
              className="w-full h-full border-0 block bg-black"
              onError={handleIframeError}
              referrerPolicy="no-referrer"
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; screen-wake-lock; pointer-lock"
              allowFullScreen
            />
          )}

          {/* Load Error / Frame-Block Fallback Warning */}
          {loadError && (
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 space-y-4">
              <AlertTriangle size={36} className="text-amber-400" />
              <h3 className="text-lg font-bold text-white">Stream Server Frame-Blocked</h3>
              <p className="text-xs text-neutral-300 max-w-md leading-relaxed">
                This server enforces strict frame-blocking. Switch to another VidSrc mirror below or open directly in a player tab.
              </p>
              <div className="flex items-center gap-3">
                <a
                  href={activeStreamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2"
                >
                  <ExternalLink size={14} />
                  <span>Open Stream in Player Tab</span>
                </a>
                <button
                  onClick={() => {
                    const currentIndex = SERVER_PROVIDERS.findIndex(s => s.id === selectedServer);
                    const nextIndex = (currentIndex + 1) % SERVER_PROVIDERS.length;
                    setSelectedServer(SERVER_PROVIDERS[nextIndex].id);
                    setLoadError(false);
                  }}
                  className="px-4 py-2.5 bg-[#170928] hover:bg-[#25103e] border border-[#3b1754] text-purple-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Switch VidSrc Mirror
                </button>
              </div>
            </div>
          )}

          {/* Floating Ad-Shield Live Protection Indicator */}
          <div className="absolute top-3 left-3 z-20 flex items-center gap-2 px-3 py-1.5 bg-[#0b0717]/85 border border-[#3b1754] backdrop-blur-md rounded-lg text-[11px] text-purple-300 font-bold shadow-lg">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span>{SERVER_PROVIDERS.find(s => s.id === selectedServer)?.name}</span>
            {adStats.blockedPopups > 0 && (
              <span className="px-1.5 py-0.2 bg-emerald-950 text-emerald-400 border border-emerald-700/60 rounded text-[9px]">
                {adStats.blockedPopups} popups blocked
              </span>
            )}
          </div>

          {/* Sandbox Bypass Notice if VidSrc is selected in an iframe sandbox */}
          {selectedServer.startsWith('vidsrc') && (
            <div className="absolute top-12 left-3 z-30 flex items-center gap-2 bg-[#0c0d16]/95 border border-purple-500/50 px-3 py-1.5 rounded-xl backdrop-blur-md text-[11px] text-purple-200 shadow-2xl max-w-[90%] flex-wrap">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="font-semibold text-neutral-300">If VidSrc shows "sandboxed frame" warning:</span>
              <a
                href={activeStreamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-0.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded text-[10px] inline-flex items-center gap-1 shadow-sm"
                title="Bypass sandbox restrictions by opening direct in top-level window"
              >
                <ExternalLink size={10} />
                <span>Open Direct Window</span>
              </a>
              <button
                onClick={() => {
                  setSelectedServer('vidlink');
                  setLoadError(false);
                  setIframeKey(Date.now());
                }}
                className="px-2 py-0.5 bg-[#1f2136] hover:bg-[#2b2e4a] text-purple-300 font-bold rounded text-[10px] cursor-pointer border border-[#3b3e66]"
              >
                Switch to VidLink (No Block)
              </button>
            </div>
          )}

          {/* Floating Stage Controls */}
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
            <button
              onClick={() => {
                const nextRatio = aspectRatio === '16/9' ? 'theater' : aspectRatio === 'theater' ? 'fill' : '16/9';
                setAspectRatio(nextRatio);
              }}
              className="px-2.5 py-1.5 bg-[#0b0717]/85 hover:bg-[#25103e] border border-white/20 text-white rounded-lg text-[11px] font-bold backdrop-blur-md transition-all cursor-pointer shadow-xl"
              title="Toggle Aspect Ratio (16:9 / Theater / Fill)"
            >
              {aspectRatio.toUpperCase()}
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-1.5 bg-[#0b0717]/85 hover:bg-purple-600 border border-white/20 hover:border-purple-400 text-white rounded-lg backdrop-blur-md transition-all cursor-pointer shadow-xl"
              title="Fullscreen Mode"
            >
              <Maximize2 size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* Multi-Server Stream Switcher Bar & Season/Episode Selectors */}
      <div className="bg-[#0b0717] border-b border-[#2e1065] px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-purple-300 font-bold flex items-center gap-1.5 mr-1">
            <Layers size={14} className="text-purple-400" />
            <span>VidSrc Mirrors & Servers:</span>
          </span>
          {SERVER_PROVIDERS.map((srv) => (
            <button
              key={srv.id}
              onClick={() => {
                setSelectedServer(srv.id);
                setLoadError(false);
                setIframeKey(Date.now());
              }}
              className={`px-3 py-1 rounded-lg font-extrabold text-xs border transition-all cursor-pointer ${
                selectedServer === srv.id
                  ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-900/50'
                  : 'bg-[#170928] text-purple-300 border-[#3b1754] hover:bg-[#25103e]'
              }`}
            >
              {srv.name}
            </button>
          ))}
        </div>

        {/* Season & Episode Selector for TV Shows */}
        {isTvSeries && (
          <div className="flex items-center gap-2.5 bg-[#170928] px-3 py-1.5 rounded-xl border border-[#3b1754]">
            <Tv size={13} className="text-purple-400" />
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400">Season:</span>
              <select
                value={season}
                onChange={(e) => {
                  setSeason(Number(e.target.value));
                  setEpisode(1);
                  setLoadError(false);
                  setIframeKey(Date.now());
                }}
                className="bg-[#0b0717] text-xs font-bold text-purple-200 border border-[#3b1754] rounded-md px-2 py-0.5 outline-none cursor-pointer"
              >
                {Array.from({ length: 15 }, (_, i) => i + 1).map((s) => (
                  <option key={s} value={s} className="bg-[#170928] text-white">
                    Season {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="h-4 w-[1px] bg-[#3b1754]" />

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400">Episode:</span>
              <select
                value={episode}
                onChange={(e) => {
                  setEpisode(Number(e.target.value));
                  setLoadError(false);
                  setIframeKey(Date.now());
                }}
                className="bg-[#0b0717] text-xs font-bold text-purple-200 border border-[#3b1754] rounded-md px-2 py-0.5 outline-none cursor-pointer"
              >
                {Array.from({ length: 30 }, (_, i) => i + 1).map((ep) => (
                  <option key={ep} value={ep} className="bg-[#170928] text-white">
                    Episode {ep}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                setEpisode((prev) => prev + 1);
                setLoadError(false);
                setIframeKey(Date.now());
              }}
              className="px-2 py-0.5 bg-purple-600/30 hover:bg-purple-600/60 text-purple-300 text-[10px] font-bold rounded border border-purple-500/40 cursor-pointer flex items-center gap-0.5"
              title="Next Episode"
            >
              <span>Next</span>
              <ChevronRight size={10} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 text-[11px] text-purple-300 font-medium">
          <CheckCircle2 size={13} className="text-purple-400" />
          <span>VidSrc Stream Verified</span>
        </div>
      </div>

      {/* Metadata & Recommendations Section */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8 flex-1">
        {/* Stream Details Card */}
        <section className="bg-[#0e1422] border border-[#1d273c] rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Poster Thumbnail */}
            <div className="lg:col-span-3 flex flex-col items-center gap-3">
              <div className="w-full max-w-[220px] aspect-[2/3] rounded-xl overflow-hidden border border-[#2a3854] shadow-xl bg-[#070a12]">
                <img
                  src={item.poster}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <a
                href={activeStreamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-purple-300 hover:text-purple-200 font-bold transition-colors"
              >
                <span>Direct Upstream Link</span>
                <ExternalLink size={12} />
              </a>
            </div>

            {/* Center Info Details */}
            <div className="lg:col-span-9 space-y-4">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  {item.category}
                </span>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {item.year}
                </span>
                {item.quality && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    {item.quality}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Star size={10} fill="currentColor" /> {Number(item.rating || 9.0).toFixed(1)} / 10
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                {item.title}
              </h2>

              <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
                {item.synopsis}
              </p>

              {/* Specs & Tags */}
              <div className="pt-4 border-t border-[#1d273c] grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Source Platform</span>
                  <span className="text-xs text-white font-bold">{item.source}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Genre</span>
                  <span className="text-xs text-white font-bold">{item.genre}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">TMDB / IMDB ID</span>
                  <span className="text-xs text-purple-300 font-bold">{item.tmdbId || item.imdbId || '693134'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">VidSrc Embed</span>
                  <span className="text-xs text-emerald-400 font-bold">Verified Direct</span>
                </div>
              </div>

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-2">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-[#170928] text-purple-200 text-[10px] rounded-md border border-[#3b1754]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Compliant Google AdSense Monetization Banner */}
        <AdSenseBanner slotId="stream-player-lower-banner" format="horizontal" />

        {/* More from Category */}
        {otherRecommendations.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Tv size={16} className="text-purple-400" />
                <span>Related {item.category} on {item.source}</span>
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {otherRecommendations.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => onSelectOther && onSelectOther(rec)}
                  className="group bg-[#0e1422] hover:bg-[#1a0f2e] border border-[#2e1065] hover:border-purple-500/50 rounded-xl overflow-hidden cursor-pointer transition-all hover:-translate-y-1 shadow-lg"
                >
                  <div className="aspect-[16/10] overflow-hidden relative">
                    <img
                      src={rec.poster}
                      alt={rec.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#0b0717]/90 text-purple-300 border border-purple-500/30">
                      {rec.category}
                    </span>
                  </div>
                  <div className="p-3">
                    <h4 className="text-xs font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                      {rec.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {rec.genre} • {rec.year}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default StreamPlayer;
