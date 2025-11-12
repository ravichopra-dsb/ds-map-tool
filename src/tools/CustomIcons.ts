import { Style, Stroke, Fill } from "ol/style";
import { Feature } from "ol";
import { Polygon } from "ol/geom";
import { Vector as VectorSource } from "ol/source";

/**
 * Creates triangle polygon coordinates from a center point
 * @param center - Center coordinate [x, y]
 * @param size - Size of the triangle (radius from center to vertices)
 * @returns Triangle coordinates as [[[x1, y1], [x2, y2], [x3, y3], [x1, y1]]]
 */
export const createTrianglePolygon = (center: number[], size: number = 20): number[][][] => {
  const [cx, cy] = center;

  // Calculate triangle vertices (equilateral triangle pointing up)
  const topVertex = [cx, cy + size];
  const bottomLeft = [cx - size * 0.866, cy - size * 0.5]; // 0.866 H cos(30�)
  const bottomRight = [cx + size * 0.866, cy - size * 0.5]; // 0.866 H cos(30�)

  // Return triangle coordinates in the format OpenLayers expects
  return [[
    topVertex,
    bottomLeft,
    bottomRight,
    topVertex // Close the polygon
  ]];
};

/**
 * Gets stroke-only style for triangle features
 * @returns Style object with black stroke and no fill
 */
export const getTriangleStyle = (): Style => {
  return new Style({
    stroke: new Stroke({
      color: "#000000",
      width: 2,
    }),
    fill: new Fill({ color: "#a4aaa5" }),
    // No fill - stroke only as requested
    // No image - using polygon geometry directly as requested
  });
};

/**
 * Handles triangle tool click events
 * Creates a triangle feature at the clicked coordinate
 * @param map - OpenLayers map instance
 * @param vectorSource - Vector source to add the triangle to
 * @param coordinate - Click coordinate where triangle should be placed
 */
export const handleTriangleClick = (
  vectorSource: VectorSource,
  coordinate: number[]
): void => {
  try {
    // Create triangle polygon geometry
    const triangleCoords = createTrianglePolygon(coordinate);
    const trianglePolygon = new Polygon(triangleCoords);

    // Create feature with triangle geometry
    const triangleFeature = new Feature({
      geometry: trianglePolygon,
    });

    // Mark as triangle feature and non-editable
    triangleFeature.set("isTriangle", true);
    triangleFeature.set("nonEditable", true);

    // Apply triangle style
    triangleFeature.setStyle(getTriangleStyle());

    // Add to vector source
    vectorSource.addFeature(triangleFeature);

  } catch (error) {
    console.error("Error creating triangle:", error);
  }
};

/**
 * Checks if a feature is a triangle feature
 * @param feature - Feature to check
 * @returns True if feature is a triangle
 */
export const isTriangleFeature = (feature: Feature): boolean => {
  return feature.get("isTriangle") === true;
};

/**
 * Triangle tool configuration and utilities
 */
export const triangleUtils = {
  createPolygon: createTrianglePolygon,
  getStyle: getTriangleStyle,
  handleClick: handleTriangleClick,
  isTriangle: isTriangleFeature,
};