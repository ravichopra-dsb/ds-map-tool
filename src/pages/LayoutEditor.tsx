import { useEffect, useRef, useState, type ChangeEvent } from "react";
import * as fabric from "fabric";
import { jsPDF } from "jspdf";
import {
  LayoutToolbar,
  LayoutCanvas,
  LayoutPropertiesPanel,
  SaveLayoutDialog,
  ZoomControls,
  PAGE_SIZES,
  type ToolType,
  type PageSize,
  type Orientation,
} from "@/components/layout";
import { getFabricExportSettings } from "@/utils/canvasExportUtils";
import { type Resolution, PAGE_SIZES as PDF_PAGE_SIZES } from "@/types/pdf";
import { ArrowLeft, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link, useParams, useNavigate } from "react-router";
import { useLayoutStore } from "@/stores/layoutStore";
import { useShallow } from "zustand/react/shallow";

export default function LayoutEditor() {
  const { layoutId } = useParams<{ layoutId: string }>();
  const navigate = useNavigate();

  // Zustand store - use useShallow to prevent infinite re-renders
  const {
    layouts,
    addLayout,
    updateLayout,
    getLayout,
    pendingBackgroundImage,
    pendingPageSize,
    pendingLayoutId,
    clearPendingBackground,
  } = useLayoutStore(
    useShallow((state) => ({
      layouts: state.layouts,
      addLayout: state.addLayout,
      updateLayout: state.updateLayout,
      getLayout: state.getLayout,
      pendingBackgroundImage: state.pendingBackgroundImage,
      pendingPageSize: state.pendingPageSize,
      pendingLayoutId: state.pendingLayoutId,
      clearPendingBackground: state.clearPendingBackground,
    }))
  );

  // Component state
  const [activeTool, setActiveTool] = useState<ToolType>("select");
  const [selectedObject, setSelectedObject] =
    useState<fabric.FabricObject | null>(null);
  const [currentLayoutId, setCurrentLayoutId] = useState<string | null>(
    layoutId ?? null
  );
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLimitWarning, setShowLimitWarning] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [pageSize, setPageSize] = useState<PageSize>("A4");
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [zoom, setZoom] = useState(100);
  const [pdfResolution] = useState<Resolution>(3600);
  const [backgroundImage, setBackgroundImage] = useState<string | undefined>(
    undefined
  );

  const nameInputRef = useRef<HTMLInputElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentLayout = currentLayoutId ? getLayout(currentLayoutId) : null;

  // Sync URL param to state
  useEffect(() => {
    setCurrentLayoutId(layoutId ?? null);
  }, [layoutId]);

  // Handle pending background image from map export
  useEffect(() => {
    if (pendingBackgroundImage && (!layoutId || layoutId === pendingLayoutId)) {
      setBackgroundImage(pendingBackgroundImage);
      if (pendingPageSize) {
        // Convert page size format (e.g., 'a4' to 'A4')
        setPageSize(pendingPageSize.toUpperCase() as PageSize);
      }
      // Consume the pending state
      clearPendingBackground();
    }
  }, [
    pendingBackgroundImage,
    pendingPageSize,
    pendingLayoutId,
    layoutId,
    clearPendingBackground,
  ]);

  // Load layout data when ID changes
  useEffect(() => {
    if (currentLayout) {
      setEditingName(currentLayout.name);
      // Don't set backgroundImage here - the map image is already in canvasData
      // Setting it would cause a duplicate because LayoutCanvas would add it again
    } else {
      // Reset for new layout
      setEditingName("New Layout");
      if (!pendingBackgroundImage) {
        setBackgroundImage(undefined);
      }
    }
  }, [currentLayout, pendingBackgroundImage]);

  // Delete keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!fabricRef.current) return;
      const activeObj = fabricRef.current.getActiveObject();
      if (activeObj?.type === "i-text" && (activeObj as fabric.IText).isEditing)
        return;
      if (e.key === "Delete" || e.key === "Backspace") {
        const activeObjects = fabricRef.current.getActiveObjects();
        if (activeObjects.length) {
          activeObjects.forEach((obj) => fabricRef.current?.remove(obj));
          fabricRef.current.discardActiveObject();
          fabricRef.current.requestRenderAll();
          setSelectedObject(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handlePropertyChange = (key: string, value: unknown) => {
    const canvas = fabricRef.current;
    const activeObj = canvas?.getActiveObject();
    if (activeObj) {
      activeObj.set(key as keyof fabric.FabricObject, value);
      canvas?.requestRenderAll();
    }
  };

  const handleDeleteSelected = () => {
    const canvas = fabricRef.current;
    const activeObjects = canvas?.getActiveObjects();
    if (activeObjects?.length) {
      activeObjects.forEach((obj) => canvas?.remove(obj));
      canvas?.discardActiveObject();
      canvas?.requestRenderAll();
      setSelectedObject(null);
    }
  };

  const handleClear = () => {
    fabricRef.current?.clear();
    if (fabricRef.current) {
      fabricRef.current.backgroundColor = "#ffffff";
    }
    fabricRef.current?.requestRenderAll();
    setSelectedObject(null);
    setBackgroundImage(undefined);
  };

  const handleSaveName = () => {
    if (currentLayoutId && editingName.trim()) {
      updateLayout(currentLayoutId, { name: editingName.trim() });
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSaveName();
  };

  const handleImportImage = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fabricRef.current) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      fabric.FabricImage.fromURL(dataUrl).then((img) => {
        const canvas = fabricRef.current;
        if (!canvas || !canvas.width || !canvas.height || !img.width || !img.height) return;
        const scale = Math.min(
          (canvas.width * 0.8) / img.width,
          (canvas.height * 0.8) / img.height,
          1
        );
        img.set({
          scaleX: scale,
          scaleY: scale,
          left: canvas.width / 2,
          top: canvas.height / 2,
          originX: "center",
          originY: "center",
        });
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.requestRenderAll();
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSaveLayout = () => {
    if (currentLayoutId && currentLayout) {
      saveLayoutWithName(currentLayout.name);
    } else {
      // Check if limit reached for new layouts
      if (layouts.length >= 3) {
        setShowLimitWarning(true);
        return;
      }
      setShowSaveDialog(true);
    }
  };

  const handleDownloadPdf = () => {
    const canvas = fabricRef.current;
    if (!canvas || !canvas.width || !canvas.height) return;

    // Deselect objects to remove selection handles from export
    canvas.discardActiveObject();
    canvas.requestRenderAll();

    // Get page dimensions in mm based on orientation
    const pageSizeLower = pageSize.toLowerCase() as keyof typeof PDF_PAGE_SIZES;
    const pageDims = PDF_PAGE_SIZES[pageSizeLower];
    const [pageWidthMm, pageHeightMm] = orientation === 'landscape'
      ? [pageDims.height, pageDims.width]
      : [pageDims.width, pageDims.height];

    // Calculate export settings using shared utility (DRY approach)
    const exportSettings = getFabricExportSettings({
      resolution: pdfResolution,
      canvasWidthPx: canvas.width,
      canvasHeightPx: canvas.height,
      pageWidthMm,
      pageHeightMm,
    });

    // Export canvas to data URL with calculated quality settings
    const dataUrl = canvas.toDataURL({
      format: exportSettings.format,
      quality: exportSettings.quality,
      multiplier: exportSettings.multiplier,
    });

    // Create PDF with correct page size and orientation
    const pdf = new jsPDF({
      orientation: orientation,
      unit: "mm",
      format: pageSize.toLowerCase(),
    });

    // Get PDF page dimensions in mm
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Add image to fill the entire page
    const imageFormat = exportSettings.format.toUpperCase() as 'JPEG' | 'PNG';
    pdf.addImage(dataUrl, imageFormat, 0, 0, pdfWidth, pdfHeight);

    // Generate filename
    const fileName = editingName.trim() || "layout";
    pdf.save(`${fileName}.pdf`);
  };

  const saveLayoutWithName = (name: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    canvas.discardActiveObject();
    canvas.requestRenderAll();

    const originalBg = canvas.backgroundColor;
    canvas.backgroundColor = "transparent";
    const previewImage = canvas.toDataURL({ format: "png", multiplier: 0.5 });
    canvas.backgroundColor = originalBg;
    canvas.requestRenderAll();

    const canvasData = canvas.toJSON();

    const layoutData: Partial<Omit<import("@/stores/layoutStore").Layout, "id">> = {
      name,
      canvasData,
      previewImage,
      backgroundImage: backgroundImage || currentLayout?.backgroundImage,
    };

    if (currentLayoutId) {
      updateLayout(currentLayoutId, layoutData);
    } else {
      const newId = addLayout(layoutData as any);
      if (!newId) {
        setShowLimitWarning(true);
        return;
      }
      setCurrentLayoutId(newId);
      navigate(`/layout/${newId}`, { replace: true });
    }
  };

  useEffect(() => {
    const handleSaveShortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSaveLayout();
      }
    };
    window.addEventListener("keydown", handleSaveShortcut);
    return () => window.removeEventListener("keydown", handleSaveShortcut);
  }, [currentLayoutId, backgroundImage]); // Rerun if these change

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <Link
            to="/layouts"
            className="p-2 hover:bg-muted rounded-full transition-colors"
            title="Back to Layouts"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <input
            ref={nameInputRef}
            type="text"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={handleNameKeyDown}
            placeholder="Layout Name"
            className="font-bold text-sm md:text-base bg-transparent outline-none px-1 -ml-1 min-w-[100px]"
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Page Size:</span>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-muted hover:bg-muted/80 rounded-md transition-colors">
                {pageSize}
                <ChevronDown className="w-4 h-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(Object.keys(PAGE_SIZES) as PageSize[]).map((size) => (
                  <DropdownMenuItem
                    key={size}
                    onClick={() => setPageSize(size)}
                    className={pageSize === size ? "bg-accent" : ""}
                  >
                    <span className="font-medium">{size}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {PAGE_SIZES[size].label.replace(`${size} `, "")}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Orientation:</span>
            <div className="flex rounded-md overflow-hidden border border-border">
              <button
                onClick={() => setOrientation("portrait")}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  orientation === "portrait"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
                title="Portrait"
              >
                Portrait
              </button>
              <button
                onClick={() => setOrientation("landscape")}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  orientation === "landscape"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
                title="Landscape"
              >
                Landscape
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 relative bg-muted/20 overflow-hidden">
        <LayoutToolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          onDeleteSelected={handleDeleteSelected}
          onClear={handleClear}
          onImportImage={handleImportImage}
          onSaveLayout={handleSaveLayout}
          onDownloadPdf={handleDownloadPdf}
          showSave={!backgroundImage}
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
          initialData={currentLayout?.canvasData}
          pageSize={pageSize}
          orientation={orientation}
          zoom={zoom}
          onZoomChange={setZoom}
          backgroundImage={backgroundImage}
        />

        <ZoomControls zoom={zoom} onZoomChange={setZoom} />

        <LayoutPropertiesPanel
          selectedObject={selectedObject}
          onChange={handlePropertyChange}
        />
      </div>

      <SaveLayoutDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSave={saveLayoutWithName}
        initialName={currentLayout?.name}
        isEditing={!!currentLayout}
      />

      <Dialog open={showLimitWarning} onOpenChange={setShowLimitWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Layout Limit Reached</DialogTitle>
            <DialogDescription>
              Maximum layout limit (3) reached. Please delete an existing layout before creating a new one.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setShowLimitWarning(false)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              OK
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
