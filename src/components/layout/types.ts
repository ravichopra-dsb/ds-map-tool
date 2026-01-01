import type * as fabric from "fabric"

export type ToolType = 'select' | 'rect' | 'circle' | 'triangle' | 'line' | 'text' | 'pencil'

export interface LayoutToolbarProps {
  activeTool: ToolType
  onToolChange: (tool: ToolType) => void
  onDeleteSelected: () => void
  onClear: () => void
  onImportImage: () => void
  onSaveLayout: () => void
}

export interface LayoutCanvasProps {
  fabricRef: React.MutableRefObject<fabric.Canvas | null>
  activeTool: ToolType
  onToolChange: (tool: ToolType) => void
  onSelect: (object: fabric.FabricObject | null) => void
}

export interface LayoutPropertiesPanelProps {
  selectedObject: fabric.FabricObject | null
  onChange: (key: string, value: unknown) => void
}
