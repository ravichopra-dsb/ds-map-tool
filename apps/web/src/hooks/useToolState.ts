import { useState } from "react";
import { type LegendType } from "@/tools/legendsConfig";
import { DEFAULT_LINE_STYLE } from "@/utils/featureTypeUtils";
import { useToolStore } from "@/stores/useToolStore";

export interface UseToolStateReturn {
  activeTool: string;
  selectedLegend: LegendType | undefined;
  selectedIconPath: string | undefined;
  lineColor: string;
  lineWidth: number;
  setActiveTool: (tool: string) => void;
  setSelectedLegend: (legend: LegendType | undefined) => void;
  setSelectedIconPath: (iconPath: string | undefined) => void;
  setLineColor: (color: string) => void;
  setLineWidth: (width: number) => void;
  handleLegendSelect: (legend: LegendType) => void;
  handleIconSelect: (iconPath: string) => void;
}

export const useToolState = (): UseToolStateReturn => {
  // Use Zustand store for activeTool to sync with pauseDrawing/resumeDrawing
  const activeTool = useToolStore((state) => state.activeTool);
  const setActiveToolStore = useToolStore((state) => state.setActiveTool);

  const [selectedLegend, setSelectedLegend] = useState<LegendType | undefined>(
    undefined
  );
  const [selectedIconPath, setSelectedIconPath] = useState<string | undefined>(
    undefined
  );
  const [lineColor, setLineColor] = useState<string>(DEFAULT_LINE_STYLE.color);
  const [lineWidth, setLineWidth] = useState<number>(DEFAULT_LINE_STYLE.width);

  // Wrapper to maintain same interface
  const setActiveTool = (tool: string) => {
    setActiveToolStore(tool);
  };

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
    lineColor,
    lineWidth,
    setActiveTool,
    setSelectedLegend,
    setSelectedIconPath,
    setLineColor,
    setLineWidth,
    handleLegendSelect,
    handleIconSelect,
  };
};