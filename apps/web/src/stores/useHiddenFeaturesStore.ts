import { create } from 'zustand';

interface HiddenFeaturesState {
  // State - Set of hidden feature IDs (ol_uid)
  hiddenFeatureIds: Set<string>;

  // Actions
  toggleFeature: (featureId: string) => void;
  hideFeature: (featureId: string) => void;
  showFeature: (featureId: string) => void;
  isHidden: (featureId: string) => boolean;
  removeFeatureId: (featureId: string) => void;
  clearAll: () => void;
}

export const useHiddenFeaturesStore = create<HiddenFeaturesState>((set, get) => ({
  hiddenFeatureIds: new Set<string>(),

  toggleFeature: (featureId) =>
    set((state) => {
      const newSet = new Set(state.hiddenFeatureIds);
      if (newSet.has(featureId)) {
        newSet.delete(featureId);
      } else {
        newSet.add(featureId);
      }
      return { hiddenFeatureIds: newSet };
    }),

  hideFeature: (featureId) =>
    set((state) => {
      const newSet = new Set(state.hiddenFeatureIds);
      newSet.add(featureId);
      return { hiddenFeatureIds: newSet };
    }),

  showFeature: (featureId) =>
    set((state) => {
      const newSet = new Set(state.hiddenFeatureIds);
      newSet.delete(featureId);
      return { hiddenFeatureIds: newSet };
    }),

  isHidden: (featureId) => get().hiddenFeatureIds.has(featureId),

  removeFeatureId: (featureId) =>
    set((state) => {
      if (state.hiddenFeatureIds.has(featureId)) {
        const newSet = new Set(state.hiddenFeatureIds);
        newSet.delete(featureId);
        return { hiddenFeatureIds: newSet };
      }
      return state;
    }),

  clearAll: () => set({ hiddenFeatureIds: new Set<string>() }),
}));
