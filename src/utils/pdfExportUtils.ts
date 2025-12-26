import { jsPDF } from 'jspdf';
import type Map from 'ol/Map';
import { PAGE_SIZES, type PdfExportConfig } from '@/types/pdf';

export type { PdfExportConfig };

/**
 * Export OpenLayers map to PDF with customizable page size and resolution
 * Adapted from openlayers-BE export implementation
 */
export async function exportMapToPdf(
  map: Map,
  config: PdfExportConfig
): Promise<Blob> {
  console.log('🚀 Starting PDF export with config:', config);

  const dims = PAGE_SIZES[config.pageSize];
  let width = Math.round((dims.width * config.resolution) / 25.4);
  let height = Math.round((dims.height * config.resolution) / 25.4);

  console.log('📐 Initial canvas dimensions:', { width, height });

  // Store original map state
  const originalSize = map.getSize();
  const originalResolution = map.getView().getResolution();

  console.log('🗺️ Original map state:', { originalSize, originalResolution });

  // Check for canvas size limits and auto-adjust if needed
  const maxCanvasSize = 8192;

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
    const printSize: [number, number] = [width, height];
    map.setSize(printSize);
    console.log('📏 Print size set:', printSize);

    if (originalSize && originalResolution !== undefined) {
      const scaling = Math.min(width / originalSize[0], height / originalSize[1]);
      console.log('🔍 Calculating scaling:', { scaling, width, height, originalSize });
      map.getView().setResolution(originalResolution / scaling);
      console.log('✅ View resolution set for export');
    } else {
      throw new Error('Cannot calculate scaling - missing size or viewResolution');
    }

    console.log('⏳ Waiting for rendercomplete...');

    // Wait for render complete with timeout
    await new Promise<void>((resolve, reject) => {
      let renderCompleted = false;

      const timeout = setTimeout(() => {
        if (!renderCompleted) {
          console.error('❌ Rendercomplete timeout');
          reject(new Error('Map render timeout after 60 seconds. Try lowering the resolution.'));
        }
      }, 60000);

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

    // Determine orientation based on dimensions
    const orientation = dims.width > dims.height ? 'landscape' : 'portrait';

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: config.pageSize,
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
      dims.width,
      dims.height
    );

    console.log('💾 Creating PDF blob...');
    const pdfBlob = pdf.output('blob');
    console.log('✅ PDF created successfully!');

    return pdfBlob;
  } catch (error) {
    console.error('❌ PDF export failed:', error);
    throw error;
  } finally {
    // Always restore original map state
    console.log('🔄 Resetting map state...');
    if (originalSize && originalResolution !== undefined) {
      map.setSize(originalSize);
      map.getView().setResolution(originalResolution);
      console.log('✅ Map size and resolution reset');
    }
  }
}
