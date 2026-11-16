import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Guard against restricted iframe Permissions-Policy violations (Screen Wake Lock) and ResizeObserver events
if (typeof window !== 'undefined') {
  window.onerror = function (msg, url, _line, _col, _error) {
    const errorMsg = String(msg || '');
    const sourceUrl = String(url || '');
    if (
      errorMsg === 'Script error.' ||
      errorMsg.includes('Script error') ||
      !errorMsg ||
      sourceUrl.includes('emulatorjs') ||
      sourceUrl.includes('fiveplay') ||
      sourceUrl.includes('cdn') ||
      sourceUrl.startsWith('blob:')
    ) {
      return true; // Suppress cross-origin script error from bubbling to browser error reporting
    }
  };

  const mockSentinel = {
    released: false,
    type: 'screen',
    addEventListener: () => {},
    removeEventListener: () => {},
    release: async () => {},
    onrelease: null,
  };

  if (typeof navigator !== 'undefined') {
    try {
      if ('wakeLock' in navigator && navigator.wakeLock) {
        const orig = navigator.wakeLock.request ? navigator.wakeLock.request.bind(navigator.wakeLock) : null;
        navigator.wakeLock.request = async (type: any) => {
          try {
            if (orig) return await orig(type);
          } catch (_) {
            return mockSentinel as any;
          }
          return mockSentinel as any;
        };
      } else {
        Object.defineProperty(navigator, 'wakeLock', {
          value: { request: async () => mockSentinel },
          configurable: true,
          writable: true,
        });
      }
    } catch (_) {
      try {
        Object.defineProperty(navigator, 'wakeLock', {
          value: { request: async () => mockSentinel },
          configurable: true,
          writable: true,
        });
      } catch (__) {}
    }
  }

  window.addEventListener('error', (event) => {
    if (!event) return;
    const msg = String(event.message || (event as any).error || '');
    const filename = String(event.filename || '');
    if (
      msg === 'Script error.' ||
      msg.includes('Script error') ||
      !msg ||
      msg.includes('WakeLock') ||
      msg.includes('permissions policy') ||
      msg.includes('ResizeObserver') ||
      filename.includes('emulatorjs') ||
      filename.includes('fiveplay') ||
      filename.includes('cdn') ||
      filename.startsWith('blob:')
    ) {
      event.stopImmediatePropagation();
      event.preventDefault();
      return true;
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    if (!event) return;
    const reason = String(event.reason || '');
    if (
      reason.includes('WakeLock') ||
      reason.includes('permissions policy') ||
      reason.includes('ResizeObserver') ||
      reason.includes('NotAllowedError') ||
      reason.includes('Script error') ||
      reason.includes('null function')
    ) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(<App />);
