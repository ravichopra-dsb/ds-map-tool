import { useState, useEffect, useCallback, useMemo } from "react";
import type Map from "ol/Map";
import type Feature from "ol/Feature";
import type { Select } from "ol/interaction";
import {
  supportsCustomLineStyle,
  DEFAULT_LINE_STYLE,
} from "@/utils/featureTypeUtils";
import { getLegendById, type LegendType } from "@/tools/legendsConfig";

export interface UseLineStyleEditorReturn {
  // State
  lineColor: string;
  lineWidth: number;
  opacity: number;
  legendType: string | null;
  supportsLineStyle: boolean;
  isEditingLineStyle: boolean;

  // Actions
  handleColorChange: (color: string) => void;
  handleWidthChange: (width: number) => void;
  handleOpacityChange: (opacity: number) => void;
  handleLegendTypeChange: (legend: LegendType) => void;
  setLineColor: (color: string) => void;
  resetToOriginal: () => void;
  commitLineStyle: () => void;
}

export const useLineStyleEditor = (
  selectedFeature: Feature | null,
  map: Map | null,
  selectInteraction: Select | null,
  isEditing: boolean
): UseLineStyleEditorReturn => {
  const [lineColor, setLineColor] = useState<string>(DEFAULT_LINE_STYLE.color);
  const [lineWidth, setLineWidth] = useState<number>(DEFAULT_LINE_STYLE.width);
  const [opacity, setOpacity] = useState<number>(1);
  const [legendType, setLegendType] = useState<string | null>(null);
  const [originalLineColor, setOriginalLineColor] = useState<string>(
    DEFAULT_LINE_STYLE.color
  );
  const [originalLineWidth, setOriginalLineWidth] = useState<number>(
    DEFAULT_LINE_STYLE.width
  );
  const [originalOpacity, setOriginalOpacity] = useState<number>(1);
  const [originalLegendType, setOriginalLegendType] = useState<string | null>(null);
  const [isEditingLineStyle, setIsEditingLineStyle] = useState(false);

  // Check if selected feature supports custom line styling
  const supportsLineStyle = useMemo(() => {
    if (!selectedFeature) return false;
    return supportsCustomLineStyle(selectedFeature);
  }, [selectedFeature]);

  // Initialize line style when feature changes
  useEffect(() => {
    if (selectedFeature && supportsCustomLineStyle(selectedFeature)) {
      // For legend features, use the legend config's strokeColor as default
      let defaultColor: string = DEFAULT_LINE_STYLE.color;
      let defaultWidth: number = DEFAULT_LINE_STYLE.width;
      if (selectedFeature.get("islegends")) {
        const legendType = getLegendById(selectedFeature.get("legendType"));
        if (legendType) {
          if (legendType.style.strokeColor) defaultColor = legendType.style.strokeColor;
          if (legendType.style.strokeWidth) defaultWidth = legendType.style.strokeWidth;
        }
      }
      const color =
        selectedFeature.get("lineColor") || defaultColor;
      const width =
        selectedFeature.get("lineWidth") || defaultWidth;
      const featureOpacity =
        selectedFeature.get("opacity") !== undefined
          ? selectedFeature.get("opacity")
          : 1;
      const featureLegendType = selectedFeature.get("legendType") || null;
      setLineColor(color);
      setLineWidth(width);
      setOpacity(featureOpacity);
      setLegendType(featureLegendType);
      setOriginalLineColor(color);
      setOriginalLineWidth(width);
      setOriginalOpacity(featureOpacity);
      setOriginalLegendType(featureLegendType);
    } else {
      setLineColor(DEFAULT_LINE_STYLE.color);
      setLineWidth(DEFAULT_LINE_STYLE.width);
      setOpacity(1);
      setLegendType(null);
      setOriginalLineColor(DEFAULT_LINE_STYLE.color);
      setOriginalLineWidth(DEFAULT_LINE_STYLE.width);
      setOriginalOpacity(1);
      setOriginalLegendType(null);
    }
    setIsEditingLineStyle(false);
  }, [selectedFeature]);

  // Auto-set isEditingLineStyle when entering/exiting edit mode
  useEffect(() => {
    if (isEditing && supportsLineStyle) {
      setIsEditingLineStyle(true);
    } else {
      setIsEditingLineStyle(false);
    }
  }, [isEditing, supportsLineStyle]);

  // Handle line style editing mode - deselect feature when entering, restore when exiting
  useEffect(() => {
    if (!selectedFeature || !selectInteraction || !supportsLineStyle) return;

    if (isEditingLineStyle) {
      // Deselect feature to show actual styling without selection overlay
      selectInteraction.getFeatures().clear();
    } else {
      // Restore selection when exiting line style editing
      const features = selectInteraction.getFeatures();
      if (!features.getArray().includes(selectedFeature)) {
        features.push(selectedFeature);
      }
    }
    // Note: No cleanup function - cleanup was causing stale closure issues
    // where the old selectedFeature would be re-added after Escape press
  }, [isEditingLineStyle, selectedFeature, selectInteraction, supportsLineStyle]);

  // Handle immediate line color change with live preview
  const handleColorChange = useCallback(
    (color: string) => {
      setLineColor(color);
      if (selectedFeature) {
        selectedFeature.set("lineColor", color);
        selectedFeature.changed();
        map?.render();
      }
    },
    [selectedFeature, map]
  );

  // Handle dropdown color selection
  const setLineColorHandler = useCallback(
    (color: string) => {
      setLineColor(color);
      if (selectedFeature) {
        selectedFeature.set("lineColor", color);
        selectedFeature.changed();
        map?.render();
      }
    },
    [selectedFeature, map]
  );

  // Handle immediate line width change with live preview
  const handleWidthChange = useCallback(
    (width: number) => {
      setLineWidth(width);
      if (selectedFeature) {
        selectedFeature.set("lineWidth", width);
        selectedFeature.changed();
        map?.render();
      }
    },
    [selectedFeature, map]
  );

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

  // Handle legend type change with live preview
  const handleLegendTypeChange = useCallback(
    (legend: LegendType) => {
            setLegendType(legend.id);
      if (selectedFeature) {
        selectedFeature.set("legendType", legend.id);
        selectedFeature.set("islegends", true);
        // Update color/width from the new legend's defaults
        if (legend.style.strokeColor) {
          setLineColor(legend.style.strokeColor);
          selectedFeature.set("lineColor", legend.style.strokeColor);
        }
        if (legend.style.strokeWidth) {
          setLineWidth(legend.style.strokeWidth);
          selectedFeature.set("lineWidth", legend.style.strokeWidth);
        }
        selectedFeature.changed();
        map?.render();
      }
    },
    [selectedFeature, map]
  );

  const resetToOriginal = useCallback(() => {
    setLineColor(originalLineColor);
    setLineWidth(originalLineWidth);
    setOpacity(originalOpacity);
    setLegendType(originalLegendType);
    if (selectedFeature) {
      selectedFeature.set("lineColor", originalLineColor);
      selectedFeature.set("lineWidth", originalLineWidth);
      selectedFeature.set("opacity", originalOpacity);
      if (originalLegendType) {
        selectedFeature.set("legendType", originalLegendType);
      }
      selectedFeature.changed();
      map?.render();
    }
  }, [selectedFeature, map, originalLineColor, originalLineWidth, originalOpacity, originalLegendType]);

  // Commit current values as new originals (call on save)
  const commitLineStyle = useCallback(() => {
    setOriginalLineColor(lineColor);
    setOriginalLineWidth(lineWidth);
    setOriginalOpacity(opacity);
    setOriginalLegendType(legendType);
  }, [lineColor, lineWidth, opacity, legendType, selectedFeature]);

  return {
    lineColor,
    lineWidth,
    opacity,
    legendType,
    supportsLineStyle,
    isEditingLineStyle,
    handleColorChange,
    handleWidthChange,
    handleOpacityChange,
    handleLegendTypeChange,
    setLineColor: setLineColorHandler,
    resetToOriginal,
    commitLineStyle,
  };
};
