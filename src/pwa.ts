import { registerSW } from 'virtual:pwa-register';

const HOUR = 60 * 60 * 1000;

/**
 * Registra el service worker. Con registerType 'autoUpdate' la página se recarga sola cuando
 * se activa una versión nueva. Como la app instalada puede quedarse abierta días, se busca
 * versión nueva al volver a la app y cada hora.
 */
export function setupPwa(): void {
  if (!('serviceWorker' in navigator)) return;
  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => {
        if (navigator.onLine) registration.update().catch(() => undefined);
      };
      setInterval(check, HOUR);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
    },
  });
}
