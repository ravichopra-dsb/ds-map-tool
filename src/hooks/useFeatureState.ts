import { useState } from "react";
import { Feature } from "ol";
import type { Geometry } from "ol/geom";

export interface UseFeatureStateReturn {
  selectedFeature: Feature<Geometry> | null;
  setSelectedFeature: (feature: Feature<Geometry> | null) => void;
}

export const useFeatureState = (): UseFeatureStateReturn => {
  const [selectedFeature, setSelectedFeature] = useState<Feature<Geometry> | null>(
    null
  );

  return {
    selectedFeature,
    setSelectedFeature,
  };
};