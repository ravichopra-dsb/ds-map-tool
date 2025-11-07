import {
  HandGrab,
  MousePointer2,
  Pencil,
  Slash,
  Type,
  Circle,
  ArrowUp,
  Minus
} from "lucide-react";

export const TOOLS = [
  {
    id: "select",
    name: "Select",
    icon: MousePointer2,
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
];

export const DEFAULT_TOOL = "hand";
