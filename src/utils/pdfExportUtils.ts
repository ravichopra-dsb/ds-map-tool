import { jsPDF } from 'jspdf';
import type Map from 'ol/Map';
import type { Extent } from 'ol/extent';
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
  console.log('🚀 Starting PDF export with config:', config);
  console.log('📍 Export extent:', extent);
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

    console.log('📊 Aspect ratios:', {
      extentAspectRatio,
      pageAspectRatio,
      extentWidth,
      extentHeight
    });

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

  // Check for canvas size limits and auto-adjust if needed
  const maxCanvasSize = 12192;

  if (width > maxCanvasSize || height > maxCanvasSize) {
    console.warn('⚠️ Large canvas size detected:', { width, height });

    const scale = Math.min(maxCanvasSize / width, maxCanvasSize / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);

    const message = `Canvas size too large. Auto-adjusted to ${width}x${height}.`;
    console.warn(message);
    alert(message + '\n\nQuality will be slightly reduced but export will work.');
  }

  console.log('📏 Final canvas dimensions:', { width, height });

  try {
    // Set print size
    console.log('📐 Setting print size...');
    onProgress?.({ stage: 'preparing', message: 'Setting up canvas...', percent: 10 });
    const printSize: [number, number] = [width, height];
    map.setSize(printSize);
    console.log('📏 Print size set:', printSize);

    // If extent is provided, fit the view to that extent
    if (extent) {
      console.log('🎯 Fitting map to selected extent:', extent);
      map.getView().fit(extent, {
        size: printSize,
        padding: [0, 0, 0, 0],
      });
      console.log('✅ Map fitted to selected extent');
    } else if (originalSize && originalResolution !== undefined) {
      const scaling = Math.min(width / originalSize[0], height / originalSize[1]);
      console.log('🔍 Calculating scaling:', { scaling, width, height, originalSize });
      map.getView().setResolution(originalResolution / scaling);
      console.log('✅ View resolution set for export');
    } else {
      throw new Error('Cannot calculate scaling - missing size or viewResolution');
    }

    console.log('⏳ Waiting for rendercomplete...');
    onProgress?.({ stage: 'rendering', message: 'Rendering map...', percent: 30 });

    // Wait for render complete with timeout
    await new Promise<void>((resolve, reject) => {
      let renderCompleted = false;

      const timeout = setTimeout(() => {
        if (!renderCompleted) {
          console.error('❌ Rendercomplete timeout');
          reject(new Error('Map render timeout after 60 seconds. Try lowering the resolution.'));
        }
      }, 60000*3);

      map.once('rendercomplete', () => {
        renderCompleted = true;
        clearTimeout(timeout);
        console.log('🎨 Rendercomplete fired!');
        resolve();
      });

      // Trigger render
      map.renderSync();
    });

    console.log('🖼️ Getting map canvas...');
    onProgress?.({ stage: 'rendering', message: 'Processing map canvas...', percent: 60 });

    // Get the map canvas
    const mapCanvas = document.querySelector('#map canvas') as HTMLCanvasElement;
    if (!mapCanvas) {
      throw new Error('No map canvas found');
    }

    console.log('📏 Map canvas dimensions:', {
      width: mapCanvas.width,
      height: mapCanvas.height,
      targetWidth: width,
      targetHeight: height,
    });

    // Create export canvas with proper dimensions
    const exportCanvas = document.createElement('canvas');
    const scale = Math.min(width / mapCanvas.width, height / mapCanvas.height);
    const scaledWidth = Math.round(mapCanvas.width * scale);
    const scaledHeight = Math.round(mapCanvas.height * scale);

    exportCanvas.width = width;
    exportCanvas.height = height;

    console.log('📐 Export canvas setup:', {
      scale,
      scaledWidth,
      scaledHeight,
      exportWidth: exportCanvas.width,
      exportHeight: exportCanvas.height,
    });

    const exportContext = exportCanvas.getContext('2d');
    if (!exportContext) {
      throw new Error('Failed to get export canvas context');
    }

    // Fill with white background
    exportContext.fillStyle = 'white';
    exportContext.fillRect(0, 0, width, height);

    // Center the map image
    const offsetX = (width - scaledWidth) / 2;
    const offsetY = (height - scaledHeight) / 2;

    // Disable image smoothing for sharp quality
    exportContext.imageSmoothingEnabled = true;
    exportContext.imageSmoothingQuality = 'high';

    // Draw the map canvas scaled to fit
    exportContext.drawImage(mapCanvas, offsetX, offsetY, scaledWidth, scaledHeight);

    console.log('🎨 Map drawn to export canvas');

    console.log('📄 Creating PDF...');
    onProgress?.({ stage: 'creating', message: 'Creating PDF document...', percent: 80 });

    // Calculate actual PDF dimensions in mm based on canvas dimensions
    const pdfWidth = (width * 25.4) / config.resolution;
    const pdfHeight = (height * 25.4) / config.resolution;

    // Determine orientation based on actual dimensions
    const orientation = width > height ? 'landscape' : 'portrait';

    console.log('📏 PDF dimensions:', { pdfWidth, pdfHeight, orientation });

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: [pdfWidth, pdfHeight], // Use custom size to match extent
    });

    console.log('🖼️ Converting canvas to data URL...');

    // Use JPEG for high resolution to avoid size limits
    const useJPEG = config.resolution >= 300;
    const dataURL = exportCanvas.toDataURL(
      useJPEG ? 'image/jpeg' : 'image/png',
      useJPEG ? 0.95 : 1.0
    );

    console.log('📊 Data URL length:', dataURL.length, 'Format:', useJPEG ? 'JPEG' : 'PNG');

    console.log('📎 Adding image to PDF...');

    pdf.addImage(
      dataURL,
      useJPEG ? 'JPEG' : 'PNG',
      0,
      0,
      pdfWidth,
      pdfHeight
    );

    console.log('💾 Creating PDF blob...');
    const pdfBlob = pdf.output('blob');
    console.log('✅ PDF created successfully!');
    onProgress?.({ stage: 'complete', message: 'Export complete!', percent: 100 });

    return pdfBlob;
  } catch (error) {
    console.error('❌ PDF export failed:', error);
    throw error;
  } finally {
    // Always restore original map state
    console.log('🔄 Resetting map state...');
    if (originalSize && originalResolution !== undefined && originalCenter) {
      map.setSize(originalSize);
      map.getView().setResolution(originalResolution);
      map.getView().setCenter(originalCenter);
      if (originalRotation !== undefined) {
        map.getView().setRotation(originalRotation);
      }
      console.log('✅ Map size, resolution, center, and rotation reset');
    }
  }
}
