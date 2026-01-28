import { Draw } from "ol/interaction";
import { createBox } from "ol/interaction/Draw";
import { Style } from "ol/style";
import { createPointStyle, createLineStyle, createPolygonStyle } from "./styleUtils";
import { getLength } from "ol/sphere";
import { Feature } from "ol";
import { Geometry, LineString, Circle as CircleGeom, Polygon, SimpleGeometry } from "ol/geom";
import { Vector as VectorSource } from "ol/source";
import type { Coordinate } from "ol/coordinate";
import { circleToPolygon } from "./geometryUtils";
import { generateArcPreview, createArcGeometry } from "./arcUtils";
import {
  generateRevisionCloudCoordinates,
  generateRevisionCloudPreview,
  REVISION_CLOUD_CONFIG,
} from "./revisionCloudUtils";
import { applyOrthoToMarkedCoordinates, constrainToOrtho } from "./orthoUtils";
import { useToolStore } from "@/stores/useToolStore";
import { useFolderStore } from "@/stores/useFolderStore";

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
  geometryFunction?: (coordinates: any, geometry?: SimpleGeometry) => SimpleGeometry;
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
    style: createPolygonStyle("#ffffff", 2, 1, "#000000", 0),
    featureProperties: {
      isBox: true,
    },
  },
  circle: {
    type: "Circle" as const,
    style: createPolygonStyle("#ffffff", 2, 1, "#000000", 0),
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
    geometryFunction: config.geometryFunction,
  });

  // Setup keyboard handlers ONLY when drawing starts (not when tool is just selected)
  drawInteraction.on("drawstart", () => {
    setupDrawKeyboardHandlers(drawInteraction);
  });

  // Remove keyboard handlers when drawing ends or is aborted
  drawInteraction.on("drawend", (event) => {
    removeDrawKeyboardHandlers(drawInteraction);

    const feature = event.feature;

    // Set feature properties if specified
    if (config.featureProperties) {
      Object.entries(config.featureProperties!).forEach(([key, value]) => {
        feature.set(key, value);
      });
    }

    // Set active folder ID if one is selected
    const activeFolderId = useFolderStore.getState().activeFolderId;
    if (activeFolderId) {
      feature.set("folderId", activeFolderId);
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
 * Create a polyline draw interaction with optional ortho mode support
 * Supports toggling ortho mode during drawing - segments are constrained based on
 * the ortho state at the time each point was added (AutoCAD-like behavior).
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

  // Track ortho state for each segment during drawing
  // orthoStates[i] = true means segment from coord[i] to coord[i+1] should be ortho
  let orthoStates: boolean[] = [];

  // Geometry function that dynamically checks ortho mode and tracks per-segment state
  const orthoGeometryFunction = (
    coordinates: Coordinate[] | Coordinate[][],
    geometry?: SimpleGeometry
  ): SimpleGeometry => {
    const coordArray = coordinates as Coordinate[];
    if (!geometry) {
      geometry = new LineString([]);
    }

    const currentOrthoEnabled = useToolStore.getState().orthoMode;

    // Calculate confirmed segments: last coord is cursor preview, segments = points - 1
    // coordArray = [p0, cursor] → 0 confirmed segments
    // coordArray = [p0, p1, cursor] → 1 confirmed segment (p0→p1)
    // coordArray = [p0, p1, p2, cursor] → 2 confirmed segments
    const confirmedSegments = Math.max(0, coordArray.length - 2);

    // When a new segment is confirmed (user clicked 2nd+ point), record the ortho state
    if (confirmedSegments > orthoStates.length) {
      const newSegments = confirmedSegments - orthoStates.length;
      for (let i = 0; i < newSegments; i++) {
        orthoStates.push(currentOrthoEnabled);
      }
    }

    // Build the preview coordinates with selective ortho constraint
    // For confirmed segments, use stored ortho states
    // For the preview segment (last), use current ortho state
    const result: Coordinate[] = [coordArray[0]];

    for (let i = 1; i < coordArray.length; i++) {
      const prevConstrained = result[i - 1];
      const currentRaw = coordArray[i];

      // Determine if this segment should be ortho
      // Segment index = i - 1 (segment 0 connects coord[0] to coord[1])
      let shouldApplyOrtho: boolean;
      if (i <= orthoStates.length) {
        // This is a confirmed segment - use stored state
        shouldApplyOrtho = orthoStates[i - 1];
      } else {
        // This is the preview segment - use current ortho mode
        shouldApplyOrtho = currentOrthoEnabled;
      }

      if (shouldApplyOrtho) {
        result.push(constrainToOrtho(prevConstrained, currentRaw));
      } else {
        result.push(currentRaw);
      }
    }

    (geometry as LineString).setCoordinates(result);
    return geometry;
  };

  // Wrap the onDrawEnd to apply final ortho constraint based on tracked states
  const handleDrawEnd = (event: any) => {
    const geometry = event.feature.getGeometry() as LineString;
    const coords = geometry.getCoordinates();

    // Record ortho state for the final segment if needed
    const currentOrthoEnabled = useToolStore.getState().orthoMode;
    if (orthoStates.length < coords.length - 1) {
      orthoStates.push(currentOrthoEnabled);
    }

    // Apply ortho constraint based on per-segment ortho states
    const constrainedCoords = applyOrthoToMarkedCoordinates(coords, orthoStates);
    geometry.setCoordinates(constrainedCoords);

    // Store ortho states in feature for potential later use
    event.feature.set('orthoStates', [...orthoStates]);

    // Reset tracking for next drawing
    orthoStates = [];
    // lastCoordCount = 0;

    // Call the original onDrawEnd if provided
    if (onDrawEnd) {
      onDrawEnd(event);
    }
  };

  const drawInteraction = createDrawInteraction({
    ...DRAW_CONFIGS.polyline,
    source,
    style: createLineStyle(customColor, customWidth),
    featureProperties: {
      isPolyline: true,
      lineColor: customColor,
      lineWidth: customWidth,
    },
    geometryFunction: orthoGeometryFunction,
    onDrawEnd: handleDrawEnd,
  });

  // Reset ortho tracking when drawing is aborted
  drawInteraction.on('drawabort', () => {
    orthoStates = [];
    // lastCoordCount = 0;
  });

  return drawInteraction;
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
  const customStrokeColor = strokeColor || "#000000";
  const customFillColor = fillColor || "#000000";

  const drawInteraction = new Draw({
    source: source,
    type: "Circle",
    geometryFunction: createBox(),
    style: createPolygonStyle(customStrokeColor, 2, 1, customFillColor, 0),
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
    event.feature.set("fillOpacity", 0);

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
  const customStrokeColor = strokeColor || "#000000";
  const customFillColor = fillColor || "#000000";

  const drawInteraction = new Draw({
    source: source,
    type: "Circle",
    style: createPolygonStyle(customStrokeColor, 2, 1, customFillColor, 0),
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
    event.feature.set("fillOpacity", 0);

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

/**
 * Create a 3-point arc draw interaction
 * User clicks 3 points: start, point on arc, end
 * @param source - Vector source to draw on
 * @param onDrawEnd - Optional callback for when drawing ends
 * @param color - Optional custom line color
 * @param width - Optional custom line width
 * @returns Arc draw interaction
 */
export const createArcDraw = (
  source: VectorSource<Feature<Geometry>>,
  onDrawEnd?: (event: any) => void,
  color?: string,
  width?: number
): Draw => {
  const customColor = color || "#00ff00";
  const customWidth = width || 4;

  const drawInteraction = new Draw({
    source: source,
    type: "LineString",
    maxPoints: 3,
    style: createLineStyle(customColor, customWidth),
    geometryFunction: (coordinates, geom) => {
      const coordArray = coordinates as Coordinate[];

      if (!geom) {
        geom = new LineString([]);
      }

      // Generate arc preview based on number of points
      const previewCoords = generateArcPreview(coordArray);
      (geom as LineString).setCoordinates(previewCoords);

      return geom;
    },
  });

  // Setup keyboard handlers when drawing starts
  drawInteraction.on("drawstart", () => {
    setupDrawKeyboardHandlers(drawInteraction);
  });

  drawInteraction.on("drawend", (event) => {
    removeDrawKeyboardHandlers(drawInteraction);

    // Get the 3 clicked points from the sketch
    const sketchCoords = (event.feature.getGeometry() as LineString).getCoordinates();

    // If we have the full arc preview, use it; otherwise regenerate
    if (sketchCoords.length >= 3) {
      // The geometryFunction already generated the arc, but we need to ensure
      // we have the full resolution arc from the original 3 points
      // Extract the original 3 control points and regenerate with higher resolution
      const p1 = sketchCoords[0];
      const p2 = sketchCoords[Math.floor(sketchCoords.length / 2)];
      const p3 = sketchCoords[sketchCoords.length - 1];

      const finalGeom = createArcGeometry(p1, p2, p3, 64);
      event.feature.setGeometry(finalGeom);
    }

    // Set feature properties
    event.feature.set("isArc", true);
    event.feature.set("lineColor", customColor);
    event.feature.set("lineWidth", customWidth);

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
 * Create a revision cloud draw interaction
 * Uses freehand drawing with automatic scallop edge generation
 * @param source - Vector source to draw on
 * @param onDrawEnd - Optional callback for when drawing ends
 * @param strokeColor - Optional custom stroke color
 * @param fillColor - Optional custom fill color
 * @param scallopRadius - Optional scallop radius in map units
 * @returns Revision cloud draw interaction
 */
export const createRevisionCloudDraw = (
  source: VectorSource<Feature<Geometry>>,
  onDrawEnd?: (event: any) => void,
  strokeColor?: string,
  fillColor?: string,
  scallopRadius?: number
): Draw => {
  const customStrokeColor = strokeColor || "#ff0000";
  const customFillColor = fillColor;
  const radius = scallopRadius || REVISION_CLOUD_CONFIG.defaultScallopRadius;

  const drawInteraction = new Draw({
    source: source,
    type: "Polygon",
    freehand: true,
    style: createPolygonStyle(customStrokeColor, 2, 1, customFillColor, 0),
    geometryFunction: (coordinates, geom) => {
      // coordinates for Polygon type is [ring[]]
      const coordArray = coordinates as Coordinate[][];

      if (!geom) {
        geom = new Polygon([[]]);
      }

      if (coordArray.length > 0 && coordArray[0].length >= 3) {
        // Generate revision cloud preview
        const cloudCoords = generateRevisionCloudPreview(coordArray[0], radius);
        (geom as Polygon).setCoordinates([cloudCoords]);
      } else if (coordArray.length > 0) {
        (geom as Polygon).setCoordinates(coordArray);
      }

      return geom;
    },
  });

  // Setup keyboard handlers when drawing starts
  drawInteraction.on("drawstart", () => {
    setupDrawKeyboardHandlers(drawInteraction);
  });

  drawInteraction.on("drawend", (event) => {
    removeDrawKeyboardHandlers(drawInteraction);

    // Get the original freehand coordinates and regenerate with full resolution
    const polygon = event.feature.getGeometry() as Polygon;
    const originalCoords = polygon.getCoordinates()[0];

    // Generate final revision cloud with full resolution
    const finalCloudCoords = generateRevisionCloudCoordinates(
      originalCoords,
      radius
    );
    polygon.setCoordinates([finalCloudCoords]);

    // Set feature properties
    event.feature.set("isRevisionCloud", true);
    event.feature.set("strokeColor", customStrokeColor);
    event.feature.set("fillColor", customFillColor);
    event.feature.set("fillOpacity", 1);
    event.feature.set("scallopRadius", radius);

    if (onDrawEnd) {
      onDrawEnd(event);
    }
  });

  drawInteraction.on("drawabort", () => {
    removeDrawKeyboardHandlers(drawInteraction);
  });

  return drawInteraction;
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
        // Use finishDrawing() to keep the drawn coordinates (same as normal mode)
        drawInteraction.finishDrawing();
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