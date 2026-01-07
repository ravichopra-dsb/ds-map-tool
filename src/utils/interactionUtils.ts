import { Draw } from "ol/interaction";
import { Style } from "ol/style";
import { createPointStyle, createLineStyle } from "./styleUtils";
import { getLength } from "ol/sphere";
import { Feature } from "ol";
import { Geometry } from "ol/geom";

/**
 * Draw interaction configuration interface
 */
export interface DrawInteractionConfig {
  type: "Point" | "LineString" | "Polygon" | "MultiLineString" | "MultiPolygon";
  source: any;
  freehand?: boolean;
  style?: Style | Style[] | ((feature: any) => Style | Style[]);
  onDrawEnd?: (event: any) => void;
  featureProperties?: Record<string, any>;
}

/**
 * Predefined draw configurations for common tools
 */
export const DRAW_CONFIGS = {
  point: {
    type: "Point" as const,
    style: createPointStyle({
      radius: 6,
      fillColor: "#ff0000",
      strokeColor: "#ffffff",
      strokeWidth: 2,
    }),
    featureProperties: {
      isPoint: true,
    },
  },
  polyline: {
    type: "LineString" as const,
    style: createLineStyle("#00ff00", 4),
    featureProperties: {
      isPolyline: true,
    },
  },
  freehand: {
    type: "LineString" as const,
    freehand: true,
    style: createLineStyle("#00ff00", 4),
    featureProperties: {
      isFreehand: true,
    },
  },
  arrow: {
    type: "LineString" as const,
    style: createLineStyle("#000000", 4),
    featureProperties: {
      isArrow: true,
    },
  },
} as const;

/**
 * Global flag to track if we're currently in an active drawing session
 * Used to disable global Ctrl+Z handler during drawing
 */
let isCurrentlyDrawing = false;

/**
 * Check if we're currently in an active drawing session
 * @returns true if drawing is in progress, false otherwise
 */
export const isDrawing = (): boolean => {
  return isCurrentlyDrawing;
};

/**
 * Setup keyboard event handlers for draw interactions
 * Handles Ctrl+Z to remove last point and Escape to finish drawing
 * Only active during drawing (between drawstart and drawend)
 * @param draw - Draw interaction
 */
const setupDrawKeyboardHandlers = (draw: Draw): void => {
  // Mark that we're now drawing
  isCurrentlyDrawing = true;
  const handleKeyDown = (evt: KeyboardEvent) => {
    // Check if Ctrl+Z was pressed to remove last point
    if ((evt.ctrlKey || evt.metaKey) && evt.key === 'z') {
      evt.preventDefault();
      evt.stopImmediatePropagation();
      draw.removeLastPoint();
    }
    // Check if Escape was pressed to finish drawing
    else if (evt.key === 'Escape') {
      evt.preventDefault();
      evt.stopImmediatePropagation();
      draw.finishDrawing();
    }
  };

  // Store the handler reference for cleanup
  (draw as any)._keydownHandler = handleKeyDown;
  window.addEventListener('keydown', handleKeyDown);
};

/**
 * Remove keyboard event handlers from a draw interaction
 * @param draw - Draw interaction
 */
const removeDrawKeyboardHandlers = (draw: Draw): void => {
  const handler = (draw as any)._keydownHandler;
  if (handler) {
    window.removeEventListener('keydown', handler);
    (draw as any)._keydownHandler = null;
  }
  // Mark that we're no longer drawing - global Ctrl+Z can work again
  isCurrentlyDrawing = false;
};

/**
 * Factory function to create draw interactions with standardized configuration
 * @param config - Draw interaction configuration
 * @returns Configured Draw interaction
 */
export const createDrawInteraction = (config: DrawInteractionConfig): Draw => {
  const drawInteraction = new Draw({
    source: config.source,
    type: config.type,
    freehand: config.freehand || false,
    style: config.style,
  });

  // Setup keyboard handlers ONLY when drawing starts (not when tool is just selected)
  drawInteraction.on("drawstart", () => {
    setupDrawKeyboardHandlers(drawInteraction);
  });

  // Remove keyboard handlers when drawing ends or is aborted
  drawInteraction.on("drawend", (event) => {
    removeDrawKeyboardHandlers(drawInteraction);

    // Set feature properties if specified
    if (config.featureProperties) {
      const feature = event.feature;
      Object.entries(config.featureProperties!).forEach(([key, value]) => {
        feature.set(key, value);
      });
    }

    // Call custom onDrawEnd handler if provided
    if (config.onDrawEnd) {
      config.onDrawEnd(event);
    }
  });

  // Also remove handlers if drawing is aborted (e.g., user right-clicks to cancel)
  drawInteraction.on("drawabort", () => {
    removeDrawKeyboardHandlers(drawInteraction);
  });

  return drawInteraction;
};

/**
 * Create a point draw interaction
 * @param source - Vector source to draw on
 * @param onDrawEnd - Optional callback for when drawing ends
 * @returns Point draw interaction
 */
export const createPointDraw = (
  source: any,
  onDrawEnd?: (event: any) => void
): Draw => {
  return createDrawInteraction({
    ...DRAW_CONFIGS.point,
    source,
    onDrawEnd,
  });
};

/**
 * Create a polyline draw interaction
 * @param source - Vector source to draw on
 * @param onDrawEnd - Optional callback for when drawing ends
 * @returns Polyline draw interaction
 */
export const createPolylineDraw = (
  source: any,
  onDrawEnd?: (event: any) => void
): Draw => {
  return createDrawInteraction({
    ...DRAW_CONFIGS.polyline,
    source,
    onDrawEnd,
  });
};

/**
 * Create a freehand draw interaction
 * @param source - Vector source to draw on
 * @param onDrawEnd - Optional callback for when drawing ends
 * @returns Freehand draw interaction
 */
export const createFreehandDraw = (
  source: any,
  onDrawEnd?: (event: any) => void
): Draw => {
  return createDrawInteraction({
    ...DRAW_CONFIGS.freehand,
    source,
    onDrawEnd,
  });
};

/**
 * Create an arrow draw interaction
 * @param source - Vector source to draw on
 * @param onDrawEnd - Optional callback for when drawing ends
 * @returns Arrow draw interaction
 */
export const createArrowDraw = (
  source: any,
  onDrawEnd?: (event: any) => void
): Draw => {
  return createDrawInteraction({
    ...DRAW_CONFIGS.arrow,
    source,
    onDrawEnd,
  });
};

/**
 * Create a legend line draw interaction
 * @param source - Vector source to draw on
 * @param style - Style for the legend line
 * @param legendTypeId - ID of the legend type
 * @param onDrawEnd - Optional callback for when drawing ends
 * @returns Legend draw interaction
 */
export const createLegendDraw = (
  source: any,
  style: Style | Style[],
  legendTypeId: string,
  onDrawEnd?: (event: any) => void
): Draw => {
  return createDrawInteraction({
    type: "LineString",
    source,
    style,
    featureProperties: {
      islegends: true,
      legendType: legendTypeId,
    },
    onDrawEnd,
  });
};

export const createMeasureDraw = (
  source: any,
  style: Style | Style[],
  onDrawEnd?: (event: any) => void
): Draw => {
  // Add measurement logic to the default handler
  const handleDrawEnd = (event: any) => {
    const geometry = event.feature.getGeometry();
    const length = getLength(geometry); // Returns length in meters

    // Store distance in feature properties for text display
    event.feature.set('isMeasure', true);
    event.feature.set('distance', length);

    // Optionally call the provided handler after measurement
    if (onDrawEnd) {
      onDrawEnd(event);
    }
  };

  return createDrawInteraction({
    type: "LineString",
    source,
    style,
    featureProperties: {
      isMeasure: true,
    },
    onDrawEnd: handleDrawEnd,
  });
};

/**
 * Recalculate distance for a measure feature
 * @param feature - Feature to recalculate distance for
 * @returns void
 */
export const recalculateMeasureDistance = (feature: Feature<Geometry>): void => {
  try {
    if (!feature.get('isMeasure')) return;

    const geometry = feature.getGeometry();
    if (!geometry) return;

    // Calculate new distance
    const distance = getLength(geometry);

    // Update the distance property
    feature.set('distance', distance);

  } catch (error) {
    console.error('Error recalculating measure distance:', error);
  }
};

/**
 * Recalculate distances for an array of measure features
 * @param features - Array of features to process
 * @returns void
 */
export const recalculateMeasureDistances = (features: Feature<Geometry>[]): void => {
  features.forEach(feature => {
    if (feature.get('isMeasure')) {
      recalculateMeasureDistance(feature);
    }
  });
};

/**
 * Deep clone a feature with all its properties and geometry
 * @param feature - Feature to clone
 * @returns Cloned feature
 */
export const cloneFeature = (feature: Feature<Geometry>): Feature<Geometry> => {
  const clonedFeature = new Feature({
    ...feature.getProperties(),
    // Don't copy the feature itself
    geometry: feature.getGeometry()?.clone()
  });

  // Copy the style if it exists
  if (feature.getStyle()) {
    clonedFeature.setStyle(feature.getStyle());
  }

  return clonedFeature;
};

/**
 * Offset a feature's geometry by a given amount
 * @param feature - Feature to offset
 * @param offsetX - X offset in map coordinates
 * @param offsetY - Y offset in map coordinates
 * @returns Feature with offset geometry
 */
export const offsetFeature = (
  feature: Feature<Geometry>,
  offsetX: number,
  offsetY: number
): Feature<Geometry> => {
  const clonedFeature = cloneFeature(feature);
  const geometry = clonedFeature.getGeometry();

  if (geometry) {
    geometry.translate(offsetX, offsetY);
  }

  return clonedFeature;
};

/**
 * Get features that can be copied/pasted from a selection
 * @param selectedFeatures - Collection of selected features
 * @returns Array of features that can be copied
 */
export const getCopyableFeatures = (selectedFeatures: Feature<Geometry>[]): Feature<Geometry>[] => {
  // All selectable features can be copied
  return selectedFeatures.filter(feature => feature.getGeometry() !== undefined);
};