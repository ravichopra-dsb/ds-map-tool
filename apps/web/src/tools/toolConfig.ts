import {
  HandGrab,
  MousePointer2,
  Pencil,
  Slash,
  Type,
  Circle,
  ArrowUp,
  Minus,
  Move,
  RulerDimensionLine,
  MapPin,
  Scissors,
  Spline,
  CopySlash,
  Square,
  CircleDot,
  Merge,
  Cloud,
  Pipette,
  MoveVertical,
  ScissorsLineDashed,
} from "lucide-react";

export type ToolCategory = "edit" | "draw" | "symbols";

export interface ToolItem {
  id: string;
  name: string;
  icon: any;
  category: ToolCategory;
  iconPath?: string;
}

const LANDMARK_ICONS_BASE = "/google_earth_icons/landmark-symbols";

const QUICK_ACCESS_ICONS = [
  { id: "icon-tower", name: "Tower", file: "TOWER.png" },
  { id: "icon-chamber", name: "Chamber", file: "chamber.png" },
  { id: "icon-ep-pole", name: "EP Pole", file: "EP POLE.png" },
  { id: "icon-bridge", name: "Bridge", file: "BRIDGE.png" },
  { id: "icon-bt", name: "BT", file: "BT.png" },
  { id: "icon-gl", name: "GL", file: "GL.png" },
  { id: "icon-cc", name: "CC", file: "CC.png" },
] as const;

export const TOOLS: ToolItem[] = [
  // EDIT TOOLS
  {
    id: "select",
    name: "Select",
    icon: MousePointer2,
    category: "edit",
  },
  {
    id: "transform",
    name: "Transform",
    icon: Move,
    category: "edit",
  },
  {
    id: "hand",
    name: "Pan",
    icon: HandGrab,
    category: "edit",
  },
  {
    id: 'split',
    name: 'Split',
    icon: Scissors,
    category: "edit",
  },
  {
    id: 'break',
    name: 'Break',
    icon: ScissorsLineDashed,
    category: "edit",
  },
  {
    id: 'merge',
    name: 'Merge',
    icon: Merge,
    category: "edit",
  },
  {
    id: 'offset',
    name: 'Offset',
    icon: CopySlash,
    category: "edit",
  },
  {
    id: 'matchproperties',
    name: 'Match Properties',
    icon: Pipette,
    category: "edit",
  },
  // DRAW TOOLS
  {
    id: "freehand",
    name: "Freehand",
    icon: Pencil,
    category: "draw",
  },
  {
    id: "polyline",
    name: "Polyline",
    icon: Slash,
    category: "draw",
  },
  {
    id: "arrow",
    name: "Arrow",
    icon: ArrowUp,
    category: "draw",
  },
  {
    id: "dimension",
    name: "Dimension",
    icon: MoveVertical,
    category: "draw",
  },
  {
    id: "alignedDimension",
    name: "Aligned Dim",
    icon: null,
    category: "draw",
    iconPath: "/Tool-Icons/AlignedDim.png",
  },
  {
    id: "linearDimension",
    name: "Linear Dim",
    icon: null,
    category: "draw",
    iconPath: "/Tool-Icons/LinearDim.png",
  },
  {
    id: "radiusDimension",
    name: "Radius Dim",
    icon: null,
    category: "draw",
    iconPath: "/Tool-Icons/RadiusDim.png",
  },
  {
    id: "point",
    name: "Point",
    icon: Circle,
    category: "draw",
  },
  {
    id: "text",
    name: "Text",
    icon: Type,
    category: "draw",
  },
  {
    id: "legends",
    name: "Legends",
    icon: Minus,
    category: "draw",
  },
  {
    id: 'measure',
    name: 'Measure',
    icon: RulerDimensionLine,
    category: "draw",
  },
  {
    id: 'box',
    name: 'Box',
    icon: Square,
    category: "draw",
  },
  {
    id: 'circle',
    name: 'Circle',
    icon: CircleDot,
    category: "draw",
  },
  {
    id: 'arc',
    name: 'Arc',
    icon: Spline,
    category: "draw",
  },
  {
    id: 'revcloud',
    name: 'Rev Cloud',
    icon: Cloud,
    category: "draw",
  },
  // SYMBOL TOOLS - Quick Access Icons
  ...QUICK_ACCESS_ICONS.map(({ id, name, file }) => ({
    id,
    name,
    icon: null,
    category: "symbols" as ToolCategory,
    iconPath: `${LANDMARK_ICONS_BASE}/${file}`,
  })),
  {
    id: 'icons',
    name: 'Icons',
    icon: MapPin,
    category: "symbols",
  },
];

export const DEFAULT_TOOL = "hand";
