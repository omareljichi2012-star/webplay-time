import React from 'react';
import { X, Box, Disc, Sparkles, Gamepad2, Info, CheckCircle2 } from 'lucide-react';
import { GameBox3DEngine } from './GameBox3DEngine';
import { SafeGameImage } from './SafeGameImage';

interface GameBox3DModalProps {
  game: {
    title: string;
    poster?: string;
    posterUrl?: string;
    coverUrl?: string;
    boxFront?: string;
    box3d?: string | null;
    box3dUrl?: string | null;
    cartridge?: string | null;
    cartridgeUrl?: string | null;
    cartridge3DUrl?: string | null;
    cartridgeFrontUrl?: string | null;
    boxFrontUrl?: string | null;
    boxBackUrl?: string | null;
    boxSpineUrl?: string | null;
    cartridgeBackUrl?: string | null;
    launchboxId?: number | string | null;
    launchboxUrl?: string | null;
    launchboxAssetSource?: string | null;
    publisher?: string;
    developer?: string;
    year?: number | string;
    genre?: string;
    synopsis?: string;
    rating?: number | string;
    consoleType?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export const GameBox3DModal: React.FC<GameBox3DModalProps> = ({ game, isOpen, onClose }) => {
  if (!isOpen || !game) return null;

  const poster = game.poster || game.posterUrl || game.coverUrl || game.boxFront;
  const box3d = game.box3dUrl || game.box3d || poster;
  const cartridge = game.cartridge3DUrl || game.cartridgeFrontUrl || game.cartridgeUrl || game.cartridge;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-[#0e0f18] border border-[#2b2d45] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#202235] bg-[#121320]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Box size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-wide">{game.title}</h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-purple-950/80 text-purple-300 border border-purple-800/50">
                  {game.consoleType || 'NES'} 3D STAGE
                </span>
                {game.launchboxId ? (
                  <a
                    href={game.launchboxUrl || `https://gamesdb.launchbox-app.com/games/details/${game.launchboxId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/50 hover:bg-emerald-900/90 transition-colors"
                  >
                    <CheckCircle2 size={10} /> LAUNCHBOX #{game.launchboxId}
                  </a>
                ) : (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/50">
                    <CheckCircle2 size={10} /> LAUNCHBOX ASSETS
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400">
                Interactive Three.js Engine • 3D Retail Box, 3D Physical Cartridge & Eject Unboxing Animation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white bg-[#1a1c2c] hover:bg-[#282b45] rounded-xl border border-white/5 transition-colors cursor-pointer"
            title="Close 3D Viewer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Engine Main Stage */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-[480px]">
          {/* 3D Viewport */}
          <div className="flex-1 relative bg-gradient-to-b from-[#090a10] to-[#040508] p-3 sm:p-4 flex flex-col">
            <GameBox3DEngine
              title={game.title}
              posterUrl={poster}
              box3dUrl={box3d}
              cartridgeUrl={cartridge}
              cartridge3DUrl={game.cartridge3DUrl || undefined}
              cartridgeFrontUrl={game.cartridgeFrontUrl || undefined}
              boxFrontUrl={game.boxFrontUrl}
              boxBackUrl={game.boxBackUrl}
              boxSpineUrl={game.boxSpineUrl}
              cartridgeBackUrl={game.cartridgeBackUrl}
              launchboxId={game.launchboxId}
              launchboxUrl={game.launchboxUrl}
              publisher={game.publisher || game.developer}
              year={game.year}
              genre={game.genre}
              synopsis={game.synopsis}
              consoleType={game.consoleType || 'NES'}
              initialMode="duo"
              className="flex-1 w-full min-h-[420px] shadow-2xl"
            />
          </div>

          {/* Details Sidebar */}
          <div className="w-full md:w-80 p-5 bg-[#11121d] border-t md:border-t-0 md:border-l border-[#202235] flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Hardware & Packaging</span>
                <h3 className="text-sm font-bold text-white mt-1">
                  {game.consoleType === 'PS1' ? 'Authentic 1995 PS1 CD Jewel Case' : 'Authentic 1985 NES Physical Pak'}
                </h3>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  {game.consoleType === 'PS1'
                    ? '3D jewel case presentation with clear polystyrene casing, iconic black spine banner, rear tray inlay, and authentic 700MB PlayStation black CD-ROM disc.'
                    : 'Dual model inspection with textured ABS grey plastic body, 5-ridge top ventilation grooves, recessed label pocket, rear warning label, and 72-pin gold edge connector.'}
                </p>
              </div>

              {/* Media Thumbnails Row */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1e2030]">
                <div className="p-2 rounded-xl bg-[#171929] border border-[#23263e]">
                  <span className="text-[9px] font-mono font-bold text-neutral-400 uppercase block mb-1">Retail Box Art</span>
                  <div className="aspect-[3/4] rounded-lg overflow-hidden bg-[#090a12]">
                    <SafeGameImage
                      primaryUrl={box3d}
                      fallbackUrl={poster}
                      alt={`${game.title} Box Art`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-[#171929] border border-[#23263e]">
                  <span className="text-[9px] font-mono font-bold text-neutral-400 uppercase block mb-1">Cartridge Label</span>
                  <div className="aspect-[3/4] rounded-lg overflow-hidden bg-[#090a12]">
                    <SafeGameImage
                      primaryUrl={cartridge}
                      fallbackUrl={poster}
                      alt={`${game.title} Cartridge`}
                      className="w-full h-full object-contain p-1"
                    />
                  </div>
                </div>
              </div>

              {/* Game Metadata Table */}
              <div className="space-y-1.5 pt-2 border-t border-[#1e2030] text-xs">
                <div className="flex justify-between py-1 text-neutral-400 border-b border-white/5">
                  <span>Year Released:</span>
                  <span className="font-mono text-neutral-200">{game.year || '1988'}</span>
                </div>
                <div className="flex justify-between py-1 text-neutral-400 border-b border-white/5">
                  <span>Genre:</span>
                  <span className="font-semibold text-neutral-200">{game.genre || 'Action'}</span>
                </div>
                <div className="flex justify-between py-1 text-neutral-400 border-b border-white/5">
                  <span>Publisher:</span>
                  <span className="text-neutral-200 truncate max-w-[140px] text-right">{game.publisher || 'Nintendo'}</span>
                </div>
                <div className="flex justify-between py-1 text-neutral-400 border-b border-white/5">
                  <span>Rating:</span>
                  <span className="font-mono text-amber-400 font-bold">{game.rating || '9.5'} / 10</span>
                </div>
              </div>

              {/* Interaction Hints */}
              <div className="p-3 rounded-xl bg-[#171928] border border-[#26283e]">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-300 mb-1">
                  <Info size={13} className="text-purple-400" />
                  <span>3D Interaction Features</span>
                </div>
                <ul className="text-[11px] text-neutral-400 space-y-1 list-disc list-inside">
                  <li>Toggle between <b>3D Box</b>, <b>Cartridge</b>, and <b>Duo Combo</b></li>
                  <li>Click <b>Eject Pak</b> to slide cartridge out of the box in real time</li>
                  <li>Rotate 360° freely with mouse or touch</li>
                  <li>Select Studio, Neon, or Dramatic lighting</li>
                </ul>
              </div>
            </div>

            <button
              onClick={onClose}
              className="mt-4 w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-900/30 transition-all cursor-pointer text-center"
            >
              Done Inspecting
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameBox3DModal;
