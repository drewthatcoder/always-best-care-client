/**
 * Detects if the app is running inside a native mobile shell (Capacitor).
 * When running natively, certain web-only features (like signup) should be hidden.
 */
export const isNativePlatform = (): boolean => {
  return !!(window as any).Capacitor?.isNativePlatform?.() || !!(window as any).Capacitor?.isNative;
};
