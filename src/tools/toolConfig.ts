import { GP, JunctionPoint, Pit, Tower, Triangle } from "@/icons/ToolBoxIcon";
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
    icon: Spline,
    category: "edit",
  },
  {
    id: 'offset',
    name: 'Offset',
    icon: CopySlash,
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
  // SYMBOL TOOLS
  {
    id: "triangle",
    name: "Triangle",
    icon: Triangle,
    category: "symbols",
  },
  {
    id: "pit",
    name: "Pit",
    icon: Pit,
    category: "symbols",
  },
  {
    id: "gp",
    name: "GP",
    icon: GP,
    category: "symbols",
  },
  {
    id: 'junction',
    name: 'Junction',
    icon: JunctionPoint,
    category: "symbols",
  },
  {
    id: 'tower',
    name: 'Tower',
    icon: Tower,
    category: "symbols",
  },
  {
    id: 'icons',
    name: 'Icons',
    icon: MapPin,
    category: "symbols",
  },
];

export const DEFAULT_TOOL = "hand";
