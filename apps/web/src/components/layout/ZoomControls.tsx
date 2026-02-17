import { Minus, Plus } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { ZoomControlsProps } from "./types"

const MIN_ZOOM = 10
const MAX_ZOOM = 200
const ZOOM_STEP = 10

export function ZoomControls({ zoom, onZoomChange }: ZoomControlsProps) {
  const handleZoomIn = () => {
    onZoomChange(Math.min(zoom + ZOOM_STEP, MAX_ZOOM))
  }

  const handleZoomOut = () => {
    onZoomChange(Math.max(zoom - ZOOM_STEP, MIN_ZOOM))
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20">
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-full px-4 py-2 shadow-lg flex items-center gap-3">
        {/* Zoom Out Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleZoomOut}
              disabled={zoom <= MIN_ZOOM}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Minus className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Zoom Out</TooltipContent>
        </Tooltip>

        {/* Zoom Slider */}
        <div className="w-32 flex items-center">
          <Slider
            value={[zoom]}
            onValueChange={([value]) => onZoomChange(value)}
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={1}
            className="w-full"
          />
        </div>

        {/* Zoom In Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleZoomIn}
              disabled={zoom >= MAX_ZOOM}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Zoom In</TooltipContent>
        </Tooltip>

        {/* Zoom Percentage */}
        <span className="text-sm font-medium min-w-[45px] text-center">
          {zoom}%
        </span>
      </div>
    </div>
  )
}
