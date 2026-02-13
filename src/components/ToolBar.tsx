import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FilePlus,
  ChevronUp,
  ChevronDown,
  ArrowUpFromLine,
  Undo,
  Redo,
} from "lucide-react";
import { TOOLS, type ToolCategory } from "../tools/toolConfig";
import { LegendDropdown } from "./LegendDropdown";
import type { LegendType } from "@/tools/legendsConfig";
import { Link } from "react-router";
import type { Project } from "@/hooks/useMapProjects";
import type { PGlite } from "@electric-sql/pglite";
import { JobSelection } from "./JobSelection";
import { useToolStore } from "@/stores/useToolStore";

interface ToolbarProps {
  onFileImport: () => void;
  onToolActivate: (toolId: string) => void;
  activeTool: string;
  selectedLegend?: LegendType;
  onLegendSelect: (legend: LegendType) => void;
  onExportClick: (format: "geojson" | "kml" | "kmz") => void;
  onPdfExportClick: () => void;
  lineColor: string;
  lineWidth: number;
  onLineColorChange: (color: string) => void;
  onLineWidthChange: (width: number) => void;
  projects?: Project[];
  currentProjectId: string | null;
  onSelectProject: (projectId: string) => Promise<PGlite | null>;
}

const CATEGORY_LABELS: Record<ToolCategory, string> = {
  edit: "Edit",
  draw: "Draw",
  symbols: "Symbols",
};

const Toolbar = ({
  onFileImport,
  onToolActivate,
  activeTool,
  selectedLegend,
  onLegendSelect,
  onExportClick,
  onPdfExportClick,
  projects = [],
  currentProjectId,
  onSelectProject,
}: ToolbarProps) => {
  const [activeCategory, setActiveCategory] = useState<ToolCategory>("edit");
  // const [isSwitchingJob, setIsSwitchingJob] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { undo, redo } = useToolStore();

  // const handleJobSelect = async (projectId: string) => {
  //   if (!onSelectProject) return;
  //   setIsSwitchingJob(true);
  //   try {
  //     await onSelectProject(projectId);
  //   } finally {
  //     setIsSwitchingJob(false);
  //   }
  // };

  const handleToolClick = (toolId: string) => {
    onToolActivate(toolId);
  };

  const getToolsByCategory = (category: ToolCategory) => {
    return TOOLS.filter((tool) => tool.category === category);
  };

  const categories: ToolCategory[] = ["edit", "draw", "symbols"];

  return (
    <div className="absolute top-0 left-0 right-0 z-50">
      {/* Main Toolbar Container */}
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-b-lg shadow-md">
        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-2 py-2 border-b border-gray-200">
          <div className="flex gap-1">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => {
                  setActiveCategory(category);
                  setIsCollapsed(false);
                }}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all cursor-pointer ${
                  activeCategory === category
                    ? "bg-blue-100 text-blue-900 border border-blue-300"
                    : "text-gray-700 hover:bg-gray-100 border border-transparent"
                }`}
              >
                {CATEGORY_LABELS[category]}
              </button>
            ))}
          </div>

          {/* Right-side Actions */}
          <div className="flex items-center gap-2">
            <div className="w-px h-6 bg-gray-200"></div>
            <Button
              variant="ghost"
              size="sm"
              className="cursor-pointer h-8 px-3"
              onClick={() => undo()}
              title="Undo (Ctrl+Z)"
            >
              <Undo className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="cursor-pointer h-8 px-3"
              onClick={() => redo()}
              title="Redo (Ctrl+Y)"
            >
              <Redo className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="cursor-pointer h-8 px-3"
              title="Import GeoJson/Kml/Kmz"
              onClick={onFileImport}
            >
              <FilePlus className="w-4 h-4" />
              <span className="ml-1 text-xs">Import</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="cursor-pointer h-8 px-3"
                >
                  <ArrowUpFromLine className="w-4 h-4" />
                  <span className="ml-1 text-xs">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => onExportClick("geojson")}>
                    GeoJson
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onExportClick("kml")}>
                    KML
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onExportClick("kmz")}>
                    KMZ
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onPdfExportClick}>
                    PDF
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="sm"
              className="cursor-pointer h-8 px-3"
              title="Redirect to Layouts"
              asChild
            >
              <Link to={"/layouts"} target="_blank" className="text-xs">
                Layouts
              </Link>
            </Button>

            {/* Job Selector Dropdown */}
            <JobSelection
              projects={projects}
              currentProjectId={currentProjectId}
              onSelectProject={onSelectProject}
            />

            {/* Tools Section Collapsable */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 hover:bg-gray-100 rounded transition-colors cursor-pointer"
              title={isCollapsed ? "Expand tools" : "Collapse tools"}
            >
              {isCollapsed ? (
                <ChevronDown className="w-4 h-4 text-gray-700" />
              ) : (
                <ChevronUp className="w-4 h-4 text-gray-700" />
              )}
            </button>
          </div>
        </div>

        {/* Tools Display */}
        <div
          className={`overflow-hidden transition-all ease-in-out duration-500 ${
            isCollapsed ? "max-h-0" : "max-h-96"
          }`}
        >
          <div className="flex flex-wrap items-center gap-2 px-3 py-3">
            {getToolsByCategory(activeCategory).map((tool) => {
              if (tool.id === "legends") {
                return (
                  <div key={tool.id}>
                    <LegendDropdown
                      selectedLegend={selectedLegend}
                      onLegendSelect={onLegendSelect}
                      activeTool={activeTool}
                    />
                  </div>
                );
              }

              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  onClick={() => handleToolClick(tool.id)}
                  title={tool.name}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all cursor-pointer ${
                    activeTool === tool.id
                      ? "bg-blue-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {tool.iconPath ? (
                    <img src={tool.iconPath} alt={tool.name} className="w-5 h-5 object-contain" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                  <span className="text-xs font-medium">{tool.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
