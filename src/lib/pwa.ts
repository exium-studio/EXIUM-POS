import { useState, useEffect } from 'react';

export interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isUpdateAvailable: boolean;
  isOnline: boolean;
  installApp: () => Promise<boolean>;
  updateApp: () => void;
  getCacheSize: () => Promise<string>;
  clearAppCache: () => Promise<boolean>;
}

let deferredPrompt: any = null;
const listeners: Array<() => void> = [];

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

// Global register service worker function
export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[PWA] Service Worker registered with scope:', registration.scope);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New version available!');
                notifyListeners();
              }
            });
          }
        });
      })
      .catch((err) => {
        console.warn('[PWA] Service Worker registration failed:', err);
      });
  });

  // Listen for beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('[PWA] beforeinstallprompt captured');
    notifyListeners();
  });

  // Listen for appinstalled event
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    console.log('[PWA] App successfully installed');
    notifyListeners();
  });
}

export function usePWA(): PWAState {
  const [isInstallable, setIsInstallable] = useState<boolean>(!!deferredPrompt);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    // Check if running in standalone display mode (PWA installed)
    const checkInstalled = () => {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone);
      setIsInstallable(!isStandalone && !!deferredPrompt);
    };

    checkInstalled();

    const handleUpdate = () => {
      setIsInstallable(!isInstalled && !!deferredPrompt);
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.getRegistration().then((reg) => {
          if (reg && reg.waiting) {
            setIsUpdateAvailable(true);
          }
        });
      }
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    listeners.push(handleUpdate);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      const idx = listeners.indexOf(handleUpdate);
      if (idx > -1) listeners.splice(idx, 1);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isInstalled]);

  const installApp = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      // Fallback instructions if prompt not supported or already installed
      alert(
        'Untuk memasang aplikasi POS di perangkat Anda:\n' +
        '• Desktop Chrome/Edge: Klik ikon Pasang/Install (➕) di bilah alamat browser.\n' +
        '• Android: Ketuk menu (⋮) lalu pilih "Tambahkan ke Layar Utama" (Add to Home Screen).\n' +
        '• iOS Safari: Ketuk tombol Share (Bagikan) lalu pilih "Tambah ke Layar Utama".'
      );
      return false;
    }

    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      console.log('[PWA] User accepted the install prompt');
      deferredPrompt = null;
      setIsInstallable(false);
      setIsInstalled(true);
      return true;
    } else {
      console.log('[PWA] User dismissed the install prompt');
      return false;
    }
  };

  const updateApp = () => {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg && reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          window.location.reload();
        }
      });
    }
  };

  const getCacheSize = async (): Promise<string> => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usageInMB = ((estimate.usage || 0) / (1024 * 1024)).toFixed(2);
      const quotaInMB = ((estimate.quota || 0) / (1024 * 1024)).toFixed(0);
      return `${usageInMB} MB / ${quotaInMB} MB`;
    }
    return 'Tersedia (Lokal)';
  };

  const clearAppCache = async (): Promise<boolean> => {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      console.log('[PWA] Caches cleared successfully');
      return true;
    }
    return false;
  };

  return {
    isInstallable,
    isInstalled,
    isUpdateAvailable,
    isOnline,
    installApp,
    updateApp,
    getCacheSize,
    clearAppCache,
  };
}
