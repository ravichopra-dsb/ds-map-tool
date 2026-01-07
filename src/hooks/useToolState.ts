import { useState } from "react";
import { type LegendType } from "@/tools/legendsConfig";

export interface UseToolStateReturn {
  activeTool: string;
  selectedLegend: LegendType | undefined;
  selectedIconPath: string | undefined;
  setActiveTool: (tool: string) => void;
  setSelectedLegend: (legend: LegendType | undefined) => void;
  setSelectedIconPath: (iconPath: string | undefined) => void;
  handleLegendSelect: (legend: LegendType) => void;
  handleIconSelect: (iconPath: string) => void;
}

export const useToolState = (): UseToolStateReturn => {
  const [activeTool, setActiveTool] = useState<string>("");
  const [selectedLegend, setSelectedLegend] = useState<LegendType | undefined>(
    undefined
  );
  const [selectedIconPath, setSelectedIconPath] = useState<string | undefined>(
    undefined
  );

  const handleLegendSelect = (legend: LegendType) => {
    setSelectedLegend(legend);
  };

  const handleIconSelect = (iconPath: string) => {
    setSelectedIconPath(iconPath);
    setActiveTool("icons");
  };

  return {
    activeTool,
    selectedLegend,
    selectedIconPath,
    setActiveTool,
    setSelectedLegend,
    setSelectedIconPath,
    handleLegendSelect,
    handleIconSelect,
  };
};