import { Circle as CircleGeom, Polygon } from "ol/geom";

/**
 * Create a polygon approximation of a circle directly from center and radius
 * @param center - Center coordinate [x, y]
 * @param radius - Radius of the circle
 * @param sides - Number of sides for the polygon approximation
 * @returns Polygon that visually approximates a Circle
 */
export const createCirclePolygon = (
  center: number[],
  radius: number,
  sides: number = 32
): Polygon => {
  const coordinates = [];

  // Generate points around the circle
  for (let i = 0; i <= sides; i++) {
    const angle = (i / sides) * 2 * Math.PI;
    const x = center[0] + radius * Math.cos(angle);
    const y = center[1] + radius * Math.sin(angle);
    coordinates.push([x, y]);
  }

  return new Polygon([coordinates]);
};

/**
 * Convert an OpenLayers Circle geometry to a Polygon approximation
 * This solves the GeoJSON serialization issue where Circles cannot be saved
 * @param circle - The Circle geometry to convert
 * @param sides - Number of sides for the polygon approximation (higher = smoother)
 * @returns Polygon that visually approximates the Circle
 */
export const circleToPolygon = (
  circle: CircleGeom,
  sides: number = 32
): Polygon => {
  return createCirclePolygon(circle.getCenter(), circle.getRadius(), sides);
};
