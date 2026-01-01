import { Link, useNavigate } from "react-router"
import { useLayoutStore } from "@/stores/layoutStore"
import { ArrowLeft, Trash2, Plus, Layout } from "lucide-react"

export default function LayoutsList() {
  const navigate = useNavigate()
  const layouts = useLayoutStore((state) => state.layouts)
  const deleteLayout = useLayoutStore((state) => state.deleteLayout)

  const handleOpenLayout = (id: string) => {
    navigate(`/layout/${id}`)
  }

  const handleDeleteLayout = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this layout?')) {
      deleteLayout(id)
    }
  }

  return (
    <div className="min-h-screen bg-background">
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
              {layouts.length} layout{layouts.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <Link
          to="/layout"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Layout
        </Link>
      </header>

      {/* Content */}
      <main className="p-6">
        {layouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Layout className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No layouts saved yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Create your first layout by clicking the button above or start designing in the layout editor.
            </p>
            <Link
              to="/layout"
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Create New Layout
            </Link>
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
          </div>
        )}
      </main>
    </div>
  )
}
