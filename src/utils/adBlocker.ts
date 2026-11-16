/**
 * Stream X Smart Ad-Shield with Google AdSense Whitelist
 * 
 * Neutralizes invasive 3rd-party popups, malicious redirects, and intrusive ad networks
 * while strictly whitelisting and preserving Google AdSense monetization tags.
 */

// Explicitly whitelisted monetization and analytics providers
export const WHITELISTED_DOMAINS = [
  'pagead2.googlesyndication.com',
  'googlesyndication.com',
  'googleads.g.doubleclick.net',
  'googleservices.com',
  'tpc.googlesyndication.com',
  'www.google-analytics.com',
  'analytics.google.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.jsdelivr.net',
  'raw.githubusercontent.com',
  'archive.org',
  'ia800108.us.archive.org',
  'ia601809.us.archive.org',
  'streamex.hn',
  'toonix.bond',
  'v2.fiveplay.lol',
  'fiveplay.lol'
];

// Known invasive ad providers and deceptive redirect networks to intercept
export const BLOCKED_AD_PATTERNS = [
  'popads',
  'popcash',
  'adsterra',
  'propellerads',
  'monetag',
  'clickadu',
  'exoclick',
  'trafficjunky',
  'bet365',
  '1xbet',
  'adcash',
  'juicyads',
  'hilltopads',
  'vungle',
  'ironsrc',
  'adnxs.com/pop',
  'ad-maven',
  'onclickperf',
  'adtrue',
  'syndication.click'
];

export interface AdShieldStats {
  blockedPopups: number;
  blockedRedirects: number;
  whitelistedAllowed: number;
  lastInterceptedUrl?: string;
}

class AdShieldEngine {
  private stats: AdShieldStats = {
    blockedPopups: 0,
    blockedRedirects: 0,
    whitelistedAllowed: 0
  };
  private listeners: Set<(stats: AdShieldStats) => void> = new Set();
  private originalWindowOpen: typeof window.open | null = null;
  private isInitialized = false;

  public init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // Preserve original window.open
    this.originalWindowOpen = window.open.bind(window);

    // Override window.open to intercept unwanted popup tabs while allowing Google AdSense
    window.open = (url?: string | URL, target?: string, features?: string): WindowProxy | null => {
      const urlStr = String(url || '');

      // Check if URL belongs to Google AdSense / Whitelisted services
      if (this.isWhitelisted(urlStr)) {
        this.stats.whitelistedAllowed++;
        this.notify();
        if (this.originalWindowOpen) {
          return this.originalWindowOpen(url, target, features);
        }
        return null;
      }

      // Check if it matches blocked ad patterns or is an unauthorized popup
      this.stats.blockedPopups++;
      this.stats.lastInterceptedUrl = urlStr;
      this.notify();
      console.warn(`[Stream X Ad-Shield] Neutralized invasive popup:`, urlStr || '(blank target)');
      return null;
    };

    // Attach click interceptor to catch programmatic synthetic clicks trying to bypass sandbox
    window.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest('a');
      if (anchor && anchor.href) {
        if (!this.isWhitelisted(anchor.href) && this.isAdNetwork(anchor.href)) {
          e.preventDefault();
          e.stopPropagation();
          this.stats.blockedRedirects++;
          this.stats.lastInterceptedUrl = anchor.href;
          this.notify();
          console.warn(`[Stream X Ad-Shield] Blocked unauthorized redirect:`, anchor.href);
        }
      }
    }, true);
  }

  public isWhitelisted(url: string): boolean {
    if (!url) return false;
    try {
      const parsed = new URL(url, window.location.origin);
      const host = parsed.hostname.toLowerCase();
      return WHITELISTED_DOMAINS.some(domain => host === domain || host.endsWith('.' + domain));
    } catch (e) {
      return false;
    }
  }

  public isAdNetwork(url: string): boolean {
    if (!url) return false;
    const lower = url.toLowerCase();
    return BLOCKED_AD_PATTERNS.some(pattern => lower.includes(pattern));
  }

  public getStats(): AdShieldStats {
    return { ...this.stats };
  }

  public subscribe(cb: (stats: AdShieldStats) => void) {
    this.listeners.add(cb);
    cb(this.getStats());
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    const s = this.getStats();
    this.listeners.forEach(cb => cb(s));
  }

  public resetStats() {
    this.stats = {
      blockedPopups: 0,
      blockedRedirects: 0,
      whitelistedAllowed: 0
    };
    this.notify();
  }
}

export const adShield = new AdShieldEngine();
