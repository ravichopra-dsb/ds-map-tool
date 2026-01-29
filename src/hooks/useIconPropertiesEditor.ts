import { useState, useEffect, useCallback, useMemo } from "react";
import type Map from "ol/Map";
import type Feature from "ol/Feature";
import type { Select } from "ol/interaction";

export interface UseIconPropertiesEditorReturn {
  // State
  opacity: number;
  iconScale: number;
  labelScale: number;
  textOffsetX: number;
  textOffsetY: number;
  rotation: number;
  supportsIconProperties: boolean;
  isEditingIconProperties: boolean;

  // Actions
  handleOpacityChange: (opacity: number) => void;
  handleIconScaleChange: (scale: number) => void;
  handleLabelScaleChange: (scale: number) => void;
  handleTextOffsetXChange: (offset: number) => void;
  handleTextOffsetYChange: (offset: number) => void;
  handleRotationChange: (rotation: number) => void;
  resetToOriginal: () => void;
  commitIconProperties: () => void;
}

const DEFAULT_OPACITY = 1;
const DEFAULT_ICON_SCALE = 1;
const DEFAULT_LABEL_SCALE = 1;
const DEFAULT_TEXT_OFFSET_X = 0;
const DEFAULT_TEXT_OFFSET_Y = 0;
const DEFAULT_ROTATION = 0;

/**
 * Check if a feature supports icon properties editing
 * Only Google Earth icons (isIcon) support all properties
 */
const supportsIconPropertiesEdit = (feature: Feature | null): boolean => {
  if (!feature) return false;

  // Only Google Earth icons from IconPickerDialog
  return feature.get("isIcon") === true;
};

export const useIconPropertiesEditor = (
  selectedFeature: Feature | null,
  map: Map | null,
  selectInteraction: Select | null,
  isEditing: boolean
): UseIconPropertiesEditorReturn => {
  // Current values
  const [opacity, setOpacity] = useState<number>(DEFAULT_OPACITY);
  const [iconScale, setIconScale] = useState<number>(DEFAULT_ICON_SCALE);
  const [labelScale, setLabelScale] = useState<number>(DEFAULT_LABEL_SCALE);
  const [textOffsetX, setTextOffsetX] = useState<number>(DEFAULT_TEXT_OFFSET_X);
  const [textOffsetY, setTextOffsetY] = useState<number>(DEFAULT_TEXT_OFFSET_Y);
  const [rotation, setRotation] = useState<number>(DEFAULT_ROTATION);

  // Original values for reset
  const [originalOpacity, setOriginalOpacity] = useState<number>(DEFAULT_OPACITY);
  const [originalIconScale, setOriginalIconScale] = useState<number>(DEFAULT_ICON_SCALE);
  const [originalLabelScale, setOriginalLabelScale] = useState<number>(DEFAULT_LABEL_SCALE);
  const [originalTextOffsetX, setOriginalTextOffsetX] = useState<number>(DEFAULT_TEXT_OFFSET_X);
  const [originalTextOffsetY, setOriginalTextOffsetY] = useState<number>(DEFAULT_TEXT_OFFSET_Y);
  const [originalRotation, setOriginalRotation] = useState<number>(DEFAULT_ROTATION);

  const [isEditingIconProperties, setIsEditingIconProperties] = useState(false);

  // Check if selected feature supports icon properties
  const supportsIconProperties = useMemo(() => {
    return supportsIconPropertiesEdit(selectedFeature);
  }, [selectedFeature]);

  // Initialize values when feature changes
  useEffect(() => {
    if (selectedFeature && supportsIconPropertiesEdit(selectedFeature)) {
      const featureOpacity = selectedFeature.get("opacity") ?? DEFAULT_OPACITY;
      const featureIconScale = selectedFeature.get("iconScale") ?? DEFAULT_ICON_SCALE;
      const featureLabelScale = selectedFeature.get("labelScale") ?? DEFAULT_LABEL_SCALE;
      const featureTextOffsetX = selectedFeature.get("textOffsetX") ?? DEFAULT_TEXT_OFFSET_X;
      const featureTextOffsetY = selectedFeature.get("textOffsetY") ?? DEFAULT_TEXT_OFFSET_Y;
      const featureRotation = selectedFeature.get("iconRotation") ?? DEFAULT_ROTATION;

      setOpacity(featureOpacity);
      setIconScale(featureIconScale);
      setLabelScale(featureLabelScale);
      setTextOffsetX(featureTextOffsetX);
      setTextOffsetY(featureTextOffsetY);
      setRotation(featureRotation);

      setOriginalOpacity(featureOpacity);
      setOriginalIconScale(featureIconScale);
      setOriginalLabelScale(featureLabelScale);
      setOriginalTextOffsetX(featureTextOffsetX);
      setOriginalTextOffsetY(featureTextOffsetY);
      setOriginalRotation(featureRotation);
    } else {
      setOpacity(DEFAULT_OPACITY);
      setIconScale(DEFAULT_ICON_SCALE);
      setLabelScale(DEFAULT_LABEL_SCALE);
      setTextOffsetX(DEFAULT_TEXT_OFFSET_X);
      setTextOffsetY(DEFAULT_TEXT_OFFSET_Y);
      setRotation(DEFAULT_ROTATION);

      setOriginalOpacity(DEFAULT_OPACITY);
      setOriginalIconScale(DEFAULT_ICON_SCALE);
      setOriginalLabelScale(DEFAULT_LABEL_SCALE);
      setOriginalTextOffsetX(DEFAULT_TEXT_OFFSET_X);
      setOriginalTextOffsetY(DEFAULT_TEXT_OFFSET_Y);
      setOriginalRotation(DEFAULT_ROTATION);
    }
    setIsEditingIconProperties(false);
  }, [selectedFeature]);

  // Auto-set editing mode when entering/exiting edit mode
  useEffect(() => {
    if (isEditing && supportsIconProperties) {
      setIsEditingIconProperties(true);
    } else {
      setIsEditingIconProperties(false);
    }
  }, [isEditing, supportsIconProperties]);

  // Handle editing mode - deselect feature when entering, restore when exiting
  useEffect(() => {
    if (!selectedFeature || !selectInteraction || !supportsIconProperties) return;

    if (isEditingIconProperties) {
      // Deselect feature to show actual styling without selection overlay
      selectInteraction.getFeatures().clear();
    } else {
      // Restore selection when exiting editing
      const features = selectInteraction.getFeatures();
      if (!features.getArray().includes(selectedFeature)) {
        features.push(selectedFeature);
      }
    }
    // Note: No cleanup function - cleanup was causing stale closure issues
    // where the old selectedFeature would be re-added after Escape press
  }, [isEditingIconProperties, selectedFeature, selectInteraction, supportsIconProperties]);

  // Handle opacity change with live preview
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

  // Handle icon scale change with live preview
  const handleIconScaleChange = useCallback(
    (newScale: number) => {
      setIconScale(newScale);
      if (selectedFeature) {
        selectedFeature.set("iconScale", newScale);
        selectedFeature.changed();
        map?.render();
      }
    },
    [selectedFeature, map]
  );

  // Handle label scale change with live preview
  const handleLabelScaleChange = useCallback(
    (newScale: number) => {
      setLabelScale(newScale);
      if (selectedFeature) {
        selectedFeature.set("labelScale", newScale);
        selectedFeature.changed();
        map?.render();
      }
    },
    [selectedFeature, map]
  );

  // Handle text offset X change with live preview
  const handleTextOffsetXChange = useCallback(
    (newOffset: number) => {
      setTextOffsetX(newOffset);
      if (selectedFeature) {
        selectedFeature.set("textOffsetX", newOffset);
        selectedFeature.changed();
        map?.render();
      }
    },
    [selectedFeature, map]
  );

  // Handle text offset Y change with live preview
  const handleTextOffsetYChange = useCallback(
    (newOffset: number) => {
      setTextOffsetY(newOffset);
      if (selectedFeature) {
        selectedFeature.set("textOffsetY", newOffset);
        selectedFeature.changed();
        map?.render();
      }
    },
    [selectedFeature, map]
  );

  // Handle rotation change with live preview
  const handleRotationChange = useCallback(
    (newRotation: number) => {
      setRotation(newRotation);
      if (selectedFeature) {
        selectedFeature.set("iconRotation", newRotation);
        selectedFeature.changed();
        map?.render();
      }
    },
    [selectedFeature, map]
  );

  // Reset all values to original
  const resetToOriginal = useCallback(() => {
    setOpacity(originalOpacity);
    setIconScale(originalIconScale);
    setLabelScale(originalLabelScale);
    setTextOffsetX(originalTextOffsetX);
    setTextOffsetY(originalTextOffsetY);
    setRotation(originalRotation);

    if (selectedFeature) {
      selectedFeature.set("opacity", originalOpacity);
      selectedFeature.set("iconScale", originalIconScale);
      selectedFeature.set("labelScale", originalLabelScale);
      selectedFeature.set("textOffsetX", originalTextOffsetX);
      selectedFeature.set("textOffsetY", originalTextOffsetY);
      selectedFeature.set("iconRotation", originalRotation);
      selectedFeature.changed();
      map?.render();
    }
  }, [selectedFeature, map, originalOpacity, originalIconScale, originalLabelScale, originalTextOffsetX, originalTextOffsetY, originalRotation]);

  // Commit current values as new originals (call on save)
  const commitIconProperties = useCallback(() => {
    setOriginalOpacity(opacity);
    setOriginalIconScale(iconScale);
    setOriginalLabelScale(labelScale);
    setOriginalTextOffsetX(textOffsetX);
    setOriginalTextOffsetY(textOffsetY);
    setOriginalRotation(rotation);
  }, [opacity, iconScale, labelScale, textOffsetX, textOffsetY, rotation]);

  return {
    opacity,
    iconScale,
    labelScale,
    textOffsetX,
    textOffsetY,
    rotation,
    supportsIconProperties,
    isEditingIconProperties,
    handleOpacityChange,
    handleIconScaleChange,
    handleLabelScaleChange,
    handleTextOffsetXChange,
    handleTextOffsetYChange,
    handleRotationChange,
    resetToOriginal,
    commitIconProperties,
  };
};
