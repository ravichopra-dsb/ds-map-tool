import type { Resolution } from '@/types/pdf';

export interface FabricExportConfig {
  resolution: Resolution;
  canvasWidthPx: number;
  canvasHeightPx: number;
  pageWidthMm: number;
  pageHeightMm: number;
}

export interface FabricExportSettings {
  format: 'jpeg' | 'png';
  quality: number;
  multiplier: number;
}

/**
 * Calculate Fabric.js canvas export settings based on target DPI resolution.
 * Reuses quality logic from mapImageExport.ts for DRY approach.
 *
 * @param config - Export configuration with resolution and canvas/page dimensions
 * @returns Export settings for canvas.toDataURL()
 */
export function getFabricExportSettings(config: FabricExportConfig): FabricExportSettings {
  // Target pixels = (mm * DPI) / 25.4
  const targetWidthPx = Math.round((config.pageWidthMm * config.resolution) / 25.4);
  const targetHeightPx = Math.round((config.pageHeightMm * config.resolution) / 25.4);

  // Multiplier = target / current canvas size
  const multiplier = Math.max(
    targetWidthPx / config.canvasWidthPx,
    targetHeightPx / config.canvasHeightPx
  );

  // PNG for lower res (better quality, no compression artifacts)
  // JPEG for higher res (smaller file size)
  const useJPEG = config.resolution >= 300;

  return {
    format: useJPEG ? 'jpeg' : 'png',
    quality: useJPEG ? 0.95 : 1.0,
    multiplier: Math.min(multiplier, 10), // Cap at 10x to prevent memory issues
  };
}
