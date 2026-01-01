import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Layout {
  id: string
  name: string
  canvasData: object // Fabric.js JSON data
  previewImage: string // Base64 data URL with transparent background
  createdAt: number
  updatedAt: number
}

interface LayoutStore {
  layouts: Layout[]
  addLayout: (layout: Omit<Layout, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateLayout: (id: string, data: Partial<Omit<Layout, 'id' | 'createdAt'>>) => void
  deleteLayout: (id: string) => void
  getLayout: (id: string) => Layout | undefined
}

const generateId = () => `layout_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

export const useLayoutStore = create<LayoutStore>()(
  persist(
    (set, get) => ({
      layouts: [],

      addLayout: (layout) => {
        const id = generateId()
        const now = Date.now()
        const newLayout: Layout = {
          ...layout,
          id,
          createdAt: now,
          updatedAt: now,
        }
        set((state) => ({ layouts: [...state.layouts, newLayout] }))
        return id
      },

      updateLayout: (id, data) => {
        set((state) => ({
          layouts: state.layouts.map((layout) =>
            layout.id === id
              ? { ...layout, ...data, updatedAt: Date.now() }
              : layout
          ),
        }))
      },

      deleteLayout: (id) => {
        set((state) => ({
          layouts: state.layouts.filter((layout) => layout.id !== id),
        }))
      },

      getLayout: (id) => {
        return get().layouts.find((layout) => layout.id === id)
      },
    }),
    {
      name: 'layout-storage',
    }
  )
)
