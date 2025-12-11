import React, { useState, useEffect } from "react";
import { fromLonLat, toLonLat } from "ol/proj";
import type Map from "ol/Map";
import type Feature from "ol/Feature";
import type Point from "ol/geom/Point";
import type LineString from "ol/geom/LineString";
import type Polygon from "ol/geom/Polygon";
import type GeometryCollection from "ol/geom/GeometryCollection";
import type MultiLineString from "ol/geom/MultiLineString";
import { getCenter } from "ol/extent";
import { X, Edit2, Save, X as XIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PropertiesPanelProps {
  map: Map | null;
  selectedFeature: Feature | null;
  onClose: () => void;
  onSave?: () => void;
}

interface CoordinateState {
  longitude: string;
  latitude: string;
  name: string;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  map,
  selectedFeature,
  onClose,
  onSave,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [coordinates, setCoordinates] = useState<CoordinateState>({
    longitude: "",
    latitude: "",
    name: "",
  });
  const [originalCoordinates, setOriginalCoordinates] =
    useState<CoordinateState>({
      longitude: "",
      latitude: "",
      name: "",
    });

  // Get feature type name
  // const getFeatureType = (feature: Feature): string => {
  //   if (feature.get("isArrow")) return "Arrow";
  //   if (feature.get("islegends")) return "Legend";
  //   if (feature.get("isMeasure")) return "Measure";
  //   if (feature.get("isTower")) return "Tower";
  //   if (feature.get("isTriangle")) return "Triangle";
  //   if (feature.get("isPit")) return "Pit";
  //   if (feature.get("isGP")) return "GP";
  //   if (feature.get("isJunctionPoint")) return "Junction Point";

  //   const geometry = feature.getGeometry();
  //   if (!geometry) return "Unknown";

  //   const type = geometry.getType();
  //   switch (type) {
  //     case "Point":
  //       return "Point";
  //     case "LineString":
  //       return "Polyline";
  //     case "Polygon":
  //       return "Polygon";
  //     case "Circle":
  //       return "Circle";
  //     default:
  //       return type;
  //   }
  // };

  // Extract coordinates based on geometry type
  const extractCoordinates = (feature: Feature): CoordinateState => {
    const geometry = feature.getGeometry();
    if (!geometry) return { longitude: "", latitude: "", name: "" };

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
        // Get the extent of the entire collection and use its center
        const center = getCenter(geometryCollection.getExtent());
        const centerCoords = toLonLat(center);
        [lon, lat] = centerCoords;
        break;
      }
      case "MultiLineString": {
        const multiLineString = geometry as MultiLineString;
        // Get the extent of the entire multi-line string and use its center
        const center = getCenter(multiLineString.getExtent());
        const centerCoords = toLonLat(center);
        [lon, lat] = centerCoords;
        break;
      }
      default:
        return { longitude: "", latitude: "", name: "" };
    }

    return {
      longitude: lon.toFixed(6),
      latitude: lat.toFixed(6),
      name: feature.get('name') || "",
    };
  };

  // Update coordinates when selected feature changes
  useEffect(() => {
    if (selectedFeature) {
      const coords = extractCoordinates(selectedFeature);
      setCoordinates(coords);
      setOriginalCoordinates(coords);
      setIsEditing(false);
    } else {
      setCoordinates({ longitude: "", latitude: "", name: "" });
      setOriginalCoordinates({ longitude: "", latitude: "", name: "" });
      setIsEditing(false);
    }
  }, [selectedFeature]);

  // Update feature geometry with new coordinates
  const updateFeatureCoordinates = (lon: number, lat: number, name: string) => {
    if (!map || !selectedFeature) return;

    const geometry = selectedFeature.getGeometry();
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

          // Move all vertices by the same offset
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

        // Move all coordinates by the offset
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

        // Transform all geometries in the collection by the same offset
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

        geometryCollection.changed(); // Trigger change event
        break;
      }
      case "MultiLineString": {
        const multiLineString = geometry as MultiLineString;
        const center = getCenter(multiLineString.getExtent());
        const [currentLon, currentLat] = toLonLat(center);
        const deltaX = lon - currentLon;
        const deltaY = lat - currentLat;

        // Transform all line strings in the multi-line string by the same offset
        const lineStrings = multiLineString.getLineStrings();
        lineStrings.forEach((lineString) => {
          const newLineCoords = lineString.getCoordinates().map((coord) => {
            const [x, y] = toLonLat(coord);
            return fromLonLat([x + deltaX, y + deltaY]);
          });
          lineString.setCoordinates(newLineCoords);
        });

        multiLineString.changed(); // Trigger change event
        break;
      }
    }

    // Update feature name
    if (name.trim()) {
      selectedFeature.set('name', name.trim());
    } else {
      selectedFeature.unset('name');
    }

    // Redraw the map
    map.render();
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    const lon = parseFloat(coordinates.longitude);
    const lat = parseFloat(coordinates.latitude);

    if (!isNaN(lon) && !isNaN(lat)) {
      updateFeatureCoordinates(lon, lat, coordinates.name);
      setOriginalCoordinates(coordinates);

      // Trigger save callback if provided
      if (onSave) {
        onSave();
      }
    }

    setIsEditing(false);
  };

  const handleCancel = () => {
    setCoordinates(originalCoordinates);
    setIsEditing(false);
  };

  const handleInputChange = (field: keyof CoordinateState, value: string) => {
    setCoordinates((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (!selectedFeature) {
    return null;
  }

  // Don't show properties panel for text features
  if (selectedFeature.get("isText")) {
    return null;
  }

  return (
    <div className="absolute right-4 top-20 w-80 h-112 rounded-lg overflow-hidden bg-white dark:bg-slate-800 shadow-2xl border-l border-gray-200 dark:border-slate-700 z-50 transform transition-transform duration-300 ease-in-out">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700 bg-linear-to-r from-gray-50 to-white dark:from-slate-700 dark:to-slate-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {/* {getFeatureType(selectedFeature)} */}
            {coordinates.name}
          </h3>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="h-6 w-6 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-slate-700"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p- space-y-6">
          {!isEditing ? (
            <Card className="border-none shadow-none rounded-none">
              {/* Properties Section */}
              {/* <CardHeader>
                <CardTitle className="text-base">Properties</CardTitle>
              </CardHeader> */}
              <CardContent>
                <div className="space-y-2 text-sm">
                  {(() => {
                    const properties = selectedFeature.getProperties();
                    delete properties.geometry;

                    const entries = Object.entries(properties).filter(
                      ([key]) => !key.startsWith("is") && key !== "nonEditable"
                    );

                    if (entries.length === 0) {
                      return (
                        <div className="text-gray-500 dark:text-gray-400 italic">
                          No additional properties
                        </div>
                      );
                    }

                    return entries.map(([key, value]) => (
                      <div
                        key={key}
                        className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-700 last:border-b-0"
                      >
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {key}:
                        </span>
                        <span className="text-gray-600 dark:text-gray-400 truncate ml-2">
                          {String(value)}
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-none shadow-none rounded-none">
              {/* Coordinates Section */}
              {/* <CardHeader>
                <CardTitle className="text-base">Coordinates</CardTitle>
              </CardHeader> */}
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Name
                  </label>
                  {isEditing ? (
                    <Input
                      type="text"
                      value={coordinates.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      className="mt-1"
                      placeholder="Enter feature name"
                    />
                  ) : (
                    <div className="mt-1 p-2 bg-gray-50 dark:bg-slate-700 rounded text-sm">
                      {coordinates.name || "No name"}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Longitude
                  </label>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="any"
                      value={coordinates.longitude}
                      onChange={(e) =>
                        handleInputChange("longitude", e.target.value)
                      }
                      className="mt-1"
                      placeholder="-180 to 180"
                    />
                  ) : (
                    <div className="mt-1 p-2 bg-gray-50 dark:bg-slate-700 rounded text-sm">
                      {coordinates.longitude || "N/A"}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Latitude
                  </label>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="any"
                      value={coordinates.latitude}
                      onChange={(e) =>
                        handleInputChange("latitude", e.target.value)
                      }
                      className="mt-1"
                      placeholder="-90 to 90"
                    />
                  ) : (
                    <div className="mt-1 p-2 bg-gray-50 dark:bg-slate-700 rounded text-sm">
                      {coordinates.latitude || "N/A"}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700 bg-linear-to-r from-gray-50 to-white dark:from-slate-700 dark:to-slate-800">
          {/* Edit/Save/Cancel Buttons */}
          <div className="flex gap-2 pt-2">
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEdit}
                className="flex items-center gap-2"
              >
                <Edit2 className="h-3 w-3" />
                Edit
              </Button>
            ) : (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSave}
                  className="flex items-center gap-2"
                >
                  <Save className="h-3 w-3" />
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="flex items-center gap-2"
                >
                  <XIcon className="h-3 w-3" />
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertiesPanel;
