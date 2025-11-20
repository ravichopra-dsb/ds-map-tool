import { useState } from "react";
import Feature from "ol/Feature";
import type { Geometry } from "ol/geom";

export interface ClipboardState {
  copiedFeatures: Feature<Geometry>[];
  isCutOperation: boolean;
  cutFeatureIds: string[]; // Track cut features for removal
  lastCopyTime: number;
}

export interface UseFeatureStateReturn {
  selectedFeature: Feature<Geometry> | null;
  setSelectedFeature: (feature: Feature<Geometry> | null) => void;
  clipboardState: ClipboardState;
  setCopiedFeatures: (features: Feature<Geometry>[], isCut?: boolean) => void;
  clearClipboard: () => void;
}

export const useFeatureState = (): UseFeatureStateReturn => {
  const [selectedFeature, setSelectedFeature] = useState<Feature<Geometry> | null>(
    null
  );

  const [clipboardState, setClipboardState] = useState<ClipboardState>({
    copiedFeatures: [],
    isCutOperation: false,
    cutFeatureIds: [],
    lastCopyTime: 0,
  });

  const setCopiedFeatures = (features: Feature<Geometry>[], isCut: boolean = false) => {
    const featureIds = features.map(f => (f as unknown as { ol_uid: string }).ol_uid || '');
    setClipboardState({
      copiedFeatures: features,
      isCutOperation: isCut,
      cutFeatureIds: isCut ? featureIds : [],
      lastCopyTime: Date.now(),
    });
  };

  const clearClipboard = () => {
    setClipboardState({
      copiedFeatures: [],
      isCutOperation: false,
      cutFeatureIds: [],
      lastCopyTime: 0,
    });
  };

  return {
    selectedFeature,
    setSelectedFeature,
    clipboardState,
    setCopiedFeatures,
    clearClipboard,
  };
};