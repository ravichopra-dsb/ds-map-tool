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
  RulerDimensionLine
} from "lucide-react";

export const TOOLS = [
  {
    id: "select",
    name: "Select",
    icon: MousePointer2,
  },
  {
    id: "transform",
    name: "Transform",
    icon: Move,
  },
  {
    id: "hand",
    name: "Hand",
    icon: HandGrab,
  },
  {
    id: "point",
    name: "Point",
    icon: Circle,
  },
  {
    id: "polyline",
    name: "Polyline",
    icon: Slash,
  },
  {
    id: "freehand",
    name: "Freehand Line",
    icon: Pencil,
  },
  {
    id: "text",
    name: "Text",
    icon: Type,
  },
  {
    id: "arrow",
    name: "Arrow",
    icon: ArrowUp,
  },
  {
    id: "legends",
    name: "Legends",
    icon: Minus,
  },
  {
    id: "triangle",
    name: "Triangle",
    icon: Triangle,
  },
  {
    id: "pit",
    name: "Pit",
    icon: Pit,
  },
  {
    id: "gp",
    name: "Gp",
    icon: GP,
  },
  {
    id: 'junction',
    name: 'Junction Point',
    icon: JunctionPoint,
  },
  {
    id: 'tower',
    name: 'Tower',
    icon: Tower,
  }, 
  {
    id: 'measure',
    name: 'Measure',
    icon: RulerDimensionLine
  }
];

export const DEFAULT_TOOL = "hand";
