import { useEffect, useRef, useState, type ChangeEvent } from "react"
import * as fabric from "fabric"
import {
  LayoutToolbar,
  LayoutCanvas,
  LayoutPropertiesPanel,
  type ToolType,
} from "@/components/layout"
import { ArrowLeft } from "lucide-react"
import { Link } from "react-router"
import { useLayoutStore } from "@/stores/layoutStore"

export default function LayoutEditor() {
  const [activeTool, setActiveTool] = useState<ToolType>('select')
  const [selectedObject, setSelectedObject] = useState<fabric.FabricObject | null>(null)
  const fabricRef = useRef<fabric.Canvas | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const addLayout = useLayoutStore((state) => state.addLayout)

  // Delete keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!fabricRef.current) return

      // Don't delete if editing text
      const activeObj = fabricRef.current.getActiveObject()
      if (activeObj?.type === 'i-text' && (activeObj as fabric.IText).isEditing) {
        return
      }

      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObjects = fabricRef.current.getActiveObjects()
        if (activeObjects.length) {
          activeObjects.forEach((obj) => fabricRef.current?.remove(obj))
          fabricRef.current.discardActiveObject()
          fabricRef.current.requestRenderAll()
          setSelectedObject(null)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handlePropertyChange = (key: string, value: unknown) => {
    const canvas = fabricRef.current
    const activeObj = canvas?.getActiveObject()

    if (activeObj) {
      activeObj.set(key as keyof fabric.FabricObject, value)
      canvas?.requestRenderAll()
    }
  }

  const handleDeleteSelected = () => {
    const canvas = fabricRef.current
    const activeObjects = canvas?.getActiveObjects()
    if (activeObjects?.length) {
      activeObjects.forEach((obj) => canvas?.remove(obj))
      canvas?.discardActiveObject()
      canvas?.requestRenderAll()
      setSelectedObject(null)
    }
  }

  const handleClear = () => {
    fabricRef.current?.clear()
    if (fabricRef.current) {
      fabricRef.current.backgroundColor = '#ffffff'
    }
    fabricRef.current?.requestRenderAll()
    setSelectedObject(null)
  }

  const handleImportImage = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !fabricRef.current) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string

      fabric.FabricImage.fromURL(dataUrl).then((img) => {
        const canvas = fabricRef.current
        if (!canvas) return

        // Scale image to fit canvas while maintaining aspect ratio
        const maxWidth = canvas.width! * 0.8
        const maxHeight = canvas.height! * 0.8
        const scale = Math.min(maxWidth / img.width!, maxHeight / img.height!, 1)

        img.set({
          scaleX: scale,
          scaleY: scale,
          left: canvas.width! / 2,
          top: canvas.height! / 2,
          originX: 'center',
          originY: 'center',
        })

        canvas.add(img)
        canvas.setActiveObject(img)
        canvas.requestRenderAll()
      })
    }
    reader.readAsDataURL(file)

    // Reset input so same file can be imported again
    e.target.value = ''
  }

  const handleSaveLayout = () => {
    const canvas = fabricRef.current
    if (!canvas) return

    // Deselect all objects before generating preview
    canvas.discardActiveObject()
    canvas.requestRenderAll()

    // Store original background
    const originalBg = canvas.backgroundColor

    // Set transparent background for preview
    canvas.backgroundColor = 'transparent'

    // Generate preview image with transparent background
    const previewImage = canvas.toDataURL({
      format: 'png',
      multiplier: 0.5, // Smaller preview for storage efficiency
    })

    // Restore original background
    canvas.backgroundColor = originalBg
    canvas.requestRenderAll()

    // Serialize canvas data
    const canvasData = canvas.toJSON()

    // Generate a default name with timestamp
    const name = `Layout ${new Date().toLocaleString()}`

    // Save to store
    const layoutId = addLayout({
      name,
      canvasData,
      previewImage,
    })

    console.log('Layout saved with ID:', layoutId)
  }

  // Ctrl+S keyboard shortcut for save
  useEffect(() => {
    const handleSaveShortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSaveLayout()
      }
    }

    window.addEventListener('keydown', handleSaveShortcut)
    return () => window.removeEventListener('keydown', handleSaveShortcut)
  }, [])

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Header Bar */}
      <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="p-2 hover:bg-muted rounded-full transition-colors"
            title="Back to Home"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="font-bold text-sm md:text-base">Layout Editor</h1>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Canvas Mode
            </span>
          </div>
        </div>

        <div className="text-xs text-muted-foreground hidden sm:block">
          Use <kbd className="px-1 py-0.5 bg-muted rounded border border-border">Del</kbd> to remove selected objects
        </div>
      </header>

      {/* Main Canvas Area */}
      <div className="flex-1 relative bg-muted/20">
        <LayoutToolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          onDeleteSelected={handleDeleteSelected}
          onClear={handleClear}
          onImportImage={handleImportImage}
          onSaveLayout={handleSaveLayout}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        <LayoutCanvas
          fabricRef={fabricRef}
          activeTool={activeTool}
          onToolChange={setActiveTool}
          onSelect={setSelectedObject}
        />

        <LayoutPropertiesPanel
          selectedObject={selectedObject}
          onChange={handlePropertyChange}
        />
      </div>
    </div>
  )
}
