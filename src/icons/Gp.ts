import { Style, Stroke, Fill } from "ol/style";
import { Feature } from "ol";
import { Circle as CircleGeom, GeometryCollection } from "ol/geom";
import { Vector as VectorSource } from "ol/source";
import type { Geometry } from "ol/geom";

/**
 * Create a single Feature that contains both outer + inner circles
 * as a GeometryCollection so they behave as one selectable feature.
 */
export const createGPGeometry = (
  center: number[],
  outerRadius: number = 8,
  innerRadius: number = 2
): Feature<Geometry> => {
  const outerCircle = new CircleGeom(center, outerRadius);
  const innerCircle = new CircleGeom(center, innerRadius);

  const geomCollection = new GeometryCollection([outerCircle, innerCircle]);

  return new Feature({
    geometry: geomCollection,
  });
};

/**
 * Returns styles for the GP feature.
 * Each Style targets a specific sub-geometry inside the GeometryCollection
 * by using the `geometry` option (function returning the sub-geometry).
 */
export const getGPStyles = (): Style[] => {
  const outerStyle = new Style({
    geometry: (feature) => {
      const geom = feature.getGeometry() as GeometryCollection | null;
      // guard - return whole geometry if collection isn't present
      if (!geom || typeof (geom as any).getGeometries !== "function")
        return geom;
      return (geom as any).getGeometries()[0]; // outer circle
    },
    stroke: new Stroke({
      color: "black",
      width: 1,
    }),
    fill: new Fill({
      color: "rgba(147, 51, 234)",
    }),
  });

  const innerStyle = new Style({
    geometry: (feature) => {
      const geom = feature.getGeometry() as GeometryCollection | null;
      if (!geom || typeof (geom as any).getGeometries !== "function")
        return geom;
      return (geom as any).getGeometries()[1]; // inner circle
    },
    stroke: new Stroke({
      color: "black",
      width: 1,
    }),
    fill: new Fill({
      color: "#000",
    }),
  });

  return [outerStyle, innerStyle];
};

/**
 * Convenience alias that returns the same styles as getGPStyles,
 * for code that expects `getStyle()` (singular).
 */
export const getGPStyle = (): Style[] => {
  return getGPStyles();
};

/**
 * Handles click event to create GP symbol (single Feature with GeometryCollection)
 */
export const handleGPClick = (
  vectorSource: VectorSource,
  coordinate: number[],
  outerRadius: number = 8,
  innerRadius: number = 2
): void => {
  try {
    const gpFeature = createGPGeometry(coordinate, outerRadius, innerRadius);

    // Tag feature for identification
    gpFeature.set("isGP", true);
    gpFeature.set("nonEditable", true);

    // Apply styles (array of styles that target sub-geometries)
    gpFeature.setStyle(getGPStyles());

    // Add to vector source (single feature = selectable as one unit)
    vectorSource.addFeature(gpFeature);
  } catch (error) {
    console.error("Error creating GP:", error);
  }
};

/**
 * Checks if a feature is a GP symbol
 */
export const isGPFeature = (feature: Feature): boolean => {
  return feature.get("isGP") === true;
};

/**
 * GP tool utilities
 */
export const gpUtils = {
  createGeometry: createGPGeometry,
  getStyles: getGPStyles,
  getStyle: getGPStyle, // alias for compatibility
  handleClick: handleGPClick,
  isGP: isGPFeature,
};
