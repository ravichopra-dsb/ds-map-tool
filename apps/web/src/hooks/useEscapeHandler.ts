import { useEffect, useCallback } from "react";

/**
 * Hook for subscribing to global Escape key events.
 *
 * Usage:
 * ```typescript
 * useEscapeHandler(useCallback(() => {
 *   setDialogOpen(false);
 * }, []));
 * ```
 *
 * This allows any component to react to Escape key presses
 * without modifying central keyboard handling code.
 * The callback is automatically cleaned up on unmount.
 *
 * @param callback - Function to call when Escape is pressed
 */
export const useEscapeHandler = (callback: () => void) => {
  const stableCallback = useCallback(callback, [callback]);

  useEffect(() => {
    const handler = () => stableCallback();
    window.addEventListener('globalEscape', handler);
    return () => window.removeEventListener('globalEscape', handler);
  }, [stableCallback]);
};
