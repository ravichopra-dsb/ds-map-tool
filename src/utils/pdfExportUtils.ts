import { jsPDF } from 'jspdf';
import type Map from 'ol/Map';
import type { Extent } from 'ol/extent';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { PAGE_SIZES, type PdfExportConfig } from '@/types/pdf';

export type { PdfExportConfig };

export interface ExportProgress {
  stage: 'preparing' | 'rendering' | 'creating' | 'complete';
  message: string;
  percent: number;
}

/**
 * Export OpenLayers map to PDF with customizable page size and resolution
 * Adapted from openlayers-BE export implementation
 * @param map - OpenLayers map instance
 * @param config - PDF export configuration (page size, resolution)
 * @param onProgress - Optional progress callback
 * @param extent - Optional extent to export (if provided, only this area will be exported)
 */
export async function exportMapToPdf(
  map: Map,
  config: PdfExportConfig,
  onProgress?: (progress: ExportProgress) => void,
  extent?: Extent
): Promise<Blob> {
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

    // Adjust canvas dimensions to match extent aspect ratio
    if (extentAspectRatio > pageAspectRatio) {
      // Extent is wider - keep width, adjust height
      height = Math.round(width / extentAspectRatio);
    } else {
      // Extent is taller - keep height, adjust width
      width = Math.round(height * extentAspectRatio);
    }

    console.log('📐 Adjusted canvas dimensions to match extent:', { width, height });
  }

  console.log('📐 Final canvas dimensions:', { width, height });

  // Store original map state
  const originalSize = map.getSize();
  const originalResolution = map.getView().getResolution();
  const originalCenter = map.getView().getCenter();
  const originalRotation = map.getView().getRotation();

  console.log('🗺️ Original map state:', { originalSize, originalResolution, originalCenter, originalRotation });

  // Get layer references for separate rendering if needed
  const layers = map.getLayers().getArray();
  const baseLayers = layers.filter(layer => layer instanceof TileLayer);
  const vectorLayers = layers.filter(layer => layer instanceof VectorLayer);

  console.log('📚 Layers found:', {
    baseLayers: baseLayers.length,
    vectorLayers: vectorLayers.length,
    keepVectorLayerConstant: config.keepVectorLayerConstant
  });

  // Check for canvas size limits and auto-adjust if needed
  const maxCanvasSize = 12192;

  if (width > maxCanvasSize || height > maxCanvasSize) {
    console.warn('⚠️ Large canvas size detected:', { width, height });

    const scale = Math.min(maxCanvasSize / width, maxCanvasSize / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);

    const message = `Canvas size too large. Auto-adjusted to ${width}x${height}.`;
    console.warn(message);
    // alert(message + '\n\nQuality will be slightly reduced but export will work.');
  }

  try {
    let baseLayerCanvas: HTMLCanvasElement | null = null;
    let vectorLayerCanvas: HTMLCanvasElement | null = null;

    // Dual-layer rendering mode (keep vector constant)
    if (config.keepVectorLayerConstant && vectorLayers.length > 0) {
      onProgress?.({ stage: 'preparing', message: 'Preparing dual-layer rendering...', percent: 10 });

      // Store original visibility state for all layers
      const originalVisibility = new WeakMap();
      baseLayers.forEach(layer => originalVisibility.set(layer, layer.getVisible()));
      vectorLayers.forEach(layer => originalVisibility.set(layer, layer.getVisible()));

      // STEP 1: Render vector layers at a size matching extent's aspect ratio
      // This ensures perfect geographic alignment with the base layer
      onProgress?.({ stage: 'rendering', message: 'Rendering features...', percent: 20 });

      // Hide base layers, show only vector
      baseLayers.forEach(layer => layer.setVisible(false));
      vectorLayers.forEach(layer => layer.setVisible(true));

      // Calculate vector canvas size that matches extent aspect ratio but at screen scale
      // This is CRITICAL: both layers must render with same aspect ratio to align properly
      let vectorWidth = originalSize?.[0] ?? 1920;
      let vectorHeight = originalSize?.[1] ?? 1080;

      if (extent) {
        const extentWidth = extent[2] - extent[0];
        const extentHeight = extent[3] - extent[1];
        const extentAspectRatio = extentWidth / extentHeight;
        const originalAspectRatio = vectorWidth / vectorHeight;

        // Adjust vector canvas to match extent aspect ratio (same logic as for print canvas)
        if (extentAspectRatio > originalAspectRatio) {
          // Extent is wider - keep width, reduce height
          vectorHeight = Math.round(vectorWidth / extentAspectRatio);
        } else {
          // Extent is taller - keep height, reduce width
          vectorWidth = Math.round(vectorHeight * extentAspectRatio);
        }
      }

      const vectorSize: [number, number] = [vectorWidth, vectorHeight];
      map.setSize(vectorSize);

      // Wait for resize and get actual size
      await new Promise(resolve => setTimeout(resolve, 100));
      const actualVectorSize = map.getSize() || vectorSize;

      if (extent) {

        // Calculate resolution directly for vector layer
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

      // Wait for vector layer render
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

      // Hide vector layers, show ONLY the base layer that was originally visible
      vectorLayers.forEach(layer => layer.setVisible(false));
      baseLayers.forEach(layer => {
        const wasVisible = originalVisibility.get(layer);
        layer.setVisible(wasVisible ?? false);
      });

      const printSize: [number, number] = [width, height];
      map.setSize(printSize);

      // Wait for resize and get actual size
      await new Promise(resolve => setTimeout(resolve, 100));
      const actualPrintSize = map.getSize() || printSize;

      if (extent) {
        // Calculate resolution directly for base layer
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

      // Wait for base layer render
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

      // CRITICAL: Wait for resize to take effect and get ACTUAL size
      // The map may not be able to resize to printSize due to browser/canvas limits
      await new Promise(resolve => setTimeout(resolve, 100));

      const actualSize = map.getSize();

      // Use actual size for view.fit to ensure correct resolution calculation
      const fitSize = actualSize || printSize;

      if (extent) {

        // Calculate resolution directly for more precise control
        // Resolution = max(extentWidth / canvasWidth, extentHeight / canvasHeight)
        const extentWidth = extent[2] - extent[0];
        const extentHeight = extent[3] - extent[1];
        const extentCenterX = (extent[0] + extent[2]) / 2;
        const extentCenterY = (extent[1] + extent[3]) / 2;

        const resolutionX = extentWidth / fitSize[0];
        const resolutionY = extentHeight / fitSize[1];
        const targetResolution = Math.max(resolutionX, resolutionY);

        // Set view directly for more precise control
        map.getView().setCenter([extentCenterX, extentCenterY]);
        map.getView().setResolution(targetResolution);

        // Verify the view was set correctly
        const newResolution = map.getView().getResolution();
        const newCenter = map.getView().getCenter();
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

    onProgress?.({ stage: 'rendering', message: 'Processing map canvas...', percent: 60 });

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
      // Composite dual-layer rendering - scale vector UP to match base layer

      // Draw base layer scaled to fill export canvas
      const baseScale = Math.min(width / baseLayerCanvas.width, height / baseLayerCanvas.height);
      const scaledBaseWidth = Math.round(baseLayerCanvas.width * baseScale);
      const scaledBaseHeight = Math.round(baseLayerCanvas.height * baseScale);
      const baseOffsetX = (width - scaledBaseWidth) / 2;
      const baseOffsetY = (height - scaledBaseHeight) / 2;

      exportContext.drawImage(baseLayerCanvas, baseOffsetX, baseOffsetY, scaledBaseWidth, scaledBaseHeight);

      // Scale vector layer UP to match base layer dimensions
      // Vector canvas is smaller (original screen size), base canvas is larger (high res)
      // We scale vector to match base layer size for perfect alignment
      const scaledVectorWidth = scaledBaseWidth;
      const scaledVectorHeight = scaledBaseHeight;

      // Draw vector layer scaled UP to match base layer size, at same position
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
    onProgress?.({ stage: 'creating', message: 'Creating PDF document...', percent: 80 });

    // Calculate actual PDF dimensions in mm based on canvas dimensions
    const pdfWidth = (width * 25.4) / config.resolution;
    const pdfHeight = (height * 25.4) / config.resolution;

    // Determine orientation based on actual dimensions
    const orientation = width > height ? 'landscape' : 'portrait';

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: [pdfWidth, pdfHeight], // Use custom size to match extent
    });

    // Use JPEG for high resolution to avoid size limits
    const useJPEG = config.resolution >= 300;
    const dataURL = exportCanvas.toDataURL(
      useJPEG ? 'image/jpeg' : 'image/png',
      useJPEG ? 0.95 : 1.0
    );

    pdf.addImage(
      dataURL,
      useJPEG ? 'JPEG' : 'PNG',
      0,
      0,
      pdfWidth,
      pdfHeight
    );
    const pdfBlob = pdf.output('blob');
    onProgress?.({ stage: 'complete', message: 'Export complete!', percent: 100 });

    return pdfBlob;
  } catch (error) {
    console.error('❌ PDF export failed:', error);
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
