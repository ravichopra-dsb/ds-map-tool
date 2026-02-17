import { useState, useEffect, useCallback, useMemo } from "react";
import type Map from "ol/Map";
import type Feature from "ol/Feature";
import type { Select } from "ol/interaction";

export interface UsePointOpacityEditorReturn {
  // State
  opacity: number;
  supportsPointOpacity: boolean;
  isEditingOpacity: boolean;

  // Actions
  handleOpacityChange: (opacity: number) => void;
  resetToOriginal: () => void;
  commitOpacity: () => void;
}

const DEFAULT_OPACITY = 1;

/**
 * Check if a feature supports point/icon opacity
 * Includes: Point geometry and Google Earth icons
 */
const supportsOpacity = (feature: Feature | null): boolean => {
  if (!feature) return false;

  const geometry = feature.getGeometry();
  if (!geometry) return false;

  const geometryType = geometry.getType();

  // Point geometry features
  if (geometryType === "Point") return true;

  // Google Earth icons from IconPickerDialog
  if (feature.get("isIcon")) return true;

  return false;
};

export const usePointOpacityEditor = (
  selectedFeature: Feature | null,
  map: Map | null,
  selectInteraction: Select | null,
  isEditing: boolean
): UsePointOpacityEditorReturn => {
  const [opacity, setOpacity] = useState<number>(DEFAULT_OPACITY);
  const [originalOpacity, setOriginalOpacity] = useState<number>(DEFAULT_OPACITY);
  const [isEditingOpacity, setIsEditingOpacity] = useState(false);

  // Check if selected feature supports opacity
  const supportsPointOpacity = useMemo(() => {
    return supportsOpacity(selectedFeature);
  }, [selectedFeature]);

  // Initialize opacity when feature changes
  useEffect(() => {
    if (selectedFeature && supportsOpacity(selectedFeature)) {
      const featureOpacity =
        selectedFeature.get("opacity") !== undefined
          ? selectedFeature.get("opacity")
          : DEFAULT_OPACITY;
      setOpacity(featureOpacity);
      setOriginalOpacity(featureOpacity);
    } else {
      setOpacity(DEFAULT_OPACITY);
      setOriginalOpacity(DEFAULT_OPACITY);
    }
    setIsEditingOpacity(false);
  }, [selectedFeature]);

  // Auto-set isEditingOpacity when entering/exiting edit mode
  useEffect(() => {
    if (isEditing && supportsPointOpacity) {
      setIsEditingOpacity(true);
    } else {
      setIsEditingOpacity(false);
    }
  }, [isEditing, supportsPointOpacity]);

  // Handle opacity editing mode - deselect feature when entering, restore when exiting
  useEffect(() => {
    if (!selectedFeature || !selectInteraction || !supportsPointOpacity) return;

    if (isEditingOpacity) {
      // Deselect feature to show actual styling without selection overlay
      selectInteraction.getFeatures().clear();
    } else {
      // Restore selection when exiting opacity editing
      const features = selectInteraction.getFeatures();
      if (!features.getArray().includes(selectedFeature)) {
        features.push(selectedFeature);
      }
    }
    // Note: No cleanup function - cleanup was causing stale closure issues
    // where the old selectedFeature would be re-added after Escape press
  }, [isEditingOpacity, selectedFeature, selectInteraction, supportsPointOpacity]);

  // Handle immediate opacity change with live preview
  const handleOpacityChange = useCallback(
    (newOpacity: number) => {
      setOpacity(newOpacity);
      if (selectedFeature) {
        selectedFeature.set("opacity", newOpacity);
        selectedFeature.changed();
        map?.render();
      }
    },
    [selectedFeature, map]
  );

  const resetToOriginal = useCallback(() => {
    setOpacity(originalOpacity);
    if (selectedFeature) {
      selectedFeature.set("opacity", originalOpacity);
      selectedFeature.changed();
      map?.render();
    }
  }, [selectedFeature, map, originalOpacity]);

  // Commit current value as new original (call on save)
  const commitOpacity = useCallback(() => {
    setOriginalOpacity(opacity);
  }, [opacity]);

  return {
    opacity,
    supportsPointOpacity,
    isEditingOpacity,
    handleOpacityChange,
    resetToOriginal,
    commitOpacity,
  };
};
