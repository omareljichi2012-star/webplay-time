import React, { useEffect, useRef, useState } from 'react';
import { GameItem } from '../types';
import { Play, Maximize2, Minimize2, RotateCcw, X, ShieldCheck, ShieldAlert, Cpu } from 'lucide-react';

interface GameLauncherProps {
  game: GameItem | null;
  onClose: () => void;
  onRestart?: () => void;
}

export const GameLauncher: React.FC<GameLauncherProps> = ({ game, onClose, onRestart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isIsolated, setIsIsolated] = useState<boolean>(false);
  const [hasSharedArrayBuffer, setHasSharedArrayBuffer] = useState<boolean>(false);

  // Cross-Origin Isolation Verification for WebAssembly Threads
  useEffect(() => {
    setIsIsolated(typeof window !== 'undefined' && Boolean(window.crossOriginIsolated));
    setHasSharedArrayBuffer(typeof window !== 'undefined' && typeof SharedArrayBuffer !== 'undefined');
  }, []);

  // Handle Fullscreen Toggle
  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  if (!game) return null;

  // Direct URL stream launching priority: streamUrl > rom_url > url
  const activeStreamSource = game.streamUrl || game.rom_url || game.url;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div 
        ref={containerRef}
        className="flex flex-col w-full max-w-5xl h-[90vh] bg-[#0e0f17] border border-[#282938] rounded-2xl overflow-hidden shadow-2xl"
      >
        {/* Launcher Control Header */}
        <header className="flex items-center justify-between px-5 py-3.5 bg-[#141523] border-b border-[#282938] shrink-0">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 text-xs font-bold uppercase rounded bg-purple-950/80 text-purple-300 border border-purple-800/40">
              {game.consoleType}
            </span>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide truncate max-w-md">
                {game.title}
              </h2>
              <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
                <span>{game.genre}</span>
                <span>•</span>
                <span>{game.year}</span>
                <span>•</span>
                <span className="flex items-center gap-1 font-mono text-[11px] text-emerald-400">
                  <Cpu size={12} />
                  {game.core?.toUpperCase() || 'WASM ENGINE'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Cross-Origin Isolation & SharedArrayBuffer Status Pill */}
            <div 
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${
                isIsolated && hasSharedArrayBuffer 
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40' 
                  : 'bg-amber-950/60 text-amber-300 border-amber-800/40'
              }`}
              title={isIsolated && hasSharedArrayBuffer ? 'COOP/COEP Active & SharedArrayBuffer Enabled' : 'Running in Standard Mode'}
            >
              {isIsolated && hasSharedArrayBuffer ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
              <span className="hidden sm:inline font-mono text-[10px]">
                {isIsolated && hasSharedArrayBuffer ? 'COOP/COEP ISOLATED' : 'STANDARD WORKER'}
              </span>
            </div>

            {/* Restart Engine Button */}
            {onRestart && (
              <button 
                onClick={onRestart}
                className="p-2 text-neutral-300 hover:text-white bg-[#1c1d2e] hover:bg-[#25273d] border border-[#282938] rounded-lg transition-colors"
                title="Restart Game Stream"
              >
                <RotateCcw size={15} />
              </button>
            )}

            {/* Toggle Fullscreen Button */}
            <button 
              onClick={handleToggleFullscreen}
              className="p-2 text-neutral-300 hover:text-white bg-[#1c1d2e] hover:bg-[#25273d] border border-[#282938] rounded-lg transition-colors"
              title="Fullscreen Display"
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>

            {/* Close Launcher Button */}
            <button 
              onClick={onClose}
              className="p-2 text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-900/50 border border-red-800/30 rounded-lg transition-colors"
              title="Close Player"
            >
              <X size={15} />
            </button>
          </div>
        </header>

        {/* Direct Stream Emulation Viewport */}
        <main className="relative flex-1 w-full bg-black overflow-hidden flex items-center justify-center">
          {game.engine === 'web' || game.engine === 'iframe' ? (
            <iframe 
              src={activeStreamSource}
              title={game.title}
              className="w-full h-full border-0 block"
              allow="autoplay; fullscreen; pointer-lock; touchscreen; cross-origin-isolated; keyboard-map; screen-wake-lock"
              allowFullScreen
            />
          ) : (
            <div id="game" className="w-full h-full relative" />
          )}

          {/* Direct Stream Active Indicator */}
          <div className="absolute bottom-3 left-4 pointer-events-none flex items-center gap-2 bg-[#090a10]/80 backdrop-blur border border-white/10 px-3 py-1.5 rounded-lg text-xs text-neutral-300 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[11px] truncate max-w-xs">
              Direct Stream Active
            </span>
          </div>
        </main>
      </div>
    </div>
  );
};
