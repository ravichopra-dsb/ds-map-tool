import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Type as TypeIcon } from "lucide-react"
import type { LayoutPropertiesPanelProps } from "./types"

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#a855f7', '#ec4899', '#000000', '#ffffff'
]

export function LayoutPropertiesPanel({ selectedObject, onChange }: LayoutPropertiesPanelProps) {
  const [fill, setFill] = useState<string>('#000000')
  const [stroke, setStroke] = useState<string>('#000000')
  const [strokeWidth, setStrokeWidth] = useState<number>(1)
  const [opacity, setOpacity] = useState<number>(100)

  useEffect(() => {
    if (selectedObject) {
      setFill((selectedObject.fill as string) || '#000000')
      setStroke((selectedObject.stroke as string) || '#000000')
      setStrokeWidth(selectedObject.strokeWidth || 0)
      setOpacity((selectedObject.opacity || 1) * 100)
    }
  }, [selectedObject])

  const handleColorChange = (type: 'fill' | 'stroke', color: string) => {
    if (type === 'fill') setFill(color)
    else setStroke(color)
    onChange(type, color)
  }

  if (!selectedObject) {
    return 
  }

  const isText = selectedObject.type === 'i-text' || selectedObject.type === 'text'

  return (
    <div className="absolute top-4 right-4 z-10 w-72 bg-background/80 backdrop-blur-sm border border-border rounded-2xl p-4 flex flex-col gap-6 shadow-lg animate-in slide-in-from-right-5 fade-in duration-300">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Properties</h3>
        <span className="text-xs bg-muted px-2 py-1 rounded-md font-mono">{selectedObject.type}</span>
      </div>

      {/* Colors */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">Fill Color</Label>
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="w-full h-9 rounded-lg border border-border shadow-sm flex items-center justify-center gap-2 transition-transform active:scale-95"
                style={{ backgroundColor: fill === 'transparent' ? 'transparent' : fill }}
              >
                {fill === 'transparent' && (
                  <div className="w-full h-full bg-[repeating-linear-gradient(45deg,#ccc,#ccc_2px,transparent_2px,transparent_4px)] rounded-lg" />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3">
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 mb-2 flex-wrap">
                  <button
                    onClick={() => handleColorChange('fill', 'transparent')}
                    className="w-8 h-8 rounded-full border border-border bg-[repeating-linear-gradient(45deg,#ccc,#ccc_2px,transparent_2px,transparent_4px)]"
                    title="Transparent"
                  />
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => handleColorChange('fill', c)}
                      className="w-8 h-8 rounded-full border border-border shadow-sm hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={fill === 'transparent' ? '#ffffff' : fill}
                  onChange={(e) => handleColorChange('fill', e.target.value)}
                  className="w-full h-8 cursor-pointer"
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Stroke Color</Label>
          <Popover>
            <PopoverTrigger asChild>
              <button className="w-full h-9 rounded-lg border border-border shadow-sm relative overflow-hidden active:scale-95 transition-transform">
                <div className="absolute inset-0 border-4 rounded-md" style={{ borderColor: stroke }} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3">
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 mb-2 flex-wrap">
                  <button
                    onClick={() => handleColorChange('stroke', 'transparent')}
                    className="w-8 h-8 rounded-full border border-border bg-[repeating-linear-gradient(45deg,#ccc,#ccc_2px,transparent_2px,transparent_4px)]"
                    title="Transparent"
                  />
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => handleColorChange('stroke', c)}
                      className="w-8 h-8 rounded-full border border-border shadow-sm hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={stroke === 'transparent' ? '#ffffff' : stroke}
                  onChange={(e) => handleColorChange('stroke', e.target.value)}
                  className="w-full h-8 cursor-pointer"
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Stroke Width */}
      <div className="space-y-3">
        <div className="flex justify-between">
          <Label className="text-xs">Stroke Width</Label>
          <span className="text-xs text-muted-foreground">{strokeWidth}px</span>
        </div>
        <Slider
          value={[strokeWidth]}
          min={0}
          max={20}
          step={1}
          onValueChange={(val) => {
            setStrokeWidth(val[0])
            onChange('strokeWidth', val[0])
          }}
        />
      </div>

      {/* Opacity */}
      <div className="space-y-3">
        <div className="flex justify-between">
          <Label className="text-xs">Opacity</Label>
          <span className="text-xs text-muted-foreground">{opacity}%</span>
        </div>
        <Slider
          value={[opacity]}
          min={0}
          max={100}
          step={1}
          onValueChange={(val) => {
            setOpacity(val[0])
            onChange('opacity', val[0] / 100)
          }}
        />
      </div>

      {isText && (
        <div className="pt-2 border-t border-border">
          <div className="flex items-center gap-2 text-primary text-xs">
            <TypeIcon className="w-3 h-3" />
            <span>Double click text to edit</span>
          </div>
        </div>
      )}
    </div>
  )
}
