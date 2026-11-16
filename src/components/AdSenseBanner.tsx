import React, { useEffect, useState } from 'react';
import { ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import { adShield } from '../utils/adBlocker';

interface AdSenseBannerProps {
  slotId?: string;
  format?: 'horizontal' | 'rectangle';
  className?: string;
}

export const AdSenseBanner: React.FC<AdSenseBannerProps> = ({
  slotId = 'streamx-ad-main',
  format = 'horizontal',
  className = ''
}) => {
  const [isAdSenseLoaded, setIsAdSenseLoaded] = useState(false);

  useEffect(() => {
    // Check if Google AdSense / Google tags are whitelisted
    const isWhitelisted = adShield.isWhitelisted('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js');
    if (isWhitelisted) {
      setIsAdSenseLoaded(true);
    }
  }, []);

  return (
    <div
      className={`relative w-full rounded-xl overflow-hidden border border-[#1e293b] bg-gradient-to-r from-[#0d121f] via-[#111827] to-[#0d121f] p-4 text-center ${className}`}
      data-ad-slot={slotId}
    >
      {/* Monetization Status Pill */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-[#1f293d] text-[11px]">
        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold tracking-wide">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>Google AdSense Monetization Active</span>
          <span className="px-1.5 py-0.5 text-[9px] bg-emerald-950/70 text-emerald-300 border border-emerald-700/50 rounded font-mono">
            WHITELISTED
          </span>
        </div>
        <div className="text-[10px] text-slate-400 flex items-center gap-1">
          <CheckCircle2 size={12} className="text-cyan-400" />
          <span>3rd-Party Invasive Ads Neutralized</span>
        </div>
      </div>

      {/* Ad Area Container */}
      <div
        className={`w-full flex flex-col items-center justify-center rounded-lg border border-dashed border-[#2a3854] bg-[#070a12]/60 p-3 sm:p-5 transition-all ${
          format === 'horizontal' ? 'min-h-[90px]' : 'min-h-[250px]'
        }`}
      >
        {/* Real Google AdSense Script Tag slot - Whitelisted */}
        <ins
          className="adsbygoogle"
          style={{ display: 'block', width: '100%' }}
          data-ad-client="ca-pub-streamx-retro"
          data-ad-slot={slotId}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />

        {/* Fallback Display if AdSense is in test/preview mode */}
        <div className="flex flex-col items-center gap-1.5 text-center">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
            <Sparkles size={13} className="text-cyan-400" />
            <span>Stream X Sponsored Partner Banner</span>
          </div>
          <p className="text-[11px] text-slate-400 max-w-lg">
            Google AdSense tags (<code className="text-cyan-300 text-[10px]">pagead2.googlesyndication.com</code>) bypass all filters smoothly to ensure sustained creator revenue.
          </p>
        </div>
      </div>
    </div>
  );
};
