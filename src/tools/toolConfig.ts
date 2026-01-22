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
} from "lucide-react";

export type ToolCategory = "edit" | "draw" | "symbols";

export interface ToolItem {
  id: string;
  name: string;
  icon: any;
  category: ToolCategory;
}

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
  // SYMBOL TOOLS
  {
    id: 'icons',
    name: 'Icons',
    icon: MapPin,
    category: "symbols",
  },
];

export const DEFAULT_TOOL = "hand";
