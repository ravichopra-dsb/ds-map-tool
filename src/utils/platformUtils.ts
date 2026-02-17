/**
 * Detect whether the app is running inside Electron (desktop) or a browser (web).
 */
export const isDesktop = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    typeof window.electron !== 'undefined'
  )
}

export const isWeb = (): boolean => !isDesktop()

/**
 * Current platform as a string constant.
 */
export const platform: 'desktop' | 'web' =
  typeof window !== 'undefined' && typeof (window as any).electron !== 'undefined'
    ? 'desktop'
    : 'web'
