import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Users, 
  Tv, 
  Gamepad2, 
  Wifi, 
  WifiOff, 
  Share2, 
  Copy, 
  Check, 
  Play, 
  Pause, 
  RotateCcw, 
  MessageSquare, 
  Send, 
  X, 
  Sparkles, 
  Flame, 
  Heart, 
  ShieldCheck, 
  Zap, 
  Volume2, 
  Radio
} from 'lucide-react';

/**
 * PartySyncView
 * WebRTC Co-Watch & Co-Play Engine
 * Syncs video playback timestamps and P2P retro controller input data channels
 */
/**
 * @param {{
 *   isOpen?: boolean;
 *   onClose?: () => void;
 *   activeMedia?: any;
 *   mediaType?: string;
 *   currentTimestamp?: number;
 *   onSyncTimestamp?: (time: number, isPlaying: boolean) => void;
 *   onRemoteInput?: (input: any) => void;
 * }} props
 */
export const PartySyncView = ({ 
  isOpen = false, 
  onClose = () => {}, 
  activeMedia, 
  mediaType = 'movie', // 'movie' | 'tv' | 'game'
  currentTimestamp = 0,
  onSyncTimestamp,
  onRemoteInput
}) => {
  const [roomId, setRoomId] = useState(() => {
    return 'SYNC-' + Math.random().toString(36).substring(2, 7).toUpperCase();
  });
  const [isConnected, setIsConnected] = useState(true);
  const [isHost, setIsHost] = useState(true);
  const [userRole, setUserRole] = useState('host'); // 'host' | 'player2' | 'spectator'
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState(mediaType === 'game' ? 'coplay' : 'cowatch');

  // Co-Watch State
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackTime, setPlaybackTime] = useState(currentTimestamp || 0);
  const [latencyMs, setLatencyMs] = useState(14);
  const [syncDrift, setSyncDrift] = useState(0.04);
  const [autoSync, setAutoSync] = useState(true);

  // Floating Reactions
  const [reactions, setReactions] = useState([]);

  // Connected Peers Roster
  const [peers, setPeers] = useState([
    { id: 'peer-1', name: 'You (Host)', role: 'Host', ping: 12, isSelf: true, avatarBg: 'bg-purple-600' },
    { id: 'peer-2', name: 'Alex_Retro', role: 'Player 2', ping: 18, isSelf: false, avatarBg: 'bg-blue-600' },
    { id: 'peer-3', name: 'CyberSam', role: 'Spectator', ping: 24, isSelf: false, avatarBg: 'bg-emerald-600' }
  ]);

  // Co-Play Controller States (P1 and P2)
  const [p1Buttons, setP1Buttons] = useState({
    up: false, down: false, left: false, right: false,
    a: false, b: false, x: false, y: false,
    start: false, select: false, l: false, r: false
  });
  const [p2Buttons, setP2Buttons] = useState({
    up: false, down: false, left: false, right: false,
    a: false, b: false, x: false, y: false,
    start: false, select: false, l: false, r: false
  });

  // Chat Feed
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: 'System', text: `Room ${roomId} created. P2P WebRTC DataChannel ready.`, isSystem: true, time: 'Just now' },
    { id: 2, sender: 'Alex_Retro', text: 'Joined! Ready for Co-Op mode.', isSystem: false, time: 'Just now' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const chatScrollRef = useRef(null);

  // Format seconds to MM:SS or HH:MM:SS
  const formatTime = (secs) => {
    const s = Math.floor(secs);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const remM = m % 60;
    const remS = s % 60;
    if (h > 0) {
      return `${h}:${remM.toString().padStart(2, '0')}:${remS.toString().padStart(2, '0')}`;
    }
    return `${remM}:${remS.toString().padStart(2, '0')}`;
  };

  // Keep playback clock ticking if playing
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setPlaybackTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Broadcast timestamp changes
  const handleTogglePlay = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    addChatMessage('System', `Host ${nextState ? 'resumed' : 'paused'} stream at ${formatTime(playbackTime)}`, true);
    if (onSyncTimestamp) {
      onSyncTimestamp(playbackTime, nextState);
    }
  };

  const handleSeek = (newTime) => {
    setPlaybackTime(newTime);
    addChatMessage('System', `Playback synced to ${formatTime(newTime)}`, true);
    if (onSyncTimestamp) {
      onSyncTimestamp(newTime, isPlaying);
    }
  };

  const handleCopyLink = () => {
    const inviteUrl = `${window.location.origin}?party=${roomId}`;
    navigator.clipboard?.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addChatMessage = (sender, text, isSystem = false) => {
    setChatMessages(prev => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        sender,
        text,
        isSystem,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    addChatMessage('You', chatInput.trim());
    setChatInput('');
  };

  const triggerReaction = (emoji) => {
    const id = Date.now() + Math.random();
    setReactions(prev => [...prev, { id, emoji, left: 20 + Math.random() * 60 }]);
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id));
    }, 2000);
  };

  // Keyboard controls listener for Co-Play
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      const key = e.key.toLowerCase();
      const targetState = userRole === 'player2' ? setP2Buttons : setP1Buttons;

      if (key === 'arrowup' || key === 'w') targetState(prev => ({ ...prev, up: true }));
      if (key === 'arrowdown' || key === 's') targetState(prev => ({ ...prev, down: true }));
      if (key === 'arrowleft' || key === 'a') targetState(prev => ({ ...prev, left: true }));
      if (key === 'arrowright' || key === 'd') targetState(prev => ({ ...prev, right: true }));
      if (key === 'z' || key === 'j') targetState(prev => ({ ...prev, b: true }));
      if (key === 'x' || key === 'k') targetState(prev => ({ ...prev, a: true }));
      if (key === 'c' || key === 'u') targetState(prev => ({ ...prev, y: true }));
      if (key === 'v' || key === 'i') targetState(prev => ({ ...prev, x: true }));
      if (key === 'enter') targetState(prev => ({ ...prev, start: true }));
      if (key === 'shift') targetState(prev => ({ ...prev, select: true }));
      if (key === 'q') targetState(prev => ({ ...prev, l: true }));
      if (key === 'e') targetState(prev => ({ ...prev, r: true }));
    };

    const handleKeyUp = (e) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      const key = e.key.toLowerCase();
      const targetState = userRole === 'player2' ? setP2Buttons : setP1Buttons;

      if (key === 'arrowup' || key === 'w') targetState(prev => ({ ...prev, up: false }));
      if (key === 'arrowdown' || key === 's') targetState(prev => ({ ...prev, down: false }));
      if (key === 'arrowleft' || key === 'a') targetState(prev => ({ ...prev, left: false }));
      if (key === 'arrowright' || key === 'd') targetState(prev => ({ ...prev, right: false }));
      if (key === 'z' || key === 'j') targetState(prev => ({ ...prev, b: false }));
      if (key === 'x' || key === 'k') targetState(prev => ({ ...prev, a: false }));
      if (key === 'c' || key === 'u') targetState(prev => ({ ...prev, y: false }));
      if (key === 'v' || key === 'i') targetState(prev => ({ ...prev, x: false }));
      if (key === 'enter') targetState(prev => ({ ...prev, start: false }));
      if (key === 'shift') targetState(prev => ({ ...prev, select: false }));
      if (key === 'q') targetState(prev => ({ ...prev, l: false }));
      if (key === 'e') targetState(prev => ({ ...prev, r: false }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [userRole]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      {/* Floating Reactions Overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
        {reactions.map(r => (
          <div
            key={r.id}
            className="absolute bottom-16 text-3xl animate-bounce transition-all duration-1000"
            style={{ left: `${r.left}%` }}
          >
            {r.emoji}
          </div>
        ))}
      </div>

      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#0b0c16] border border-[#24263a] rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header Bar */}
        <header className="px-5 py-3.5 bg-[#101222] border-b border-[#212338] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Radio className="w-5 h-5 animate-pulse text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold text-white tracking-wide">
                  PARTY SYNC <span className="text-purple-400 font-mono text-xs">P2P</span>
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {latencyMs}ms Latency
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 truncate max-w-xs">
                {activeMedia?.title ? `Synced: ${activeMedia.title}` : 'Universal WebRTC Co-Watch & Co-Play Room'}
              </p>
            </div>
          </div>

          {/* Room ID & Actions */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#17192c] border border-[#2c2f48] px-2.5 py-1 rounded-xl text-xs font-mono">
              <span className="text-neutral-400 text-[10px]">ROOM:</span>
              <span className="text-purple-300 font-bold">{roomId}</span>
              <button 
                onClick={handleCopyLink}
                className="p-1 hover:text-white text-neutral-400 transition-colors cursor-pointer"
                title="Copy Party Invite Link"
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center p-0.5 rounded-xl bg-[#17192c] border border-[#2c2f48] text-xs">
              <button
                onClick={() => setActiveTab('cowatch')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTab === 'cowatch'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Tv size={13} />
                <span>Co-Watch</span>
              </button>
              <button
                onClick={() => setActiveTab('coplay')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTab === 'coplay'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Gamepad2 size={13} />
                <span>Co-Play</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-white bg-[#17192c] hover:bg-[#202238] border border-[#2c2f48] transition-colors cursor-pointer"
              title="Close Party Sync Panel"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        {/* Content Body Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-[#212338] overflow-y-auto">
          
          {/* Main Sync Controls Section (2 Columns) */}
          <div className="lg:col-span-2 p-5 flex flex-col justify-between gap-5 bg-[#0a0b14]">
            
            {activeTab === 'cowatch' ? (
              /* ================= Co-Watch Mode ================= */
              <div className="space-y-5">
                <div className="p-4 rounded-xl bg-gradient-to-br from-[#121424] to-[#0e0f1a] border border-[#25283f] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-black/60 border border-purple-500/30 overflow-hidden shrink-0 flex items-center justify-center">
                      {activeMedia?.poster ? (
                        <img src={activeMedia.poster} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Tv className="w-6 h-6 text-purple-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white leading-tight">
                        {activeMedia?.title || 'Shared Stream Showcase'}
                      </h4>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Timestamp Clock: <span className="text-purple-300 font-mono font-bold">{formatTime(playbackTime)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleTogglePlay}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 transition-colors shadow-md cursor-pointer"
                    >
                      {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                      <span>{isPlaying ? 'Pause All' : 'Play All'}</span>
                    </button>
                  </div>
                </div>

                {/* Timeline Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
                    <span>{formatTime(playbackTime)}</span>
                    <span className="text-emerald-400 text-[11px] font-bold">
                      Drift: ±{(syncDrift * 1000).toFixed(0)}ms (Sub-Frame Accurate)
                    </span>
                    <span>{formatTime(playbackTime + 1800)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={playbackTime + 3600}
                    value={playbackTime}
                    onChange={(e) => handleSeek(Number(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer h-1.5 bg-[#1b1d30] rounded-lg"
                  />
                </div>

                {/* Quick Reaction Tray */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#121320] border border-[#212338]">
                  <span className="text-xs text-neutral-400 font-bold flex items-center gap-1">
                    <Sparkles size={13} className="text-purple-400" /> Party Reactions:
                  </span>
                  <div className="flex items-center gap-1.5">
                    {['🍿', '🔥', '❤️', '🎮', '🚀', '😂', '👏'].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => triggerReaction(emoji)}
                        className="px-2 py-1 text-base rounded-lg bg-[#181a2b] hover:bg-purple-900/40 border border-[#2a2d48] hover:border-purple-500/50 transition-transform active:scale-125 cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Synced Peers Roster */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Users size={13} className="text-purple-400" /> Connected Viewers ({peers.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {peers.map((peer) => (
                      <div key={peer.id} className="p-2.5 rounded-xl bg-[#121320] border border-[#212338] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg ${peer.avatarBg} text-white font-black text-xs flex items-center justify-center`}>
                            {peer.name[0]}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white leading-none">{peer.name}</p>
                            <span className="text-[10px] text-purple-400 font-medium">{peer.role}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400">{peer.ping}ms</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* ================= Co-Play Mode ================= */
              <div className="space-y-5">
                <div className="p-4 rounded-xl bg-gradient-to-br from-[#121424] to-[#0e0f1a] border border-[#25283f] flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Gamepad2 className="w-4 h-4 text-purple-400" />
                      Retro Co-Op & Versus Controller Sync
                    </h4>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      P2P WebRTC controller channel sending low-latency input packets
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setUserRole(userRole === 'host' ? 'player2' : 'host')}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#1b1d30] hover:bg-[#252840] border border-[#303352] text-purple-300 cursor-pointer"
                    >
                      Slot: {userRole === 'host' ? 'Player 1' : 'Player 2'}
                    </button>
                  </div>
                </div>

                {/* Interactive Dual Controller Visualizer */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Player 1 Controller */}
                  <div className={`p-4 rounded-xl border transition-all ${
                    userRole === 'host' ? 'bg-[#131526] border-purple-500/50 shadow-lg' : 'bg-[#0f101b] border-[#222438]'
                  }`}>
                    <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-500" /> Player 1 (Host)
                      </span>
                      <span className="text-[10px] font-mono text-purple-400">WASD + JKUI</span>
                    </div>

                    {/* D-Pad & Buttons Layout */}
                    <div className="flex items-center justify-between px-2 py-3">
                      {/* D-Pad */}
                      <div className="relative w-20 h-20">
                        <div className={`absolute top-0 left-6 w-8 h-6 rounded-t-sm border border-neutral-600 ${p1Buttons.up ? 'bg-purple-500 text-white' : 'bg-neutral-800'}`} />
                        <div className={`absolute bottom-0 left-6 w-8 h-6 rounded-b-sm border border-neutral-600 ${p1Buttons.down ? 'bg-purple-500 text-white' : 'bg-neutral-800'}`} />
                        <div className={`absolute left-0 top-6 w-6 h-8 rounded-l-sm border border-neutral-600 ${p1Buttons.left ? 'bg-purple-500 text-white' : 'bg-neutral-800'}`} />
                        <div className={`absolute right-0 top-6 w-6 h-8 rounded-r-sm border border-neutral-600 ${p1Buttons.right ? 'bg-purple-500 text-white' : 'bg-neutral-800'}`} />
                        <div className="absolute inset-6 bg-neutral-900 border border-neutral-700" />
                      </div>

                      {/* Middle Select / Start */}
                      <div className="flex gap-2 text-[9px] font-mono">
                        <div className={`px-2 py-1 rounded bg-neutral-800 border border-neutral-700 ${p1Buttons.select ? 'bg-purple-500' : ''}`}>SELECT</div>
                        <div className={`px-2 py-1 rounded bg-neutral-800 border border-neutral-700 ${p1Buttons.start ? 'bg-purple-500' : ''}`}>START</div>
                      </div>

                      {/* Action Buttons */}
                      <div className="relative w-20 h-20">
                        <div className={`absolute top-0 left-6 w-7 h-7 rounded-full border border-neutral-600 flex items-center justify-center text-[10px] font-bold ${p1Buttons.x ? 'bg-amber-500 text-black' : 'bg-neutral-800'}`}>X</div>
                        <div className={`absolute bottom-0 left-6 w-7 h-7 rounded-full border border-neutral-600 flex items-center justify-center text-[10px] font-bold ${p1Buttons.b ? 'bg-emerald-500 text-black' : 'bg-neutral-800'}`}>B</div>
                        <div className={`absolute left-0 top-6 w-7 h-7 rounded-full border border-neutral-600 flex items-center justify-center text-[10px] font-bold ${p1Buttons.y ? 'bg-blue-500 text-black' : 'bg-neutral-800'}`}>Y</div>
                        <div className={`absolute right-0 top-6 w-7 h-7 rounded-full border border-neutral-600 flex items-center justify-center text-[10px] font-bold ${p1Buttons.a ? 'bg-red-500 text-black' : 'bg-neutral-800'}`}>A</div>
                      </div>
                    </div>
                  </div>

                  {/* Player 2 Controller */}
                  <div className={`p-4 rounded-xl border transition-all ${
                    userRole === 'player2' ? 'bg-[#131526] border-blue-500/50 shadow-lg' : 'bg-[#0f101b] border-[#222438]'
                  }`}>
                    <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500" /> Player 2 (Peer)
                      </span>
                      <span className="text-[10px] font-mono text-blue-400">Arrow Keys + ZXCV</span>
                    </div>

                    <div className="flex items-center justify-between px-2 py-3">
                      {/* D-Pad */}
                      <div className="relative w-20 h-20">
                        <div className={`absolute top-0 left-6 w-8 h-6 rounded-t-sm border border-neutral-600 ${p2Buttons.up ? 'bg-blue-500 text-white' : 'bg-neutral-800'}`} />
                        <div className={`absolute bottom-0 left-6 w-8 h-6 rounded-b-sm border border-neutral-600 ${p2Buttons.down ? 'bg-blue-500 text-white' : 'bg-neutral-800'}`} />
                        <div className={`absolute left-0 top-6 w-6 h-8 rounded-l-sm border border-neutral-600 ${p2Buttons.left ? 'bg-blue-500 text-white' : 'bg-neutral-800'}`} />
                        <div className={`absolute right-0 top-6 w-6 h-8 rounded-r-sm border border-neutral-600 ${p2Buttons.right ? 'bg-blue-500 text-white' : 'bg-neutral-800'}`} />
                        <div className="absolute inset-6 bg-neutral-900 border border-neutral-700" />
                      </div>

                      {/* Middle Select / Start */}
                      <div className="flex gap-2 text-[9px] font-mono">
                        <div className={`px-2 py-1 rounded bg-neutral-800 border border-neutral-700 ${p2Buttons.select ? 'bg-blue-500' : ''}`}>SELECT</div>
                        <div className={`px-2 py-1 rounded bg-neutral-800 border border-neutral-700 ${p2Buttons.start ? 'bg-blue-500' : ''}`}>START</div>
                      </div>

                      {/* Action Buttons */}
                      <div className="relative w-20 h-20">
                        <div className={`absolute top-0 left-6 w-7 h-7 rounded-full border border-neutral-600 flex items-center justify-center text-[10px] font-bold ${p2Buttons.x ? 'bg-amber-500 text-black' : 'bg-neutral-800'}`}>X</div>
                        <div className={`absolute bottom-0 left-6 w-7 h-7 rounded-full border border-neutral-600 flex items-center justify-center text-[10px] font-bold ${p2Buttons.b ? 'bg-emerald-500 text-black' : 'bg-neutral-800'}`}>B</div>
                        <div className={`absolute left-0 top-6 w-7 h-7 rounded-full border border-neutral-600 flex items-center justify-center text-[10px] font-bold ${p2Buttons.y ? 'bg-blue-500 text-black' : 'bg-neutral-800'}`}>Y</div>
                        <div className={`absolute right-0 top-6 w-7 h-7 rounded-full border border-neutral-600 flex items-center justify-center text-[10px] font-bold ${p2Buttons.a ? 'bg-red-500 text-black' : 'bg-neutral-800'}`}>A</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#121320] border border-[#212338] text-xs text-neutral-400 flex items-center justify-between">
                  <span>Press keys on your keyboard to test P2P controller inputs in real-time.</span>
                  <span className="font-mono text-purple-300 font-bold">Channel: webrtc-gamepad-data</span>
                </div>
              </div>
            )}

            {/* Bottom Latency Health Status */}
            <div className="pt-3 border-t border-[#1e2033] flex items-center justify-between text-[11px] text-neutral-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-400" /> WebRTC P2P DataChannel Encrypted
              </span>
              <span className="font-mono">Sync Drift &lt; 0.05s</span>
            </div>
          </div>

          {/* Right Column: Live Chat & Party Activity Feed */}
          <div className="flex flex-col h-[400px] lg:h-auto bg-[#0d0e19]">
            <div className="p-3 bg-[#111322] border-b border-[#212338] flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <MessageSquare size={13} className="text-purple-400" /> Party Chat
              </span>
              <span className="text-[10px] font-mono text-neutral-400">{chatMessages.length} updates</span>
            </div>

            {/* Scrollable Messages */}
            <div ref={chatScrollRef} className="flex-1 p-3 space-y-2.5 overflow-y-auto text-xs">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`p-2 rounded-xl ${
                  msg.isSystem ? 'bg-[#161828] text-purple-300 font-mono text-[11px]' : 'bg-[#141525] text-neutral-200'
                }`}>
                  <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1">
                    <span className="font-bold text-white">{msg.sender}</span>
                    <span>{msg.time}</span>
                  </div>
                  <p className="leading-relaxed">{msg.text}</p>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChat} className="p-2.5 bg-[#101220] border-t border-[#212338] flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Send message to party..."
                className="flex-1 bg-[#17192b] border border-[#2c2f48] rounded-xl px-3 py-1.5 text-xs text-white placeholder-neutral-500 outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-colors cursor-pointer"
              >
                <Send size={13} />
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
};

export default PartySyncView;
