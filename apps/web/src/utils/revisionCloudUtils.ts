/**
 * Revision Cloud Utilities
 * Generates AutoCAD-style revision clouds with uniform scalloped edges
 */

import type { Coordinate } from "ol/coordinate";
import { Polygon } from "ol/geom";

// Configuration constants
export const REVISION_CLOUD_CONFIG = {
  defaultArcLength: 100, // chord length of each arc in map units (higher = bigger arcs)
  minArcLength: 10,
  maxArcLength: 100,
  arcSegments: 8, // segments per arc for smoothness
  bulgeRatio: 0.5, // how much the arc bulges outward (0.25 = subtle, 0.5 = semicircle)
  minPathPoints: 3,
  // Legacy names for compatibility
  defaultScallopRadius: 25,
  minScallopRadius: 10,
  maxScallopRadius: 100,
};

/**
 * Calculate distance between two coordinates
 */
const distance = (p1: Coordinate, p2: Coordinate): number => {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Determine if polygon winds clockwise using shoelace formula
 */
export const isClockwise = (coordinates: Coordinate[]): boolean => {
  let sum = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    sum +=
      (coordinates[i + 1][0] - coordinates[i][0]) *
      (coordinates[i + 1][1] + coordinates[i][1]);
  }
  return sum > 0;
};

/**
 * Close the path by connecting end to start if not already closed
 */
const closePathIfNeeded = (coordinates: Coordinate[]): Coordinate[] => {
  if (coordinates.length < 2) return coordinates;

  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];

  if (distance(first, last) < 1) {
    return coordinates;
  }

  return [...coordinates, first];
};

/**
 * Resample path to have exactly uniform segment lengths
 */
export const resamplePath = (
  coordinates: Coordinate[],
  arcLength: number
): Coordinate[] => {
  if (coordinates.length < 2) return coordinates;

  // Calculate total path length
  let totalLength = 0;
  for (let i = 1; i < coordinates.length; i++) {
    totalLength += distance(coordinates[i - 1], coordinates[i]);
  }

  if (totalLength < arcLength) {
    return coordinates;
  }

  // Calculate number of segments to create uniform distribution
  const numSegments = Math.max(3, Math.round(totalLength / arcLength));
  const actualSegmentLength = totalLength / numSegments;

  const result: Coordinate[] = [coordinates[0]];
  let targetDist = actualSegmentLength;
  let accumulatedDist = 0;
  let prevPoint = coordinates[0];

  for (let i = 1; i < coordinates.length; i++) {
    const currPoint = coordinates[i];
    const segDist = distance(prevPoint, currPoint);

    if (segDist === 0) {
      prevPoint = currPoint;
      continue;
    }

    let remainingInSegment = segDist;
    let segmentStart = prevPoint;

    while (accumulatedDist + remainingInSegment >= targetDist) {
      const needed = targetDist - accumulatedDist;
      const ratio = needed / remainingInSegment;

      const newPoint: Coordinate = [
        segmentStart[0] + ratio * (currPoint[0] - segmentStart[0]),
        segmentStart[1] + ratio * (currPoint[1] - segmentStart[1]),
      ];

      result.push(newPoint);

      remainingInSegment -= needed;
      segmentStart = newPoint;
      accumulatedDist = 0;
      targetDist = actualSegmentLength;
    }

    accumulatedDist += remainingInSegment;
    prevPoint = currPoint;
  }

  // Ensure the path closes properly - add final point if needed
  const lastInput = coordinates[coordinates.length - 1];
  const lastResult = result[result.length - 1];
  if (distance(lastInput, lastResult) > 1) {
    result.push(lastInput);
  }

  return result;
};

/**
 * Generate a single arc between two points using quadratic bezier approximation
 * This creates smooth, consistent arcs like AutoCAD revision clouds
 */
export const generateScallopArc = (
  p1: Coordinate,
  p2: Coordinate,
  bulgeDirection: number,
  bulgeRatio: number = REVISION_CLOUD_CONFIG.bulgeRatio,
  segments: number = REVISION_CLOUD_CONFIG.arcSegments
): Coordinate[] => {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const chordLength = Math.sqrt(dx * dx + dy * dy);

  if (chordLength < 0.5) return [p1, p2];

  // Midpoint of chord
  const midX = (p1[0] + p2[0]) / 2;
  const midY = (p1[1] + p2[1]) / 2;

  // Perpendicular unit vector
  const perpX = -dy / chordLength;
  const perpY = dx / chordLength;

  // Bulge height - consistent for all arcs
  const bulgeHeight = chordLength * bulgeRatio;

  // Control point for quadratic bezier (apex of arc)
  const controlX = midX + bulgeDirection * bulgeHeight * perpX;
  const controlY = midY + bulgeDirection * bulgeHeight * perpY;

  // Generate arc using quadratic bezier curve
  const points: Coordinate[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const mt = 1 - t;

    // Quadratic bezier: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
    const x = mt * mt * p1[0] + 2 * mt * t * controlX + t * t * p2[0];
    const y = mt * mt * p1[1] + 2 * mt * t * controlY + t * t * p2[1];

    points.push([x, y]);
  }

  return points;
};

/**
 * Generate revision cloud coordinates from a freehand path
 */
export const generateRevisionCloudCoordinates = (
  inputCoordinates: Coordinate[],
  arcLength: number = REVISION_CLOUD_CONFIG.defaultArcLength,
  bulgeRatio: number = REVISION_CLOUD_CONFIG.bulgeRatio
): Coordinate[] => {
  if (inputCoordinates.length < REVISION_CLOUD_CONFIG.minPathPoints) {
    return inputCoordinates;
  }

  // Step 1: Close the path
  const closedPath = closePathIfNeeded(inputCoordinates);

  // Step 2: Resample to uniform arc lengths
  const resampledPath = resamplePath(closedPath, arcLength);

  if (resampledPath.length < 3) {
    return closedPath;
  }

  // Step 3: Determine winding direction - scallops should bulge OUTWARD
  const clockwise = isClockwise(resampledPath);
  // For clockwise paths, bulge left (-1); for counter-clockwise, bulge right (+1)
  const bulgeDirection = clockwise ? 1 : -1;

  // Step 4: Generate scallops
  const cloudCoordinates: Coordinate[] = [];

  for (let i = 0; i < resampledPath.length - 1; i++) {
    const p1 = resampledPath[i];
    const p2 = resampledPath[i + 1];

    const arcPoints = generateScallopArc(p1, p2, bulgeDirection, bulgeRatio);

    // Add all arc points except the last (to avoid duplicates at joints)
    if (i < resampledPath.length - 2) {
      cloudCoordinates.push(...arcPoints.slice(0, -1));
    } else {
      cloudCoordinates.push(...arcPoints);
    }
  }

  // Ensure proper closure
  if (
    cloudCoordinates.length > 0 &&
    distance(cloudCoordinates[0], cloudCoordinates[cloudCoordinates.length - 1]) > 1
  ) {
    cloudCoordinates.push(cloudCoordinates[0]);
  }

  return cloudCoordinates;
};

/**
 * Create a Polygon geometry from revision cloud coordinates
 */
export const createRevisionCloudPolygon = (
  inputCoordinates: Coordinate[],
  arcLength?: number,
  bulgeRatio?: number
): Polygon => {
  const cloudCoords = generateRevisionCloudCoordinates(
    inputCoordinates,
    arcLength,
    bulgeRatio
  );
  return new Polygon([cloudCoords]);
};

/**
 * Generate preview during drawing
 */
export const generateRevisionCloudPreview = (
  coordinates: Coordinate[],
  arcLength?: number,
  bulgeRatio?: number
): Coordinate[] => {
  if (coordinates.length < 3) {
    return coordinates;
  }

  return generateRevisionCloudCoordinates(coordinates, arcLength, bulgeRatio);
};
