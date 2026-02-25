import type { Coordinate } from "ol/coordinate";

export type LinearDimensionDirection = "horizontal" | "vertical";

export interface LinearDimensionGeometry {
  extensionLine1: [Coordinate, Coordinate];
  extensionLine2: [Coordinate, Coordinate];
  dimensionLine: [Coordinate, Coordinate];
  textPosition: Coordinate;
  textRotation: number;
  direction: LinearDimensionDirection;
}

/**
 * Auto-detect whether the dimension should be horizontal or vertical
 * based on cursor position relative to the midpoint of p1 and p2.
 *
 * If cursor moved more vertically from midpoint -> horizontal dimension
 * If cursor moved more horizontally from midpoint -> vertical dimension
 */
export function detectDimensionDirection(
  p1: Coordinate,
  p2: Coordinate,
  cursor: Coordinate,
): LinearDimensionDirection {
  const midX = (p1[0] + p2[0]) / 2;
  const midY = (p1[1] + p2[1]) / 2;

  const deltaX = Math.abs(cursor[0] - midX);
  const deltaY = Math.abs(cursor[1] - midY);

  return deltaY > deltaX ? "horizontal" : "vertical";
}

/**
 * Compute the position of the dimension line from the cursor.
 * For horizontal: returns the Y coordinate of the dimension line
 * For vertical: returns the X coordinate of the dimension line
 */
export function computeDimLinePosition(
  cursor: Coordinate,
  direction: LinearDimensionDirection,
): number {
  return direction === "horizontal" ? cursor[1] : cursor[0];
}

/**
 * Compute all visual geometry for an AutoCAD-style linear dimension.
 *
 * @param p1 - First measured point
 * @param p2 - Second measured point
 * @param direction - 'horizontal' or 'vertical'
 * @param dimLinePosition - Y coord for horizontal, X coord for vertical
 * @param resolution - Map resolution (map units per pixel) for gap/overshoot
 */
export function computeLinearDimensionGeometry(
  p1: Coordinate,
  p2: Coordinate,
  direction: LinearDimensionDirection,
  dimLinePosition: number,
  resolution: number,
): LinearDimensionGeometry {
  const originGap = 2 * resolution;
  const overshoot = 3 * resolution;

  if (direction === "horizontal") {
    // Dimension line is horizontal at Y = dimLinePosition, spanning p1.x to p2.x
    const dimP1: Coordinate = [p1[0], dimLinePosition];
    const dimP2: Coordinate = [p2[0], dimLinePosition];

    // Extension lines are vertical from each point to the dimension line
    const sign1 = dimLinePosition >= p1[1] ? 1 : -1;
    const sign2 = dimLinePosition >= p2[1] ? 1 : -1;

    const ext1Start: Coordinate = [p1[0], p1[1] + sign1 * originGap];
    const ext1End: Coordinate = [p1[0], dimLinePosition + sign1 * overshoot];

    const ext2Start: Coordinate = [p2[0], p2[1] + sign2 * originGap];
    const ext2End: Coordinate = [p2[0], dimLinePosition + sign2 * overshoot];

    const textPosition: Coordinate = [
      (dimP1[0] + dimP2[0]) / 2,
      (dimP1[1] + dimP2[1]) / 2,
    ];

    return {
      extensionLine1: [ext1Start, ext1End],
      extensionLine2: [ext2Start, ext2End],
      dimensionLine: [dimP1, dimP2],
      textPosition,
      textRotation: 0,
      direction,
    };
  } else {
    // Dimension line is vertical at X = dimLinePosition, spanning p1.y to p2.y
    const dimP1: Coordinate = [dimLinePosition, p1[1]];
    const dimP2: Coordinate = [dimLinePosition, p2[1]];

    // Extension lines are horizontal from each point to the dimension line
    const sign1 = dimLinePosition >= p1[0] ? 1 : -1;
    const sign2 = dimLinePosition >= p2[0] ? 1 : -1;

    const ext1Start: Coordinate = [p1[0] + sign1 * originGap, p1[1]];
    const ext1End: Coordinate = [dimLinePosition + sign1 * overshoot, p1[1]];

    const ext2Start: Coordinate = [p2[0] + sign2 * originGap, p2[1]];
    const ext2End: Coordinate = [dimLinePosition + sign2 * overshoot, p2[1]];

    const textPosition: Coordinate = [
      (dimP1[0] + dimP2[0]) / 2,
      (dimP1[1] + dimP2[1]) / 2,
    ];

    return {
      extensionLine1: [ext1Start, ext1End],
      extensionLine2: [ext2Start, ext2End],
      dimensionLine: [dimP1, dimP2],
      textPosition,
      textRotation: Math.PI / 2,
      direction,
    };
  }
}

/**
 * Compute the dimension line endpoints for storing in the feature geometry.
 * Used for viewport culling so OpenLayers considers the full visual extent.
 */
export function computeLinearDimLineEndpoints(
  p1: Coordinate,
  p2: Coordinate,
  direction: LinearDimensionDirection,
  dimLinePosition: number,
): [Coordinate, Coordinate] {
  if (direction === "horizontal") {
    return [
      [p1[0], dimLinePosition],
      [p2[0], dimLinePosition],
    ];
  } else {
    return [
      [dimLinePosition, p1[1]],
      [dimLinePosition, p2[1]],
    ];
  }
}
