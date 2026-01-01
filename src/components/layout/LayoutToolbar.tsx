import {
  MousePointer2,
  Square,
  Circle,
  Triangle,
  Minus,
  Type,
  Pencil,
  Trash2,
  Eraser,
  ImagePlus,
  Save,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { ToolType, LayoutToolbarProps } from "./types"

const tools: { id: ToolType; icon: React.ElementType; label: string; shortcut: string }[] = [
  { id: 'select', icon: MousePointer2, label: 'Selection', shortcut: 'V' },
  { id: 'rect', icon: Square, label: 'Rectangle', shortcut: 'R' },
  { id: 'circle', icon: Circle, label: 'Circle', shortcut: 'C' },
  { id: 'triangle', icon: Triangle, label: 'Triangle', shortcut: 'T' },
  { id: 'line', icon: Minus, label: 'Line', shortcut: 'L' },
  { id: 'pencil', icon: Pencil, label: 'Freehand', shortcut: 'P' },
  { id: 'text', icon: Type, label: 'Text', shortcut: 'A' },
]

export function LayoutToolbar({
  activeTool,
  onToolChange,
  onDeleteSelected,
  onClear,
  onImportImage,
  onSaveLayout,
}: LayoutToolbarProps) {
  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
      <div className="bg-background/80 backdrop-blur-sm border border-border p-2 rounded-2xl flex flex-col gap-1 shadow-lg">
        {tools.map((tool) => (
          <Tooltip key={tool.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onToolChange(tool.id)}
                className={cn(
                  "w-10 h-10 flex items-center justify-center rounded-xl transition-all",
                  "hover:bg-accent hover:text-accent-foreground",
                  activeTool === tool.id && "bg-primary text-primary-foreground"
                )}
              >
                <tool.icon className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{tool.label} <span className="text-muted-foreground ml-1">({tool.shortcut})</span></p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      <div className="bg-background/80 backdrop-blur-sm border border-border p-2 rounded-2xl flex flex-col gap-1 shadow-lg">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onImportImage}
              className="w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:bg-accent hover:text-accent-foreground"
            >
              <ImagePlus className="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Import Image (I)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onSaveLayout}
              className="w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:bg-green-500/10 hover:text-green-600"
            >
              <Save className="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Save Layout (Ctrl+S)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onDeleteSelected}
              className="w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Delete Selection (Del)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onClear}
              className="w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:bg-destructive/10 hover:text-destructive"
            >
              <Eraser className="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Clear Canvas</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
