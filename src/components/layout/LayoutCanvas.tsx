import { useEffect, useRef, useCallback } from "react"
import * as fabric from "fabric"
import type { LayoutCanvasProps } from "./types"
import { PAGE_SIZES } from "./types"

export function LayoutCanvas({
  fabricRef,
  activeTool,
  onToolChange,
  onSelect,
  initialData,
  pageSize,
  zoom,
  onZoomChange,
  backgroundImage,
}: LayoutCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const dimensions = PAGE_SIZES[pageSize]
  const scale = zoom / 100

  // Handle mouse wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -5 : 5
      const newZoom = Math.min(Math.max(zoom + delta, 10), 200)
      onZoomChange(newZoom)
    }
  }, [zoom, onZoomChange])

  // Initialize Canvas with fixed dimensions
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return

    // Dispose if exists
    if (fabricRef.current) {
      fabricRef.current.dispose()
    }

    // Create new canvas with fixed page dimensions
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: dimensions.width,
      height: dimensions.height,
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

    return () => {
      canvas.dispose()
    }
  }, [pageSize])

  // Add wheel zoom listener
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [handleWheel])

  // Update canvas dimensions when page size changes
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    canvas.setDimensions({
      width: dimensions.width,
      height: dimensions.height,
    })
    canvas.requestRenderAll()
  }, [pageSize, dimensions])

  // Handle background image (Fabric.js v6+ API)
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !backgroundImage) return;

    let isCancelled = false;

    fabric.FabricImage.fromURL(backgroundImage).then((img) => {
      // Check if cancelled or canvas disposed
      if (isCancelled || !fabricRef.current) return;

      const currentCanvas = fabricRef.current;
      if (!currentCanvas.width || !currentCanvas.height || !img.width || !img.height) return;

      // Scale image to cover the canvas while maintaining aspect ratio
      const canvasAspect = currentCanvas.width / currentCanvas.height;
      const imgAspect = img.width / img.height;
      let scaleX, scaleY;

      if (canvasAspect > imgAspect) {
        // Canvas is wider than image
        scaleX = currentCanvas.width / img.width;
        scaleY = scaleX;
      } else {
        // Canvas is taller than image
        scaleY = currentCanvas.height / img.height;
        scaleX = scaleY;
      }

      img.set({
        scaleX,
        scaleY,
        originX: 'center',
        originY: 'center',
        top: currentCanvas.height / 2,
        left: currentCanvas.width / 2,
      });

      // Fabric.js v6+: Set backgroundImage property directly
      currentCanvas.backgroundImage = img;
      currentCanvas.requestRenderAll();
    }).catch((err) => {
      if (!isCancelled) {
        console.error('Failed to load background image:', err);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [backgroundImage]);

  // Load initial data when it changes
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas || !initialData) return

    canvas.loadFromJSON(initialData, () => {
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

  // Calculate scaled dimensions for the wrapper
  const scaledWidth = dimensions.width * scale
  const scaledHeight = dimensions.height * scale

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-auto bg-neutral-200"
      style={{ padding: '40px' }}
    >
      {/* Wrapper to maintain scroll area based on scaled size */}
      <div
        className="flex items-center justify-center"
        style={{
          minWidth: scaledWidth + 80, // Add padding for scroll area
          minHeight: scaledHeight + 80,
        }}
      >
        {/* Scaled canvas container */}
        <div
          className="shadow-2xl"
          style={{
            width: dimensions.width,
            height: dimensions.height,
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
          }}
        >
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  )
}
