import { Style, Stroke, Fill } from "ol/style";
import { Feature } from "ol";
import { Polygon, GeometryCollection } from "ol/geom";
import { Vector as VectorSource } from "ol/source";
import type { Geometry } from "ol/geom";
import { createCirclePolygon } from "@/utils/geometryUtils";

/**
 * Create a single Feature that contains both square + inner circle
 * as a GeometryCollection so they behave as one selectable feature.
 * Using Polygon for inner circle for GeoJSON compatibility.
 */
export const createJunctionGeometry = (
  center: number[],
  halfSize: number = 7,
  innerRadius: number = 2
): Feature<Geometry> => {
  const [cx, cy] = center;

  // Square corners (clockwise)
  const squareCoords = [
    [cx - halfSize, cy - halfSize],
    [cx + halfSize, cy - halfSize],
    [cx + halfSize, cy + halfSize],
    [cx - halfSize, cy + halfSize],
    [cx - halfSize, cy - halfSize], // close polygon
  ];

  const square = new Polygon([squareCoords]);
  // Convert inner circle to polygon for GeoJSON compatibility
  const innerCircle = createCirclePolygon(center, innerRadius, 16);

  const geomCollection = new GeometryCollection([square, innerCircle]);

  return new Feature({
    geometry: geomCollection,
  });
};

/**
 * Returns styles for the JunctionPoint feature.
 * Each Style targets a specific sub-geometry inside the GeometryCollection.
 */
export const getJunctionStyles = (): Style[] => {
  const squareStyle = new Style({
    geometry: (feature) => {
      const geom = feature.getGeometry() as GeometryCollection | null;
      if (!geom || typeof (geom as any).getGeometries !== "function") return geom;
      return (geom as any).getGeometries()[0]; // square
    },
    stroke: new Stroke({
      color: "black",
      width: 1,
    }),
    fill: new Fill({
      color: "red",
    }),
  });

  const circleStyle = new Style({
    geometry: (feature) => {
      const geom = feature.getGeometry() as GeometryCollection | null;
      if (!geom || typeof (geom as any).getGeometries !== "function") return geom;
      return (geom as any).getGeometries()[1]; // inner circle
    },
    fill: new Fill({
      color: "#000",
    }),
    stroke: new Stroke({
      color: "black",
      width: 1,
    }),
  });

  return [squareStyle, circleStyle];
};

/**
 * Convenience alias for compatibility (returns same array as getJunctionStyles)
 */
export const getJunctionStyle = (): Style[] => getJunctionStyles();

/**
 * Handles click event to create a JunctionPoint symbol (single Feature)
 */
export const handleJunctionClick = (
  vectorSource: VectorSource,
  coordinate: number[],
  halfSize: number = 7,
  innerRadius: number = 2
): void => {
  try {
    const junctionFeature = createJunctionGeometry(coordinate, halfSize, innerRadius);

    // Tag feature for identification
    junctionFeature.set("isJunction", true);
    junctionFeature.set("nonEditable", true);

    // Add label/name properties for text display
    junctionFeature.set("label", "name");
    junctionFeature.set("name", `Junction`);

    // Add to vector source
    vectorSource.addFeature(junctionFeature);
  } catch (error) {
    console.error("Error creating JunctionPoint:", error);
  }
};

/**
 * Checks if a feature is a JunctionPoint symbol
 */
export const isJunctionFeature = (feature: Feature): boolean => {
  return feature.get("isJunction") === true;
};

/**
 * JunctionPoint tool utilities
 */
export const junctionUtils = {
  createGeometry: createJunctionGeometry,
  getStyles: getJunctionStyles,
  getStyle: getJunctionStyle, // alias for compatibility
  handleClick: handleJunctionClick,
  isJunction: isJunctionFeature,
};
