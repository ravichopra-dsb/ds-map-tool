import type Map from 'ol/Map';
import type { Extent } from 'ol/extent';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { PAGE_SIZES, type PdfExportConfig } from '@/types/pdf';

export interface MapImageExportResult {
  dataURL: string;
  width: number;
  height: number;
}

export interface ExportProgress {
  stage: 'preparing' | 'rendering' | 'complete';
  message: string;
  percent: number;
}

/**
 * Export OpenLayers map to image with customizable page size and resolution
 * Same rendering logic as PDF export, but returns image data URL instead
 */
export async function exportMapToImage(
  map: Map,
  config: PdfExportConfig,
  onProgress?: (progress: ExportProgress) => void,
  extent?: Extent
): Promise<MapImageExportResult> {
  onProgress?.({ stage: 'preparing', message: 'Preparing export...', percent: 0 });

  const dims = PAGE_SIZES[config.pageSize];
  let width = Math.round((dims.width * config.resolution) / 25.4);
  let height = Math.round((dims.height * config.resolution) / 25.4);

  // If extent is provided, adjust dimensions to match extent's aspect ratio
  if (extent) {
    const extentWidth = extent[2] - extent[0];
    const extentHeight = extent[3] - extent[1];
    const extentAspectRatio = extentWidth / extentHeight;
    const pageAspectRatio = width / height;

    if (extentAspectRatio > pageAspectRatio) {
      height = Math.round(width / extentAspectRatio);
    } else {
      width = Math.round(height * extentAspectRatio);
    }
  }

  // Store original map state
  const originalSize = map.getSize();
  const originalResolution = map.getView().getResolution();
  const originalCenter = map.getView().getCenter();
  const originalRotation = map.getView().getRotation();

  // Get layer references for separate rendering if needed
  const layers = map.getLayers().getArray();
  const baseLayers = layers.filter(layer => layer instanceof TileLayer);
  const vectorLayers = layers.filter(layer => layer instanceof VectorLayer);

  // Check for canvas size limits and auto-adjust if needed
  const maxCanvasSize = 12192;

  if (width > maxCanvasSize || height > maxCanvasSize) {
    const scale = Math.min(maxCanvasSize / width, maxCanvasSize / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  try {
    let baseLayerCanvas: HTMLCanvasElement | null = null;
    let vectorLayerCanvas: HTMLCanvasElement | null = null;

    // Dual-layer rendering mode (keep vector constant)
    if (config.keepVectorLayerConstant && vectorLayers.length > 0) {
      onProgress?.({ stage: 'preparing', message: 'Preparing dual-layer rendering...', percent: 10 });

      const originalVisibility = new WeakMap();
      baseLayers.forEach(layer => originalVisibility.set(layer, layer.getVisible()));
      vectorLayers.forEach(layer => originalVisibility.set(layer, layer.getVisible()));

      // STEP 1: Render vector layers at screen size
      onProgress?.({ stage: 'rendering', message: 'Rendering features...', percent: 20 });

      baseLayers.forEach(layer => layer.setVisible(false));
      vectorLayers.forEach(layer => layer.setVisible(true));

      let vectorWidth = originalSize?.[0] ?? 1920;
      let vectorHeight = originalSize?.[1] ?? 1080;

      if (extent) {
        const extentWidth = extent[2] - extent[0];
        const extentHeight = extent[3] - extent[1];
        const extentAspectRatio = extentWidth / extentHeight;
        const originalAspectRatio = vectorWidth / vectorHeight;

        if (extentAspectRatio > originalAspectRatio) {
          vectorHeight = Math.round(vectorWidth / extentAspectRatio);
        } else {
          vectorWidth = Math.round(vectorHeight * extentAspectRatio);
        }
      }

      const vectorSize: [number, number] = [vectorWidth, vectorHeight];
      map.setSize(vectorSize);

      await new Promise(resolve => setTimeout(resolve, 100));
      const actualVectorSize = map.getSize() || vectorSize;

      if (extent) {
        const extentWidth = extent[2] - extent[0];
        const extentHeight = extent[3] - extent[1];
        const extentCenterX = (extent[0] + extent[2]) / 2;
        const extentCenterY = (extent[1] + extent[3]) / 2;

        const resolutionX = extentWidth / actualVectorSize[0];
        const resolutionY = extentHeight / actualVectorSize[1];
        const targetResolution = Math.max(resolutionX, resolutionY);
        map.getView().setCenter([extentCenterX, extentCenterY]);
        map.getView().setResolution(targetResolution);
      }

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Vector layer render timeout')), 180000);
        map.once('rendercomplete', () => {
          clearTimeout(timeout);
          resolve();
        });
        map.renderSync();
      });

      const vectorCanvas = document.querySelector('#map canvas') as HTMLCanvasElement;
      if (vectorCanvas) {
        vectorLayerCanvas = document.createElement('canvas');
        vectorLayerCanvas.width = vectorCanvas.width;
        vectorLayerCanvas.height = vectorCanvas.height;
        const ctx = vectorLayerCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(vectorCanvas, 0, 0);
        }
      }

      // STEP 2: Render base layers at HIGH RESOLUTION
      onProgress?.({ stage: 'rendering', message: 'Rendering high-res base map...', percent: 50 });

      vectorLayers.forEach(layer => layer.setVisible(false));
      baseLayers.forEach(layer => {
        const wasVisible = originalVisibility.get(layer);
        layer.setVisible(wasVisible ?? false);
      });

      const printSize: [number, number] = [width, height];
      map.setSize(printSize);

      await new Promise(resolve => setTimeout(resolve, 100));
      const actualPrintSize = map.getSize() || printSize;

      if (extent) {
        const extentWidth = extent[2] - extent[0];
        const extentHeight = extent[3] - extent[1];
        const extentCenterX = (extent[0] + extent[2]) / 2;
        const extentCenterY = (extent[1] + extent[3]) / 2;

        const resolutionX = extentWidth / actualPrintSize[0];
        const resolutionY = extentHeight / actualPrintSize[1];
        const targetResolution = Math.max(resolutionX, resolutionY);

        map.getView().setCenter([extentCenterX, extentCenterY]);
        map.getView().setResolution(targetResolution);
      } else if (originalSize && originalResolution !== undefined) {
        const scaling = Math.min(width / originalSize[0], height / originalSize[1]);
        map.getView().setResolution(originalResolution / scaling);
      }

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Base layer render timeout')), 180000);
        map.once('rendercomplete', () => {
          clearTimeout(timeout);
          resolve();
        });
        map.renderSync();
      });

      const baseCanvas = document.querySelector('#map canvas') as HTMLCanvasElement;
      if (baseCanvas) {
        baseLayerCanvas = document.createElement('canvas');
        baseLayerCanvas.width = baseCanvas.width;
        baseLayerCanvas.height = baseCanvas.height;
        const ctx = baseLayerCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(baseCanvas, 0, 0);
        }
      }

      // Restore original layer visibility
      baseLayers.forEach(layer => layer.setVisible(originalVisibility.get(layer) ?? true));
      vectorLayers.forEach(layer => layer.setVisible(originalVisibility.get(layer) ?? true));

    } else {
      // Standard rendering mode (zoom everything together)
      onProgress?.({ stage: 'preparing', message: 'Setting up canvas...', percent: 10 });

      const printSize: [number, number] = [width, height];
      map.setSize(printSize);

      await new Promise(resolve => setTimeout(resolve, 100));

      const actualSize = map.getSize();
      const fitSize = actualSize || printSize;

      if (extent) {
        const extentWidth = extent[2] - extent[0];
        const extentHeight = extent[3] - extent[1];
        const extentCenterX = (extent[0] + extent[2]) / 2;
        const extentCenterY = (extent[1] + extent[3]) / 2;

        const resolutionX = extentWidth / fitSize[0];
        const resolutionY = extentHeight / fitSize[1];
        const targetResolution = Math.max(resolutionX, resolutionY);

        map.getView().setCenter([extentCenterX, extentCenterY]);
        map.getView().setResolution(targetResolution);
      } else if (originalSize && originalResolution !== undefined) {
        const scaling = Math.min(width / originalSize[0], height / originalSize[1]);
        map.getView().setResolution(originalResolution / scaling);
      } else {
        throw new Error('Cannot calculate scaling - missing size or viewResolution');
      }

      onProgress?.({ stage: 'rendering', message: 'Rendering map...', percent: 30 });

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Map render timeout after 3 minutes. Try lowering the resolution.'));
        }, 180000);

        map.once('rendercomplete', () => {
          clearTimeout(timeout);
          resolve();
        });
        map.renderSync();
      });
    }

    onProgress?.({ stage: 'rendering', message: 'Processing map canvas...', percent: 70 });

    // Create export canvas
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = width;
    exportCanvas.height = height;

    const exportContext = exportCanvas.getContext('2d');
    if (!exportContext) {
      throw new Error('Failed to get export canvas context');
    }

    // Fill with white background
    exportContext.fillStyle = 'white';
    exportContext.fillRect(0, 0, width, height);
    exportContext.imageSmoothingEnabled = true;
    exportContext.imageSmoothingQuality = 'high';

    if (baseLayerCanvas && vectorLayerCanvas) {
      // Composite dual-layer rendering
      const baseScale = Math.min(width / baseLayerCanvas.width, height / baseLayerCanvas.height);
      const scaledBaseWidth = Math.round(baseLayerCanvas.width * baseScale);
      const scaledBaseHeight = Math.round(baseLayerCanvas.height * baseScale);
      const baseOffsetX = (width - scaledBaseWidth) / 2;
      const baseOffsetY = (height - scaledBaseHeight) / 2;

      exportContext.drawImage(baseLayerCanvas, baseOffsetX, baseOffsetY, scaledBaseWidth, scaledBaseHeight);

      const scaledVectorWidth = scaledBaseWidth;
      const scaledVectorHeight = scaledBaseHeight;

      exportContext.drawImage(
        vectorLayerCanvas,
        baseOffsetX,
        baseOffsetY,
        scaledVectorWidth,
        scaledVectorHeight
      );

    } else {
      // Draw standard single canvas
      const mapCanvas = document.querySelector('#map canvas') as HTMLCanvasElement;
      if (!mapCanvas) {
        throw new Error('No map canvas found');
      }

      const scale = Math.min(width / mapCanvas.width, height / mapCanvas.height);
      const scaledWidth = Math.round(mapCanvas.width * scale);
      const scaledHeight = Math.round(mapCanvas.height * scale);
      const offsetX = (width - scaledWidth) / 2;
      const offsetY = (height - scaledHeight) / 2;

      exportContext.drawImage(mapCanvas, offsetX, offsetY, scaledWidth, scaledHeight);
    }

    // Generate image data URL (same quality as PDF export)
    const useJPEG = config.resolution >= 300;
    const dataURL = exportCanvas.toDataURL(
      useJPEG ? 'image/jpeg' : 'image/png',
      useJPEG ? 0.95 : 1.0
    );

    onProgress?.({ stage: 'complete', message: 'Export complete!', percent: 100 });

    return {
      dataURL,
      width: exportCanvas.width,
      height: exportCanvas.height,
    };
  } catch (error) {
    console.error('Map image export failed:', error);
    throw error;
  } finally {
    // Always restore original map state
    if (originalSize && originalResolution !== undefined && originalCenter) {
      map.setSize(originalSize);
      map.getView().setResolution(originalResolution);
      map.getView().setCenter(originalCenter);
      if (originalRotation !== undefined) {
        map.getView().setRotation(originalRotation);
      }
    }
  }
}
