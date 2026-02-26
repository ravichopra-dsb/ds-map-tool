import Feature from "ol/Feature";
import { LineString, Polygon } from "ol/geom";
import type { Geometry } from "ol/geom";
import type { Coordinate } from "ol/coordinate";
import type { Vector as VectorSource } from "ol/source";
import { getLength } from "ol/sphere";
import type UndoRedo from "ol-ext/interaction/UndoRedo";
import { isSplittableFeature, getCoordinateDistance } from "./splitUtils";

/** Re-export as isExtendableFeature (same criteria as splittable) */
export const isExtendableFeature = isSplittableFeature;

// =============================================
// GEOMETRY PRIMITIVES
// =============================================

/**
 * Ray-segment intersection.
 * Casts a ray from `rayOrigin` in direction `rayDir` and tests intersection
 * with the bounded segment [c, d].
 *
 * Returns the intersection point and the ray parameter t (distance along ray),
 * or null if no intersection.
 *
 * Constraint: t > epsilon (forward along ray), u in [0, 1] (on the segment).
 */
export function raySegmentIntersection(
  rayOrigin: Coordinate,
  rayDir: Coordinate,
  c: Coordinate,
  d: Coordinate
): { point: Coordinate; t: number } | null {
  const dx2 = d[0] - c[0];
  const dy2 = d[1] - c[1];
  const denom = rayDir[0] * dy2 - rayDir[1] * dx2;

  if (Math.abs(denom) < 1e-10) return null; // Parallel

  const t =
    ((c[0] - rayOrigin[0]) * dy2 - (c[1] - rayOrigin[1]) * dx2) / denom;
  const u =
    ((c[0] - rayOrigin[0]) * rayDir[1] - (c[1] - rayOrigin[1]) * rayDir[0]) /
    denom;

  // t > epsilon: forward along ray (skip self-intersection at origin)
  // u in [0, 1]: within the boundary segment
  if (t > 1e-6 && u >= 0 && u <= 1) {
    return {
      point: [rayOrigin[0] + t * rayDir[0], rayOrigin[1] + t * rayDir[1]],
      t,
    };
  }
  return null;
}

// =============================================
// ENDPOINT UTILITIES
// =============================================

/**
 * Get the direction vector at an endpoint of a LineString.
 * For 'start': direction from coords[1] toward coords[0] (outward from start).
 * For 'end': direction from coords[n-2] toward coords[n-1] (outward from end).
 */
export function getEndpointDirection(
  coords: Coordinate[],
  endpoint: "start" | "end"
): Coordinate {
  if (endpoint === "start") {
    return [coords[0][0] - coords[1][0], coords[0][1] - coords[1][1]];
  } else {
    const n = coords.length;
    return [
      coords[n - 1][0] - coords[n - 2][0],
      coords[n - 1][1] - coords[n - 2][1],
    ];
  }
}

/**
 * Determine which endpoint of a LineString is closest to a coordinate.
 */
export function findClosestEndpoint(
  coords: Coordinate[],
  clickCoord: Coordinate
): "start" | "end" {
  const startDist = getCoordinateDistance(clickCoord, coords[0]);
  const endDist = getCoordinateDistance(clickCoord, coords[coords.length - 1]);
  return startDist <= endDist ? "start" : "end";
}

// =============================================
// MAIN EXTEND COMPUTATION
// =============================================

export interface ExtendResult {
  intersectionPoint: Coordinate;
  endpoint: "start" | "end";
  newCoords: Coordinate[];
}

/**
 * Find the nearest boundary intersection for extending a LineString endpoint.
 * Casts a ray from the endpoint in the direction of the first/last segment,
 * tests against all segments of all other features.
 */
export function computeExtend(
  targetFeature: Feature<Geometry>,
  endpoint: "start" | "end",
  vectorSource: VectorSource<Feature<Geometry>>
): ExtendResult | null {
  const targetGeom = targetFeature.getGeometry() as LineString;
  const coords = targetGeom.getCoordinates();

  if (coords.length < 2) return null;

  const rayOrigin =
    endpoint === "start" ? coords[0] : coords[coords.length - 1];
  const rayDir = getEndpointDirection(coords, endpoint);

  let nearestHit: { point: Coordinate; t: number } | null = null;

  const allFeatures = vectorSource.getFeatures();

  for (const otherFeature of allFeatures) {
    if (otherFeature === targetFeature) continue;

    const otherGeom = otherFeature.getGeometry();
    if (!otherGeom) continue;

    let edgeChains: Coordinate[][] = [];

    if (otherGeom.getType() === "LineString") {
      edgeChains = [(otherGeom as LineString).getCoordinates()];
    } else if (otherGeom.getType() === "Polygon") {
      edgeChains = (otherGeom as Polygon).getCoordinates();
    }

    for (const edgeChain of edgeChains) {
      for (let j = 0; j < edgeChain.length - 1; j++) {
        const hit = raySegmentIntersection(
          rayOrigin,
          rayDir,
          edgeChain[j],
          edgeChain[j + 1]
        );
        if (hit && (!nearestHit || hit.t < nearestHit.t)) {
          nearestHit = hit;
        }
      }
    }
  }

  if (!nearestHit) return null;

  // Build new coordinates: replace endpoint with intersection point
  const newCoords = [...coords];
  if (endpoint === "start") {
    newCoords[0] = nearestHit.point;
  } else {
    newCoords[newCoords.length - 1] = nearestHit.point;
  }

  return {
    intersectionPoint: nearestHit.point,
    endpoint,
    newCoords,
  };
}

// =============================================
// SOURCE MUTATION
// =============================================

/**
 * Apply the extend result to the vector source:
 * Remove the original feature and add a new one with extended coordinates.
 * Wrapped in undo/redo block for single-step undo.
 */
export function applyExtend(
  vectorSource: VectorSource<Feature<Geometry>>,
  originalFeature: Feature<Geometry>,
  result: ExtendResult,
  undoRedo?: UndoRedo | null
): Feature<Geometry> {
  const newFeature = new Feature({
    geometry: new LineString(result.newCoords),
  });

  // Copy all properties from original (without renaming like copyFeatureProperties does)
  const props = originalFeature.getProperties();
  const { geometry, ...otherProps } = props;
  Object.entries(otherProps).forEach(([key, value]) => {
    newFeature.set(key, value);
  });

  // Recalculate measure distance if needed
  if (newFeature.get("isMeasure")) {
    const geom = newFeature.getGeometry() as LineString;
    if (geom) newFeature.set("distance", getLength(geom));
  }

  // Group all mutations as a single undo/redo step
  (undoRedo as any)?.blockStart?.("extend");

  vectorSource.removeFeature(originalFeature);
  vectorSource.addFeature(newFeature);

  (undoRedo as any)?.blockEnd?.();

  return newFeature;
}
