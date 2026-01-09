import Feature from "ol/Feature";
import { LineString } from "ol/geom";
import type { Geometry } from "ol/geom";
import { getLength } from "ol/sphere";
import type { Coordinate } from "ol/coordinate";
import type { Vector as VectorSource } from "ol/source";
import { transform } from "ol/proj";

/**
 * Check if a feature is splittable
 * LineString features except Arrow can be split (including Measure)
 */
export const isSplittableFeature = (feature: Feature<Geometry>): boolean => {
  const geometry = feature.getGeometry();

  // Only LineString geometries can be split
  if (!geometry || geometry.getType() !== "LineString") {
    return false;
  }

  // Exclude arrow features
  if (feature.get("isArrow")) {
    return false;
  }

  return true;
};

/**
 * Check if a feature can be offset (parallel copy)
 * Reuses same criteria as splittable: LineString features except Arrow
 * DRY: Alias to isSplittableFeature since criteria is identical
 */
export const isOffsettableFeature = isSplittableFeature;

/**
 * Copy all properties from original feature to split features
 * Preserves styling, names, and custom properties
 * For measure features, recalculates distance for each split segment
 */
export const copyFeatureProperties = (
  original: Feature<Geometry>,
  splitFeatures: Feature<Geometry>[]
): void => {
  const properties = original.getProperties();
  const isMeasure = original.get("isMeasure");

  // Remove geometry from properties as each split feature has its own geometry
  const { geometry, ...otherProps } = properties;

  splitFeatures.forEach((feature, index) => {
    // Copy all properties to the split feature
    Object.entries(otherProps).forEach(([key, value]) => {
      feature.set(key, value);
    });

    // Append index to name if original has a name (for distinction)
    const originalName = original.get("name");
    if (originalName) {
      feature.set("name", `${originalName} (${index + 1})`);
    }

    // Recalculate distance for measure features
    if (isMeasure) {
      const geom = feature.getGeometry() as LineString;
      if (geom) {
        const length = getLength(geom);
        feature.set("distance", length);
      }
    }
  });
};

// ============== MERGE UTILITIES ==============

/**
 * Check if a feature can be merged
 * Reuses same criteria as splittable: LineString features except Arrow
 * DRY: Alias to isSplittableFeature since criteria is identical
 */
export const isMergeableFeature = isSplittableFeature;

/**
 * Get the start and end coordinates of a LineString feature
 */
export const getLineEndpoints = (
  feature: Feature<Geometry>
): { start: Coordinate; end: Coordinate } | null => {
  const geometry = feature.getGeometry();
  if (!geometry || geometry.getType() !== "LineString") {
    return null;
  }

  const coords = (geometry as LineString).getCoordinates();
  if (coords.length < 2) {
    return null;
  }

  return {
    start: coords[0],
    end: coords[coords.length - 1],
  };
};

/**
 * Calculate distance between two coordinates
 */
export const getCoordinateDistance = (
  coord1: Coordinate,
  coord2: Coordinate
): number => {
  const dx = coord1[0] - coord2[0];
  const dy = coord1[1] - coord2[1];
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Find a nearby endpoint from other features in the source
 * Returns the feature and which endpoint matched
 */
export const findNearbyEndpoint = (
  coordinate: Coordinate,
  sourceFeatures: Feature<Geometry>[],
  excludeFeature: Feature<Geometry>,
  tolerance: number
): {
  feature: Feature<Geometry>;
  endpoint: "start" | "end";
  distance: number;
} | null => {
  let closest: {
    feature: Feature<Geometry>;
    endpoint: "start" | "end";
    distance: number;
  } | null = null;

  for (const feature of sourceFeatures) {
    // Skip the feature being modified and non-mergeable features
    if (feature === excludeFeature || !isMergeableFeature(feature)) {
      continue;
    }

    const endpoints = getLineEndpoints(feature);
    if (!endpoints) continue;

    const startDist = getCoordinateDistance(coordinate, endpoints.start);
    const endDist = getCoordinateDistance(coordinate, endpoints.end);

    if (startDist <= tolerance && (!closest || startDist < closest.distance)) {
      closest = { feature, endpoint: "start", distance: startDist };
    }

    if (endDist <= tolerance && (!closest || endDist < closest.distance)) {
      closest = { feature, endpoint: "end", distance: endDist };
    }
  }

  return closest;
};

/**
 * Merge two LineString features into one
 * @param feature1 - First feature (the one being modified)
 * @param feature2 - Second feature (the one to merge with)
 * @param feature1Endpoint - Which endpoint of feature1 is connecting ("start" or "end")
 * @param feature2Endpoint - Which endpoint of feature2 is connecting ("start" or "end")
 * @param customProperties - Optional custom properties to use instead of auto-merging from feature1
 * @returns New merged feature
 */
export const mergeLineStrings = (
  feature1: Feature<Geometry>,
  feature2: Feature<Geometry>,
  feature1Endpoint: "start" | "end",
  feature2Endpoint: "start" | "end",
  customProperties?: Record<string, any>
): Feature<Geometry> | null => {
  const geom1 = feature1.getGeometry() as LineString;
  const geom2 = feature2.getGeometry() as LineString;

  if (!geom1 || !geom2) return null;

  let coords1 = geom1.getCoordinates();
  let coords2 = geom2.getCoordinates();

  // Determine the order and direction of coordinates
  // We want: [...coords1] -> [...coords2] connected at the right endpoints

  // If feature1's start is connecting, reverse coords1
  if (feature1Endpoint === "start") {
    coords1 = coords1.slice().reverse();
  }

  // If feature2's end is connecting, reverse coords2
  if (feature2Endpoint === "end") {
    coords2 = coords2.slice().reverse();
  }

  // Merge coordinates (skip first coord of coords2 to avoid duplicate)
  const mergedCoords = [...coords1, ...coords2.slice(1)];

  // Create new LineString geometry
  const mergedGeometry = new LineString(mergedCoords);

  // Create new feature with merged geometry
  const mergedFeature = new Feature({
    geometry: mergedGeometry,
  });

  // Use custom properties if provided, otherwise fall back to feature1's properties
  if (customProperties) {
    Object.entries(customProperties).forEach(([key, value]) => {
      mergedFeature.set(key, value);
    });
  } else {
    // Copy properties from feature1 (primary feature)
    const props = feature1.getProperties();
    const { geometry, ...otherProps } = props;
    Object.entries(otherProps).forEach(([key, value]) => {
      mergedFeature.set(key, value);
    });
  }

  // Recalculate distance for measure features
  if (feature1.get("isMeasure") || feature2.get("isMeasure")) {
    mergedFeature.set("isMeasure", true);
    const length = getLength(mergedGeometry);
    mergedFeature.set("distance", length);
  }

  return mergedFeature;
};

/**
 * Perform merge operation: remove old features, add merged feature
 * @param customProperties - Optional custom properties to use for the merged feature
 */
export const performMerge = (
  vectorSource: VectorSource<Feature<Geometry>>,
  feature1: Feature<Geometry>,
  feature2: Feature<Geometry>,
  feature1Endpoint: "start" | "end",
  feature2Endpoint: "start" | "end",
  customProperties?: Record<string, any>
): Feature<Geometry> | null => {
  const mergedFeature = mergeLineStrings(
    feature1,
    feature2,
    feature1Endpoint,
    feature2Endpoint,
    customProperties
  );

  if (!mergedFeature) return null;

  // Remove original features
  vectorSource.removeFeature(feature1);
  vectorSource.removeFeature(feature2);

  // Add merged feature
  vectorSource.addFeature(mergedFeature);

  return mergedFeature;
};

// ============== OFFSET UTILITIES ==============

/**
 * Create an offset (parallel) copy of a LineString at a specified distance
 * @param feature - The LineString feature to offset
 * @param distance - Distance in meters to offset (positive for left, negative for right)
 * @returns New LineString feature offset from the original
 */
export const createOffsetLineString = (
  feature: Feature<Geometry>,
  distance: number
): Feature<Geometry> | null => {
  const geometry = feature.getGeometry();
  if (!geometry || geometry.getType() !== "LineString") {
    return null;
  }

  const lineString = geometry as LineString;
  const coords = lineString.getCoordinates();

  if (coords.length < 2) {
    return null;
  }

  // Create offset coordinates
  const offsetCoords: Coordinate[] = [];

  for (let i = 0; i < coords.length; i++) {
    const current = coords[i];
    let perpendicular: [number, number];

    if (i === 0) {
      // First point: use direction to next point
      const next = coords[i + 1];
      perpendicular = getPerpendicularVector(current, next, distance, current);
    } else if (i === coords.length - 1) {
      // Last point: use direction from previous point
      const prev = coords[i - 1];
      perpendicular = getPerpendicularVector(prev, current, distance, current);
    } else {
      // Middle points: average of perpendiculars from both segments
      const prev = coords[i - 1];
      const next = coords[i + 1];
      const perp1 = getPerpendicularVector(prev, current, distance, current);
      const perp2 = getPerpendicularVector(current, next, distance, current);
      perpendicular = [
        (perp1[0] + perp2[0]) / 2,
        (perp1[1] + perp2[1]) / 2,
      ];
    }

    offsetCoords.push([
      current[0] + perpendicular[0],
      current[1] + perpendicular[1],
    ]);
  }

  // Create new feature with offset geometry
  const offsetGeometry = new LineString(offsetCoords);
  const offsetFeature = new Feature({ geometry: offsetGeometry });

  // Copy properties from original feature
  const properties = feature.getProperties();
  const { geometry: _, ...otherProps } = properties;
  Object.entries(otherProps).forEach(([key, value]) => {
    offsetFeature.set(key, value);
  });

  // Append "(offset)" to name if exists
  const originalName = feature.get("name");
  if (originalName) {
    offsetFeature.set("name", `${originalName} (offset)`);
  }

  // Recalculate distance for measure features
  if (feature.get("isMeasure")) {
    offsetFeature.set("isMeasure", true);
    const length = getLength(offsetGeometry);
    offsetFeature.set("distance", length);
  }

  return offsetFeature;
};

/**
 * Convert meters to projection units at a given coordinate
 * In Web Mercator (EPSG:3857), the scale varies with latitude
 * Scale factor = 1 / cos(latitude)
 * @param meters - Distance in meters
 * @param coord - Coordinate in EPSG:3857 (Web Mercator)
 * @returns Distance in projection units
 */
const metersToProjectionUnits = (
  meters: number,
  coord: Coordinate
): number => {
  // Convert coordinate from EPSG:3857 to EPSG:4326 to get latitude
  const lonLat = transform(coord, "EPSG:3857", "EPSG:4326");
  const latitudeRadians = (lonLat[1] * Math.PI) / 180;

  // In Web Mercator, the scale factor at a given latitude is 1/cos(lat)
  // So to convert meters to projection units: meters * scale = meters / cos(lat)
  const scaleFactor = 1 / Math.cos(latitudeRadians);

  return meters * scaleFactor;
};

/**
 * Calculate perpendicular vector for a line segment
 * @param start - Start coordinate of the segment
 * @param end - End coordinate of the segment
 * @param distance - Distance to offset in meters (positive for left, negative for right)
 * @param referenceCoord - Coordinate to use for projection scale calculation
 * @returns Perpendicular vector [dx, dy] in projection units
 */
const getPerpendicularVector = (
  start: Coordinate,
  end: Coordinate,
  distance: number,
  referenceCoord: Coordinate
): [number, number] => {
  // Calculate direction vector
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];

  // Calculate length of direction vector
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) {
    return [0, 0];
  }

  // Normalize direction vector
  const nx = dx / length;
  const ny = dy / length;

  // Convert meters to projection units at this location
  const distanceInProjectionUnits = metersToProjectionUnits(
    distance,
    referenceCoord
  );

  // Perpendicular vector (rotate 90 degrees counterclockwise for left)
  // For right offset, distance should be negative
  return [-ny * distanceInProjectionUnits, nx * distanceInProjectionUnits];
};

// ============== CONTINUATION UTILITIES ==============

/**
 * Check if a feature can be continued (extended from endpoint)
 * All LineString features can be continued: Polyline, Freehand, Arrow, Measure
 */
export const isContinuableFeature = (feature: Feature<Geometry>): boolean => {
  const geometry = feature.getGeometry();
  return geometry !== null && geometry !== undefined && geometry.getType() === "LineString";
};

/**
 * Detect which endpoint (if any) was clicked
 * @param feature - The LineString feature to check
 * @param coordinate - The click coordinate
 * @param tolerance - Distance tolerance in map units
 * @returns 'start' | 'end' | null
 */
export const detectEndpointClick = (
  feature: Feature<Geometry>,
  coordinate: Coordinate,
  tolerance: number
): "start" | "end" | null => {
  const endpoints = getLineEndpoints(feature);
  if (!endpoints) return null;

  const distToStart = getCoordinateDistance(coordinate, endpoints.start);
  const distToEnd = getCoordinateDistance(coordinate, endpoints.end);

  // Return whichever endpoint is within tolerance (prefer closer one)
  if (distToStart <= tolerance && distToEnd <= tolerance) {
    return distToStart <= distToEnd ? "start" : "end";
  }
  if (distToStart <= tolerance) return "start";
  if (distToEnd <= tolerance) return "end";
  return null;
};

/**
 * Get feature type for determining draw behavior and styling
 * @param feature - The LineString feature
 * @returns Feature type string or null
 */
export const getLineStringType = (
  feature: Feature<Geometry>
): "polyline" | "freehand" | "arrow" | "measure" | null => {
  if (feature.get("isPolyline")) return "polyline";
  if (feature.get("isFreehand")) return "freehand";
  if (feature.get("isArrow")) return "arrow";
  if (feature.get("isMeasure")) return "measure";
  // Default to polyline for unmarked LineStrings
  return "polyline";
};

/**
 * Extend a LineString feature with new coordinates
 * @param feature - The feature to extend
 * @param newCoords - New coordinates to add
 * @param endpoint - Which endpoint was extended ('start' or 'end')
 */
export const extendLineStringCoordinates = (
  feature: Feature<Geometry>,
  newCoords: Coordinate[],
  endpoint: "start" | "end"
): void => {
  const geometry = feature.getGeometry() as LineString;
  const existingCoords = geometry.getCoordinates();

  let mergedCoords: Coordinate[];

  if (endpoint === "end") {
    // Append new coordinates to the end
    mergedCoords = [...existingCoords, ...newCoords];
  } else {
    // Prepend new coordinates to the start (reverse them to maintain direction)
    mergedCoords = [...newCoords.reverse(), ...existingCoords];
  }

  geometry.setCoordinates(mergedCoords);

  // Recalculate measure distance if applicable
  if (feature.get("isMeasure")) {
    const length = getLength(geometry);
    feature.set("distance", length);
  }
};
