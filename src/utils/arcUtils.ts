import type { Coordinate } from "ol/coordinate";
import { LineString } from "ol/geom";

/**
 * Arc center calculation result
 */
interface ArcCenter {
  center: Coordinate;
  radius: number;
}

/**
 * Calculate the center and radius of a circle passing through 3 points
 * Uses the perpendicular bisector method
 * @param p1 - First point
 * @param p2 - Second point (point on arc)
 * @param p3 - Third point
 * @returns Center coordinate and radius, or null if points are collinear
 */
export const calculateCircleFromThreePoints = (
  p1: Coordinate,
  p2: Coordinate,
  p3: Coordinate
): ArcCenter | null => {
  const [x1, y1] = p1;
  const [x2, y2] = p2;
  const [x3, y3] = p3;

  // Calculate the determinant to check if points are collinear
  const det = (x1 - x2) * (y2 - y3) - (x2 - x3) * (y1 - y2);

  // If determinant is near zero, points are collinear (no unique circle)
  if (Math.abs(det) < 1e-10) {
    return null;
  }

  // Calculate circle center using perpendicular bisector method
  const a = x1 * x1 + y1 * y1;
  const b = x2 * x2 + y2 * y2;
  const c = x3 * x3 + y3 * y3;

  const cx =
    ((a * (y2 - y3) + b * (y3 - y1) + c * (y1 - y2)) / (2 * det));
  const cy =
    ((a * (x3 - x2) + b * (x1 - x3) + c * (x2 - x1)) / (2 * det));

  const radius = Math.sqrt((x1 - cx) ** 2 + (y1 - cy) ** 2);

  return {
    center: [cx, cy],
    radius,
  };
};

/**
 * Normalize an angle to be within [-PI, PI]
 */
const normalizeAngle = (angle: number): number => {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
};

/**
 * Check if angle2 is between angle1 and angle3 going counter-clockwise
 */
const isAngleBetweenCCW = (
  angle1: number,
  angle2: number,
  angle3: number
): boolean => {
  // Normalize all angles
  const a1 = normalizeAngle(angle1);
  const a2 = normalizeAngle(angle2);
  const a3 = normalizeAngle(angle3);

  // Calculate the angular distances going counter-clockwise
  let delta12 = a2 - a1;
  let delta13 = a3 - a1;

  // Normalize to [0, 2*PI]
  if (delta12 < 0) delta12 += 2 * Math.PI;
  if (delta13 < 0) delta13 += 2 * Math.PI;

  return delta12 < delta13;
};

/**
 * Generate arc coordinates from 3 points
 * @param p1 - Start point
 * @param p2 - Point on arc (determines curvature direction)
 * @param p3 - End point
 * @param numSegments - Number of segments for arc approximation
 * @returns Array of coordinates forming the arc, or straight line if collinear
 */
export const generateArcCoordinates = (
  p1: Coordinate,
  p2: Coordinate,
  p3: Coordinate,
  numSegments: number = 32
): Coordinate[] => {
  const circleData = calculateCircleFromThreePoints(p1, p2, p3);

  // If points are collinear, return a straight line
  if (!circleData) {
    return [p1, p3];
  }

  const { center, radius } = circleData;
  const [cx, cy] = center;

  // Calculate angles for each point
  const angle1 = Math.atan2(p1[1] - cy, p1[0] - cx);
  const angle2 = Math.atan2(p2[1] - cy, p2[0] - cx);
  const angle3 = Math.atan2(p3[1] - cy, p3[0] - cx);

  // Determine if we go counter-clockwise (CCW) or clockwise (CW)
  // We go CCW if P2 is between P1 and P3 going CCW
  const goCounterClockwise = isAngleBetweenCCW(angle1, angle2, angle3);

  // Calculate total angular sweep
  let totalAngle: number;
  if (goCounterClockwise) {
    totalAngle = angle3 - angle1;
    if (totalAngle < 0) totalAngle += 2 * Math.PI;
  } else {
    totalAngle = angle3 - angle1;
    if (totalAngle > 0) totalAngle -= 2 * Math.PI;
  }

  // Generate arc points
  const coordinates: Coordinate[] = [];
  for (let i = 0; i <= numSegments; i++) {
    const t = i / numSegments;
    const angle = angle1 + t * totalAngle;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    coordinates.push([x, y]);
  }

  return coordinates;
};

/**
 * Create a LineString geometry from 3 arc points
 * @param p1 - Start point
 * @param p2 - Point on arc
 * @param p3 - End point
 * @param numSegments - Number of segments for arc approximation
 * @returns LineString geometry representing the arc
 */
export const createArcGeometry = (
  p1: Coordinate,
  p2: Coordinate,
  p3: Coordinate,
  numSegments: number = 32
): LineString => {
  const coordinates = generateArcCoordinates(p1, p2, p3, numSegments);
  return new LineString(coordinates);
};

/**
 * Generate preview arc coordinates during drawing
 * Shows:
 * - Single point when 1 point clicked
 * - Line when 2 points clicked
 * - Arc preview when moving towards 3rd point
 * @param coordinates - Array of clicked coordinates (1-3 points)
 * @param numSegments - Number of segments for arc approximation
 * @returns Array of coordinates for preview
 */
export const generateArcPreview = (
  coordinates: Coordinate[],
  numSegments: number = 32
): Coordinate[] => {
  if (coordinates.length === 0) {
    return [];
  }

  if (coordinates.length === 1) {
    return [coordinates[0]];
  }

  if (coordinates.length === 2) {
    // Show straight line between first two points
    return [coordinates[0], coordinates[1]];
  }

  // 3 or more points - generate arc
  return generateArcCoordinates(
    coordinates[0],
    coordinates[1],
    coordinates[2],
    numSegments
  );
};

/**
 * Extract approximate control points from an existing arc LineString
 * Used for legacy arcs that don't have stored control points
 * @param arcCoordinates - The interpolated arc coordinates
 * @returns Approximate [start, through, end] control points
 */
export const extractControlPointsFromArc = (
  arcCoordinates: Coordinate[]
): Coordinate[] => {
  if (arcCoordinates.length < 3) {
    return arcCoordinates;
  }

  const start = arcCoordinates[0];
  const end = arcCoordinates[arcCoordinates.length - 1];

  // Use the midpoint of the arc as the through-point
  const midIndex = Math.floor(arcCoordinates.length / 2);
  const through = arcCoordinates[midIndex];

  return [start, through, end];
};
