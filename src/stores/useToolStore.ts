import { create } from 'zustand';
import type { Select } from 'ol/interaction';
import type UndoRedo from 'ol-ext/interaction/UndoRedo';
import type { LegendType } from '@/tools/legendsConfig';

const DEFAULT_LINE_COLOR = '#00ff00';
const DEFAULT_LINE_WIDTH = 4;

interface ToolState {
  // State
  activeTool: string;
  previousTool: string | null;
  selectedLegend: LegendType | undefined;
  selectedIconPath: string | undefined;
  selectInteraction: Select | null;
  undoRedoInteraction: UndoRedo | null;
  lineColor: string;
  lineWidth: number;

  // Actions
  setActiveTool: (tool: string) => void;
  setSelectedLegend: (legend: LegendType | undefined) => void;
  setSelectedIconPath: (path: string | undefined) => void;
  setSelectInteraction: (interaction: Select | null) => void;
  setUndoRedoInteraction: (interaction: UndoRedo | null) => void;
  setLineColor: (color: string) => void;
  setLineWidth: (width: number) => void;
  handleLegendSelect: (legend: LegendType) => void;
  handleIconSelect: (iconPath: string) => void;
  undo: () => void;
  redo: () => void;
}

export const useToolStore = create<ToolState>((set, get) => ({
  activeTool: '',
  previousTool: null,
  selectedLegend: undefined,
  selectedIconPath: undefined,
  selectInteraction: null,
  undoRedoInteraction: null,
  lineColor: DEFAULT_LINE_COLOR,
  lineWidth: DEFAULT_LINE_WIDTH,

  setActiveTool: (tool) =>
    set((state) => ({
      activeTool: tool,
      previousTool: state.activeTool,
    })),

  setSelectedLegend: (legend) => set({ selectedLegend: legend }),
  setSelectedIconPath: (path) => set({ selectedIconPath: path }),
  setSelectInteraction: (interaction) => set({ selectInteraction: interaction }),
  setUndoRedoInteraction: (interaction) => set({ undoRedoInteraction: interaction }),
  setLineColor: (color) => set({ lineColor: color }),
  setLineWidth: (width) => set({ lineWidth: width }),

  handleLegendSelect: (legend) => set({ selectedLegend: legend }),

  handleIconSelect: (iconPath) =>
    set({
      selectedIconPath: iconPath,
      activeTool: 'icons',
    }),

  undo: () => get().undoRedoInteraction?.undo(),
  redo: () => get().undoRedoInteraction?.redo(),
}));
