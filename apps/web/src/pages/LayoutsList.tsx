import { useRef } from "react"
import { Link, useNavigate } from "react-router"
import { useLayoutStore, type Layout as LayoutType } from "@/stores/layoutStore"
import { ArrowLeft, Trash2, Plus, Layout, Download, Upload } from "lucide-react"

function ImportLayoutCard({ onClick }: { onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="group relative bg-card border-2 border-dashed border-border rounded-xl overflow-hidden cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-all"
    >
      <div className="aspect-4/3 flex flex-col items-center justify-center gap-3">
        <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
          <Upload className="w-7 h-7 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <span className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
          Import Layout
        </span>
      </div>
    </div>
  )
}

export default function LayoutsList() {
  const navigate = useNavigate()
  const layouts = useLayoutStore((state) => state.layouts)
  const deleteLayout = useLayoutStore((state) => state.deleteLayout)
  const addLayout = useLayoutStore((state) => state.addLayout)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleOpenLayout = (id: string) => {
    navigate(`/layout/${id}`)
  }

  const handleDeleteLayout = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this layout?')) {
      deleteLayout(id)
    }
  }

  const handleDownloadLayout = (e: React.MouseEvent, layout: LayoutType) => {
    e.stopPropagation()
    const exportData = {
      name: layout.name,
      canvasData: layout.canvasData,
      createdAt: layout.createdAt,
      updatedAt: layout.updatedAt,
    }
    const jsonString = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${layout.name.replace(/[^a-z0-9]/gi, '-')}-canvas.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportLayout = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const jsonData = JSON.parse(event.target?.result as string)

        // Validate required fields
        if (!jsonData.canvasData) {
          alert('Invalid layout file: missing canvas data')
          return
        }

        const newLayoutId = addLayout({
          name: jsonData.name || `Imported ${new Date().toLocaleDateString()}`,
          canvasData: jsonData.canvasData,
          previewImage: '', // Will be regenerated when opened
        })

        if (newLayoutId) {
          navigate(`/layout/${newLayoutId}`)
        } else {
          alert('Failed to import layout. Maximum 3 layouts allowed.')
        }
      } catch {
        alert('Invalid JSON file')
      }
    }
    reader.readAsText(file)

    // Reset input so same file can be selected again
    e.target.value = ''
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportLayout}
        className="hidden"
      />

      {/* Header */}
      <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="p-2 hover:bg-muted rounded-full transition-colors"
            title="Back to Map Editor"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="font-bold text-sm md:text-base">Saved Layouts</h1>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {layouts.length} of 3 layout{layouts.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {layouts.length < 3 ? (
          <Link
            to="/layout"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New Layout
          </Link>
        ) : (
          <span
            className="flex items-center gap-2 px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm font-medium cursor-not-allowed"
            title="Maximum 3 layouts allowed"
          >
            <Plus className="w-4 h-4" />
            Limit Reached
          </span>
        )}
      </header>

      {/* Content */}
      <main className="p-6">
        {layouts.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <ImportLayoutCard onClick={handleImportClick} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {layouts
              .sort((a, b) => b.updatedAt - a.updatedAt)
              .map((layout) => (
                <div
                  key={layout.id}
                  onClick={() => handleOpenLayout(layout.id)}
                  className="group relative bg-card border border-border rounded-xl overflow-hidden cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all"
                >
                  {/* Preview Image */}
                  <div className="aspect-4/3 bg-muted/30 relative overflow-hidden">
                    {layout.previewImage ? (
                      <img
                        src={layout.previewImage}
                        alt={layout.name}
                        className="w-full h-full object-contain bg-[repeating-linear-gradient(45deg,#f0f0f0_0px,#f0f0f0_10px,#ffffff_10px,#ffffff_20px)]"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Layout className="w-12 h-12 text-muted-foreground/30" />
                      </div>
                    )}

                    {/* Download button */}
                    <button
                      onClick={(e) => handleDownloadLayout(e, layout)}
                      className="absolute top-2 right-10 p-2 bg-background/80 backdrop-blur-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-500/10 hover:text-blue-500"
                      title="Download canvas data"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDeleteLayout(e, layout.id)}
                      className="absolute top-2 right-2 p-2 bg-background/80 backdrop-blur-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                      title="Delete layout"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <h3 className="font-medium text-sm truncate">{layout.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(layout.updatedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}

            {/* Import Layout Card */}
            {layouts.length < 3 && (
              <ImportLayoutCard onClick={handleImportClick} />
            )}
          </div>
        )}
      </main>
    </div>
  )
}
