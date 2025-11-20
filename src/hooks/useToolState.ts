import { useState } from "react";
import { type LegendType } from "@/tools/legendsConfig";

export interface UseToolStateReturn {
  activeTool: string;
  selectedLegend: LegendType | undefined;
  setActiveTool: (tool: string) => void;
  setSelectedLegend: (legend: LegendType | undefined) => void;
  handleLegendSelect: (legend: LegendType) => void;
}

export const useToolState = (): UseToolStateReturn => {
  const [activeTool, setActiveTool] = useState<string>("");
  const [selectedLegend, setSelectedLegend] = useState<LegendType | undefined>(
    undefined
  );

  const handleLegendSelect = (legend: LegendType) => {
    setSelectedLegend(legend);
  };

  return {
    activeTool,
    selectedLegend,
    setActiveTool,
    setSelectedLegend,
    handleLegendSelect,
  };
};