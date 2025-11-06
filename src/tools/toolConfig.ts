import {
  HandGrab,
  MousePointer2,
  Pencil,
  Slash,
  Type
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
    id: "line",
    name: "Line",
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
  }
];

export const DEFAULT_TOOL = "hand";
