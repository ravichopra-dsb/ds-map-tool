import { useState, useEffect, useCallback } from "react";
import type Map from "ol/Map";
import type Feature from "ol/Feature";
import {
  extractCoordinates,
  updateFeatureCoordinates,
  type CoordinateState,
} from "@/utils/coordinateUtils";
import {
  extractAllProperties,
  applyPropertiesToFeature,
  createEmptyProperty,
  type CustomProperty,
} from "@/utils/propertyUtils";

export interface UsePropertiesPanelReturn {
  // State
  coordinates: CoordinateState;
  customProperties: CustomProperty[];
  isEditing: boolean;

  // Actions
  setIsEditing: (editing: boolean) => void;
  updateProperty: (id: string, field: "key" | "value", value: string) => void;
  addProperty: () => void;
  deleteProperty: (id: string) => void;
  save: () => void;
  cancel: () => void;
}

const EMPTY_COORDINATES: CoordinateState = { long: "", lat: "", name: "" };

export const usePropertiesPanel = (
  selectedFeature: Feature | null,
  map: Map | null,
  onSave?: () => void
): UsePropertiesPanelReturn => {
  const [isEditing, setIsEditing] = useState(false);
  const [coordinates, setCoordinates] =
    useState<CoordinateState>(EMPTY_COORDINATES);
  const [originalCoordinates, setOriginalCoordinates] =
    useState<CoordinateState>(EMPTY_COORDINATES);
  const [customProperties, setCustomProperties] = useState<CustomProperty[]>(
    []
  );
  const [originalCustomProperties, setOriginalCustomProperties] = useState<
    CustomProperty[]
  >([]);

  // Sync state when selected feature changes
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
      setCoordinates(EMPTY_COORDINATES);
      setOriginalCoordinates(EMPTY_COORDINATES);
      setCustomProperties([]);
      setOriginalCustomProperties([]);
      setIsEditing(false);
    }
  }, [selectedFeature]);

  const updateProperty = useCallback(
    (id: string, field: "key" | "value", value: string) => {
      setCustomProperties((prev) =>
        prev.map((prop) =>
          prop.id === id ? { ...prop, [field]: value } : prop
        )
      );
    },
    []
  );

  const addProperty = useCallback(() => {
    setCustomProperties((prev) => [...prev, createEmptyProperty()]);
  }, []);

  const deleteProperty = useCallback((id: string) => {
    setCustomProperties((prev) => prev.filter((prop) => prop.id !== id));
  }, []);

  const save = useCallback(() => {
    if (!selectedFeature || !map) return;

    // Re-read the feature's current coordinates so we don't overwrite
    // a position that was changed via Translate (drag) with stale values.
    const currentCoords = extractCoordinates(selectedFeature);
    const longProp = customProperties.find((p) => p.key === "long");
    const latProp = customProperties.find((p) => p.key === "lat");

    // Update long/lat in customProperties to current geometry values
    // unless the user manually edited them
    const userEditedCoords =
      longProp &&
      latProp &&
      (longProp.value !== originalCoordinates.long ||
        latProp.value !== originalCoordinates.lat);

    const updatedProperties = userEditedCoords
      ? customProperties
      : customProperties.map((p) => {
          if (p.key === "long") return { ...p, value: currentCoords.long };
          if (p.key === "lat") return { ...p, value: currentCoords.lat };
          return p;
        });

    // Apply properties to feature
    applyPropertiesToFeature(
      selectedFeature,
      updatedProperties,
      (lon, lat, name) => {
        updateFeatureCoordinates(selectedFeature, map, lon, lat, name);
      }
    );

    // Update original state
    setOriginalCustomProperties(updatedProperties);
    setCustomProperties(updatedProperties);

    // Update coordinates state for consistency
    const nameProp = updatedProperties.find((p) => p.key === "name");
    const finalLong = updatedProperties.find((p) => p.key === "long");
    const finalLat = updatedProperties.find((p) => p.key === "lat");

    if (finalLong && finalLat) {
      const newCoords = {
        name: nameProp?.value || "",
        long: finalLong.value,
        lat: finalLat.value,
      };
      setOriginalCoordinates(newCoords);
      setCoordinates(newCoords);
    }

    onSave?.();
    setIsEditing(false);
  }, [selectedFeature, map, customProperties, originalCoordinates, onSave]);

  const cancel = useCallback(() => {
    setCoordinates(originalCoordinates);
    setCustomProperties(originalCustomProperties);
    setIsEditing(false);
  }, [originalCoordinates, originalCustomProperties]);

  return {
    coordinates,
    customProperties,
    isEditing,
    setIsEditing,
    updateProperty,
    addProperty,
    deleteProperty,
    save,
    cancel,
  };
};
