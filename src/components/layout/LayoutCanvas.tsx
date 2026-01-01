import { useEffect, useRef } from "react"
import * as fabric from "fabric"
import type { LayoutCanvasProps } from "./types"

export function LayoutCanvas({
  fabricRef,
  activeTool,
  onToolChange,
  onSelect,
  initialData,
}: LayoutCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Initialize Canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return

    // Dispose if exists
    if (fabricRef.current) {
      fabricRef.current.dispose()
    }

    // Create new canvas
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      backgroundColor: '#ffffff',
      selection: true,
    })

    fabricRef.current = canvas

    // Event listeners for selection
    const handleSelection = () => {
      const selected = canvas.getActiveObjects()
      onSelect(selected.length > 0 ? selected[0] : null)
    }

    canvas.on('selection:created', handleSelection)
    canvas.on('selection:updated', handleSelection)
    canvas.on('selection:cleared', () => onSelect(null))

    // Handle resizing
    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current && canvas) {
        canvas.setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        })
      }
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      canvas.dispose()
    }
  }, [])

  // Load initial data when it changes
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas || !initialData) return

    canvas.loadFromJSON(initialData).then(() => {
      canvas.requestRenderAll()
    })
  }, [initialData])

  // Tool Logic
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    // Reset default behavior
    canvas.isDrawingMode = false
    canvas.selection = true
    canvas.defaultCursor = 'default'

    // Clean up previous event listeners
    canvas.off('mouse:down')

    switch (activeTool) {
      case 'pencil':
        canvas.isDrawingMode = true
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas)
        canvas.freeDrawingBrush.width = 5
        canvas.freeDrawingBrush.color = '#000000'
        break

      case 'select':
        // Default behavior
        break

      default:
        // Shape tools
        canvas.selection = false
        canvas.defaultCursor = 'crosshair'

        canvas.on('mouse:down', (o) => {
          if (!canvas) return
          const pointer = canvas.getScenePoint(o.e)
          let shape: fabric.FabricObject | null = null

          const commonProps = {
            left: pointer.x,
            top: pointer.y,
            fill: '#e2e8f0',
            stroke: '#1e293b',
            strokeWidth: 2,
            originX: 'center' as const,
            originY: 'center' as const,
          }

          if (activeTool === 'rect') {
            shape = new fabric.Rect({ ...commonProps, width: 100, height: 100 })
          } else if (activeTool === 'circle') {
            shape = new fabric.Circle({ ...commonProps, radius: 50 })
          } else if (activeTool === 'triangle') {
            shape = new fabric.Triangle({ ...commonProps, width: 100, height: 100 })
          } else if (activeTool === 'line') {
            shape = new fabric.Line([pointer.x, pointer.y, pointer.x + 100, pointer.y], {
              ...commonProps,
              stroke: '#1e293b',
              strokeWidth: 4,
              originX: 'left' as const,
              originY: 'top' as const,
            })
          } else if (activeTool === 'text') {
            shape = new fabric.IText('Type here', {
              ...commonProps,
              fontFamily: 'Inter, system-ui, sans-serif',
              fill: '#000000',
              fontSize: 24,
              originX: 'left' as const,
            })
          }

          if (shape) {
            canvas.add(shape)
            canvas.setActiveObject(shape)
            // Switch back to select tool after adding
            onToolChange('select')
          }
        })
        break
    }

    return () => {
      canvas.off('mouse:down')
    }
  }, [activeTool, onToolChange])

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-[repeating-linear-gradient(0deg,transparent,transparent_19px,#e5e7eb_19px,#e5e7eb_20px),repeating-linear-gradient(90deg,transparent,transparent_19px,#e5e7eb_19px,#e5e7eb_20px)] shadow-inner"
    >
      <canvas ref={canvasRef} />
    </div>
  )
}
