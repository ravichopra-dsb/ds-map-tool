import { create } from 'zustand'

type ActivePanel = 'features' | 'layers' | null

interface PanelStore {
  activePanel: ActivePanel
  openFeatures: () => void
  openLayers: () => void
  closePanel: () => void
  toggleToFeatures: () => void
  toggleToLayers: () => void
}

export const usePanelStore = create<PanelStore>()((set) => ({
  activePanel: null,

  openFeatures: () => set({ activePanel: 'features' }),
  openLayers: () => set({ activePanel: 'layers' }),
  closePanel: () => set({ activePanel: null }),

  toggleToFeatures: () => set({ activePanel: 'features' }),
  toggleToLayers: () => set({ activePanel: 'layers' }),
}))
