import { create } from 'zustand';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';

interface ClipboardState {
  features: Feature<Geometry>[];
  isCut: boolean;
  sourceIds: string[];
  lastCopyTime: number;
}

interface SelectionState {
  // State
  selectedFeature: Feature<Geometry> | null;
  selectedFeatures: Feature<Geometry>[];
  clipboard: ClipboardState;

  // Actions
  setSelectedFeature: (feature: Feature<Geometry> | null) => void;
  setSelectedFeatures: (features: Feature<Geometry>[]) => void;
  clearSelection: () => void;
  copy: (features: Feature<Geometry>[]) => void;
  cut: (features: Feature<Geometry>[]) => void;
  clearClipboard: () => void;
}

const getFeatureId = (feature: Feature<Geometry>): string => {
  return (feature as unknown as { ol_uid: string }).ol_uid || '';
};

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedFeature: null,
  selectedFeatures: [],
  clipboard: {
    features: [],
    isCut: false,
    sourceIds: [],
    lastCopyTime: 0,
  },

  setSelectedFeature: (feature) => set({ selectedFeature: feature }),
  setSelectedFeatures: (features) => set({ selectedFeatures: features }),
  clearSelection: () => set({ selectedFeature: null, selectedFeatures: [] }),

  copy: (features) =>
    set({
      clipboard: {
        features: features.map((f) => f.clone()),
        isCut: false,
        sourceIds: features.map(getFeatureId),
        lastCopyTime: Date.now(),
      },
    }),

  cut: (features) =>
    set({
      clipboard: {
        features: features.map((f) => f.clone()),
        isCut: true,
        sourceIds: features.map(getFeatureId),
        lastCopyTime: Date.now(),
      },
    }),

  clearClipboard: () =>
    set({
      clipboard: {
        features: [],
        isCut: false,
        sourceIds: [],
        lastCopyTime: 0,
      },
    }),
}));
