import { useState, useEffect, useCallback, useMemo } from "react";
import type Map from "ol/Map";
import type Feature from "ol/Feature";
import type { Select } from "ol/interaction";
import type { Polygon } from "ol/geom";
import {
  generateRevisionCloudCoordinates,
  REVISION_CLOUD_CONFIG,
} from "@/utils/revisionCloudUtils";

export interface UseShapeStyleEditorReturn {
  // State
  strokeColor: string;
  strokeWidth: number;
  strokeOpacity: number;
  fillColor: string;
  fillOpacity: number;
  bulgeRatio: number;
  supportsShapeStyle: boolean;
  isRevisionCloud: boolean;
  isEditingShapeStyle: boolean;

  // Actions
  handleStrokeColorChange: (color: string) => void;
  handleStrokeWidthChange: (width: number) => void;
  handleStrokeOpacityChange: (opacity: number) => void;
  handleFillColorChange: (color: string) => void;
  handleFillOpacityChange: (opacity: number) => void;
  handleBulgeRatioChange: (ratio: number) => void;
  setStrokeColor: (color: string) => void;
  setFillColor: (color: string) => void;
  resetToOriginal: () => void;
  commitShapeStyle: () => void;
}

const DEFAULT_STROKE_COLOR = "#000000";
const DEFAULT_STROKE_WIDTH = 2;
const DEFAULT_STROKE_OPACITY = 1;
const DEFAULT_FILL_COLOR = "#ffffff";
const DEFAULT_FILL_OPACITY = 0;
const DEFAULT_REVISION_CLOUD_COLOR = "#000000";
const DEFAULT_BULGE_RATIO = REVISION_CLOUD_CONFIG.bulgeRatio;

export const useShapeStyleEditor = (
  selectedFeature: Feature | null,
  map: Map | null,
  selectInteraction: Select | null,
  isEditing: boolean
): UseShapeStyleEditorReturn => {
  const [strokeColor, setStrokeColor] = useState<string>(DEFAULT_STROKE_COLOR);
  const [strokeWidth, setStrokeWidth] = useState<number>(DEFAULT_STROKE_WIDTH);
  const [strokeOpacity, setStrokeOpacity] = useState<number>(DEFAULT_STROKE_OPACITY);
  const [fillColor, setFillColor] = useState<string>(DEFAULT_FILL_COLOR);
  const [fillOpacity, setFillOpacity] = useState<number>(DEFAULT_FILL_OPACITY);
  const [bulgeRatio, setBulgeRatio] = useState<number>(DEFAULT_BULGE_RATIO);

  const [originalStrokeColor, setOriginalStrokeColor] = useState<string>(
    DEFAULT_STROKE_COLOR
  );
  const [originalStrokeWidth, setOriginalStrokeWidth] = useState<number>(
    DEFAULT_STROKE_WIDTH
  );
  const [originalStrokeOpacity, setOriginalStrokeOpacity] = useState<number>(
    DEFAULT_STROKE_OPACITY
  );
  const [originalFillColor, setOriginalFillColor] = useState<string>(
    DEFAULT_FILL_COLOR
  );
  const [originalFillOpacity, setOriginalFillOpacity] = useState<number>(
    DEFAULT_FILL_OPACITY
  );
  const [originalBulgeRatio, setOriginalBulgeRatio] = useState<number>(
    DEFAULT_BULGE_RATIO
  );
  const [isEditingShapeStyle, setIsEditingShapeStyle] = useState(false);

  // Check if selected feature is a Box, Circle, or RevisionCloud
  const supportsShapeStyle = useMemo(() => {
    if (!selectedFeature) return false;
    return (
      selectedFeature.get("isBox") ||
      selectedFeature.get("isCircle") ||
      selectedFeature.get("isRevisionCloud")
    );
  }, [selectedFeature]);

  // Check if selected feature is a RevisionCloud (for conditional UI)
  const isRevisionCloud = useMemo(() => {
    if (!selectedFeature) return false;
    return !!selectedFeature.get("isRevisionCloud");
  }, [selectedFeature]);

  // Initialize shape style when feature changes
  useEffect(() => {
    if (selectedFeature && supportsShapeStyle) {
      // Use green as default for RevisionCloud, black for others
      const defaultColor = selectedFeature.get("isRevisionCloud")
        ? DEFAULT_REVISION_CLOUD_COLOR
        : DEFAULT_STROKE_COLOR;
      const featureStrokeColor =
        selectedFeature.get("strokeColor") || defaultColor;
      const featureStrokeWidth =
        selectedFeature.get("strokeWidth") !== undefined
          ? selectedFeature.get("strokeWidth")
          : DEFAULT_STROKE_WIDTH;
      const featureStrokeOpacity =
        selectedFeature.get("strokeOpacity") !== undefined
          ? selectedFeature.get("strokeOpacity")
          : DEFAULT_STROKE_OPACITY;
      const featureFillColor =
        selectedFeature.get("fillColor") || DEFAULT_FILL_COLOR;
      const featureFillOpacity =
        selectedFeature.get("fillOpacity") !== undefined
          ? selectedFeature.get("fillOpacity")
          : DEFAULT_FILL_OPACITY;
      const rawBulgeRatio = selectedFeature.get("bulgeRatio");
      const featureBulgeRatio =
        typeof rawBulgeRatio === "number"
          ? rawBulgeRatio
          : typeof rawBulgeRatio === "string" && !isNaN(parseFloat(rawBulgeRatio))
            ? parseFloat(rawBulgeRatio)
            : DEFAULT_BULGE_RATIO;

      setStrokeColor(featureStrokeColor);
      setStrokeWidth(featureStrokeWidth);
      setStrokeOpacity(featureStrokeOpacity);
      setFillColor(featureFillColor);
      setFillOpacity(featureFillOpacity);
      setBulgeRatio(featureBulgeRatio);
      setOriginalStrokeColor(featureStrokeColor);
      setOriginalStrokeWidth(featureStrokeWidth);
      setOriginalStrokeOpacity(featureStrokeOpacity);
      setOriginalFillColor(featureFillColor);
      setOriginalFillOpacity(featureFillOpacity);
      setOriginalBulgeRatio(featureBulgeRatio);
    } else {
      setStrokeColor(DEFAULT_STROKE_COLOR);
      setStrokeWidth(DEFAULT_STROKE_WIDTH);
      setStrokeOpacity(DEFAULT_STROKE_OPACITY);
      setFillColor(DEFAULT_FILL_COLOR);
      setFillOpacity(DEFAULT_FILL_OPACITY);
      setBulgeRatio(DEFAULT_BULGE_RATIO);
      setOriginalStrokeColor(DEFAULT_STROKE_COLOR);
      setOriginalStrokeWidth(DEFAULT_STROKE_WIDTH);
      setOriginalStrokeOpacity(DEFAULT_STROKE_OPACITY);
      setOriginalFillColor(DEFAULT_FILL_COLOR);
      setOriginalFillOpacity(DEFAULT_FILL_OPACITY);
      setOriginalBulgeRatio(DEFAULT_BULGE_RATIO);
    }
    setIsEditingShapeStyle(false);
  }, [selectedFeature, supportsShapeStyle]);

  // Auto-set isEditingShapeStyle when entering/exiting edit mode
  useEffect(() => {
    if (isEditing && supportsShapeStyle) {
      setIsEditingShapeStyle(true);
    } else {
      setIsEditingShapeStyle(false);
    }
  }, [isEditing, supportsShapeStyle]);

  // Handle shape style editing mode - deselect feature when entering, restore when exiting
  useEffect(() => {
    if (!selectedFeature || !selectInteraction || !supportsShapeStyle) return;

    if (isEditingShapeStyle) {
      // Deselect feature to show actual styling without selection overlay
      selectInteraction.getFeatures().clear();
    } else {
      // Restore selection when exiting shape style editing
      const features = selectInteraction.getFeatures();
      if (!features.getArray().includes(selectedFeature)) {
        features.push(selectedFeature);
      }
    }
    // Note: No cleanup function - cleanup was causing stale closure issues
    // where the old selectedFeature would be re-added after Escape press
  }, [isEditingShapeStyle, selectedFeature, selectInteraction, supportsShapeStyle]);

  // Handle immediate stroke color change with live preview
  const handleStrokeColorChange = useCallback(
    (color: string) => {
      setStrokeColor(color);
      if (selectedFeature) {
        selectedFeature.set("strokeColor", color);
        selectedFeature.changed();
        map?.render();
      }
    },
    [selectedFeature, map]
  );

  // Handle immediate stroke width change with live preview
  const handleStrokeWidthChange = useCallback(
    (width: number) => {
      setStrokeWidth(width);
      if (selectedFeature) {
        selectedFeature.set("strokeWidth", width);
        selectedFeature.changed();
        map?.render();
      }
    },
    [selectedFeature, map]
  );

  // Handle immediate stroke opacity change with live preview
  const handleStrokeOpacityChange = useCallback(
    (opacity: number) => {
      setStrokeOpacity(opacity);
      if (selectedFeature) {
        selectedFeature.set("strokeOpacity", opacity);
        selectedFeature.changed();
        map?.render();
      }
    },
    [selectedFeature, map]
  );

  // Handle immediate fill color change with live preview
  const handleFillColorChange = useCallback(
    (color: string) => {
      setFillColor(color);
      if (selectedFeature) {
        selectedFeature.set("fillColor", color);
        selectedFeature.changed();
        map?.render();
      }
    },
    [selectedFeature, map]
  );

  // Handle immediate fill opacity change with live preview
  const handleFillOpacityChange = useCallback(
    (opacity: number) => {
      setFillOpacity(opacity);
      if (selectedFeature) {
        selectedFeature.set("fillOpacity", opacity);
        selectedFeature.changed();
        map?.render();
      }
    },
    [selectedFeature, map]
  );

  // Handle bulge ratio change with live preview (regenerates cloud geometry)
  const handleBulgeRatioChange = useCallback(
    (ratio: number) => {
      setBulgeRatio(ratio);
      if (selectedFeature && selectedFeature.get("isRevisionCloud")) {
        selectedFeature.set("bulgeRatio", ratio);

        // Regenerate cloud geometry from original path
        const originalPathStr = selectedFeature.get("originalPath");
        if (originalPathStr) {
          const originalPath = JSON.parse(originalPathStr) as number[][];
          const scallopRadius =
            selectedFeature.get("scallopRadius") ||
            REVISION_CLOUD_CONFIG.defaultScallopRadius;
          const newCloudCoords = generateRevisionCloudCoordinates(
            originalPath,
            scallopRadius,
            ratio
          );
          const polygon = selectedFeature.getGeometry() as Polygon;
          polygon.setCoordinates([newCloudCoords]);
        }

        selectedFeature.changed();
        map?.render();
      }
    },
    [selectedFeature, map]
  );

  // Handle dropdown stroke color selection
  const setStrokeColorHandler = useCallback(
    (color: string) => {
      setStrokeColor(color);
      if (selectedFeature) {
        selectedFeature.set("strokeColor", color);
        selectedFeature.changed();
        map?.render();
      }
    },
    [selectedFeature, map]
  );

  // Handle dropdown fill color selection
  const setFillColorHandler = useCallback(
    (color: string) => {
      setFillColor(color);
      if (selectedFeature) {
        selectedFeature.set("fillColor", color);
        selectedFeature.changed();
        map?.render();
      }
    },
    [selectedFeature, map]
  );

  const resetToOriginal = useCallback(() => {
    setStrokeColor(originalStrokeColor);
    setStrokeWidth(originalStrokeWidth);
    setStrokeOpacity(originalStrokeOpacity);
    setFillColor(originalFillColor);
    setFillOpacity(originalFillOpacity);
    setBulgeRatio(originalBulgeRatio);
    if (selectedFeature) {
      selectedFeature.set("strokeColor", originalStrokeColor);
      selectedFeature.set("strokeWidth", originalStrokeWidth);
      selectedFeature.set("strokeOpacity", originalStrokeOpacity);
      selectedFeature.set("fillColor", originalFillColor);
      selectedFeature.set("fillOpacity", originalFillOpacity);

      // Restore original cloud geometry if revision cloud
      if (selectedFeature.get("isRevisionCloud")) {
        selectedFeature.set("bulgeRatio", originalBulgeRatio);
        const originalPathStr = selectedFeature.get("originalPath");
        if (originalPathStr) {
          const originalPath = JSON.parse(originalPathStr) as number[][];
          const scallopRadius =
            selectedFeature.get("scallopRadius") ||
            REVISION_CLOUD_CONFIG.defaultScallopRadius;
          const newCloudCoords = generateRevisionCloudCoordinates(
            originalPath,
            scallopRadius,
            originalBulgeRatio
          );
          const polygon = selectedFeature.getGeometry() as Polygon;
          polygon.setCoordinates([newCloudCoords]);
        }
      }

      selectedFeature.changed();
      map?.render();
    }
  }, [selectedFeature, map, originalStrokeColor, originalStrokeWidth, originalStrokeOpacity, originalFillColor, originalFillOpacity, originalBulgeRatio]);

  // Commit current values as new originals (call on save)
  const commitShapeStyle = useCallback(() => {
    setOriginalStrokeColor(strokeColor);
    setOriginalStrokeWidth(strokeWidth);
    setOriginalStrokeOpacity(strokeOpacity);
    setOriginalFillColor(fillColor);
    setOriginalFillOpacity(fillOpacity);
    setOriginalBulgeRatio(bulgeRatio);
  }, [strokeColor, strokeWidth, strokeOpacity, fillColor, fillOpacity, bulgeRatio]);

  return {
    strokeColor,
    strokeWidth,
    strokeOpacity,
    fillColor,
    fillOpacity,
    bulgeRatio,
    supportsShapeStyle,
    isRevisionCloud,
    isEditingShapeStyle,
    handleStrokeColorChange,
    handleStrokeWidthChange,
    handleStrokeOpacityChange,
    handleFillColorChange,
    handleFillOpacityChange,
    handleBulgeRatioChange,
    setStrokeColor: setStrokeColorHandler,
    setFillColor: setFillColorHandler,
    resetToOriginal,
    commitShapeStyle,
  };
};
