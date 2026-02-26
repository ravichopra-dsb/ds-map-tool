import Feature from "ol/Feature";
import { LineString, Polygon } from "ol/geom";
import type { Geometry } from "ol/geom";
import type { Coordinate } from "ol/coordinate";
import type { Vector as VectorSource } from "ol/source";
import { getLength } from "ol/sphere";
import { isSplittableFeature, copyFeatureProperties } from "./splitUtils";

/** Re-export as isTrimmableFeature (same criteria as splittable) */
export const isTrimmableFeature = isSplittableFeature;

// =============================================
// GEOMETRY PRIMITIVES
// =============================================

/**
 * Parametric segment-segment intersection.
 * Returns the intersection coordinate if segments intersect, or null.
 */
export function segmentIntersection(
  a: Coordinate,
  b: Coordinate,
  c: Coordinate,
  d: Coordinate
): Coordinate | null {
  const dx1 = b[0] - a[0],
    dy1 = b[1] - a[1];
  const dx2 = d[0] - c[0],
    dy2 = d[1] - c[1];
  const denom = dx1 * dy2 - dy1 * dx2;

  if (Math.abs(denom) < 1e-10) return null; // Parallel

  const t = ((c[0] - a[0]) * dy2 - (c[1] - a[1]) * dx2) / denom;
  const u = ((c[0] - a[0]) * dy1 - (c[1] - a[1]) * dx1) / denom;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return [a[0] + t * dx1, a[1] + t * dy1];
  }
  return null;
}

function dist(a: Coordinate, b: Coordinate): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
}

// =============================================
// POINT-ON-LINE PARAMETERIZATION
// =============================================

/**
 * Project a coordinate onto a LineString and return
 * an arc-length parameter in [0, totalLength].
 */
export function parameterizeAlongLine(
  lineCoords: Coordinate[],
  point: Coordinate
): number {
  let closestT = 0;
  let closestDist = Infinity;
  let accumulated = 0;

  for (let i = 0; i < lineCoords.length - 1; i++) {
    const a = lineCoords[i];
    const b = lineCoords[i + 1];
    const dx = b[0] - a[0],
      dy = b[1] - a[1];
    const segLen = Math.sqrt(dx * dx + dy * dy);

    let t = 0;
    if (segLen > 1e-10) {
      t = Math.max(
        0,
        Math.min(
          1,
          ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / (segLen * segLen)
        )
      );
    }

    const px = a[0] + t * dx,
      py = a[1] + t * dy;
    const d = Math.sqrt((point[0] - px) ** 2 + (point[1] - py) ** 2);

    if (d < closestDist) {
      closestDist = d;
      closestT = accumulated + t * segLen;
    }
    accumulated += segLen;
  }

  return closestT;
}

// =============================================
// INTERSECTION DETECTION
// =============================================

export interface TrimIntersection {
  coordinate: Coordinate;
  parameter: number; // arc-length position on the target line
}

/**
 * Find all intersections between targetFeature and ALL other
 * LineString/Polygon features in the source.
 */
export function findAllIntersections(
  targetFeature: Feature<Geometry>,
  vectorSource: VectorSource<Feature<Geometry>>
): TrimIntersection[] {
  const targetGeom = targetFeature.getGeometry() as LineString;
  const targetCoords = targetGeom.getCoordinates();
  const results: TrimIntersection[] = [];
  const seen = new Set<string>();

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
      for (let i = 0; i < targetCoords.length - 1; i++) {
        for (let j = 0; j < edgeChain.length - 1; j++) {
          const pt = segmentIntersection(
            targetCoords[i],
            targetCoords[i + 1],
            edgeChain[j],
            edgeChain[j + 1]
          );
          if (!pt) continue;

          const key = `${pt[0].toFixed(4)},${pt[1].toFixed(4)}`;
          if (seen.has(key)) continue;
          seen.add(key);

          results.push({
            coordinate: pt,
            parameter: parameterizeAlongLine(targetCoords, pt),
          });
        }
      }
    }
  }

  results.sort((a, b) => a.parameter - b.parameter);
  return results;
}

// =============================================
// LINESTRING SLICING
// =============================================

function totalArcLength(coords: Coordinate[]): number {
  let len = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    len += dist(coords[i], coords[i + 1]);
  }
  return len;
}

/**
 * Slice a LineString at a specific arc-length parameter.
 * Returns coordinates for the segment before and after the cut.
 */
function sliceAtParameter(
  coords: Coordinate[],
  t: number
): { before: Coordinate[]; after: Coordinate[] } {
  let accumulated = 0;

  for (let i = 0; i < coords.length - 1; i++) {
    const segLen = dist(coords[i], coords[i + 1]);
    if (accumulated + segLen >= t - 1e-10) {
      const localT = (t - accumulated) / Math.max(segLen, 1e-10);
      const clamped = Math.max(0, Math.min(1, localT));
      const cutPoint: Coordinate = [
        coords[i][0] + clamped * (coords[i + 1][0] - coords[i][0]),
        coords[i][1] + clamped * (coords[i + 1][1] - coords[i][1]),
      ];
      return {
        before: [...coords.slice(0, i + 1), cutPoint],
        after: [cutPoint, ...coords.slice(i + 1)],
      };
    }
    accumulated += segLen;
  }

  return { before: [...coords], after: [coords[coords.length - 1]] };
}

// =============================================
// MAIN TRIM OPERATION
// =============================================

export interface TrimResult {
  remainingSegments: Coordinate[][];
  trimmedInterval: { start: number; end: number };
}

/**
 * Core trim algorithm.
 * Given intersections (sorted by parameter) and the click position,
 * determine which interval to remove and return remaining coordinate arrays.
 */
export function computeTrim(
  targetCoords: Coordinate[],
  intersections: TrimIntersection[],
  clickParameter: number
): TrimResult | null {
  if (intersections.length === 0) return null;

  const totalLen = totalArcLength(targetCoords);

  let leftIdx = -1;
  let rightIdx = -1;

  for (let i = 0; i < intersections.length; i++) {
    if (intersections[i].parameter <= clickParameter) leftIdx = i;
    if (rightIdx === -1 && intersections[i].parameter >= clickParameter)
      rightIdx = i;
  }

  let startT: number;
  let endT: number;

  if (leftIdx === -1) {
    // Click is before the first intersection
    startT = 0;
    endT = intersections[rightIdx].parameter;
  } else if (rightIdx === -1 || rightIdx === leftIdx) {
    // Click is after the last intersection
    startT = intersections[leftIdx].parameter;
    endT = totalLen;
  } else {
    // Click is between two intersections
    startT = intersections[leftIdx].parameter;
    endT = intersections[rightIdx].parameter;
  }

  const { before: beforeEnd } = sliceAtParameter(targetCoords, startT);
  const { after: afterStart } = sliceAtParameter(targetCoords, endT);

  const remaining: Coordinate[][] = [];
  if (beforeEnd.length >= 2) remaining.push(beforeEnd);
  if (afterStart.length >= 2) remaining.push(afterStart);

  return {
    remainingSegments: remaining,
    trimmedInterval: { start: startT, end: endT },
  };
}

// =============================================
// SOURCE MUTATION
// =============================================

/**
 * Apply the trim result to the vector source:
 * Remove the original feature and add 0-2 replacement features.
 */
export function applyTrim(
  vectorSource: VectorSource<Feature<Geometry>>,
  originalFeature: Feature<Geometry>,
  result: TrimResult
): Feature<Geometry>[] {
  const newFeatures = result.remainingSegments.map((coords) => {
    return new Feature({ geometry: new LineString(coords) });
  });

  copyFeatureProperties(originalFeature, newFeatures);

  // Recalculate measure distance if needed
  newFeatures.forEach((feat) => {
    if (feat.get("isMeasure")) {
      const geom = feat.getGeometry() as LineString;
      if (geom) feat.set("distance", getLength(geom));
    }
  });

  vectorSource.removeFeature(originalFeature);
  newFeatures.forEach((f) => vectorSource.addFeature(f));

  return newFeatures;
}

// =============================================
// PREVIEW HELPERS
// =============================================

/**
 * Get the world coordinates of the trimmed interval for preview rendering.
 * Walks along the feature coords and collects points inside [startT, endT].
 */
export function getTrimmedIntervalCoords(
  coords: Coordinate[],
  startT: number,
  endT: number
): Coordinate[] {
  const points: Coordinate[] = [];

  // Start cut point
  const startSlice = sliceAtParameter(coords, startT);
  if (startSlice.before.length > 0) {
    points.push(startSlice.before[startSlice.before.length - 1]);
  }

  // Interior vertices within the interval
  let accumulated = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const segLen = dist(coords[i], coords[i + 1]);
    const tVertex = accumulated + segLen;
    if (tVertex > startT + 1e-6 && tVertex < endT - 1e-6) {
      points.push(coords[i + 1]);
    }
    accumulated += segLen;
  }

  // End cut point
  const endSlice = sliceAtParameter(coords, endT);
  if (endSlice.after.length > 0) {
    points.push(endSlice.after[0]);
  }

  return points;
}
