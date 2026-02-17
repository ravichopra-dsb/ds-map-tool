import type { Coordinate } from "ol/coordinate";

/**
 * Constrain a coordinate to the nearest orthogonal direction from a reference point.
 * Orthogonal directions: 0 (east), 90 (north), 180 (west), 270 (south) degrees.
 *
 * @param referenceCoord - The previous point (anchor)
 * @param targetCoord - The current cursor position
 * @returns Coordinate constrained to orthogonal angle
 */
export const constrainToOrtho = (
  referenceCoord: Coordinate,
  targetCoord: Coordinate
): Coordinate => {
  const dx = targetCoord[0] - referenceCoord[0];
  const dy = targetCoord[1] - referenceCoord[1];

  // If points are the same, return target
  if (dx === 0 && dy === 0) {
    return targetCoord;
  }

  // Calculate angle in radians
  const angle = Math.atan2(dy, dx);

  // Convert to degrees (0-360)
  let degrees = (angle * 180) / Math.PI;
  if (degrees < 0) degrees += 360;

  // Snap to nearest orthogonal angle (0, 90, 180, 270)
  // Each quadrant: 0 = [-45, 45), 90 = [45, 135), 180 = [135, 225), 270 = [225, 315)
  let snappedAngle: number;
  if (degrees >= 315 || degrees < 45) {
    snappedAngle = 0; // East (right)
  } else if (degrees >= 45 && degrees < 135) {
    snappedAngle = 90; // North (up)
  } else if (degrees >= 135 && degrees < 225) {
    snappedAngle = 180; // West (left)
  } else {
    snappedAngle = 270; // South (down)
  }

  // Calculate distance from reference to target
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Convert snapped angle back to radians
  const snappedRadians = (snappedAngle * Math.PI) / 180;

  // Calculate constrained coordinate
  return [
    referenceCoord[0] + distance * Math.cos(snappedRadians),
    referenceCoord[1] + distance * Math.sin(snappedRadians),
  ];
};

/**
 * Apply ortho constraint to a LineString coordinate array.
 * Only constrains the last coordinate relative to the previous point.
 * Used during drawing for live preview.
 *
 * @param coordinates - Array of LineString coordinates
 * @returns Modified coordinate array with ortho constraint applied
 */
export const applyOrthoToLineString = (
  coordinates: Coordinate[]
): Coordinate[] => {
  if (coordinates.length < 2) {
    return coordinates;
  }

  // Get the last two coordinates
  const prevCoord = coordinates[coordinates.length - 2];
  const currentCoord = coordinates[coordinates.length - 1];

  // Constrain the current coordinate
  const constrainedCoord = constrainToOrtho(prevCoord, currentCoord);

  // Return new array with constrained last coordinate
  return [...coordinates.slice(0, -1), constrainedCoord];
};

/**
 * Apply ortho constraint to ALL consecutive coordinate pairs in a LineString.
 * Each point (except the first) is constrained relative to the previous constrained point.
 * Used when finalizing a drawing to ensure all points are orthogonally aligned.
 *
 * @param coordinates - Array of LineString coordinates
 * @returns Modified coordinate array with all points ortho-constrained
 */
export const applyOrthoToAllCoordinates = (
  coordinates: Coordinate[]
): Coordinate[] => {
  if (coordinates.length < 2) {
    return coordinates;
  }

  const result: Coordinate[] = [coordinates[0]]; // First point stays as-is

  for (let i = 1; i < coordinates.length; i++) {
    const prevConstrained = result[i - 1];
    const currentRaw = coordinates[i];
    const constrained = constrainToOrtho(prevConstrained, currentRaw);
    result.push(constrained);
  }

  return result;
};

/**
 * Apply ortho constraint only to segments marked as ortho-enabled.
 * Each segment's ortho state is determined by the orthoStates array.
 * orthoStates[i] indicates whether the segment from coord[i] to coord[i+1] should be ortho.
 *
 * @param coordinates - Array of LineString coordinates
 * @param orthoStates - Array of booleans indicating ortho state for each segment
 * @returns Modified coordinate array with selective ortho constraints
 */
export const applyOrthoToMarkedCoordinates = (
  coordinates: Coordinate[],
  orthoStates: boolean[]
): Coordinate[] => {
  if (coordinates.length < 2) {
    return coordinates;
  }

  const result: Coordinate[] = [coordinates[0]]; // First point stays as-is

  for (let i = 1; i < coordinates.length; i++) {
    const prevConstrained = result[i - 1];
    const currentRaw = coordinates[i];
    // orthoStates[i-1] represents the segment from coord[i-1] to coord[i]
    const shouldApplyOrtho = orthoStates[i - 1] ?? false;

    if (shouldApplyOrtho) {
      const constrained = constrainToOrtho(prevConstrained, currentRaw);
      result.push(constrained);
    } else {
      result.push(currentRaw);
    }
  }

  return result;
};
