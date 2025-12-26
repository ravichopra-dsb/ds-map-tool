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
import { Loader2 } from "lucide-react";
import type { PdfExportConfig, PageSize, Resolution } from "@/types/pdf";
import { PAGE_SIZE_OPTIONS, RESOLUTION_OPTIONS } from "@/types/pdf";

interface PdfExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (config: PdfExportConfig) => void;
  isExporting: boolean;
}

export function PdfExportDialog({
  isOpen,
  onClose,
  onExport,
  isExporting,
}: PdfExportDialogProps) {
  const [pageSize, setPageSize] = useState<PageSize>('a4');
  const [resolution, setResolution] = useState<Resolution>(1200);

  const handleExport = () => {
    onExport({ pageSize, resolution });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
                  {size === 'a0' && ' (slow)'}
                  {size === 'a5' && ' (fast)'}
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
              onChange={(e) => setResolution(Number(e.target.value) as Resolution)}
              disabled={isExporting}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            >
              {RESOLUTION_OPTIONS.map((res) => (
                <option key={res} value={res}>
                  {res} DPI
                  {res === 72 && ' (fast)'}
                  {res === 600 && ' (high quality)'}
                  {res === 1200 && ' (ultra high quality)'}
                  {res === 2400 && ' (maximum quality, very slow)'}
                </option>
              ))}
            </select>
          </div>
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
              'Export PDF'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
