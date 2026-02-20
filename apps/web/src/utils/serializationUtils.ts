import { Feature } from "ol";
import type { Geometry } from "ol/geom";
import type { Extent } from "ol/extent";
import GeoJSON from "ol/format/GeoJSON";

// Conversion utilities for proper serialization
export const convertFeaturesToGeoJSON = (vectorSource: any): any => {
  const features = vectorSource.getFeatures();
  const geoJSONFormat = new GeoJSON();

  try {
    const geoJSONFeatures = features.map((feature: Feature<Geometry>) => {
      // Extract style metadata before converting to GeoJSON
      const styleMetadata = extractStyleMetadata(feature);

      // Create a copy of the feature and add style metadata to properties
      const featureClone = feature.clone();

      // Add style metadata to feature properties
      Object.keys(styleMetadata).forEach((key) => {
        featureClone.set(key, styleMetadata[key]);
      });

      const geoJSONFeature = geoJSONFormat.writeFeature(featureClone, {
        featureProjection: "EPSG:3857",
        dataProjection: "EPSG:4326",
      });

      const parsed = JSON.parse(geoJSONFeature);

      // Ensure properties object exists and contains our metadata
      if (!parsed.properties) {
        parsed.properties = {};
      }

      // Explicitly add all style metadata to properties
      Object.assign(parsed.properties, styleMetadata);

      return parsed;
    });

    return {
      type: "FeatureCollection",
      features: geoJSONFeatures,
    };
  } catch (error) {
    console.error("Error converting features to GeoJSON:", error);
    return {
      type: "FeatureCollection",
      features: [],
    };
  }
};

export const convertGeoJSONToFeatures = (geoJSONData: any): Feature<Geometry>[] => {
  const geoJSONFormat = new GeoJSON();

  console.log("geoJSONData", geoJSONData);
  console.log("geoJSONFormat", geoJSONFormat);

  try {
    const features = geoJSONFormat.readFeatures(geoJSONData, {
      featureProjection: "EPSG:3857",
      dataProjection: "EPSG:4326",
    });

    // Restore feature properties from GeoJSON properties
    features.forEach((feature: Feature<Geometry>) => {
      const geoJSONProperties = feature.getProperties();

      // Restore all icon type identifiers and metadata
      Object.keys(geoJSONProperties).forEach((key) => {
        if (key !== "geometry" && geoJSONProperties[key] !== undefined) {
          feature.set(key, geoJSONProperties[key]);
        }
      });

      // Call style recreation (though styling is handled by FeatureStyler)
      recreateFeatureStyle(feature);
    });

    return features;
  } catch (error) {
    console.error("Error converting GeoJSON to features:", error);
    return [];
  }
};


// Helper function to check if extent is empty
export const isEmptyExtent = (extent: Extent): boolean => {
  return (
    extent[0] === Infinity ||
    extent[1] === Infinity ||
    extent[2] === -Infinity ||
    extent[3] === -Infinity
  );
};

// Style serialization utilities
export const extractStyleMetadata = (feature: Feature<Geometry>): any => {
  const featureType = feature.getGeometry()?.getType();
  const properties: any = {};

  // Store feature type for recreation
  properties.featureType = featureType;

  // Store icon type identifiers
  if (feature.get("isArrow")) properties.isArrow = true;
  if (feature.get("isDimension")) properties.isDimension = true;
  if (feature.get("dimensionText")) properties.dimensionText = feature.get("dimensionText");
  if (feature.get("isAlignedDimension")) properties.isAlignedDimension = true;
  if (feature.get("offsetDistance") !== undefined) properties.offsetDistance = feature.get("offsetDistance");
  if (feature.get("isMeasure")) properties.isMeasure = true;
  if (feature.get("islegends")) properties.islegends = true;
  if (feature.get("isPoint")) properties.isPoint = true;
  if (feature.get("isPolyline")) properties.isPolyline = true;
  if (feature.get("isFreehand")) properties.isFreehand = true;
  if (feature.get("legendType"))
    properties.legendType = feature.get("legendType");
  if (feature.get("distance")) properties.distance = feature.get("distance");
  if (feature.get("nonEditable")) properties.nonEditable = true;

  // Store name property for PropertiesPanel
  if (feature.get("name")) properties.name = feature.get("name");

  // Store label property for custom label selection
  if (feature.get("label")) properties.label = feature.get("label");

  // Store shape type identifiers (Box, Circle, Arc, Revision Cloud)
  if (feature.get("isBox")) properties.isBox = true;
  if (feature.get("isCircle")) properties.isCircle = true;
  if (feature.get("isArc")) properties.isArc = true;
  if (feature.get("isRevisionCloud")) properties.isRevisionCloud = true;
  if (feature.get("scallopRadius")) properties.scallopRadius = feature.get("scallopRadius");
  if (feature.get("bulgeRatio") !== undefined) properties.bulgeRatio = feature.get("bulgeRatio");
  if (feature.get("originalPath")) properties.originalPath = feature.get("originalPath");

  // Store arc control points for editing (start, through, end)
  if (feature.get("arcControlPoints")) {
    properties.arcControlPoints = feature.get("arcControlPoints");
  }

  // Store line style properties
  if (feature.get("lineColor")) properties.lineColor = feature.get("lineColor");
  if (feature.get("lineWidth")) properties.lineWidth = feature.get("lineWidth");

  // Store shape style properties (stroke, fill, opacity)
  if (feature.get("strokeColor")) properties.strokeColor = feature.get("strokeColor");
  if (feature.get("fillColor")) properties.fillColor = feature.get("fillColor");
  if (feature.get("fillOpacity") !== undefined) properties.fillOpacity = feature.get("fillOpacity");

  // Store folder assignment for feature grouping
  if (feature.get("folderId")) properties.folderId = feature.get("folderId");

  // Store icon properties (Google Earth icons from IconPickerDialog)
  if (feature.get("isIcon")) properties.isIcon = true;
  if (feature.get("iconPath")) properties.iconPath = feature.get("iconPath");
  if (feature.get("opacity") !== undefined) properties.opacity = feature.get("opacity");
  if (feature.get("iconScale") !== undefined) properties.iconScale = feature.get("iconScale");
  if (feature.get("labelScale") !== undefined) properties.labelScale = feature.get("labelScale");
  if (feature.get("textOffsetX") !== undefined) properties.textOffsetX = feature.get("textOffsetX");
  if (feature.get("textOffsetY") !== undefined) properties.textOffsetY = feature.get("textOffsetY");
  if (feature.get("iconRotation") !== undefined) properties.iconRotation = feature.get("iconRotation");
  if (feature.get("showLabel") !== undefined) properties.showLabel = feature.get("showLabel");
  if (feature.get("iconSrc") !== undefined) properties.iconSrc = feature.get("iconSrc");

  return properties;
};

export const recreateFeatureStyle = (_feature: Feature<Geometry>): void => {
  // This will be called after features are loaded from GeoJSON
  // The FeatureStyler will handle the actual styling via getFeatureTypeStyle
  // We just need to make sure the feature properties are preserved
  // The style will be applied automatically when the feature is rendered
};

// ✅ NEW: Strip Z-coordinates for consistency
export const normalizeCoordinates = (coordinates: unknown): unknown => {
  // Not an array? Just return as‑is
  if (!Array.isArray(coordinates)) return coordinates;

  // Empty array – nothing to normalize
  if (coordinates.length === 0) return coordinates;

  const first = coordinates[0];

  // Base case: single coordinate [x, y, z?] → [x, y]
  if (typeof first === "number") {
    const arr = coordinates as number[];
    return arr.length >= 2 ? [arr[0], arr[1]] : arr;
  }

  // Recursive case: nested arrays
  return (coordinates as unknown[]).map((coord) =>
    normalizeCoordinates(coord)
  );
};

// ✅ NEW: Normalize geometry after any conversion
export const normalizeGeometry = (geometry: any): any => {
  if (!geometry) return geometry;

  return {
    ...geometry,
    coordinates: normalizeCoordinates(geometry.coordinates),
  };
};

// ✅ NEW: Normalize GeoJSON features (strip Z from all geometries)
export const normalizeGeoJSON = (geoJSONData: any): any => {
  if (geoJSONData.type === 'FeatureCollection') {
    return {
      type: 'FeatureCollection',
      features: geoJSONData.features.map((feature: any) => ({
        ...feature,
        geometry: normalizeGeometry(feature.geometry),
      })),
    };
  }

  return {
    ...geoJSONData,
    geometry: normalizeGeometry(geoJSONData.geometry),
  };
};

// ✅ NEW: Detect and preserve GeometryCollection from GeoJSON
// export const reconstructGeometryCollection = (geoJSONData: any): any => {
//   if (!geoJSONData.features) return geoJSONData;

//   return {
//     type: 'FeatureCollection',
//     features: geoJSONData.features.map((feature: any) => {
//       // If this is a MultiPolygon with custom properties indicating it was a GeometryCollection
//       if (
//         feature.geometry.type === 'MultiPolygon' &&
//         (feature.properties?.isGP || feature.properties?.featureType === 'GeometryCollection')
//       ) {
//         // Convert MultiPolygon back to GeometryCollection
//         const polygons = feature.geometry.coordinates.map((polygonCoords: any) => ({
//           type: 'Polygon',
//           coordinates: polygonCoords,
//         }));

//         return {
//           ...feature,
//           geometry: {
//             type: 'GeometryCollection',
//             geometries: polygons,
//           },
//         };
//       }
//       return feature;
//     }),
//   };
// };

// ✅ NEW - Handles ALL feature types (isGP, isPit, isTriangle, isTower, isJunction, etc.)
export const reconstructGeometryCollection = (geoJSONData: any): any => {
  if (!geoJSONData.features) return geoJSONData;

  return {
    type: 'FeatureCollection',
    features: geoJSONData.features.map((feature: any) => {
      const props = feature.properties || {};

      // ✅ Handle MultiPolygon → GeometryCollection conversion
      if (
        feature.geometry.type === 'MultiPolygon' &&
        props.featureType === 'GeometryCollection'
      ) {
        const polygons = feature.geometry.coordinates.map((polygonCoords: any) => ({
          type: 'Polygon',
          coordinates: polygonCoords,
        }));

        return {
          ...feature,
          geometry: {
            type: 'GeometryCollection',
            geometries: polygons,
          },
        };
      }

      // ✅ DEFAULT: Return feature as-is if no special handling needed
      return feature;
    }),
  };
};


// ✅ NEW: Unified normalization for both import paths
export const normalizeImportedGeoJSON = (geoJSONData: any): any => {
  // Step 1: Strip Z-coordinates
  let normalized = normalizeGeoJSON(geoJSONData);

  // Step 2: Attempt to restore GeometryCollections
  normalized = reconstructGeometryCollection(normalized);

  return normalized;
};