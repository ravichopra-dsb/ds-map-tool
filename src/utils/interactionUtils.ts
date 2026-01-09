import { Draw } from "ol/interaction";
import { createBox } from "ol/interaction/Draw";
import { Style } from "ol/style";
import { createPointStyle, createLineStyle, createPolygonStyle } from "./styleUtils";
import { getLength } from "ol/sphere";
import { Feature } from "ol";
import { Geometry, LineString, Circle as CircleGeom } from "ol/geom";
import { Vector as VectorSource } from "ol/source";
import type { Coordinate } from "ol/coordinate";
import { circleToPolygon } from "./geometryUtils";

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
  box: {
    type: "Circle" as const, // Uses Circle type with createBox() geometry function
    style: createPolygonStyle("#3b82f6", 2, 1, "#3b82f6", 0.2),
    featureProperties: {
      isBox: true,
    },
  },
  circle: {
    type: "Circle" as const,
    style: createPolygonStyle("#8b5cf6", 2, 1, "#8b5cf6", 0.2),
    featureProperties: {
      isCircle: true,
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
 * @param color - Optional custom line color
 * @param width - Optional custom line width
 * @returns Polyline draw interaction
 */
export const createPolylineDraw = (
  source: any,
  onDrawEnd?: (event: any) => void,
  color?: string,
  width?: number
): Draw => {
  const customColor = color || "#00ff00";
  const customWidth = width || 4;

  return createDrawInteraction({
    ...DRAW_CONFIGS.polyline,
    source,
    style: createLineStyle(customColor, customWidth),
    featureProperties: {
      isPolyline: true,
      lineColor: customColor,
      lineWidth: customWidth,
    },
    onDrawEnd,
  });
};

/**
 * Create a freehand draw interaction
 * @param source - Vector source to draw on
 * @param onDrawEnd - Optional callback for when drawing ends
 * @param color - Optional custom line color
 * @param width - Optional custom line width
 * @returns Freehand draw interaction
 */
export const createFreehandDraw = (
  source: any,
  onDrawEnd?: (event: any) => void,
  color?: string,
  width?: number
): Draw => {
  const customColor = color || "#00ff00";
  const customWidth = width || 4;

  return createDrawInteraction({
    ...DRAW_CONFIGS.freehand,
    source,
    style: createLineStyle(customColor, customWidth),
    featureProperties: {
      isFreehand: true,
      lineColor: customColor,
      lineWidth: customWidth,
    },
    onDrawEnd,
  });
};

/**
 * Create an arrow draw interaction
 * @param source - Vector source to draw on
 * @param onDrawEnd - Optional callback for when drawing ends
 * @param color - Optional custom line color
 * @param width - Optional custom line width
 * @returns Arrow draw interaction
 */
export const createArrowDraw = (
  source: any,
  onDrawEnd?: (event: any) => void,
  color?: string,
  width?: number
): Draw => {
  const customColor = color || "#000000";
  const customWidth = width || 4;

  return createDrawInteraction({
    ...DRAW_CONFIGS.arrow,
    source,
    style: createLineStyle(customColor, customWidth),
    featureProperties: {
      isArrow: true,
      lineColor: customColor,
      lineWidth: customWidth,
    },
    onDrawEnd,
  });
};

/**
 * Create a box draw interaction
 * @param source - Vector source to draw on
 * @param onDrawEnd - Optional callback for when drawing ends
 * @param strokeColor - Optional custom stroke color
 * @param fillColor - Optional custom fill color
 * @returns Box draw interaction
 */
export const createBoxDraw = (
  source: any,
  onDrawEnd?: (event: any) => void,
  strokeColor?: string,
  fillColor?: string
): Draw => {
  const customStrokeColor = strokeColor || "#3b82f6";
  const customFillColor = fillColor || "#3b82f6";

  const drawInteraction = new Draw({
    source: source,
    type: "Circle",
    geometryFunction: createBox(),
    style: createPolygonStyle(customStrokeColor, 2, 1, customFillColor, 0.2),
  });

  // Setup keyboard handlers when drawing starts
  drawInteraction.on("drawstart", () => {
    setupDrawKeyboardHandlers(drawInteraction);
  });

  drawInteraction.on("drawend", (event) => {
    removeDrawKeyboardHandlers(drawInteraction);

    // Set feature properties
    event.feature.set("isBox", true);
    event.feature.set("strokeColor", customStrokeColor);
    event.feature.set("fillColor", customFillColor);

    if (onDrawEnd) {
      onDrawEnd(event);
    }
  });

  drawInteraction.on("drawabort", () => {
    removeDrawKeyboardHandlers(drawInteraction);
  });

  return drawInteraction;
};

/**
 * Create a circle draw interaction
 * Draws as Circle geometry but converts to Polygon on completion for GeoJSON compatibility
 * @param source - Vector source to draw on
 * @param onDrawEnd - Optional callback for when drawing ends
 * @param strokeColor - Optional custom stroke color
 * @param fillColor - Optional custom fill color
 * @returns Circle draw interaction
 */
export const createCircleDraw = (
  source: any,
  onDrawEnd?: (event: any) => void,
  strokeColor?: string,
  fillColor?: string
): Draw => {
  const customStrokeColor = strokeColor || "#8b5cf6";
  const customFillColor = fillColor || "#8b5cf6";

  const drawInteraction = new Draw({
    source: source,
    type: "Circle",
    style: createPolygonStyle(customStrokeColor, 2, 1, customFillColor, 0.2),
  });

  // Setup keyboard handlers when drawing starts
  drawInteraction.on("drawstart", () => {
    setupDrawKeyboardHandlers(drawInteraction);
  });

  drawInteraction.on("drawend", (event) => {
    removeDrawKeyboardHandlers(drawInteraction);

    // Convert Circle geometry to Polygon for GeoJSON compatibility
    const circleGeometry = event.feature.getGeometry() as CircleGeom;
    const polygonGeometry = circleToPolygon(circleGeometry, 64);
    event.feature.setGeometry(polygonGeometry);

    // Set feature properties
    event.feature.set("isCircle", true);
    event.feature.set("strokeColor", customStrokeColor);
    event.feature.set("fillColor", customFillColor);

    if (onDrawEnd) {
      onDrawEnd(event);
    }
  });

  drawInteraction.on("drawabort", () => {
    removeDrawKeyboardHandlers(drawInteraction);
  });

  return drawInteraction;
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

// ============== CONTINUATION DRAW UTILITIES ==============

/**
 * Configuration for continuation drawing
 */
export interface ContinuationConfig {
  feature: Feature<Geometry>;
  endpoint: "start" | "end";
  featureType: "polyline" | "freehand" | "arrow" | "measure";
  onComplete: (newCoordinates: Coordinate[]) => void;
  onCancel: () => void;
}

/**
 * Get style for continuation drawing based on feature type
 * @param feature - The feature being extended
 * @param featureType - Type of the feature
 * @returns Style for the draw interaction
 */
const getContinuationStyle = (
  feature: Feature<Geometry>,
  featureType: string
): Style | Style[] => {
  // Get existing feature's style properties if available
  const strokeColor = feature.get("strokeColor") || "#00ff00";
  const strokeWidth = feature.get("strokeWidth") || 4;

  if (featureType === "measure") {
    return createLineStyle("#3b4352", 2, 1, [12, 8]);
  }

  if (featureType === "arrow") {
    return createLineStyle("#000000", 4);
  }

  return createLineStyle(strokeColor, strokeWidth);
};

/**
 * Create a Draw interaction for continuing an existing LineString
 * The Draw interaction starts from the endpoint and allows adding new coordinates
 * @param source - Vector source (not used for drawing, just for reference)
 * @param config - Continuation configuration
 * @returns Configured Draw interaction
 */
export const createContinuationDraw = (
  _source: VectorSource<Feature<Geometry>>,
  config: ContinuationConfig
): Draw => {
  const { feature, endpoint, featureType, onComplete, onCancel } = config;
  const geometry = feature.getGeometry() as LineString;
  const existingCoords = geometry.getCoordinates();

  // Determine starting point based on which endpoint is being extended
  const startCoord =
    endpoint === "end"
      ? existingCoords[existingCoords.length - 1]
      : existingCoords[0];

  // Freehand mode for freehand features
  const isFreehand = featureType === "freehand";

  // Get appropriate style
  const style = getContinuationStyle(feature, featureType);

  // Create temporary source for the continuation segment
  // We don't add to the main source - we'll extend the original feature instead
  const tempSource = new VectorSource<Feature<Geometry>>();

  const drawInteraction = new Draw({
    source: tempSource,
    type: "LineString",
    freehand: isFreehand,
    style: style,
    // Custom geometry function to connect visually to the existing endpoint
    geometryFunction: (coordinates, geom) => {
      if (!geom) {
        geom = new LineString([startCoord]);
      }
      // Prepend the start coordinate to make it appear connected
      // coordinates is an array of Coordinate for LineString type
      const coordArray = coordinates as Coordinate[];
      const allCoords: Coordinate[] = [startCoord, ...coordArray.slice(1)];
      (geom as LineString).setCoordinates(allCoords);
      return geom;
    },
  });

  // Setup keyboard handlers when drawing starts
  drawInteraction.on("drawstart", () => {
    // Mark that we're currently drawing
    isCurrentlyDrawing = true;

    const handleKeyDown = (evt: KeyboardEvent) => {
      if ((evt.ctrlKey || evt.metaKey) && evt.key === "z") {
        evt.preventDefault();
        evt.stopImmediatePropagation();
        drawInteraction.removeLastPoint();
      } else if (evt.key === "Escape") {
        evt.preventDefault();
        evt.stopImmediatePropagation();
        drawInteraction.abortDrawing();
      }
    };

    (drawInteraction as any)._continuationKeydownHandler = handleKeyDown;
    window.addEventListener("keydown", handleKeyDown);
  });

  // Handle draw completion
  drawInteraction.on("drawend", (event) => {
    // Remove keyboard handler
    const handler = (drawInteraction as any)._continuationKeydownHandler;
    if (handler) {
      window.removeEventListener("keydown", handler);
      (drawInteraction as any)._continuationKeydownHandler = null;
    }
    isCurrentlyDrawing = false;

    const drawnGeom = event.feature.getGeometry() as LineString;
    const newCoords = drawnGeom.getCoordinates();

    // Remove the prepended start coordinate to get only new points
    const extensionCoords = newCoords.slice(1);

    if (extensionCoords.length > 0) {
      onComplete(extensionCoords);
    } else {
      onCancel();
    }
  });

  // Handle draw abort (e.g., Escape key)
  drawInteraction.on("drawabort", () => {
    // Remove keyboard handler
    const handler = (drawInteraction as any)._continuationKeydownHandler;
    if (handler) {
      window.removeEventListener("keydown", handler);
      (drawInteraction as any)._continuationKeydownHandler = null;
    }
    isCurrentlyDrawing = false;
    onCancel();
  });

  return drawInteraction;
};