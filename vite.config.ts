import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import http from 'http';
import https from 'https';
import { spawn } from 'child_process';

function crossOriginIsolationPlugin(): Plugin {
  const applyHeaders = (req: any, res: any, next: any) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, *');

    if (req.url?.includes('coi-') || req.url?.includes('serviceworker')) {
      res.setHeader('Service-Worker-Allowed', '/');
    }

    if (req.method === 'OPTIONS') {
      res.statusCode = 200;
      return res.end();
    }

    next();
  };

  return {
    name: 'cross-origin-isolation',
    configureServer(server) {
      server.middlewares.use(applyHeaders);
    },
    configurePreviewServer(server) {
      server.middlewares.use(applyHeaders);
    }
  };
}

function romProxyPlugin(): Plugin {
  const handler = (req: any, res: any, next: any) => {
    // 1. LaunchBox GamesDB API Proxy
    if (req.url?.startsWith('/api/launchbox/')) {
      if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Access-Control-Expose-Headers', '*');
        return res.end();
      }

      let targetApiUrl = '';
      if (req.url.startsWith('/api/launchbox/search/')) {
        const searchTerm = req.url.substring('/api/launchbox/search/'.length);
        targetApiUrl = `https://gamesdb-api.launchbox-app.com/api/search/${searchTerm}`;
      } else if (req.url.startsWith('/api/launchbox/details/')) {
        const gameId = req.url.substring('/api/launchbox/details/'.length);
        targetApiUrl = `https://gamesdb-api.launchbox-app.com/api/games/details/${gameId}`;
      }

      if (targetApiUrl) {
        const headers = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*'
        };

        const upstreamReq = https.get(targetApiUrl, { headers }, (upstreamRes) => {
          res.statusCode = upstreamRes.statusCode || 200;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');
          res.setHeader('Access-Control-Expose-Headers', '*');
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          upstreamRes.pipe(res);
        });

        upstreamReq.on('error', (err) => {
          res.statusCode = 502;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        });
        return;
      }
    }

    // 1.5. SteamGridDB API Proxy (mirrors LaunchBox CORS-safe proxy protocol)
    if (req.url?.startsWith('/api/steamgrid/')) {
      if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Access-Control-Expose-Headers', '*');
        return res.end();
      }

      let targetApiUrl = '';
      if (req.url.startsWith('/api/steamgrid/search/')) {
        const searchTerm = req.url.substring('/api/steamgrid/search/'.length);
        targetApiUrl = `https://www.steamgriddb.com/api/v2/search/autocomplete/${searchTerm}`;
      } else if (req.url.startsWith('/api/steamgrid/grids/')) {
        const rest = req.url.substring('/api/steamgrid/grids/'.length);
        targetApiUrl = `https://www.steamgriddb.com/api/v2/grids/game/${rest}`;
      }

      if (targetApiUrl) {
        const apiKey = process.env.STEAMGRIDDB_API_KEY || '4604163d9e3c7458aad1c35e090954c0';
        const headers = {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*'
        };

        const upstreamReq = https.get(targetApiUrl, { headers }, (upstreamRes) => {
          res.statusCode = upstreamRes.statusCode || 200;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');
          res.setHeader('Access-Control-Expose-Headers', '*');
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          upstreamRes.pipe(res);
        });

        upstreamReq.on('error', (err) => {
          res.statusCode = 502;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        });
        return;
      }
    }

    if (!req.url?.startsWith('/api/proxy')) {
      return next();
    }
    if (req.method === 'OPTIONS') {
      res.statusCode = 200;
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, *');
      res.setHeader('Access-Control-Max-Age', '86400');
      return res.end();
    }

    try {
      const parsedUrl = new URL(req.url, 'http://localhost:3000');
      let targetUrl = parsedUrl.searchParams.get('url');
      if (!targetUrl) {
        res.statusCode = 400;
        return res.end('Missing url parameter');
      }

      // Ad-Blocker rule: Block known intrusive popup networks, ALWAYS whitelist Google AdSense
      const isGoogleAdSense = targetUrl.includes('googlesyndication.com') ||
                              targetUrl.includes('googleads') ||
                              targetUrl.includes('googleservices.com');
      const isMaliciousAd = ['popads', 'adsterra', 'propellerads', 'monetag', 'clickadu'].some(p => targetUrl!.includes(p));
      if (!isGoogleAdSense && isMaliciousAd) {
        res.statusCode = 204;
        return res.end();
      }

      // Proactively rewrite legacy locked chd_psx URLs to 100% public mirror
      if (targetUrl.includes('chd_psx')) {
        const rawFilename = decodeURIComponent(targetUrl.split('/').pop() || '');
        const cleanName = rawFilename
          .replace(/\.chd$/i, '')
          .replace(/\s*\([^)]*\)/g, '')
          .replace(/\s*\[[^\]]*\]/g, '')
          .trim();
        targetUrl = `https://archive.org/download/ps1-rip-chd-ck/${encodeURIComponent(cleanName)}.chd`;
      }

      const method = req.method || 'GET';

      const forwardViaCurl = (urlToFetch: string) => {
        const args = [
          '-sS',
          '-L',
          '--max-time',
          '30',
          '-D',
          '-',
          ...(method === 'HEAD' ? ['-I'] : ['-o', '-']),
          '-A',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          '-H',
          'Accept: image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        ];
        if (urlToFetch.includes('batcave.biz')) {
          args.push('-H', 'Referer: https://batcave.biz/');
          args.push('-H', 'Origin: https://batcave.biz');
        }
        args.push(urlToFetch);

        const curlProc = spawn('curl', args);
        const chunks: Buffer[] = [];

        curlProc.on('error', (err) => {
          if (!res.headersSent) {
            res.statusCode = 502;
            res.end(`Proxy curl error: ${err.message}`);
          }
        });

        req.on('close', () => {
          if (!curlProc.killed) curlProc.kill();
        });

        curlProc.stdout.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        curlProc.on('close', (code) => {
          if (res.headersSent) return;
          const raw = Buffer.concat(chunks);
          if (code !== 0 && raw.length === 0) {
            res.statusCode = 502;
            res.end('Upstream proxy transfer failed');
            return;
          }

          // Strip one or more HTTP header blocks (if redirects occurred with -L)
          let offset = 0;
          let finalStatus = 200;
          let finalContentType = 'application/octet-stream';
          let finalCacheControl = '';

          while (offset < raw.length) {
            const sep = raw.indexOf('\r\n\r\n', offset);
            if (sep === -1) break;
            const headerBlock = raw.slice(offset, sep).toString('utf8');
            if (!/^HTTP\/\d/i.test(headerBlock)) break;

            const lines = headerBlock.split('\r\n');
            const statusM = lines[0].match(/^HTTP\/[\d.]+\s+(\d{3})/);
            const status = statusM ? Number(statusM[1]) : 200;
            offset = sep + 4;

            for (const line of lines.slice(1)) {
              const colon = line.indexOf(':');
              if (colon === -1) continue;
              const k = line.slice(0, colon).trim().toLowerCase();
              const v = line.slice(colon + 1).trim();
              if (k === 'content-type') finalContentType = v;
              if (k === 'cache-control') finalCacheControl = v;
            }
            finalStatus = status;
            if (status < 300 || status >= 400) break;
          }

          const body = method === 'HEAD' ? Buffer.alloc(0) : raw.slice(offset);
          res.statusCode = finalStatus;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');
          res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, *');
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
          res.setHeader('Content-Type', finalContentType);
          if (finalCacheControl) {
            res.setHeader('Cache-Control', finalCacheControl);
          }
          res.setHeader('Content-Length', String(body.length));
          res.end(body);
        });
      };

      const forwardRequest = (urlToFetch: string, hops = 0, isFallback = false) => {
        if (hops > 5) {
          res.statusCode = 508;
          return res.end('Too many redirects');
        }

        // BatCave CDN / uploads require browser/curl TLS + HTTP/2 fingerprint
        if (urlToFetch.includes('batcave.biz')) {
          return forwardViaCurl(urlToFetch);
        }

        const client = urlToFetch.startsWith('https:') ? https : http;
        const headers: Record<string, string> = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': '*/*'
        };
        if (req.headers.range) {
          headers['Range'] = req.headers.range as string;
        }

        const upstreamReq = client.request(urlToFetch, { method, headers }, (upstreamRes) => {
          // Handle redirects
          if ([301, 302, 303, 307, 308].includes(upstreamRes.statusCode || 0) && upstreamRes.headers.location) {
            upstreamRes.resume();
            const redirectUrl = new URL(upstreamRes.headers.location, urlToFetch).toString();
            return forwardRequest(redirectUrl, hops + 1, isFallback);
          }

          // Fallback to curl if Cloudflare/WAF returns 403 on Node https TLS
          if ((upstreamRes.statusCode || 0) === 403 && !urlToFetch.includes('archive.org')) {
            upstreamRes.resume();
            return forwardViaCurl(urlToFetch);
          }

          // If upstream returns 401/403/404 on an archive.org PS1 CHD, failover to public mirrors
          if (!isFallback && [401, 403, 404].includes(upstreamRes.statusCode || 0) && urlToFetch.includes('archive.org')) {
            upstreamRes.resume();
            const rawFilename = decodeURIComponent(urlToFetch.split('/').pop() || '');
            const cleanName = rawFilename
              .replace(/\.chd$/i, '')
              .replace(/\s*\([^)]*\)/g, '')
              .replace(/\s*\[[^\]]*\]/g, '')
              .trim();
            const fallbackUrl = `https://archive.org/download/CuratedPSXRedumpCHDs/${encodeURIComponent(cleanName)}.chd`;
            return forwardRequest(fallbackUrl, 0, true);
          }

          res.statusCode = upstreamRes.statusCode || 200;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');
          res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, *');
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');

          if (upstreamRes.headers['content-length']) {
            res.setHeader('Content-Length', upstreamRes.headers['content-length']);
          } else if (method === 'HEAD') {
            res.setHeader('Content-Length', '52428800'); // Safe fallback content length for HEAD
          }
          if (upstreamRes.headers['content-type']) {
            res.setHeader('Content-Type', upstreamRes.headers['content-type']);
          }
          if (upstreamRes.headers['accept-ranges']) {
            res.setHeader('Accept-Ranges', upstreamRes.headers['accept-ranges']);
          } else {
            res.setHeader('Accept-Ranges', 'bytes');
          }
          if (upstreamRes.headers['content-range']) {
            res.setHeader('Content-Range', upstreamRes.headers['content-range']);
          }

          if (method === 'HEAD') {
            res.end();
          } else {
            upstreamRes.pipe(res);
          }
        });

        upstreamReq.setTimeout(120000, () => {
          upstreamReq.destroy();
          if (!res.headersSent) {
            res.statusCode = 504;
            res.end('Gateway timeout');
          }
        });

        req.on('close', () => {
          upstreamReq.destroy();
        });

        upstreamReq.on('error', (err) => {
          if (!isFallback && urlToFetch.includes('archive.org')) {
            const rawFilename = decodeURIComponent(urlToFetch.split('/').pop() || '');
            const cleanName = rawFilename
              .replace(/\.chd$/i, '')
              .replace(/\s*\([^)]*\)/g, '')
              .replace(/\s*\[[^\]]*\]/g, '')
              .trim();
            const fallbackUrl = `https://archive.org/download/CuratedPSXRedumpCHDs/${encodeURIComponent(cleanName)}.chd`;
            return forwardRequest(fallbackUrl, 0, true);
          }
          if (!res.headersSent) {
            res.statusCode = 502;
            res.end(`Proxy error: ${err.message}`);
          }
        });

        upstreamReq.end();
      };

      forwardRequest(targetUrl);
    } catch (e: any) {
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end(`Server error: ${e.message}`);
      }
    }
  };

  return {
    name: 'rom-proxy',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    }
  };
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [crossOriginIsolationPlugin(), react(), tailwindcss(), romProxyPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'credentialless',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'credentialless',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          player: path.resolve(__dirname, 'player.html'),
        }
      }
    }
  };
});
