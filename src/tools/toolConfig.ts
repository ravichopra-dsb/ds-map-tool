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
  Triangle
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
    icon: Minus ,
  },
  {
    id: "triangle",
    name: "Triangle",
    icon: Triangle ,
  },
];

export const DEFAULT_TOOL = "hand";
