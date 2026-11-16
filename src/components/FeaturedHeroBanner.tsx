import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, Gamepad2, ArrowUpRight, Zap, Globe, ShieldCheck, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { GameItem } from '../types';
import { SafeGameImage } from './SafeGameImage';

interface FeaturedHeroBannerProps {
  games: GameItem[];
  onLaunchGame: (game: GameItem) => void;
}

export const FeaturedHeroBanner: React.FC<FeaturedHeroBannerProps> = ({ games, onLaunchGame }) => {
  // Web Port games pool only
  const webPortGames = useMemo(() => {
    if (!games || games.length === 0) return [];
    const filtered = games.filter(
      g => g.consoleType === 'WebPort' || g.engine === 'web' || (g.id && g.id.includes('webport'))
    );
    return filtered.length > 0 ? filtered : games;
  }, [games]);

  const [featuredIndex, setFeaturedIndex] = useState<number>(0);

  // Pick GTA V or Half-Life 2 or random Web Port on mount
  useEffect(() => {
    if (!webPortGames || webPortGames.length === 0) return;
    const preferredIndex = webPortGames.findIndex(
      g => g.title.toLowerCase().includes('grand theft auto v') || g.title.toLowerCase().includes('gta v')
    );
    if (preferredIndex !== -1) {
      setFeaturedIndex(preferredIndex);
    } else {
      setFeaturedIndex(Math.floor(Math.random() * webPortGames.length));
    }
  }, [webPortGames]);

  const featuredGame = useMemo(() => {
    if (!webPortGames || webPortGames.length === 0) return null;
    return webPortGames[featuredIndex % webPortGames.length] || webPortGames[0];
  }, [webPortGames, featuredIndex]);

  const handleNext = () => {
    if (!webPortGames || webPortGames.length === 0) return;
    setFeaturedIndex(prev => (prev + 1) % webPortGames.length);
  };

  const handlePrev = () => {
    if (!webPortGames || webPortGames.length === 0) return;
    setFeaturedIndex(prev => (prev - 1 + webPortGames.length) % webPortGames.length);
  };

  const handleRandomShuffle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!webPortGames || webPortGames.length === 0) return;
    const nextIdx = Math.floor(Math.random() * webPortGames.length);
    setFeaturedIndex(nextIdx);
  };

  // Global Arrow Keys Shortcut Support for cycling Web Port games
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) || target?.isContentEditable) {
        return;
      }

      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [webPortGames]);

  if (!featuredGame) return null;

  return (
    <div className="relative my-4 w-full overflow-hidden rounded-3xl border border-purple-500/30 bg-gradient-to-r from-[#0c0618] via-[#140a2d] to-[#090416] p-6 sm:p-8 shadow-2xl shadow-purple-950/50 group">
      {/* Background Subtle Ambient Glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-purple-600/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Copy & Actions (Col 7) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Header Kicker Pill & Navigation Arrow Shortcut Controls */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-900/40 border border-purple-500/30 text-purple-300 text-[11px] font-extrabold tracking-wider">
              <Sparkles size={13} className="text-purple-400 shrink-0" />
              <span>ARCADE HUB • WEB PORTS</span>
            </div>

            {/* Navigation Arrow & Shuffle Controls */}
            <div className="flex items-center gap-1.5 bg-[#140b2a] border border-purple-500/30 rounded-2xl p-1 shadow-md">
              <button
                onClick={handlePrev}
                className="p-1.5 rounded-xl text-purple-300 hover:text-white hover:bg-purple-900/60 transition-all cursor-pointer"
                title="Previous Web Port (Left Arrow ←)"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="text-[10px] font-mono font-extrabold text-purple-300/80 px-1">
                {featuredIndex + 1} / {webPortGames.length}
              </span>

              <button
                onClick={handleNext}
                className="p-1.5 rounded-xl text-purple-300 hover:text-white hover:bg-purple-900/60 transition-all cursor-pointer"
                title="Next Web Port (Right Arrow →)"
              >
                <ChevronRight size={16} />
              </button>

              <div className="h-3 w-px bg-purple-500/30 mx-0.5" />

              <button
                onClick={handleRandomShuffle}
                className="p-1.5 rounded-xl text-purple-300 hover:text-white hover:bg-purple-900/60 transition-all cursor-pointer"
                title="Random Shuffle Web Port"
              >
                <RefreshCw size={14} className="hover:rotate-180 transition-transform duration-500" />
              </button>
            </div>
          </div>

          {/* Subtitle & Headline matching reference screenshot 100% */}
          <div>
            <span className="text-[11px] font-black uppercase tracking-widest text-purple-400 block">
              TODAY'S FEATURE
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight tracking-tight mt-1">
              Your next game <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-purple-200 to-indigo-300">starts here.</span>
            </h2>
          </div>

          {/* Featured Game Synopsis */}
          <div className="p-3.5 rounded-2xl bg-[#0e071e]/70 border border-purple-500/20 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-purple-600 text-white uppercase tracking-wider">
                {featuredGame.consoleType || 'WEBPORT'}
              </span>
              <h3 className="text-sm font-extrabold text-white truncate">
                {featuredGame.title}
              </h3>
              {featuredGame.year && (
                <span className="text-xs font-mono text-purple-300/70">
                  • {featuredGame.year}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300/90 leading-relaxed line-clamp-2">
              {featuredGame.synopsis || featuredGame.description || `Explore ${webPortGames.length} classic and browser games. Pick one and jump straight into the action.`}
            </p>
          </div>

          {/* Action Row: Play Button & Feature Badges matching reference screenshot 100% */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-4 flex-wrap">
            <button
              onClick={() => onLaunchGame(featuredGame)}
              className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-purple-600/40 transition-all transform hover:scale-105 active:scale-95 cursor-pointer shrink-0"
            >
              <Gamepad2 size={20} />
              <span className="tracking-wide">PLAY NOW</span>
              <ArrowUpRight size={18} />
            </button>

            {/* Feature Badges Row */}
            <div className="flex items-center gap-3 text-slate-400 text-xs font-semibold flex-wrap">
              <span className="inline-flex items-center gap-1">
                <Zap size={13} className="text-purple-400 shrink-0" />
                <span>{webPortGames.length} support embedding</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <Globe size={13} className="text-indigo-400 shrink-0" />
                <span>{webPortGames.length} games to discover</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
                <span>No downloads</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Artwork Panel (Col 5) matching reference screenshot 100% */}
        <div className="lg:col-span-5 relative">
          <div className="relative aspect-[16/9] sm:aspect-[16/10] w-full overflow-hidden rounded-2xl border border-purple-500/40 bg-black/60 shadow-2xl group/img">
            <SafeGameImage
              primaryUrl={featuredGame.poster || featuredGame.coverUrl}
              fallbackUrl={featuredGame.boxFront}
              title={featuredGame.title}
              consoleType={featuredGame.consoleType}
              alt={featuredGame.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover/img:scale-105"
            />

            {/* Dark Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c0618] via-transparent to-transparent opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0c0618]/60 via-transparent to-transparent" />

            {/* Floating Game Title Badge */}
            <div className="absolute top-3 left-3 px-3 py-1 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 text-white font-extrabold text-xs">
              {featuredGame.title}
            </div>

            {/* Bottom Right Portal Online Equalizer Indicator matching reference screenshot */}
            <div className="absolute bottom-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-purple-500/40 shadow-lg">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-300">
                PORTAL ONLINE
              </span>
              <div className="flex items-end gap-0.5 h-3">
                <span className="w-0.5 h-full bg-cyan-400 animate-pulse" />
                <span className="w-0.5 h-2/3 bg-cyan-400 animate-pulse delay-75" />
                <span className="w-0.5 h-4/5 bg-cyan-400 animate-pulse delay-150" />
                <span className="w-0.5 h-1/2 bg-cyan-400 animate-pulse delay-300" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeaturedHeroBanner;
