import type { Coordinate } from "ol/coordinate";

export interface AlignedDimensionGeometry {
  extensionLine1: [Coordinate, Coordinate];
  extensionLine2: [Coordinate, Coordinate];
  dimensionLine: [Coordinate, Coordinate];
  textPosition: Coordinate;
  textRotation: number;
}

/**
 * Compute all visual geometry for an AutoCAD-style aligned dimension.
 * @param p1 - First measured point
 * @param p2 - Second measured point
 * @param offsetDistance - Signed perpendicular offset from the measurement line
 * @param resolution - Map resolution (map units per pixel)
 */
export function computeAlignedDimensionGeometry(
  p1: Coordinate,
  p2: Coordinate,
  offsetDistance: number,
  resolution: number,
): AlignedDimensionGeometry {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const lineLength = Math.sqrt(dx * dx + dy * dy);

  if (lineLength < 1e-10) {
    // Degenerate case: both points are the same
    return {
      extensionLine1: [p1, p1],
      extensionLine2: [p2, p2],
      dimensionLine: [p1, p2],
      textPosition: p1,
      textRotation: 0,
    };
  }

  // Perpendicular unit vector (left-hand normal of p1→p2)
  const perpX = -dy / lineLength;
  const perpY = dx / lineLength;

  const sign = offsetDistance >= 0 ? 1 : -1;
  const absOffset = Math.abs(offsetDistance);

  // Signed perpendicular direction
  const dirX = sign * perpX;
  const dirY = sign * perpY;

  // Extension line parameters (resolution-dependent pixel values)
  const originGap = 2 * resolution;
  const overshoot = 3 * resolution;

  // Dimension line endpoints (offset from p1 and p2 along perpendicular)
  const dimP1: Coordinate = [p1[0] + dirX * absOffset, p1[1] + dirY * absOffset];
  const dimP2: Coordinate = [p2[0] + dirX * absOffset, p2[1] + dirY * absOffset];

  // Extension line 1: from (p1 + gap) to (dimP1 + overshoot)
  const ext1Start: Coordinate = [p1[0] + dirX * originGap, p1[1] + dirY * originGap];
  const ext1End: Coordinate = [dimP1[0] + dirX * overshoot, dimP1[1] + dirY * overshoot];

  // Extension line 2: from (p2 + gap) to (dimP2 + overshoot)
  const ext2Start: Coordinate = [p2[0] + dirX * originGap, p2[1] + dirY * originGap];
  const ext2End: Coordinate = [dimP2[0] + dirX * overshoot, dimP2[1] + dirY * overshoot];

  // Text at midpoint of dimension line
  const textPosition: Coordinate = [(dimP1[0] + dimP2[0]) / 2, (dimP1[1] + dimP2[1]) / 2];
  const textRotation = Math.atan2(dy, dx);

  return {
    extensionLine1: [ext1Start, ext1End],
    extensionLine2: [ext2Start, ext2End],
    dimensionLine: [dimP1, dimP2],
    textPosition,
    textRotation,
  };
}

/**
 * Compute the dimension line endpoints (offset from p1 and p2 along perpendicular).
 * This is resolution-independent and used to build the stored geometry so that
 * OpenLayers viewport culling includes the full visual extent.
 */
export function computeDimensionLineEndpoints(
  p1: Coordinate,
  p2: Coordinate,
  offsetDistance: number,
): [Coordinate, Coordinate] {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const lineLength = Math.sqrt(dx * dx + dy * dy);

  if (lineLength < 1e-10) return [p1, p2];

  const perpX = -dy / lineLength;
  const perpY = dx / lineLength;
  const sign = offsetDistance >= 0 ? 1 : -1;
  const absOffset = Math.abs(offsetDistance);
  const dirX = sign * perpX;
  const dirY = sign * perpY;

  const dimP1: Coordinate = [p1[0] + dirX * absOffset, p1[1] + dirY * absOffset];
  const dimP2: Coordinate = [p2[0] + dirX * absOffset, p2[1] + dirY * absOffset];
  return [dimP1, dimP2];
}

/**
 * Compute signed offset distance from a cursor position relative to the p1→p2 line.
 */
export function computeOffsetFromCursor(
  p1: Coordinate,
  p2: Coordinate,
  cursor: Coordinate,
): number {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const lineLength = Math.sqrt(dx * dx + dy * dy);

  if (lineLength < 1e-10) return 0;

  // Perpendicular unit vector (left-hand normal)
  const perpX = -dy / lineLength;
  const perpY = dx / lineLength;

  // Project cursor-to-midpoint onto perpendicular
  const midX = (p1[0] + p2[0]) / 2;
  const midY = (p1[1] + p2[1]) / 2;
  const cursorDx = cursor[0] - midX;
  const cursorDy = cursor[1] - midY;

  return cursorDx * perpX + cursorDy * perpY;
}
