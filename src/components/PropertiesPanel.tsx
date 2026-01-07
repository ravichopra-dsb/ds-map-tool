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
import { X, Edit2, Save, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PropertiesPanelProps {
  map: Map | null;
  selectedFeature: Feature | null;
  onClose: () => void;
  onSave?: () => void;
}

interface CoordinateState {
  long: string;
  lat: string;
  name: string;
}

interface CustomProperty {
  id: string;
  key: string;
  value: string;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  map,
  selectedFeature,
  onClose,
  onSave,
}) => {
  console.log("Selected Features : ", selectedFeature)
  const [isEditing, setIsEditing] = useState(false);
  const [coordinates, setCoordinates] = useState<CoordinateState>({
    long: "",
    lat: "",
    name: "",
  });
  const [originalCoordinates, setOriginalCoordinates] =
    useState<CoordinateState>({
      long: "",
      lat: "",
      name: "",
    });
  const [customProperties, setCustomProperties] = useState<CustomProperty[]>(
    []
  );
  const [originalCustomProperties, setOriginalCustomProperties] = useState<
    CustomProperty[]
  >([]);

  // Extract all properties including coordinates
  const extractAllProperties = (feature: Feature): CustomProperty[] => {
    const coords = extractCoordinates(feature);
    const properties = feature.getProperties();
    delete properties.geometry;

    const allProperties: CustomProperty[] = [];

    // Add lon/lat for all geometries except LineString
    const geometry = feature.getGeometry();
    const geometryType = geometry?.getType();

    // Add name first
    allProperties.push(
      { id: 'prop-name', key: 'name', value: coords.name }
    );

    // Add lon/lat for all features except LineString
    if (geometryType !== 'LineString') {
      allProperties.push(
        { id: 'prop-long', key: 'long', value: coords.long },
        { id: 'prop-lat', key: 'lat', value: coords.lat }
      );
    }

    // Add custom properties
    const filteredEntries = Object.entries(properties).filter(
      ([key]) =>
        !key.startsWith("is") &&
        key !== "nonEditable" &&
        key !== "name" &&
        !key.startsWith("_")
    );

    filteredEntries.forEach(([key, value], index) => {
      allProperties.push({
        id: `prop-${index}-${Date.now()}`,
        key,
        value: String(value),
      });
    });

    console.log(allProperties)
    return allProperties;
  };

  // Extract coordinates based on geometry type
  const extractCoordinates = (feature: Feature): CoordinateState => {
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
        return { long: "", lat: "", name: "" };
    }

    return {
      long: lon.toFixed(6),
      lat: lat.toFixed(6),
      name: feature.get("name") || "",
    };
  };

  // Update all properties when selected feature changes
  useEffect(() => {
    if (selectedFeature) {
      const coords = extractCoordinates(selectedFeature);
      const properties = extractAllProperties(selectedFeature);
      setCoordinates(coords);
      setOriginalCoordinates(coords);
      setCustomProperties(properties);
      setOriginalCustomProperties(properties);
      setIsEditing(false);
    } else {
      setCoordinates({ long: "", lat: "", name: "" });
      setOriginalCoordinates({ long: "", lat: "", name: "" });
      setCustomProperties([]);
      setOriginalCustomProperties([]);
      setIsEditing(false);
    }
  }, [selectedFeature]);

  // Update all properties
  const updateAllProperties = (properties: CustomProperty[]) => {
    if (!selectedFeature) return;

    // Extract coordinates from properties
    const nameProp = properties.find(p => p.key === 'name');
    const longProp = properties.find(p => p.key === 'long');
    const latProp = properties.find(p => p.key === 'lat');

    // Update coordinates if they exist
    if (longProp && latProp) {
      const lon = parseFloat(longProp.value);
      const lat = parseFloat(latProp.value);
      if (!isNaN(lon) && !isNaN(lat)) {
        updateFeatureCoordinates(lon, lat, nameProp?.value || '');
      }
    } else if (nameProp) {
      // Update name if only name is provided
      if (nameProp.value.trim()) {
        selectedFeature.set('name', nameProp.value.trim());
      } else {
        selectedFeature.unset('name');
      }
    }

    // Clear existing custom properties
    const currentProperties = selectedFeature.getProperties();
    Object.keys(currentProperties).forEach((key) => {
      if (
        !key.startsWith("is") &&
        key !== "geometry" &&
        key !== "name" &&
        key !== "nonEditable" &&
        !key.startsWith("_")
      ) {
        selectedFeature.unset(key);
      }
    });

    // Set new custom properties
    properties.forEach((prop) => {
      if (prop.key.trim() && prop.value.trim() &&
          !['name', 'long', 'lat'].includes(prop.key)) {
        selectedFeature.set(prop.key.trim(), prop.value.trim());
      }
    });
  };

  // Custom property management functions
  const addCustomProperty = () => {
    const newProperty: CustomProperty = {
      id: `prop-new-${Date.now()}`,
      key: "",
      value: "",
    };
    setCustomProperties([...customProperties, newProperty]);
  };

  const updateCustomProperty = (
    id: string,
    field: "key" | "value",
    value: string
  ) => {
    setCustomProperties(
      customProperties.map((prop) =>
        prop.id === id ? { ...prop, [field]: value } : prop
      )
    );
  };

  const deleteCustomProperty = (id: string) => {
    setCustomProperties(customProperties.filter((prop) => prop.id !== id));
  };

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
      selectedFeature.set("name", name.trim());
    } else {
      selectedFeature.unset("name");
    }

    // Redraw the map
    map.render();
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    updateAllProperties(customProperties);
    setOriginalCustomProperties(customProperties);

    // Update coordinates state for consistency
    const nameProp = customProperties.find(p => p.key === 'name');
    const longProp = customProperties.find(p => p.key === 'long');
    const latProp = customProperties.find(p => p.key === 'lat');

    if (longProp && latProp) {
      setOriginalCoordinates({
        name: nameProp?.value || '',
        long: longProp.value,
        lat: latProp.value,
      });
      setCoordinates({
        name: nameProp?.value || '',
        long: longProp.value,
        lat: latProp.value,
      });
    }

    // Trigger save callback if provided
    if (onSave) {
      onSave();
    }

    setIsEditing(false);
  };

  const handleCancel = () => {
    setCoordinates(originalCoordinates);
    setCustomProperties(originalCustomProperties);
    setIsEditing(false);
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
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
          <div className="space-y-2">
            {!isEditing ? (
              <div className="space-y-1">
                {customProperties.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <div className="text-4xl mb-2">📋</div>
                    <div className="text-sm font-medium">No properties</div>
                    <div className="text-xs mt-1">Click Edit to add properties</div>
                  </div>
                ) : (
                  customProperties.map((prop) => (
                    <div
                      key={prop.id}
                      className="flex justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <span className="font-medium text-gray-700 dark:text-gray-300 capitalize">
                        {prop.key}:
                      </span>
                      <span className="text-gray-600 dark:text-gray-400 truncate ml-2">
                        {prop.value || <span className="text-gray-400 italic">Empty</span>}
                      </span>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {customProperties.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                    <div className="text-3xl mb-2">➕</div>
                    <div className="text-sm font-medium">No properties yet</div>
                    <div className="text-xs mt-1">Click "Add" to create your first property</div>
                  </div>
                ) : (
                  customProperties.map((prop) => {
                    const isReadOnly = ['name', 'long', 'lat'].includes(prop.key);

                    return (
                      <div key={prop.id} className="flex gap-2 items-center">
                        <Input
                          placeholder="Property name"
                          value={prop.key}
                          onChange={(e) =>
                            updateCustomProperty(prop.id, "key", e.target.value)
                          }
                          className={`flex-1 text-sm ${isReadOnly ? 'bg-gray-50 dark:bg-slate-700' : ''}`}
                          disabled={isReadOnly}
                        />
                        <Input
                          placeholder="Value"
                          value={prop.value}
                          onChange={(e) =>
                            updateCustomProperty(prop.id, "value", e.target.value)
                          }
                          className="flex-1 text-sm"
                          type={prop.key === 'long' || prop.key === 'lat' ? 'number' : 'text'}
                          step={prop.key === 'long' || prop.key === 'lat' ? 'any' : undefined}
                        />
                        {!isReadOnly && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => deleteCustomProperty(prop.id)}
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            aria-label="Delete property"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
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
                  <X className="h-3 w-3" />
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addCustomProperty}
                  className="flex items-center gap-2 ml-8"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
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
