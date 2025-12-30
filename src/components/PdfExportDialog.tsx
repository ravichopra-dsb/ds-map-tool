import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import type { PdfExportConfig, PageSize, Resolution } from "@/types/pdf";
import { PAGE_SIZE_OPTIONS, RESOLUTION_OPTIONS } from "@/types/pdf";
import type { ExportProgress } from "@/utils/pdfExportUtils";

interface PdfExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (
    config: PdfExportConfig,
    onProgress: (progress: ExportProgress) => void
  ) => void;
  isExporting: boolean;
}

export function PdfExportDialog({
  isOpen,
  onClose,
  onExport,
  isExporting,
}: PdfExportDialogProps) {
  const [pageSize, setPageSize] = useState<PageSize>("a4");
  const [resolution, setResolution] = useState<Resolution>(1200);
  const [keepVectorLayerConstant, setKeepVectorLayerConstant] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);

  const handleExport = () => {
    setProgress({
      stage: "preparing",
      message: "Starting export...",
      percent: 0,
    });
    onExport({ pageSize, resolution, keepVectorLayerConstant }, setProgress);
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
          <DialogTitle>PDF Export Settings</DialogTitle>
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
          <div className="grid gap-2">
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
                  {res === 72 && " (fast)"}
                  {res === 600 && " (high quality)"}
                  {res === 1200 && " (ultra high quality)"}
                  {res === 2400 && " (maximum quality, very slow)"}
                  {res === 3600 && " (maximum quality, very slow)"}
                </option>
              ))}
            </select>
          </div>

          {/* Keep Vector Layer Constant Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="keep-vector-constant"
              checked={keepVectorLayerConstant}
              onCheckedChange={(checked) => setKeepVectorLayerConstant(checked === true)}
              disabled={isExporting}
            />
            <Label
              htmlFor="keep-vector-constant"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Keep drawn features at constant size (only zoom base map)
            </Label>
          </div>

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
              "Export PDF"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
