import { useState, useEffect, useCallback, useMemo } from "react";
import type Map from "ol/Map";
import type Feature from "ol/Feature";
import type { Point } from "ol/geom";
import type { Select } from "ol/interaction";
import { toLonLat, fromLonLat } from "ol/proj";
import { DEFAULT_TEXT_STYLE } from "@/utils/featureTypeUtils";

export type TextAlign = 'left' | 'center' | 'right';

export interface UseTextStyleEditorReturn {
  // State
  text: string;
  textScale: number;
  textRotation: number;
  textOpacity: number;
  textFillColor: string;
  textStrokeColor: string;
  textAlign: TextAlign;
  longitude: string;
  latitude: string;
  supportsTextStyle: boolean;
  isEditingTextStyle: boolean;

  // Actions
  handleTextChange: (text: string) => void;
  handleScaleChange: (scale: number) => void;
  handleRotationChange: (rotation: number) => void;
  handleOpacityChange: (opacity: number) => void;
  handleFillColorChange: (color: string) => void;
  handleStrokeColorChange: (color: string) => void;
  handleTextAlignChange: (align: TextAlign) => void;
  handleLongitudeChange: (lon: string) => void;
  handleLatitudeChange: (lat: string) => void;
  resetToOriginal: () => void;
  commitTextStyle: () => void;
}

export const useTextStyleEditor = (
  selectedFeature: Feature | null,
  map: Map | null,
  selectInteraction: Select | null,
  isEditing: boolean
): UseTextStyleEditorReturn => {
  // Current values
  const [text, setText] = useState<string>("");
  const [textScale, setTextScale] = useState<number>(1);
  const [textRotation, setTextRotation] = useState<number>(0);
  const [textOpacity, setTextOpacity] = useState<number>(1);
  const [textFillColor, setTextFillColor] = useState<string>(
    DEFAULT_TEXT_STYLE.fillColor
  );
  const [textStrokeColor, setTextStrokeColor] = useState<string>(
    DEFAULT_TEXT_STYLE.strokeColor
  );
  const [textAlign, setTextAlign] = useState<TextAlign>("center");
  const [longitude, setLongitude] = useState<string>("");
  const [latitude, setLatitude] = useState<string>("");

  // Original values for reset
  const [originalText, setOriginalText] = useState<string>("");
  const [originalScale, setOriginalScale] = useState<number>(1);
  const [originalRotation, setOriginalRotation] = useState<number>(0);
  const [originalOpacity, setOriginalOpacity] = useState<number>(1);
  const [originalFillColor, setOriginalFillColor] = useState<string>(
    DEFAULT_TEXT_STYLE.fillColor
  );
  const [originalStrokeColor, setOriginalStrokeColor] = useState<string>(
    DEFAULT_TEXT_STYLE.strokeColor
  );
  const [originalTextAlign, setOriginalTextAlign] = useState<TextAlign>("center");
  const [originalLongitude, setOriginalLongitude] = useState<string>("");
  const [originalLatitude, setOriginalLatitude] = useState<string>("");

  const [isEditingTextStyle, setIsEditingTextStyle] = useState(false);

  // Check if selected feature is a text feature
  const supportsTextStyle = useMemo(() => {
    if (!selectedFeature) return false;
    return selectedFeature.get("isText") === true;
  }, [selectedFeature]);

  // Initialize text style when feature changes
  useEffect(() => {
    if (selectedFeature && selectedFeature.get("isText")) {
      const featureText = selectedFeature.get("text") || "";
      const scale = Number(selectedFeature.get("textScale")) || 1;
      const rotation = Number(selectedFeature.get("textRotation")) || 0;
      const opacity = selectedFeature.get("textOpacity") != null ? Number(selectedFeature.get("textOpacity")) : 1;
      const fillColor =
        selectedFeature.get("textFillColor") || DEFAULT_TEXT_STYLE.fillColor;
      const strokeColor =
        selectedFeature.get("textStrokeColor") || DEFAULT_TEXT_STYLE.strokeColor;
      const align = (selectedFeature.get("textAlign") as TextAlign) || "center";

      // Get coordinates from geometry
      const geometry = selectedFeature.getGeometry() as Point | undefined;
      let lon = "";
      let lat = "";
      if (geometry && geometry.getType() === "Point") {
        const coords = geometry.getCoordinates();
        const lonLat = toLonLat(coords);
        lon = lonLat[0].toFixed(6);
        lat = lonLat[1].toFixed(6);
      }

      setText(featureText);
      setTextScale(scale);
      setTextRotation(rotation);
      setTextOpacity(opacity);
      setTextFillColor(fillColor);
      setTextStrokeColor(strokeColor);
      setTextAlign(align);
      setLongitude(lon);
      setLatitude(lat);

      setOriginalText(featureText);
      setOriginalScale(scale);
      setOriginalRotation(rotation);
      setOriginalOpacity(opacity);
      setOriginalFillColor(fillColor);
      setOriginalStrokeColor(strokeColor);
      setOriginalTextAlign(align);
      setOriginalLongitude(lon);
      setOriginalLatitude(lat);
    } else {
      setText("");
      setTextScale(1);
      setTextRotation(0);
      setTextOpacity(1);
      setTextFillColor(DEFAULT_TEXT_STYLE.fillColor);
      setTextStrokeColor(DEFAULT_TEXT_STYLE.strokeColor);
      setTextAlign("center");
      setLongitude("");
      setLatitude("");

      setOriginalText("");
      setOriginalScale(1);
      setOriginalRotation(0);
      setOriginalOpacity(1);
      setOriginalFillColor(DEFAULT_TEXT_STYLE.fillColor);
      setOriginalStrokeColor(DEFAULT_TEXT_STYLE.strokeColor);
      setOriginalTextAlign("center");
      setOriginalLongitude("");
      setOriginalLatitude("");
    }
    setIsEditingTextStyle(false);
  }, [selectedFeature]);

  // Auto-set isEditingTextStyle when entering/exiting edit mode
  useEffect(() => {
    if (isEditing && supportsTextStyle) {
      setIsEditingTextStyle(true);
    } else {
      setIsEditingTextStyle(false);
    }
  }, [isEditing, supportsTextStyle]);

  // Handle text style editing mode - deselect feature when entering, restore when exiting
  useEffect(() => {
    if (!selectedFeature || !selectInteraction || !supportsTextStyle) return;

    if (isEditingTextStyle) {
      // Deselect feature to show actual styling without selection overlay
      selectInteraction.getFeatures().clear();
    } else {
      // Restore selection when exiting text style editing
      const features = selectInteraction.getFeatures();
      if (!features.getArray().includes(selectedFeature)) {
        features.push(selectedFeature);
      }
    }
  }, [isEditingTextStyle, selectedFeature, selectInteraction, supportsTextStyle]);

  // Handle text content change with live preview
  const handleTextChange = useCallback(
    (newText: string) => {
      setText(newText);
      if (selectedFeature) {
        selectedFeature.set("text", newText);
        selectedFeature.changed();
        map?.render();
      }
    },
    [selectedFeature, map]
  );

  // Handle scale change with live preview
  const handleScaleChange = useCallback(
    (scale: number) => {
      setTextScale(scale);
      if (selectedFeature) {
        selectedFeature.set("textScale", scale);
        selectedFeature.changed();
        map?.render();
      }
    },
    [selectedFeature, map]
  );

  // Handle rotation change with live preview
  const handleRotationChange = useCallback(
    (rotation: number) => {
      setTextRotation(rotation);
      if (selectedFeature) {
        selectedFeature.set("textRotation", rotation);
        selectedFeature.changed();
        map?.render();
      }
    },
    [selectedFeature, map]
  );

  // Handle opacity change with live preview
  const handleOpacityChange = useCallback(
    (opacity: number) => {
      setTextOpacity(opacity);
      if (selectedFeature) {
        selectedFeature.set("textOpacity", opacity);
        selectedFeature.changed();
        map?.render();
      }
    },
    [selectedFeature, map]
  );

  // Handle fill color change with live preview
  const handleFillColorChange = useCallback(
    (color: string) => {
      setTextFillColor(color);
      if (selectedFeature) {
        selectedFeature.set("textFillColor", color);
        selectedFeature.changed();
        map?.render();
      }
    },
    [selectedFeature, map]
  );

  // Handle stroke color change with live preview
  const handleStrokeColorChange = useCallback(
    (color: string) => {
      setTextStrokeColor(color);
      if (selectedFeature) {
        selectedFeature.set("textStrokeColor", color);
        selectedFeature.changed();
        map?.render();
      }
    },
    [selectedFeature, map]
  );

  // Handle text align change with live preview
  const handleTextAlignChange = useCallback(
    (align: TextAlign) => {
      setTextAlign(align);
      if (selectedFeature) {
        selectedFeature.set("textAlign", align);
        selectedFeature.changed();
        map?.render();
      }
    },
    [selectedFeature, map]
  );

  // Handle longitude change
  const handleLongitudeChange = useCallback(
    (lon: string) => {
      setLongitude(lon);
      if (selectedFeature) {
        const lonNum = parseFloat(lon);
        const latNum = parseFloat(latitude);
        if (!isNaN(lonNum) && !isNaN(latNum)) {
          const geometry = selectedFeature.getGeometry() as Point | undefined;
          if (geometry && geometry.getType() === "Point") {
            const newCoords = fromLonLat([lonNum, latNum]);
            geometry.setCoordinates(newCoords);
            selectedFeature.changed();
            map?.render();
          }
        }
      }
    },
    [selectedFeature, map, latitude]
  );

  // Handle latitude change
  const handleLatitudeChange = useCallback(
    (lat: string) => {
      setLatitude(lat);
      if (selectedFeature) {
        const lonNum = parseFloat(longitude);
        const latNum = parseFloat(lat);
        if (!isNaN(lonNum) && !isNaN(latNum)) {
          const geometry = selectedFeature.getGeometry() as Point | undefined;
          if (geometry && geometry.getType() === "Point") {
            const newCoords = fromLonLat([lonNum, latNum]);
            geometry.setCoordinates(newCoords);
            selectedFeature.changed();
            map?.render();
          }
        }
      }
    },
    [selectedFeature, map, longitude]
  );

  // Reset to original values
  const resetToOriginal = useCallback(() => {
    setText(originalText);
    setTextScale(originalScale);
    setTextRotation(originalRotation);
    setTextOpacity(originalOpacity);
    setTextFillColor(originalFillColor);
    setTextStrokeColor(originalStrokeColor);
    setTextAlign(originalTextAlign);
    setLongitude(originalLongitude);
    setLatitude(originalLatitude);

    if (selectedFeature) {
      selectedFeature.set("text", originalText);
      selectedFeature.set("textScale", originalScale);
      selectedFeature.set("textRotation", originalRotation);
      selectedFeature.set("textOpacity", originalOpacity);
      selectedFeature.set("textFillColor", originalFillColor);
      selectedFeature.set("textStrokeColor", originalStrokeColor);
      selectedFeature.set("textAlign", originalTextAlign);

      // Reset coordinates
      const lonNum = parseFloat(originalLongitude);
      const latNum = parseFloat(originalLatitude);
      if (!isNaN(lonNum) && !isNaN(latNum)) {
        const geometry = selectedFeature.getGeometry() as Point | undefined;
        if (geometry && geometry.getType() === "Point") {
          const newCoords = fromLonLat([lonNum, latNum]);
          geometry.setCoordinates(newCoords);
        }
      }

      selectedFeature.changed();
      map?.render();
    }
  }, [
    selectedFeature,
    map,
    originalText,
    originalScale,
    originalRotation,
    originalOpacity,
    originalFillColor,
    originalStrokeColor,
    originalTextAlign,
    originalLongitude,
    originalLatitude,
  ]);

  // Commit current values as new originals (call on save)
  const commitTextStyle = useCallback(() => {
    setOriginalText(text);
    setOriginalScale(textScale);
    setOriginalRotation(textRotation);
    setOriginalOpacity(textOpacity);
    setOriginalFillColor(textFillColor);
    setOriginalStrokeColor(textStrokeColor);
    setOriginalTextAlign(textAlign);
    setOriginalLongitude(longitude);
    setOriginalLatitude(latitude);
  }, [text, textScale, textRotation, textOpacity, textFillColor, textStrokeColor, textAlign, longitude, latitude]);

  return {
    text,
    textScale,
    textRotation,
    textOpacity,
    textFillColor,
    textStrokeColor,
    textAlign,
    longitude,
    latitude,
    supportsTextStyle,
    isEditingTextStyle,
    handleTextChange,
    handleScaleChange,
    handleRotationChange,
    handleOpacityChange,
    handleFillColorChange,
    handleStrokeColorChange,
    handleTextAlignChange,
    handleLongitudeChange,
    handleLatitudeChange,
    resetToOriginal,
    commitTextStyle,
  };
};
