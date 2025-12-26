import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilePlus, Menu, Trash2, ArrowDownToLine } from "lucide-react";
import { TOOLS } from "../tools/toolConfig";
import { LegendDropdown } from "./LegendDropdown";
import type { LegendType } from "@/tools/legendsConfig";

interface ToolbarProps {
  onFileImport: () => void;
  onDeleteFeature: () => void;
  onToolActivate: (toolId: string) => void;
  activeTool: string;
  selectedLegend?: LegendType;
  onLegendSelect: (legend: LegendType) => void;
  onExportClick: (format: "geojson" | "kml" | "kmz") => void;
  onPdfExportClick: () => void;
}

const Toolbar = ({
  onFileImport,
  onDeleteFeature,
  onToolActivate,
  activeTool,
  selectedLegend,
  onLegendSelect,
  onExportClick,
  onPdfExportClick,
}: ToolbarProps) => {
  const [open, setOpen] = useState(true);

  const handleToolClick = (toolId: string) => {
    onToolActivate(toolId);
  };

  return (
    <div className="absolute left-2 top-2 flex gap-2 z-50">
      {/* Tools Dropdown */}
      <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="cursor-pointer">
            <Menu />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="mt-3"
          align="start"
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDown={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DropdownMenuLabel className="px-3">Tool</DropdownMenuLabel>
          <DropdownMenuGroup className="my-2 px-3">
            <div className="grid grid-cols-2 gap-4">
              {TOOLS.map((tool) => {
                if (tool.id === "legends") {
                  return (
                    <div key={tool.id} className="flex justify-center">
                      <LegendDropdown
                        selectedLegend={selectedLegend}
                        onLegendSelect={onLegendSelect}
                      />
                    </div>
                  );
                }

                const Icon = tool.icon;
                return (
                  <DropdownMenuItem
                    key={tool.id}
                    onSelect={(e) => e.preventDefault()}
                    className={`w-full cursor-pointer ${
                      activeTool === tool.id
                        ? "bg-[#e0dfff] focus:bg-[#e0dfff]"
                        : "focus:bg-zinc-200/60"
                    } hover:bg-[#e0dfff]  delay-75 transition-all flex justify-center `}
                    onClick={() => handleToolClick(tool.id)}
                    title={tool.name}
                  >
                    <Icon />
                  </DropdownMenuItem>
                );
              })}
            </div>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        variant="outline"
        className="cursor-pointer"
        title="Import GeoJson/Kml/Kmz"
        onClick={onFileImport}
      >
        <FilePlus /> Import
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <ArrowDownToLine /> Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-32" align="start">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => onExportClick("geojson")}>GeoJson</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExportClick("kml")}>Kml</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExportClick("kmz")}>Kmz</DropdownMenuItem>
            <DropdownMenuItem onClick={onPdfExportClick}>PDF</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        variant="outline"
        className="cursor-pointer text-red-600"
        title="Delete GeoJson"
        onClick={onDeleteFeature}
      >
        <Trash2 /> Delete
      </Button>
    </div>
  );
};

export default Toolbar;
