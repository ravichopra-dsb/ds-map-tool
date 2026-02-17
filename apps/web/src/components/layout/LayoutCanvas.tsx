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
  orientation,
  zoom,
  onZoomChange,
  backgroundImage,
}: LayoutCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const baseDimensions = PAGE_SIZES[pageSize]
  // Swap width/height for landscape orientation
  const dimensions = orientation === 'landscape'
    ? { width: baseDimensions.height, height: baseDimensions.width, label: baseDimensions.label }
    : baseDimensions
  const scale = zoom / 100

  // Handle mouse wheel zoom (Ctrl for canvas, Shift for selected map image)
  const handleWheel = useCallback((e: WheelEvent) => {
    const canvas = fabricRef.current

    // Shift + scroll: Zoom selected map image
    if (e.shiftKey && canvas) {
      const activeObject = canvas.getActiveObject()
      if (activeObject && (activeObject as fabric.FabricImage & { isMapImage?: boolean }).isMapImage) {
        e.preventDefault()
        const scaleFactor = e.deltaY > 0 ? 0.95 : 1.05 // 5% zoom per scroll step
        const currentScaleX = activeObject.scaleX || 1
        const currentScaleY = activeObject.scaleY || 1

        // Limit scale between 10% and 500%
        const newScaleX = Math.min(Math.max(currentScaleX * scaleFactor, 0.1), 5)
        const newScaleY = Math.min(Math.max(currentScaleY * scaleFactor, 0.1), 5)

        activeObject.set({
          scaleX: newScaleX,
          scaleY: newScaleY,
        })
        canvas.requestRenderAll()
        return
      }
    }

    // Ctrl/Cmd + scroll: Canvas zoom
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -5 : 5
      const newZoom = Math.min(Math.max(zoom + delta, 10), 200)
      onZoomChange(newZoom)
    }
  }, [zoom, onZoomChange, fabricRef])

  // Initialize Canvas once on mount
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return

    // Dispose if exists
    if (fabricRef.current) {
      fabricRef.current.dispose()
    }

    // Create new canvas with initial page dimensions
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount - dimension updates handled separately

  // Add wheel zoom listener
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [handleWheel])

  // Update canvas dimensions when page size or orientation changes
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    canvas.setDimensions({
      width: dimensions.width,
      height: dimensions.height,
    })
    canvas.requestRenderAll()
  }, [pageSize, orientation, dimensions.width, dimensions.height])

  // Apply Fabric.js viewport zoom for high-quality rendering (instead of CSS transform)
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    // Use Fabric.js setZoom for native high-quality rendering
    canvas.setZoom(scale)
    // Update canvas element dimensions to match zoomed size for proper scrolling
    canvas.setDimensions({
      width: dimensions.width * scale,
      height: dimensions.height * scale,
    })
    canvas.requestRenderAll()
  }, [zoom, scale, dimensions.width, dimensions.height])

  // Handle map image as a selectable/movable object
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !backgroundImage) return;

    let isCancelled = false;

    fabric.FabricImage.fromURL(backgroundImage).then((img) => {
      // Check if cancelled or canvas disposed
      if (isCancelled || !fabricRef.current) return;

      const currentCanvas = fabricRef.current;
      if (!currentCanvas.width || !currentCanvas.height || !img.width || !img.height) return;

      // Remove any existing map image (identified by custom property)
      const existingMapImage = currentCanvas.getObjects().find(
        (obj) => (obj as fabric.FabricObject & { isMapImage?: boolean }).isMapImage
      );
      if (existingMapImage) {
        currentCanvas.remove(existingMapImage);
      }

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

      // Mark this as the map image for identification
      (img as fabric.FabricImage & { isMapImage?: boolean }).isMapImage = true;

      // Add as regular object (selectable and movable)
      currentCanvas.add(img);
      // Send to back so other objects are on top
      currentCanvas.sendObjectToBack(img);
      currentCanvas.requestRenderAll();
    }).catch((err) => {
      if (!isCancelled) {
        console.error('Failed to load map image:', err);
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
        {/* Canvas container - Fabric.js handles zoom internally for high-quality rendering */}
        <div
          className="shadow-2xl"
          style={{
            width: scaledWidth,
            height: scaledHeight,
            // No CSS transform needed - Fabric.js setZoom handles zoom with proper re-rendering
          }}
        >
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  )
}
