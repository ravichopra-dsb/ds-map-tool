import type * as fabric from "fabric"

export type ToolType = 'select' | 'rect' | 'circle' | 'triangle' | 'line' | 'text' | 'pencil'

export type PageSize = 'A0' | 'A1' | 'A2' | 'A3' | 'A4' | 'A5'

export interface PageDimensions {
  width: number
  height: number
  label: string
}

// Page sizes in pixels at 72 DPI (standard for screen design)
export const PAGE_SIZES: Record<PageSize, PageDimensions> = {
  A0: { width: 2384, height: 3370, label: 'A0 (841 × 1189 mm)' },
  A1: { width: 1684, height: 2384, label: 'A1 (594 × 841 mm)' },
  A2: { width: 1191, height: 1684, label: 'A2 (420 × 594 mm)' },
  A3: { width: 842, height: 1191, label: 'A3 (297 × 420 mm)' },
  A4: { width: 595, height: 842, label: 'A4 (210 × 297 mm)' },
  A5: { width: 420, height: 595, label: 'A5 (148 × 210 mm)' },
}

export interface LayoutToolbarProps {
  activeTool: ToolType
  onToolChange: (tool: ToolType) => void
  onDeleteSelected: () => void
  onClear: () => void
  onImportImage: () => void
  onSaveLayout: () => void
  onDownloadPdf: () => void
  showSave?: boolean
}

export interface LayoutCanvasProps {
  fabricRef: React.MutableRefObject<fabric.Canvas | null>
  activeTool: ToolType
  onToolChange: (tool: ToolType) => void
  onSelect: (object: fabric.FabricObject | null) => void
  initialData?: object // Fabric.js JSON data to load on init
  pageSize: PageSize
  zoom: number
  onZoomChange: (zoom: number) => void
  backgroundImage?: string
}

export interface ZoomControlsProps {
  zoom: number
  onZoomChange: (zoom: number) => void
}

export interface LayoutPropertiesPanelProps {
  selectedObject: fabric.FabricObject | null
  onChange: (key: string, value: unknown) => void
}
