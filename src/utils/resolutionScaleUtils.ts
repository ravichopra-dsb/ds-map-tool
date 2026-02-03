/**
 * Resolution-based scaling utilities for consistent world-space sizing
 *
 * These utilities ensure features maintain consistent visual size relative
 * to the map view, scaling appropriately as the user zooms in/out.
 */

/**
 * Default reference values for resolution-based scaling
 */
export const RESOLUTION_SCALE_DEFAULTS = {
  DESIRED_PX_SIZE: 16,
  REFERENCE_RESOLUTION: 1.0,
  DEFAULT_ICON_WIDTH: 32,
  TEXT_FONT_SIZE: 14,
  DEFAULT_STROKE_WIDTH: 16,
} as const;

/**
 * Calculates the base scale factor for resolution-based scaling
 * @param resolution - Current map resolution
 * @param baseSize - Base size of the element (icon width, font size, etc.)
 * @param desiredPxSize - Desired pixel size at reference resolution (default: 16)
 * @param referenceResolution - Reference resolution for scaling (default: 1.0)
 * @returns Base scale factor
 */
export const calculateBaseScaleFactor = (
  resolution: number,
  baseSize: number,
  desiredPxSize: number = RESOLUTION_SCALE_DEFAULTS.DESIRED_PX_SIZE,
  referenceResolution: number = RESOLUTION_SCALE_DEFAULTS.REFERENCE_RESOLUTION
): number => {
  return (desiredPxSize / baseSize) * (referenceResolution / resolution);
};

/**
 * Calculates the final scale factor including user-defined scale
 * @param resolution - Current map resolution
 * @param baseSize - Base size of the element
 * @param userScale - User-defined scale multiplier (default: 1)
 * @returns Final scale factor
 */
export const calculateFinalScale = (
  resolution: number,
  baseSize: number,
  userScale: number = 1
): number => {
  const baseScaleFactor = calculateBaseScaleFactor(resolution, baseSize);
  return baseScaleFactor * userScale;
};

/**
 * Calculates scale factor for icon features
 * @param resolution - Current map resolution
 * @param iconWidth - Width of the icon (default: 32)
 * @param userIconScale - User-defined icon scale (default: 1)
 * @returns Final icon scale factor
 */
export const calculateIconScale = (
  resolution: number,
  iconWidth: number = RESOLUTION_SCALE_DEFAULTS.DEFAULT_ICON_WIDTH,
  userIconScale: number = 1
): number => {
  return calculateFinalScale(resolution, iconWidth, userIconScale);
};

/**
 * Calculates scale factor for text features
 * @param resolution - Current map resolution
 * @param fontSize - Font size (default: 14)
 * @param userTextScale - User-defined text scale (default: 1)
 * @returns Final text scale factor
 */
export const calculateTextScale = (
  resolution: number,
  fontSize: number = RESOLUTION_SCALE_DEFAULTS.TEXT_FONT_SIZE,
  userTextScale: number = 1
): number => {
  return calculateFinalScale(resolution, fontSize, userTextScale);
};

/**
 * Calculates scale factor for stroke widths on LineString/MultiLineString
 * @param resolution - Current map resolution
 * @returns Stroke width scale factor
 */
export const calculateStrokeScale = (
  resolution: number
): number => {
  return calculateBaseScaleFactor(
    resolution,
    RESOLUTION_SCALE_DEFAULTS.DEFAULT_STROKE_WIDTH
  );
};

/**
 * Calculates highlight circle radius for icon features
 * @param resolution - Current map resolution
 * @param iconWidth - Width of the icon (default: 32)
 * @param userIconScale - User-defined icon scale (default: 1)
 * @param minRadius - Minimum radius (default: 10)
 * @returns Highlight circle radius
 */
export const calculateIconHighlightRadius = (
  resolution: number,
  iconWidth: number = RESOLUTION_SCALE_DEFAULTS.DEFAULT_ICON_WIDTH,
  userIconScale: number = 1,
  minRadius: number = 10
): number => {
  const baseScaleFactor = calculateBaseScaleFactor(resolution, iconWidth);
  return Math.max(minRadius, 16 * baseScaleFactor * userIconScale);
};

/**
 * Calculates point radius for regular point features
 * @param resolution - Current map resolution
 * @param baseRadius - Base radius (default: 9)
 * @param minRadius - Minimum radius (default: 6)
 * @returns Point radius
 */
export const calculatePointRadius = (
  resolution: number,
  baseRadius: number = 9,
  minRadius: number = 6
): number => {
  const baseScaleFactor = calculateBaseScaleFactor(
    resolution,
    RESOLUTION_SCALE_DEFAULTS.DESIRED_PX_SIZE
  );
  return Math.max(minRadius, baseRadius * baseScaleFactor);
};

/**
 * Checks if resolution-based scaling should be applied
 * (Only applies when zoomed out beyond threshold)
 * @param resolution - Current map resolution
 * @param threshold - Resolution threshold (default: 0.8)
 * @returns Whether scaling should be applied
 */
export const shouldApplyResolutionScaling = (
  resolution: number,
  threshold: number = 0.8
): boolean => {
  return resolution >= threshold;
};
