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
  orthoMode: boolean;
  resolutionScalingEnabled: boolean;
  // Drawing pause state
  isDrawingPaused: boolean;
  pausedTool: string | null;
  isNewlyCreatedFeature: boolean;

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
  toggleOrthoMode: () => void;
  toggleResolutionScaling: () => void;
  undo: () => void;
  redo: () => void;
  // Drawing pause actions
  pauseDrawing: (tool: string) => void;
  resumeDrawing: () => void;
  setIsNewlyCreatedFeature: (isNew: boolean) => void;
}

export const useToolStore = create<ToolState>((set, get) => ({
  activeTool: 'select',
  previousTool: null,
  selectedLegend: undefined,
  selectedIconPath: undefined,
  selectInteraction: null,
  undoRedoInteraction: null,
  lineColor: DEFAULT_LINE_COLOR,
  lineWidth: DEFAULT_LINE_WIDTH,
  orthoMode: false,
  resolutionScalingEnabled: true,
  isDrawingPaused: false,
  pausedTool: null,
  isNewlyCreatedFeature: false,

  setActiveTool: (tool) =>
    set((state) => ({
      activeTool: tool,
      previousTool: state.activeTool,
      // Clear pause state when manually switching tools
      isDrawingPaused: false,
      pausedTool: null,
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

  toggleOrthoMode: () => set((state) => ({ orthoMode: !state.orthoMode })),

  toggleResolutionScaling: () => set((state) => ({ resolutionScalingEnabled: !state.resolutionScalingEnabled })),

  undo: () => get().undoRedoInteraction?.undo(),
  redo: () => get().undoRedoInteraction?.redo(),

  pauseDrawing: (tool) =>
    set({
      isDrawingPaused: true,
      pausedTool: tool,
      activeTool: 'hand',
    }),

  resumeDrawing: () =>
    set((state) => ({
      isDrawingPaused: false,
      activeTool: state.pausedTool || 'select',
      pausedTool: null,
      isNewlyCreatedFeature: false,
    })),

  setIsNewlyCreatedFeature: (isNew) => set({ isNewlyCreatedFeature: isNew }),
}));
