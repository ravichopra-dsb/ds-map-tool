import { fromLonLat, toLonLat } from "ol/proj";
import type Map from "ol/Map";
import type Feature from "ol/Feature";
import type Point from "ol/geom/Point";
import type LineString from "ol/geom/LineString";
import type Polygon from "ol/geom/Polygon";
import type GeometryCollection from "ol/geom/GeometryCollection";
import type MultiLineString from "ol/geom/MultiLineString";
import { getCenter } from "ol/extent";

export interface CoordinateState {
  long: string;
  lat: string;
  name: string;
}

/**
 * Extracts coordinates from a feature based on its geometry type.
 * Returns center point for polygons/collections, start point for linestrings.
 */
export const extractCoordinates = (feature: Feature): CoordinateState => {
  const geometry = feature.getGeometry();
  if (!geometry) return { long: "", lat: "", name: "" };

  let lon = 0;
  let lat = 0;

  switch (geometry.getType()) {
    case "Point": {
      const point = geometry as Point;
      const coords = toLonLat(point.getCoordinates());
      [lon, lat] = coords;
      break;
    }
    case "LineString": {
      const lineString = geometry as LineString;
      const coords = lineString.getCoordinates();
      // Use start point
      const startCoords = toLonLat(coords[0]);
      [lon, lat] = startCoords;
      break;
    }
    case "Polygon": {
      const polygon = geometry as Polygon;
      const center = getCenter(polygon.getExtent());
      const centerCoords = toLonLat(center);
      [lon, lat] = centerCoords;
      break;
    }
    case "GeometryCollection": {
      const geometryCollection = geometry as GeometryCollection;
      const center = getCenter(geometryCollection.getExtent());
      const centerCoords = toLonLat(center);
      [lon, lat] = centerCoords;
      break;
    }
    case "MultiLineString": {
      const multiLineString = geometry as MultiLineString;
      const center = getCenter(multiLineString.getExtent());
      const centerCoords = toLonLat(center);
      [lon, lat] = centerCoords;
      break;
    }
    default:
      return { long: "", lat: "", name: "" };
  }

  return {
    long: lon.toFixed(6),
    lat: lat.toFixed(6),
    name: feature.get("name") || "",
  };
};

/**
 * Updates feature geometry with new coordinates.
 * Translates entire geometry to maintain shape while moving to new position.
 */
export const updateFeatureCoordinates = (
  feature: Feature,
  map: Map,
  lon: number,
  lat: number,
  name: string
): void => {
  const geometry = feature.getGeometry();
  if (!geometry) return;

  const newCoords = fromLonLat([lon, lat]);

  switch (geometry.getType()) {
    case "Point": {
      const point = geometry as Point;
      point.setCoordinates(newCoords);
      break;
    }
    case "LineString": {
      const lineString = geometry as LineString;
      const coords = lineString.getCoordinates();
      if (coords.length > 0) {
        const startCoords = toLonLat(coords[0]);
        const deltaX = lon - startCoords[0];
        const deltaY = lat - startCoords[1];

        const newLineCoords = coords.map((coord) => {
          const [x, y] = toLonLat(coord);
          return fromLonLat([x + deltaX, y + deltaY]);
        });

        lineString.setCoordinates(newLineCoords);
      }
      break;
    }
    case "Polygon": {
      const polygon = geometry as Polygon;
      const coords = polygon.getCoordinates();
      const center = getCenter(polygon.getExtent());
      const [currentLon, currentLat] = toLonLat(center);
      const deltaX = lon - currentLon;
      const deltaY = lat - currentLat;

      const newPolygonCoords = coords.map((ring) =>
        ring.map((coord) => {
          const [x, y] = toLonLat(coord);
          return fromLonLat([x + deltaX, y + deltaY]);
        })
      );

      polygon.setCoordinates(newPolygonCoords);
      break;
    }
    case "GeometryCollection": {
      const geometryCollection = geometry as GeometryCollection;
      const center = getCenter(geometryCollection.getExtent());
      const [currentLon, currentLat] = toLonLat(center);
      const deltaX = lon - currentLon;
      const deltaY = lat - currentLat;

      const geometries = geometryCollection.getGeometriesArray();
      geometries.forEach((geom) => {
        switch (geom.getType()) {
          case "Point": {
            const point = geom as Point;
            const [x, y] = toLonLat(point.getCoordinates());
            point.setCoordinates(fromLonLat([x + deltaX, y + deltaY]));
            break;
          }
          case "LineString": {
            const lineString = geom as LineString;
            const newLineCoords = lineString.getCoordinates().map((coord) => {
              const [x, y] = toLonLat(coord);
              return fromLonLat([x + deltaX, y + deltaY]);
            });
            lineString.setCoordinates(newLineCoords);
            break;
          }
          case "Polygon": {
            const polygon = geom as Polygon;
            const newPolygonCoords = polygon.getCoordinates().map((ring) =>
              ring.map((coord) => {
                const [x, y] = toLonLat(coord);
                return fromLonLat([x + deltaX, y + deltaY]);
              })
            );
            polygon.setCoordinates(newPolygonCoords);
            break;
          }
        }
      });

      geometryCollection.changed();
      break;
    }
    case "MultiLineString": {
      const multiLineString = geometry as MultiLineString;
      const center = getCenter(multiLineString.getExtent());
      const [currentLon, currentLat] = toLonLat(center);
      const deltaX = lon - currentLon;
      const deltaY = lat - currentLat;

      const lineStrings = multiLineString.getLineStrings();
      lineStrings.forEach((lineString) => {
        const newLineCoords = lineString.getCoordinates().map((coord) => {
          const [x, y] = toLonLat(coord);
          return fromLonLat([x + deltaX, y + deltaY]);
        });
        lineString.setCoordinates(newLineCoords);
      });

      multiLineString.changed();
      break;
    }
  }

  // Update feature name
  if (name.trim()) {
    feature.set("name", name.trim());
  } else {
    feature.unset("name");
  }

  // Redraw the map
  map.render();
};
