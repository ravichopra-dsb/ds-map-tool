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
import { Import, Menu, Trash2 } from "lucide-react";
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
}

const Toolbar = ({
  onFileImport,
  onDeleteFeature,
  onToolActivate,
  activeTool,
  selectedLegend,
  onLegendSelect,
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
          <DropdownMenuLabel className="px-3">Tools</DropdownMenuLabel>
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
                console.log(tool.id);
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
                    {tool.id === "triangle" ? (
                      <Icon fill="#a4aaa5" stroke="#000" />
                    ) : tool.id === "pit" ? (
                      <Icon stroke="#ff0000" strokeWidth={5}/>
                    ) : (
                      <Icon />
                    )}
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
        <Import />
      </Button>
      <Button
        variant="outline"
        className="cursor-pointer"
        title="Delete GeoJson"
        onClick={onDeleteFeature}
      >
        <Trash2 />
      </Button>
    </div>
  );
};

export default Toolbar;
