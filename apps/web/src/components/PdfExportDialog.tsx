import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useLayoutStore } from "@/stores/layoutStore";
import { collectLegendMetadata } from "@/utils/legendMetadataUtils";
import type VectorSource from "ol/source/Vector";
import type { PageSize, PdfExportConfig, Resolution } from "@/types/pdf";
import { DEFAULT_RESOLUTION, PAGE_SIZE_OPTIONS } from "@/types/pdf";
import type {
  ExportProgress,
  MapImageExportResult,
} from "@/utils/mapImageExport";
import { Layout, Loader2, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

interface PdfExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (
    config: PdfExportConfig,
    onProgress: (progress: ExportProgress) => void,
  ) => Promise<MapImageExportResult>;
  isExporting: boolean;
  jobName?: string;
  vectorSource?: VectorSource;
}

export function PdfExportDialog({
  isOpen,
  onClose,
  onExport,
  isExporting,
  jobName,
  vectorSource,
}: PdfExportDialogProps) {
  const navigate = useNavigate();
  const [pageSize, setPageSize] = useState<PageSize>("a4");
  const [resolution, _setResolution] = useState<Resolution>(DEFAULT_RESOLUTION);
  const [keepVectorLayerConstant, _setKeepVectorLayerConstant] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [selectedLayoutId, setSelectedLayoutId] = useState<string>("");
  console.log("JOB NAME", jobName);

  const layouts = useLayoutStore((state) => state.layouts);
  const setPendingBackground = useLayoutStore(
    (state) => state.setPendingBackground,
  );
  const selectedLayout = layouts.find((l) => l.id === selectedLayoutId);

  const handleExport = async () => {
    setProgress({
      stage: "preparing",
      message: "Starting export...",
      percent: 0,
    });

    try {
      const result = await onExport(
        {
          pageSize,
          resolution,
          keepVectorLayerConstant,
          layoutId: selectedLayoutId || undefined,
        },
        setProgress,
      );

      // Collect legend/icon metadata from map features
      const legendMetadata = vectorSource ? collectLegendMetadata(vectorSource) : null;

      // Store the image and metadata in Zustand
      setPendingBackground(result.dataURL, pageSize, selectedLayoutId || null, jobName, legendMetadata);

      // Navigate to layout editor
      const targetPath = selectedLayoutId
        ? `/layout/${selectedLayoutId}`
        : "/layout";
      navigate(targetPath);

      setProgress(null);
      onClose();
    } catch (error) {
      console.error("Export failed:", error);
      setProgress(null);
    }
  };

  const handleClose = () => {
    if (!isExporting) {
      setProgress(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export to Layout Editor</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Page Size Dropdown */}
          <div className="grid gap-2">
            <Label htmlFor="page-size">Page Size</Label>
            <select
              id="page-size"
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value as PageSize)}
              disabled={isExporting}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size.toUpperCase()}
                  {size === "a0" && " (slow)"}
                  {size === "a5" && " (fast)"}
                </option>
              ))}
            </select>
          </div>

          {/* Resolution Dropdown */}
          {/* <div className="grid gap-2">
            <Label htmlFor="resolution">Resolution</Label>
            <select
              id="resolution"
              value={resolution}
              onChange={(e) =>
                setResolution(Number(e.target.value) as Resolution)
              }
              disabled={isExporting}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            >
              {RESOLUTION_OPTIONS.map((res) => (
                <option key={res} value={res}>
                  {res} DPI
                  {res === 600 && " (high quality)"}
                  {res === 1200 && " (ultra high quality)"}
                  {res === 2400 && " (maximum quality, very slow)"}
                </option>
              ))}
            </select>
          </div> */}

          {/* Keep Vector Layer Constant Checkbox */}
          {/* <div className="flex items-center space-x-2">
            <Checkbox
              id="keep-vector-constant"
              checked={keepVectorLayerConstant}
              onCheckedChange={(checked) =>
                setKeepVectorLayerConstant(checked === true)
              }
              disabled={isExporting}
            />
            <Label
              htmlFor="keep-vector-constant"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Keep drawn features at constant size (only zoom base map)
            </Label>
          </div> */}

          {/* Layout Overlay Selector */}
          <div className="grid gap-2">
            <Label htmlFor="layout-select">Layout Overlay</Label>
            <select
              id="layout-select"
              value={selectedLayoutId}
              onChange={(e) => setSelectedLayoutId(e.target.value)}
              disabled={isExporting}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            >
              <option value="">No layout</option>
              {layouts.map((layout) => (
                <option key={layout.id} value={layout.id}>
                  {layout.name}
                </option>
              ))}
            </select>
          </div>

          {/* Layout Preview */}
          {selectedLayout && (
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Layout Preview</Label>
                <button
                  onClick={() => setSelectedLayoutId("")}
                  className="p-1 hover:bg-muted rounded transition-colors"
                  title="Clear selection"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="relative border border-border rounded-lg overflow-hidden bg-[repeating-linear-gradient(45deg,#f0f0f0_0px,#f0f0f0_10px,#ffffff_10px,#ffffff_20px)]">
                {selectedLayout.previewImage ? (
                  <img
                    src={selectedLayout.previewImage}
                    alt={selectedLayout.name}
                    className="w-full h-32 object-contain"
                  />
                ) : (
                  <div className="w-full h-32 flex items-center justify-center">
                    <Layout className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {isExporting && progress && (
            <div className="grid gap-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{progress.message}</span>
                <span>{progress.percent}%</span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <DialogClose asChild>
            <Button type="button" variant="secondary" disabled={isExporting}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              "Export to Layout"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
